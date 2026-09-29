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
console.log('🔧 API_BASE_URL configurée pour MedicamentService:', API_BASE_URL);

class MedicamentService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/medicaments`;
    this.tokenKey = 'pharmacy_token';
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  // Récupérer le token (aligné avec AuthService)
  getToken() {
    return sessionStorage.getItem(this.tokenKey);
  }

  // Ajouter le token d'authentification si disponible
  getHeaders() {
    const token = this.getToken();
    return {
      ...this.headers,
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  // Récupérer la liste des médicaments avec pagination et recherche
  async getMedicaments(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.search) queryParams.append('search', params.search);
      if (params.famille) queryParams.append('famille', params.famille);
      if (params.page) queryParams.append('page', params.page);
      if (params.per_page) queryParams.append('per_page', params.per_page);

      const url = `${this.baseURL}${queryParams.toString() ? `?${queryParams}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la récupération des médicaments');
      }

      return data;
    } catch (error) {
      console.error('Erreur getMedicaments:', error);
      throw error;
    }
  }

  // Créer un nouveau médicament
  async createMedicament(medicamentData) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(medicamentData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la création du médicament');
      }

      return data;
    } catch (error) {
      console.error('Erreur createMedicament:', error);
      throw error;
    }
  }

  // Modifier un médicament
  async updateMedicament(id, medicamentData) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(medicamentData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la modification du médicament');
      }

      return data;
    } catch (error) {
      console.error('Erreur updateMedicament:', error);
      throw error;
    }
  }

  // Supprimer un médicament
  async deleteMedicament(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la suppression du médicament');
      }

      return data;
    } catch (error) {
      console.error('Erreur deleteMedicament:', error);
      throw error;
    }
  }

  // Récupérer la liste des familles
  async getFamilies() {
    try {
      const response = await fetch(`${this.baseURL}/families`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la récupération des familles');
      }

      return data;
    } catch (error) {
      console.error('Erreur getFamilies:', error);
      throw error;
    }
  }

  // Recherche rapide (pour autocomplete)
  async searchMedicaments(query, limit = 10) {
    try {
      const response = await fetch(`${this.baseURL}/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la recherche');
      }

      return data;
    } catch (error) {
      console.error('Erreur searchMedicaments:', error);
      throw error;
    }
  }
}

// Instance unique du service
const medicamentService = new MedicamentService();

export default medicamentService;
export { MedicamentService };