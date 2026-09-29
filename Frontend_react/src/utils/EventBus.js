class EventBus {
  constructor() {
    this.events = {};
  }

  // Écouter un événement
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);

    return () => {
      this.off(eventName, callback);
    };
  }

  off(eventName, callback) {
    if (!this.events[eventName]) return;
    
    this.events[eventName] = this.events[eventName].filter(
      listener => listener !== callback
    );
  }

  // Émettre un événement
  emit(eventName, data = null) {
    console.log(`📡 Événement émis: ${eventName}`, data);
    
    if (!this.events[eventName]) return;
    
    this.events[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Erreur lors de l'exécution du callback pour ${eventName}:`, error);
      }
    });
  }

  // Nettoyer tous les événements
  clear() {
    this.events = {};
  }

  getActiveEvents() {
    const active = {};
    Object.keys(this.events).forEach(eventName => {
      active[eventName] = this.events[eventName].length;
    });
    return active;
  }
}

const eventBus = new EventBus();

export const EVENTS = {
  MEDECIN_CREATED: 'medecin:created',
  MEDECIN_UPDATED: 'medecin:updated', 
  MEDECIN_DELETED: 'medecin:deleted',
  
  ORDONNANCE_CREATED: 'ordonnance:created',
  ORDONNANCE_UPDATED: 'ordonnance:updated',
  ORDONNANCE_DELETED: 'ordonnance:deleted',

  DATA_REFRESH_STARTED: 'data:refresh_started',
  DATA_REFRESHED: 'data:refreshed',
  DATA_REFRESH_ERROR: 'data:refresh_error',
  
  STATS_REFRESH_NEEDED: 'stats:refresh_needed',
  STATS_REFRESHED: 'stats:refreshed',
  
  DOSSIER_CHANGED: 'dossier:changed',
  
  DATA_CHANGED: 'data:changed'
};

export default eventBus;