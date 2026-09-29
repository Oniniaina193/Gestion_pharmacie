const getApiUrl = () => {
  try {
    if (import.meta.env && import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    } else {
      return 'http://localhost:8000/api';
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'URL:', error);
    return 'http://localhost:8000/api';
  }
};

const API_BASE_URL = getApiUrl();

class ClientService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/clients`;
    this.tokenKey = 'pharmacy_token';
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  getToken() {
    return sessionStorage.getItem(this.tokenKey);
  }

  getHeaders() {
    const token = this.getToken();
    return {
      ...this.headers,
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  async getClients(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      if (params.page) queryParams.append('page', params.page);
      if (params.per_page) queryParams.append('per_page', params.per_page);

      const url = `${this.baseURL}${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, { 
        method: 'GET', 
        headers: this.getHeaders() 
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la récupération des clients');
      
      return data;
    } catch (error) {
      console.error('Erreur getClients:', error);
      throw error;
    }
  }

  async createClient(clientData) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(clientData),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la création du client');
      
      return data;
    } catch (error) {
      console.error('Erreur createClient:', error);
      throw error;
    }
  }

  async updateClient(id, clientData) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(clientData),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la modification du client');
      
      return data;
    } catch (error) {
      console.error('Erreur updateClient:', error);
      throw error;
    }
  }

  async deleteClient(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la suppression du client');
      
      return data;
    } catch (error) {
      console.error('Erreur deleteClient:', error);
      throw error;
    }
  }

  async getClient(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la récupération du client');
      
      return data;
    } catch (error) {
      console.error('Erreur getClient:', error);
      throw error;
    }
  }

  async getAllClients() {
    try {
        // Utilise this.baseURL au lieu d'une URL hardcodée
        const response = await fetch(`${this.baseURL}/all`, {
            method: 'GET',
            headers: this.getHeaders(), // Utilise la méthode existante pour les headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erreur getAllClients:', error);
        throw error;
    }
}
  // Recherche rapide pour autocomplete
  async searchClients(query, limit = 10) {
    try {
      if (!query || query.trim().length < 2) {
        return { success: true, data: [] };
      }

      const response = await fetch(`${this.baseURL}/search/q?q=${encodeURIComponent(query)}&limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la recherche');
      
      return data;
    } catch (error) {
      console.error('Erreur searchClients:', error);
      throw error;
    }
  }
}

const clientService = new ClientService();

export default clientService;
export { ClientService };