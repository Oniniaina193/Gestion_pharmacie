const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class DataRefreshService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/data-refresh`;
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // État du refresh
    this.isRefreshing = false;
    this.lastRefreshTime = null;
    this.refreshCallbacks = [];
  }

  async refreshAllData() {
    if (this.isRefreshing) {
      console.log('⚠️ Refresh déjà en cours, ignoré');
      return { success: false, message: 'Mise à jour déjà en cours' };
    }

    try {
      this.isRefreshing = true;
      console.log('🔄 Début du refresh complet des données...');
      
      // Notifier le début du refresh
      this.notifyCallbacks('start', null);

      const response = await fetch(`${this.baseURL}/refresh`, {
        method: 'POST',
        headers: this.headers,
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la mise à jour');
      }

      this.lastRefreshTime = new Date();
      console.log('✅ Refresh complet terminé:', result);
      
      // Notifier le succès
      this.notifyCallbacks('success', result);

      return result;

    } catch (error) {
      console.error('❌ Erreur lors du refresh:', error);
      
      // Notifier l'erreur
      this.notifyCallbacks('error', error);
      
      return {
        success: false,
        message: error.message
      };

    } finally {
      this.isRefreshing = false;
    }
  }

  
  async quickRefresh() {
    try {
      console.log('⚡ Refresh rapide en cours...');

      const response = await fetch(`${this.baseURL}/quick-refresh`, {
        method: 'POST',
        headers: this.headers,
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors du refresh rapide');
      }

      console.log('⚡ Refresh rapide terminé');
      return result;

    } catch (error) {
      console.error('❌ Erreur refresh rapide:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

 //Verification status connexion 
  async getConnectionStatus() {
    try {
      const response = await fetch(`${this.baseURL}/status`, {
        method: 'GET',
        headers: this.headers,
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la vérification');
      }

      return result;

    } catch (error) {
      console.error('❌ Erreur vérification statut:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  onRefresh(callback) {
    this.refreshCallbacks.push(callback);
    
    // Retourner une fonction pour supprimer le callback
    return () => {
      const index = this.refreshCallbacks.indexOf(callback);
      if (index > -1) {
        this.refreshCallbacks.splice(index, 1);
      }
    };
  }

  notifyCallbacks(event, data) {
    this.refreshCallbacks.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Erreur dans callback refresh:', error);
      }
    });
  }

  getRefreshState() {
    return {
      isRefreshing: this.isRefreshing,
      lastRefreshTime: this.lastRefreshTime,
      lastRefreshTimeFormatted: this.lastRefreshTime 
        ? this.lastRefreshTime.toLocaleTimeString() 
        : null
    };
  }

  async refreshWithRetry(maxRetries = 3, delay = 1000) {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        attempt++;
        console.log(`🔄 Tentative de refresh ${attempt}/${maxRetries}`);
        
        const result = await this.refreshAllData();
        
        if (result.success) {
          return result;
        } else if (attempt < maxRetries) {
          console.log(`⏳ Nouvelle tentative dans ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; 
        }
        
      } catch (error) {
        console.error(`❌ Échec tentative ${attempt}:`, error);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        }
      }
    }
    
    return {
      success: false,
      message: `Échec après ${maxRetries} tentatives`
    };
  }

  startPeriodicRefresh(intervalMinutes = 5) {
    if (this.periodicRefreshInterval) {
      clearInterval(this.periodicRefreshInterval);
    }

    this.periodicRefreshInterval = setInterval(async () => {
      console.log('🕐 Refresh automatique périodique');
      await this.quickRefresh();
    }, intervalMinutes * 60 * 1000);

    console.log(`🕐 Refresh périodique démarré (${intervalMinutes} minutes)`);
    
    return () => this.stopPeriodicRefresh();
  }

  stopPeriodicRefresh() {
    if (this.periodicRefreshInterval) {
      clearInterval(this.periodicRefreshInterval);
      this.periodicRefreshInterval = null;
      console.log('🛑 Refresh périodique arrêté');
    }
  }

  cleanup() {
    this.stopPeriodicRefresh();
    this.refreshCallbacks = [];
    console.log('🧹 DataRefreshService nettoyé');
  }
}

// Instance singleton
const dataRefreshService = new DataRefreshService();

export default dataRefreshService;
export { DataRefreshService };