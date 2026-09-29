const getApiUrl = () => {
  try {
    // Vite utilise import.meta.env au lieu de process.env
    if (import.meta.env && import.meta.env.VITE_API_URL) {
      console.log('✅ Variable Vite trouvée:', import.meta.env.VITE_API_URL);
      return import.meta.env.VITE_API_URL;
    } else {
      console.warn('⚠️ Variable VITE_API_URL non trouvée, utilisation du fallback');
      return 'http://localhost:8000/api';
    }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'URL:', error);
    return 'http://localhost:8000/api';
  }
};

const API_BASE_URL = getApiUrl();
console.log('🔧 API_BASE_URL configurée:', API_BASE_URL);

class AuthService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.tokenKey = 'pharmacy_token';
    this.userKey = 'pharmacy_user';
  }

  /**
   * Connexion utilisateur
   */
  async login(email, password) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      const result = await response.json();

      if (result.success) {
        // Stocker le token et les infos utilisateur
        sessionStorage.setItem(this.tokenKey, result.data.token);
        sessionStorage.setItem(this.userKey, JSON.stringify(result.data.user));
        
        return {
          success: true,
          data: result.data,
          message: result.message
        };
      } else {
        return {
          success: false,
          message: result.message || 'Erreur de connexion'
        };
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      return {
        success: false,
        message: 'Erreur de communication avec le serveur'
      };
    }
  }

  /**
   * Déconnexion utilisateur
   */
  async logout() {
    try {
      const token = this.getToken();
      
      if (token) {
        await fetch(`${this.baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          }
        });
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      this.clearStorage();
    }
  }

  /**
   * Vérifier si l'utilisateur est connecté
   */
  isAuthenticated() {
    return this.getToken() !== null;
  }

  /**
   * Récupérer le token
   */
  getToken() {
    return sessionStorage.getItem(this.tokenKey);
  }

  /**
   * Récupérer les informations utilisateur
   */
  getUser() {
    const userStr = sessionStorage.getItem(this.userKey);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Erreur parsing user data:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Nettoyer le stockage
   */
  clearStorage() {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);
  }

  /**
   * Vérifier le statut d'authentification côté serveur
   */
  async checkAuth() {
    try {
      const token = this.getToken();
      
      if (!token) {
        return { authenticated: false, user: null };
      }

      const response = await fetch(`${this.baseURL}/auth/check`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        }
      });

      const result = await response.json();

      if (result.success && result.authenticated) {
        return {
          authenticated: true,
          user: result.user
        };
      } else {
        this.clearStorage();
        return { authenticated: false, user: null };
      }
    } catch (error) {
      console.error('Erreur vérification auth:', error);
      return { authenticated: false, user: null };
    }
  }

  /**
   * Récupérer les infos complètes de l'utilisateur connecté
   */
  async getCurrentUser() {
    try {
      const token = this.getToken();
      
      if (!token) {
        return null;
      }

      const response = await fetch(`${this.baseURL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        }
      });

      const result = await response.json();

      if (result.success) {
        // Mettre à jour le cache local
        sessionStorage.setItem(this.userKey, JSON.stringify(result.data.user));
        return result.data.user;
      } else {
        this.clearStorage();
        return null;
      }
    } catch (error) {
      console.error('Erreur récupération utilisateur:', error);
      return null;
    }
  }

  /**
   * Headers pour les requêtes authentifiées
   */
  getAuthHeaders() {
    const token = this.getToken();
    return token ? {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    } : {
      'Accept': 'application/json',
    };
  }
}

// Instance unique du service
const authService = new AuthService();

export default authService;
export { AuthService };