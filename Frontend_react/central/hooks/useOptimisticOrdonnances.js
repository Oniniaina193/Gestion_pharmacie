import { useState, useCallback, useRef } from 'react';
import { useOptimizedNotifications } from '../utils/OptimizedNotifications';
import ordonnanceService from '../services/OrdonnanceService';
import eventBus, { EVENTS } from '../utils/EventBus';

export const useOptimisticOrdonnances = (initialOrdonnances = []) => {
  const [ordonnances, setOrdonnances] = useState(initialOrdonnances);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Notifications optimisées
  const notifications = useOptimizedNotifications();
  
  // Référence pour les rollbacks
  const rollbackRef = useRef(new Map());

  const createOrdonnanceOptimistic = useCallback(async (ordonnanceData) => {
    const tempId = `temp_${Date.now()}`;
    const tempOrdonnance = {
      id: tempId,
      ...ordonnanceData,
      // Données calculées 
      total_medicaments: ordonnanceData.medicaments?.length || 0,
      medecin: ordonnanceData.medecin_id ? { 
        nom_complet: 'Chargement...',
        ONM: '...'
      } : null,
      client: ordonnanceData.client || {
        nom_complet: ordonnanceData.client_nom_complet || 'Nouveau client'
      },
      // Marquer comme temporaire
      _isOptimistic: true,
      _isLoading: true
    };
    setOrdonnances(prev => [tempOrdonnance, ...prev]);
    notifications.showInfo('Création en cours...', { duration: 1500 });

    try {
      // Appel API réel
      const response = await ordonnanceService.createOrdonnance(ordonnanceData);
      
      if (response.success) {
        // Remplacer l'ordonnance temporaire par la vraie
        setOrdonnances(prev => prev.map(ord => 
          ord.id === tempId ? {
            ...response.data,
            _isOptimistic: false,
            _isLoading: false
          } : ord
        ));
        
        // Notification de succès
        notifications.showSuccess(`Ordonnance ${response.data.numero_ordonnance} créée avec succès`);
        
        // Émettre événement pour synchronisation
        eventBus.emit(EVENTS.ORDONNANCE_CREATED, response.data);
        
        return { success: true, data: response.data };
      }
    } catch (error) {
      // ROLLBACK : Supprimer l'ordonnance temporaire
      setOrdonnances(prev => prev.filter(ord => ord.id !== tempId));
      
      // Notification d'erreur
      notifications.showError(`Erreur lors de la création: ${error.message}`);
      
      throw error;
    }
  }, [notifications]);

  // 2. MODIFICATION OPTIMISTE
  const updateOrdonnanceOptimistic = useCallback(async (id, ordonnanceData) => {
    // Sauvegarder l'état actuel pour rollback
    const currentOrdonnance = ordonnances.find(ord => ord.id === id);
    if (currentOrdonnance) {
      rollbackRef.current.set(id, currentOrdonnance);
    }

    setOrdonnances(prev => prev.map(ord => 
      ord.id === id ? {
        ...ord,
        ...ordonnanceData,
        total_medicaments: ordonnanceData.medicaments?.length || ord.total_medicaments,
        _isOptimistic: true,
        _isLoading: true
      } : ord
    ));

    notifications.showInfo('Modification en cours...', { duration: 1500 });

    try {
      const response = await ordonnanceService.updateOrdonnance(id, ordonnanceData);
      
      if (response.success) {
        // Confirmer la mise à jour
        setOrdonnances(prev => prev.map(ord => 
          ord.id === id ? {
            ...response.data,
            _isOptimistic: false,
            _isLoading: false
          } : ord
        ));
        
        notifications.showSuccess(`Ordonnance ${response.data.numero_ordonnance} modifiée avec succès`);
        eventBus.emit(EVENTS.ORDONNANCE_UPDATED, { id, data: response.data });
        
        // Nettoyer le rollback
        rollbackRef.current.delete(id);
        
        return { success: true, data: response.data };
      }
    } catch (error) {
      // ROLLBACK
      const originalOrdonnance = rollbackRef.current.get(id);
      if (originalOrdonnance) {
        setOrdonnances(prev => prev.map(ord => 
          ord.id === id ? originalOrdonnance : ord
        ));
        rollbackRef.current.delete(id);
      }
      
      notifications.showError(`Erreur lors de la modification: ${error.message}`);
      throw error;
    }
  }, [ordonnances, notifications]);

  const deleteOrdonnanceOptimistic = useCallback(async (id) => {
    const ordonnanceToDelete = ordonnances.find(ord => ord.id === id);
    if (!ordonnanceToDelete) return;

    rollbackRef.current.set(id, ordonnanceToDelete);

    setOrdonnances(prev => prev.filter(ord => ord.id !== id));
    notifications.showInfo('Suppression en cours...', { duration: 1500 });

    try {
      const response = await ordonnanceService.deleteOrdonnance(id);
      
      if (response.success) {
        notifications.showSuccess(`Ordonnance ${ordonnanceToDelete.numero_ordonnance} supprimée avec succès`);
        eventBus.emit(EVENTS.ORDONNANCE_DELETED, { id, deletedData: ordonnanceToDelete });
        
        // Nettoyer le rollback
        rollbackRef.current.delete(id);
        
        return { success: true };
      }
    } catch (error) {
      // ROLLBACK : Restaurer l'ordonnance
      const originalOrdonnance = rollbackRef.current.get(id);
      if (originalOrdonnance) {
        setOrdonnances(prev => [...prev, originalOrdonnance].sort((a, b) => 
          new Date(b.date) - new Date(a.date)
        ));
        rollbackRef.current.delete(id);
      }
      
      notifications.showError(`Erreur lors de la suppression: ${error.message}`);
      throw error;
    }
  }, [ordonnances, notifications]);

  const refreshOrdonnances = useCallback(async (params = {}, force = false) => {
  
    if (!force && ordonnances.length > 0) {
      return { success: true, data: ordonnances };
    }

    setLoading(true);
    setError('');

    try {
      const response = await ordonnanceService.getOrdonnances(params);
      
      if (response.success) {
        // Fusionner avec les ordonnances optimistes en cours
        const realOrdonnances = response.data.ordonnances;
        const optimisticOrdonnances = ordonnances.filter(ord => ord._isOptimistic);
        const combinedOrdonnances = [...optimisticOrdonnances, ...realOrdonnances];
        
        setOrdonnances(combinedOrdonnances);
        return response;
      }
    } catch (error) {
      setError('Erreur lors du chargement des ordonnances');
      notifications.showError('Erreur lors du chargement des ordonnances');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [ordonnances, notifications]);

  const syncInBackground = useCallback(async () => {
    try {
      // Rechargement silencieux
      const response = await ordonnanceService.getOrdonnances({ per_page: 50 });
      
      if (response.success) {
        setOrdonnances(prev => {
          const optimisticOrdonnances = prev.filter(ord => ord._isOptimistic);
          const realOrdonnances = response.data.ordonnances;
          
          return [...optimisticOrdonnances, ...realOrdonnances];
        });
      }
    } catch (error) {
      console.warn('Échec de la synchronisation en arrière-plan:', error);
    }
  }, []);

  return {
    ordonnances,
    loading,
    error,
    setError,
    createOrdonnanceOptimistic,
    updateOrdonnanceOptimistic,
    deleteOrdonnanceOptimistic,
    refreshOrdonnances,
    syncInBackground,
    // État des actions optimistes
    hasOptimisticActions: ordonnances.some(ord => ord._isOptimistic),
    optimisticCount: ordonnances.filter(ord => ord._isOptimistic).length
  };
};