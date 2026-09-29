import React, { useState } from 'react';
import { FolderOpen, CheckCircle, Database, Calendar, AlertCircle, Loader } from 'lucide-react';

const FolderSelectionApp = ({ onContinue, loadingProgress }) => {
  const [selectedFolder, setSelectedFolder] = useState('');
  const [isSelected, setIsSelected] = useState(false);
  const [folderPath, setFolderPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [folderInfo, setFolderInfo] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  React.useEffect(() => {
    checkExistingSelection();
  }, []);

  // Vérification lde la sélection éxistante
  const checkExistingSelection = async () => {
    setDebugInfo('Vérification de la sélection existante...');
    try {
      const response = await fetch('/api/folder-selection/current', {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSelectedFolder(data.data.folder_name);
          setFolderPath(data.data.folder_path || data.data.access_file_path);
          setFolderInfo(data.data);
          setIsSelected(true);
          setDebugInfo(`✅ Sélection trouvée: ${data.data.folder_name}`);
          
          localStorage.setItem('current_dossier_vente', data.data.folder_name);
          sessionStorage.setItem('current_dossier_vente', data.data.folder_name);
        } else {
          setDebugInfo('Aucune sélection trouvée');
          setIsSelected(false);
        }
      }
    } catch (error) {
      setDebugInfo(`Erreur réseau: ${error.message}`);
    }
  };

  const resetSelection = async () => {
    setError('');
    setIsLoading(true);
    setDebugInfo('Réinitialisation...');

    try {
      const response = await fetch('/api/folder-selection/reset', {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setSelectedFolder('');
        setFolderPath('');
        setFolderInfo(null);
        setIsSelected(false);
        setDebugInfo('Sélection réinitialisée');
        
        localStorage.removeItem('current_dossier_vente');
        sessionStorage.removeItem('current_dossier_vente');
      } else {
        setError(result.message || 'Erreur lors de la réinitialisation');
      }
    } catch (error) {
      setError('Erreur lors de la réinitialisation');
      setDebugInfo(`Erreur: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectFolderSelection = () => {
    setError('');
    setIsLoading(true);
    setDebugInfo('Sélection de dossier...');

    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;
    
    input.onchange = async (event) => {
      const files = Array.from(event.target.files);
      
      if (files.length === 0) {
        setIsLoading(false);
        setDebugInfo('Aucun fichier sélectionné');
        return;
      }

      try {
        const firstFile = files[0];
        const pathParts = firstFile.webkitRelativePath.split('/');
        const folderName = pathParts[0];
        
        // Validation des fichiers requis
        const caissFile = files.find(file => 
          file.name.toLowerCase() === 'caiss.mdb'
        );

        if (!caissFile) {
          setError('Le fichier Caiss.mdb est requis dans le dossier sélectionné.');
          setIsLoading(false);
          return;
        }

        //Vérification  des autres fichiers utiles
        const facturationFile = files.find(file => 
          file.name.toLowerCase() === 'caiss_facturation.mdb'
        );
        const frontofficeFile = files.find(file => 
          file.name.toLowerCase() === 'caiss_frontoffice.mdb'
        );

        // Construire le chemin du dossier 
        const folderFullPath = firstFile.path ? 
          firstFile.path.replace(/[\\\/][^\\\/]*$/, '') : 
          `Dossier: ${folderName}`; 

        setDebugInfo(`Tentative d'accès: ${folderName}`);

        const response = await fetch('/api/folder-selection/select', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            folder_path: folderFullPath,
            folder_name: folderName,
            access_method: 'direct_only',
            
            validation_info: {
              has_facturation: !!facturationFile,
              has_frontoffice: !!frontofficeFile,
              total_files: files.length
            }
          })
        });

        const result = await response.json();

        if (result.success) {
          setSelectedFolder(folderName);
          setFolderPath(folderFullPath);
          setFolderInfo({
            ...result.data,
            method: 'direct_access'
          });
          setIsSelected(true);
          setDebugInfo(`✅ Accès réussi!!`);
          
          //Stocker immédiatement pour cohérence
          localStorage.setItem('current_dossier_vente', folderName);
          sessionStorage.setItem('current_dossier_vente', folderName);
        } else {
          setError(`Accès direct impossible: ${result.message || 'Erreur inconnue'}`);
          setDebugInfo(`❌ Accès direct échoué: ${result.message || 'Erreur inconnue'}`);
          
          if (result.suggestion) {
            setError(error + `\n\nSuggestion: ${result.suggestion}`);
          }
        }

      } catch (error) {
        setError('Erreur lors de la sélection: ' + error.message);
        setDebugInfo(`❌ Erreur: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    input.oncancel = () => {
      setIsLoading(false);
      setDebugInfo('Sélection annulée par l\'utilisateur');
    };
    
    input.click();
  };

  // Fonction de continuation avec informations de dossier
  const handleContinue = () => {
    if (onContinue) {
      // Passer les informations complètes du dossier
      const folderInfoComplete = {
        ...folderInfo,
        folder_name: selectedFolder,
        folder_path: folderPath,
        selected_at: new Date().toISOString()
      };
      onContinue(folderInfoComplete);
    }
  };

  return (
    <div>
      <div className="w-96 h-100 bg-gray-100 rounded-xl shadow-lg flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Database className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2 font-serif">
            Gestion Pharmaceutique
          </h1>
        </div>

        {debugInfo && (
          <div className={`mb-4 p-3 border rounded-lg text-sm ${
            debugInfo.includes('✅') ? 'bg-green-50 border-green-200 text-green-700' :
            debugInfo.includes('❌') ? 'bg-red-50 border-red-200 text-red-700' :
            'bg-gray-50 border-gray-200 text-gray-700'
          }`}>
            <strong>Status:</strong> {debugInfo}
          </div>
        )}

        {!isSelected ? (
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Erreur d'accès au dossier</h3>
                    <p className="text-xs text-red-700 mt-1 whitespace-pre-line">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleDirectFolderSelection}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Accès direct en cours...</span>
                </>
              ) : (
                <>
                  <FolderOpen className="w-5 h-5" />
                  <span>Accès direct au dossier</span>
                </>
              )}
            </button>

            <div className="text-xs text-gray-500 text-center">
              Mode accès direct uniquement 
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-3">
                <div className="bg-white rounded border p-3">
                  <p className="text-xs text-gray-500 mb-1">Dossier sélectionné :</p>
                  <p className="text-sm font-mono text-gray-800 break-all">
                    {selectedFolder}
                  </p>
                </div>
              </div>
            </div>

            {/* Informations sur le processus de chargement si en cours */}
            {loadingProgress && loadingProgress.stage && loadingProgress.progress > 0 && (
              <div className="w-full">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm text-blue-800 mb-2">
                    {loadingProgress.message}
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${loadingProgress.progress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-blue-600 mt-2">
                    {loadingProgress.progress}% terminé
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={resetSelection}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Changer
              </button>
              <button
                onClick={handleContinue}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">
            Application de gestion pharmaceutique
          </p>
        </div>
      </div>
    </div>
  );
};

export default FolderSelectionApp;