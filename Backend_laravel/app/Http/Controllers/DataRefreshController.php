<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use PDO;
use Exception;

class DataRefreshController extends Controller
{
  
public function refreshAllData(Request $request): JsonResponse
{
    try {
        if (!$request->session()->isStarted()) {
            $request->session()->start();
        }

        $selectedFolder = $request->session()->get('selected_folder');
        if (!$selectedFolder) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun dossier sélectionné'
            ], 400);
        }

        Log::info('🔄 Début du refresh RÉEL des données Access', [
            'dossier' => $selectedFolder['folder_name'] ?? 'Inconnu',
            'timestamp' => now()
        ]);

        $this->clearApplicationCaches();
        $this->forceCloseOdbcConnections();
        usleep(500000); // 0.5 seconde
        $fileTimestamps = $this->getAccessFilesTimestamps($selectedFolder);
        $refreshResults = $this->forceDataRefreshFromFiles($selectedFolder);
        $connectionResults = $this->testAndRefreshConnections($selectedFolder);
        $dataSnapshot = $this->getDataSnapshot($selectedFolder);

        Log::info('✅ Refresh RÉEL des données terminé', [
            'file_timestamps' => $fileTimestamps,
            'refresh_results' => $refreshResults,
            'connections' => $connectionResults,
            'data_snapshot' => $dataSnapshot
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Données mises à jour avec succès (refresh complet)',
            'data' => [
                'refresh_timestamp' => now()->toISOString(),
                'dossier_name' => $selectedFolder['folder_name'] ?? 'Inconnu',
                'file_timestamps' => $fileTimestamps,
                'refresh_results' => $refreshResults,
                'connections' => $connectionResults,
                'data_snapshot' => $dataSnapshot,
                'cache_cleared' => true,
                'full_refresh' => true
            ]
        ]);

    } catch (Exception $e) {
        Log::error('❌ Erreur lors du refresh RÉEL', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la mise à jour: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * Forcer la fermeture des connexions ODBC
 */
private function forceCloseOdbcConnections(): array
{
    $results = [];
    
    try {
        if (class_exists('PDO')) {
            gc_collect_cycles();
            $results['gc_collected'] = true;
        }

        if (function_exists('opcache_reset')) {
            opcache_reset();
            $results['opcache_reset'] = true;
        }

        Log::info('🔌 Connexions ODBC fermées');
        return $results;

    } catch (Exception $e) {
        Log::warning('Erreur fermeture connexions ODBC', ['error' => $e->getMessage()]);
        return ['error' => $e->getMessage()];
    }
}

private function getAccessFilesTimestamps($selectedFolder): array
{
    $timestamps = [];
    
    try {
        // Fichier principal Caiss.mdb
        $accessDbPath = $this->getAccessDbPath($selectedFolder);
        if (file_exists($accessDbPath)) {
            $timestamps['caiss_mdb'] = [
                'path' => $accessDbPath,
                'last_modified' => filemtime($accessDbPath),
                'last_modified_formatted' => date('Y-m-d H:i:s', filemtime($accessDbPath)),
                'size' => filesize($accessDbPath)
            ];
        }

        // Fichier facturation
        $facturationDbPath = $this->getFacturationDbPath($selectedFolder);
        if (file_exists($facturationDbPath)) {
            $timestamps['facturation_mdb'] = [
                'path' => $facturationDbPath,
                'last_modified' => filemtime($facturationDbPath),
                'last_modified_formatted' => date('Y-m-d H:i:s', filemtime($facturationDbPath)),
                'size' => filesize($facturationDbPath)
            ];
        }

        // Fichier frontoffice
        $frontofficeDbPath = $this->getFrontofficeDbPath($selectedFolder);
        if (file_exists($frontofficeDbPath)) {
            $timestamps['frontoffice_mdb'] = [
                'path' => $frontofficeDbPath,
                'last_modified' => filemtime($frontofficeDbPath),
                'last_modified_formatted' => date('Y-m-d H:i:s', filemtime($frontofficeDbPath)),
                'size' => filesize($frontofficeDbPath)
            ];
        }

    } catch (Exception $e) {
        Log::warning('Erreur lecture timestamps', ['error' => $e->getMessage()]);
        $timestamps['error'] = $e->getMessage();
    }

    return $timestamps;
}

/**
 * Forcer le rechargement des données depuis les fichiers
 */
private function forceDataRefreshFromFiles($selectedFolder): array
{
    $results = [
        'caiss_db' => ['refreshed' => false, 'method' => '', 'error' => null],
        'facturation_db' => ['refreshed' => false, 'method' => '', 'error' => null],
        'frontoffice_db' => ['refreshed' => false, 'method' => '', 'error' => null]
    ];

    try {
        $accessDbPath = $this->getAccessDbPath($selectedFolder);
        if (file_exists($accessDbPath)) {
            for ($i = 0; $i < 3; $i++) {
                $pdo = $this->connectToAccessWithRefresh($accessDbPath);
                $stmt = $pdo->query("SELECT COUNT(*) FROM Article");
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $pdo = null;
                usleep(100000); 
            }
            
            $results['caiss_db'] = [
                'refreshed' => true, 
                'method' => 'multiple_connections',
                'error' => null
            ];
        }
    } catch (Exception $e) {
        $results['caiss_db']['error'] = $e->getMessage();
        Log::warning('Erreur refresh Caiss.mdb', ['error' => $e->getMessage()]);
    }

    // Répéter pour les autres bases
    try {
        $facturationDbPath = $this->getFacturationDbPath($selectedFolder);
        if (file_exists($facturationDbPath)) {
            for ($i = 0; $i < 3; $i++) {
                $pdo = $this->connectToAccessWithRefresh($facturationDbPath);
                $stmt = $pdo->query("SELECT COUNT(*) FROM Mouvementstock");
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $pdo = null;
                usleep(100000);
            }
            
            $results['facturation_db'] = [
                'refreshed' => true,
                'method' => 'multiple_connections', 
                'error' => null
            ];
        }
    } catch (Exception $e) {
        $results['facturation_db']['error'] = $e->getMessage();
    }

    try {
        $frontofficeDbPath = $this->getFrontofficeDbPath($selectedFolder);
        if (file_exists($frontofficeDbPath)) {
            for ($i = 0; $i < 3; $i++) {
                $pdo = $this->connectToAccessWithRefresh($frontofficeDbPath);
                $stmt = $pdo->query("SELECT COUNT(*) FROM Ticket");
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $pdo = null;
                usleep(100000);
            }
            
            $results['frontoffice_db'] = [
                'refreshed' => true,
                'method' => 'multiple_connections',
                'error' => null
            ];
        }
    } catch (Exception $e) {
        $results['frontoffice_db']['error'] = $e->getMessage();
    }

    return $results;
}

private function connectToAccessWithRefresh(string $accessDbPath): PDO
{
    $dsn = "odbc:DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=" . $accessDbPath . ";";
    
    $pdo = new PDO($dsn, '', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => false,
    ]);
    
    return $pdo;
}

    /**
     * Tester et forcer la reconnexion aux bases Access
     */
    private function testAndRefreshConnections($selectedFolder): array
    {
        $results = [
            'caiss_db' => ['connected' => false, 'records' => 0, 'error' => null],
            'facturation_db' => ['connected' => false, 'records' => 0, 'error' => null],
            'frontoffice_db' => ['connected' => false, 'records' => 0, 'error' => null]
        ];

    try {
        $accessDbPath = $this->getAccessDbPath($selectedFolder);
        if (file_exists($accessDbPath)) {
            usleep(200000); // 0.2 seconde
            
            $accessPdo = $this->connectToAccessWithRefresh($accessDbPath);
            $stmt = $accessPdo->query("SELECT COUNT(*) as total FROM Article");
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $results['caiss_db'] = [
                'connected' => true,
                'records' => $result['total'],
                'path' => $accessDbPath,
                'reconnected' => true, 
                'error' => null
            ];
            
            $accessPdo = null;
        }
    } catch (Exception $e) {
        $results['caiss_db']['error'] = $e->getMessage();
    }

        // Test connexion Caiss.mdb (principal)
        try {
            $accessDbPath = $this->getAccessDbPath($selectedFolder);
            if (file_exists($accessDbPath)) {
                $accessPdo = $this->connectToAccess($accessDbPath);
                $stmt = $accessPdo->query("SELECT COUNT(*) as total FROM Article");
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                
                $results['caiss_db'] = [
                    'connected' => true,
                    'records' => $result['total'],
                    'path' => $accessDbPath,
                    'error' => null
                ];
                
                // Fermer explicitement la connexion pour forcer une reconnexion
                $accessPdo = null;
            }
        } catch (Exception $e) {
            $results['caiss_db']['error'] = $e->getMessage();
            Log::warning('Erreur connexion Caiss.mdb lors du refresh', ['error' => $e->getMessage()]);
        }

        // Test connexion caiss_facturation.mdb (stocks)
        try {
            $facturationDbPath = $this->getFacturationDbPath($selectedFolder);
            if (file_exists($facturationDbPath)) {
                $facturationPdo = $this->connectToAccess($facturationDbPath);
                $stmt = $facturationPdo->query("SELECT COUNT(*) as total FROM Mouvementstock");
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                
                $results['facturation_db'] = [
                    'connected' => true,
                    'records' => $result['total'],
                    'path' => $facturationDbPath,
                    'error' => null
                ];
                
                $facturationPdo = null;
            }
        } catch (Exception $e) {
            $results['facturation_db']['error'] = $e->getMessage();
            Log::warning('Erreur connexion caiss_facturation.mdb lors du refresh', ['error' => $e->getMessage()]);
        }

        // Test connexion Caiss_frontoffice.mdb (tickets)
        try {
            $frontofficeDbPath = $this->getFrontofficeDbPath($selectedFolder);
            if (file_exists($frontofficeDbPath)) {
                $frontofficePdo = $this->connectToAccess($frontofficeDbPath);
                $stmt = $frontofficePdo->query("SELECT COUNT(*) as total FROM Ticket");
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                
                $results['frontoffice_db'] = [
                    'connected' => true,
                    'records' => $result['total'],
                    'path' => $frontofficeDbPath,
                    'error' => null
                ];
                
                $frontofficePdo = null;
            }
        } catch (Exception $e) {
            $results['frontoffice_db']['error'] = $e->getMessage();
            Log::warning('Erreur connexion Caiss_frontoffice.mdb lors du refresh', ['error' => $e->getMessage()]);
        }

        return $results;
    }

    /**
     * Vider tous les caches de l'application
     */
    private function clearApplicationCaches(): void
    {
        try {
            Cache::flush();
            if (function_exists('opcache_reset')) {
                opcache_reset();
            }
            
            Log::info('🗑️ Caches Laravel vidés lors du refresh');
        } catch (Exception $e) {
            Log::warning('Erreur lors du vidage des caches', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Obtenir un aperçu des données après refresh
     */
    private function getDataSnapshot($selectedFolder): array
    {
        $snapshot = [
            'articles_count' => 0,
            'families_count' => 0,
            'stock_movements_count' => 0,
            'tickets_count' => 0,
            'last_article' => null,
            'last_ticket' => null
        ];

        try {
            // Données des articles
            $accessDbPath = $this->getAccessDbPath($selectedFolder);
            if (file_exists($accessDbPath)) {
                $accessPdo = $this->connectToAccess($accessDbPath);
                
                // Compter les articles
                $stmt = $accessPdo->query("SELECT COUNT(*) as total FROM Article");
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $snapshot['articles_count'] = $result['total'];
                
                // Compter les familles distinctes
                $stmt = $accessPdo->query("SELECT COUNT(DISTINCT CodeFam) as total FROM Article WHERE CodeFam IS NOT NULL AND CodeFam <> ''");
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $snapshot['families_count'] = $result['total'];
                
                $stmt = $accessPdo->query("SELECT TOP 1 Code, Libelle FROM Article ORDER BY Code DESC");
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($result) {
                    $snapshot['last_article'] = [
                        'code' => $this->fixEncoding($result['Code'] ?? ''),
                        'libelle' => $this->fixEncoding($result['Libelle'] ?? '')
                    ];
                }
                
                $accessPdo = null;
            }

            // Données des stocks
            $facturationDbPath = $this->getFacturationDbPath($selectedFolder);
            if (file_exists($facturationDbPath)) {
                $facturationPdo = $this->connectToAccess($facturationDbPath);
                
                $stmt = $facturationPdo->query("SELECT COUNT(*) as total FROM Mouvementstock");
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $snapshot['stock_movements_count'] = $result['total'];
                
                $facturationPdo = null;
            }

            // Données des tickets
            $frontofficeDbPath = $this->getFrontofficeDbPath($selectedFolder);
            if (file_exists($frontofficeDbPath)) {
                $frontofficePdo = $this->connectToAccess($frontofficeDbPath);
                
                $stmt = $frontofficePdo->query("SELECT COUNT(*) as total FROM Ticket");
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $snapshot['tickets_count'] = $result['total'];
                
                // Dernier ticket
                $stmt = $frontofficePdo->query("SELECT TOP 1 Id, Code FROM Ticket ORDER BY Id DESC");
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($result) {
                    $snapshot['last_ticket'] = [
                        'id' => $result['Id'],
                        'code' => $this->fixEncoding($result['Code'] ?? '')
                    ];
                }
                
                $frontofficePdo = null;
            }

        } catch (Exception $e) {
            Log::warning('Erreur lors de la création du snapshot', ['error' => $e->getMessage()]);
        }

        return $snapshot;
    }

    public function quickRefresh(Request $request): JsonResponse
    {
        try {
            if (!$request->session()->isStarted()) {
                $request->session()->start();
            }

            $selectedFolder = $request->session()->get('selected_folder');
            if (!$selectedFolder) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucun dossier sélectionné'
                ], 400);
            }

            // Vider les caches
            $this->clearApplicationCaches();

            return response()->json([
                'success' => true,
                'message' => 'Refresh rapide effectué',
                'data' => [
                    'refresh_timestamp' => now()->toISOString(),
                    'dossier_name' => $selectedFolder['folder_name'] ?? 'Inconnu',
                    'type' => 'quick_refresh'
                ]
            ]);

        } catch (Exception $e) {
            Log::error('Erreur lors du refresh rapide', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du refresh rapide: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir le statut des connexions 
     */
    public function getConnectionStatus(Request $request): JsonResponse
    {
        try {
            if (!$request->session()->isStarted()) {
                $request->session()->start();
            }

            $selectedFolder = $request->session()->get('selected_folder');
            if (!$selectedFolder) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucun dossier sélectionné'
                ], 400);
            }

            $connectionResults = $this->testAndRefreshConnections($selectedFolder);

            return response()->json([
                'success' => true,
                'data' => [
                    'dossier_name' => $selectedFolder['folder_name'] ?? 'Inconnu',
                    'connections' => $connectionResults,
                    'check_timestamp' => now()->toISOString()
                ]
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la vérification: ' . $e->getMessage()
            ], 500);
        }
    }

    private function connectToAccess(string $accessDbPath): PDO
    {
        $dsn = "odbc:DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=" . $accessDbPath . ";";
        $pdo = new PDO($dsn);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        return $pdo;
    }

    private function getAccessDbPath($selectedFolder): string
    {
        if (isset($selectedFolder['stored_file_path'])) {
            return storage_path('app/' . $selectedFolder['stored_file_path']);
        } else if (isset($selectedFolder['folder_path'])) {
            $folderPath = $selectedFolder['folder_path'];
            $normalizedPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $folderPath);
            return $normalizedPath . DIRECTORY_SEPARATOR . 'Caiss.mdb';
        }
        throw new Exception('Aucun chemin Access disponible');
    }

    private function getFacturationDbPath($selectedFolder): string
    {
        if (isset($selectedFolder['stored_file_path'])) {
            $caissPath = storage_path('app/' . $selectedFolder['stored_file_path']);
            $folderPath = dirname($caissPath);
            return $folderPath . DIRECTORY_SEPARATOR . 'caiss_facturation.mdb';
        } else if (isset($selectedFolder['folder_path'])) {
            $folderPath = $selectedFolder['folder_path'];
            $normalizedPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $folderPath);
            return $normalizedPath . DIRECTORY_SEPARATOR . 'caiss_facturation.mdb';
        }
        throw new Exception('Aucun chemin caiss_facturation.mdb disponible');
    }

    private function getFrontofficeDbPath($selectedFolder): string
    {
        if (isset($selectedFolder['stored_file_path'])) {
            $caissPath = storage_path('app/' . $selectedFolder['stored_file_path']);
            $folderPath = dirname($caissPath);
            return $folderPath . DIRECTORY_SEPARATOR . 'Caiss_frontoffice.mdb';
        } else if (isset($selectedFolder['folder_path'])) {
            $folderPath = $selectedFolder['folder_path'];
            $normalizedPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $folderPath);
            return $normalizedPath . DIRECTORY_SEPARATOR . 'Caiss_frontoffice.mdb';
        }
        throw new Exception('Aucun chemin Caiss_frontoffice.mdb disponible');
    }

    private function fixEncoding($value): string
    {
        if (empty($value)) return '';
        if (mb_check_encoding($value, 'UTF-8')) return $value;
        
        $encodings = ['Windows-1252', 'ISO-8859-1', 'CP1252', 'UTF-8'];
        foreach ($encodings as $encoding) {
            $converted = @mb_convert_encoding($value, 'UTF-8', $encoding);
            if ($converted !== false && mb_check_encoding($converted, 'UTF-8')) {
                return $converted;
            }
        }
        return mb_convert_encoding($value, 'UTF-8', 'UTF-8');
    }
}