<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use PDO;
use Exception;

class SyncAccessDatabase extends Command
{
    protected $signature = 'sync:selected-folder {--auto : Mode automatique silencieux}';
    protected $description = 'Synchronise automatiquement le dossier sélectionné en arrière-plan';

    public function handle()
    {
        try {
            $isAutoMode = $this->option('auto');
            
            if (!$isAutoMode) {
                $this->info('🚀 Recherche du dossier sélectionné...');
            }
            
            // Récupération automatique du dossier sélectionné
            $folderInfo = $this->getSelectedFolderFromSession();
            
            if (!$folderInfo) {
                if (!$isAutoMode) {
                    $this->warn('⚠️  Aucun dossier sélectionné trouvé');
                }
                return Command::SUCCESS;
            }

            if (!$this->needsSync($folderInfo['access_file_path'])) {
                if (!$isAutoMode) {
                    $this->info("✅ Dossier '{$folderInfo['folder_name']}' déjà synchronisé");
                }
                return Command::SUCCESS;
            }

            if (!$isAutoMode) {
                $this->info("📁 Synchronisation: {$folderInfo['folder_name']}");
            }
            
            // Synchronisation
            $this->syncAccessFile($folderInfo);
            
            if (!$isAutoMode) {
                $this->info('✅ Synchronisation terminée');
            }
            
            return Command::SUCCESS;
            
        } catch (Exception $e) {
            Log::error('Auto Sync Error: ' . $e->getMessage());
            if (!$this->option('auto')) {
                $this->error('❌ Erreur: ' . $e->getMessage());
            }
            return Command::FAILURE;
        }
    }

    private function getSelectedFolderFromSession(): ?array
    {
        // Recherche dans les sessions Laravel stockées en base ou fichiers
        $sessionPath = storage_path('framework/sessions');
        
        if (!is_dir($sessionPath)) {
            return null;
        }

        $latestSelection = null;
        $latestTime = 0;

        // Parcourir tous les fichiers de session
        $sessionFiles = glob($sessionPath . '/*');
        
        foreach ($sessionFiles as $sessionFile) {
            if (!is_file($sessionFile)) continue;
            
            try {
                $sessionData = file_get_contents($sessionFile);
                $unserializedData = $this->unserializeSession($sessionData);
                
                if (isset($unserializedData['selected_folder'])) {
                    $selection = $unserializedData['selected_folder'];
                    
                    // Vérifier que le fichier existe encore
                    if (isset($selection['access_file_path']) && 
                        file_exists($selection['access_file_path'])) {
                        
                        $selectionTime = strtotime($selection['selected_at'] ?? $selection['uploaded_at'] ?? '0');
                        
                        if ($selectionTime > $latestTime) {
                            $latestTime = $selectionTime;
                            $latestSelection = $selection;
                        }
                    }
                }
            } catch (Exception $e) {
                continue;
            }
        }
        
        return $latestSelection;
    }


    private function unserializeSession($sessionData): array
    {
        $payload = unserialize(base64_decode($sessionData));
        
        if (!is_array($payload)) {
            return [];
        }
        
        return $payload['data'] ?? [];
    }

    private function needsSync($filePath): bool
    {
        if (!file_exists($filePath)) {
            return false;
        }

        $currentModified = filemtime($filePath);
        $currentSize = filesize($filePath);

        $lastSync = DB::table('sync_status')
            ->where('file_path', $filePath)
            ->first();

        if (!$lastSync) {
            return true; 
        }

        return ($lastSync->last_modified != $currentModified || 
                ($lastSync->file_size ?? 0) != $currentSize);
    }

    /**
     * Synchronise le fichier Access
     */
    private function syncAccessFile($folderInfo): void
    {
        $filePath = $folderInfo['access_file_path'];
        $accessData = $this->readAccessDatabase($filePath);
        
        if (empty($accessData)) {
            return;
        }
        $fileHash = md5($filePath . '_' . filemtime($filePath) . '_' . $folderInfo['folder_name']);
        $this->updatePostgreSQL($accessData, $fileHash, $folderInfo);
        
        // Mise à jour du statut
        $this->updateSyncStatus($filePath, $fileHash, $folderInfo);
        
        Log::info('Auto sync completed', [
            'folder' => $folderInfo['folder_name'],
            'records' => array_sum(array_map('count', $accessData))
        ]);
    }

    /**
     * Lecture des données Access
     */
    private function readAccessDatabase($filePath): array
    {
        try {
            $dsn = "odbc:DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=" . $filePath . ";";
            $pdo = new PDO($dsn);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            $data = [];
            $tables = ['Article', 'Mouvementstock', 'Ticket', 'TicketLigne'];
            
            foreach ($tables as $table) {
                if ($this->tableExists($pdo, $table)) {
                    $stmt = $pdo->query("SELECT * FROM {$table}");
                    $data[$table] = $stmt->fetchAll(PDO::FETCH_ASSOC);
                }
            }
            
            return $data;
            
        } catch (\PDOException $e) {
            Log::error("Access read error: " . $e->getMessage());
            return [];
        }
    }

    private function tableExists(PDO $pdo, $tableName): bool
    {
        try {
            $pdo->query("SELECT COUNT(*) FROM {$tableName}");
            return true;
        } catch (\PDOException $e) {
            return false;
        }
    }

    private function updatePostgreSQL($accessData, $fileHash, $folderInfo): void
    {
        DB::beginTransaction();
        
        try {
            foreach ($accessData as $tableName => $records) {
                if (empty($records)) continue;
              
                DB::table(strtolower($tableName))
                    ->where('source_file_hash', $fileHash)
                    ->delete();
                
                foreach ($records as &$record) {
                    $record['source_file_hash'] = $fileHash;
                    $record['source_folder'] = $folderInfo['folder_name'];
                    $record['sync_date'] = now();
                    $record['quarter'] = $folderInfo['quarter'] ?? null;
                    $record['year'] = $folderInfo['year'] ?? null;
                }
                
                // Insertion par batch
                $chunks = array_chunk($records, 1000);
                foreach ($chunks as $chunk) {
                    DB::table(strtolower($tableName))->insert($chunk);
                }
            }
            
            DB::commit();
            
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Mise à jour du statut de sync
     */
    private function updateSyncStatus($filePath, $fileHash, $folderInfo): void
    {
        DB::table('sync_status')->updateOrInsert(
            ['file_path' => $filePath],
            [
                'last_modified' => filemtime($filePath),
                'file_size' => filesize($filePath),
                'file_hash' => $fileHash,
                'folder_name' => $folderInfo['folder_name'],
                'last_sync' => now(),
                'sync_count' => DB::raw('COALESCE(sync_count, 0) + 1')
            ]
        );
    }
}