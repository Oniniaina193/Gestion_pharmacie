const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class DirectAccessService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Tester la connexion directe Access
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseURL}/direct-access/test-connection`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erreur test connexion:', error);
      return {
        success: false,
        message: `Erreur réseau: ${error.message}`
      };
    }
  }

  /**
   * Rechercher des articles avec accès direct
   */
  async searchArticles(params = {}) {
    try {
      const {
        search = '',
        family = '',
        page = 1,
        limit = 20
      } = params;

      const queryParams = new URLSearchParams();
      
      if (search.trim()) {
        queryParams.append('search', search.trim());
      }
      
      if (family) {
        queryParams.append('family', family);
      }
      
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());

      const response = await fetch(`${this.baseURL}/direct-access/search?${queryParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erreur recherche articles:', error);
      return {
        success: false,
        message: `Erreur réseau: ${error.message}`
      };
    }
  }

  /**
   * Récupérer les familles disponibles
   */
  async getFamilies() {
    try {
      const response = await fetch(`${this.baseURL}/direct-access/families`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erreur familles:', error);
      return {
        success: false,
        message: `Erreur réseau: ${error.message}`,
        data: []
      };
    }
  }

  async getTableStructure() {
    try {
      const response = await fetch(`${this.baseURL}/direct-access/table-structure`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erreur structure table:', error);
      return {
        success: false,
        message: `Erreur réseau: ${error.message}`
      };
    }
  }
}

// Service de gestion des dossiers
class FolderService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Sélectionner un dossier 
   */
  async selectFolder(folderPath, folderName) {
    try {
      const response = await fetch(`${this.baseURL}/folder-selection/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify({
          folder_path: folderPath,
          folder_name: folderName,
          access_method: 'direct_only' 
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur dans selectFolder:', error);
      throw error;
    }
  }

  /**
   * Récupérer la sélection actuelle
   */
  async getCurrentSelection() {
    try {
      const response = await fetch(`${this.baseURL}/folder-selection/current`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return data.data;
      }
      
      return null;
    } catch (error) {
      console.error('Erreur getCurrentSelection:', error);
      return null;
    }
  }

  /**
   * Réinitialiser la sélection
   */
  async resetSelection() {
    try {
      const response = await fetch(`${this.baseURL}/folder-selection/reset`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur resetSelection:', error);
      throw error;
    }
  }

  /**
   * Sélection de dossier 
   */
  async selectFolderDirectOnly() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;
      input.multiple = true;
      
      input.onchange = async (event) => {
        const files = Array.from(event.target.files);
        
        if (files.length === 0) {
          reject(new Error('Aucun fichier sélectionné'));
          return;
        }

        try {
          const firstFile = files[0];
          const pathParts = firstFile.webkitRelativePath.split('/');
          const folderName = pathParts[0];
          
          // Vérifier la présence du fichier Caiss.mdb
          const caissFile = files.find(file => 
            file.name.toLowerCase() === 'caiss.mdb'
          );

          if (!caissFile) {
            reject(new Error('Le fichier Caiss.mdb est requis.'));
            return;
          }

          // Construire le chemin du dossier
          let folderFullPath = '';
          if (firstFile.path) {
            folderFullPath = firstFile.path.replace(/[\\\/][^\\\/]*$/, '');
          } else {
            folderFullPath = `Dossier: ${folderName}`;
          }
          const directResult = await this.selectFolder(folderFullPath, folderName);
          
          if (directResult.success) {
            resolve({
              success: true,
              method: 'direct_access',
              data: directResult.data,
              message: 'Accès direct réussi'
            });
          } else {
            reject(new Error(directResult.message || 'Accès direct impossible'));
          }

        } catch (error) {
          reject(error);
        }
      };

      input.oncancel = () => {
        reject(new Error('Sélection annulée'));
      };
      
      input.click();
    });
  }
}

// Instances des services
const directAccessService = new DirectAccessService();
const folderService = new FolderService();

export default directAccessService;

// Exports nommés
export { 
  DirectAccessService, 
  FolderService, 
  directAccessService, 
  folderService 
};