import { useEffect, useCallback } from 'react';
import eventBus, { EVENTS } from '../../src/utils/EventBus';

export const useStatisticsRefresh = (refreshCallback) => {
  const handleRefresh = useCallback((eventData) => {
    console.log('🔄 Rafraîchissement des statistiques demandé:', eventData);
    if (typeof refreshCallback === 'function') {
      refreshCallback(eventData);
    }
  }, [refreshCallback]);

  useEffect(() => {
    // Écouter tous les événements
    const unsubscribeList = [
      eventBus.on(EVENTS.MEDECIN_CREATED, handleRefresh),
      eventBus.on(EVENTS.MEDECIN_DELETED, handleRefresh),
      eventBus.on(EVENTS.ORDONNANCE_CREATED, handleRefresh),
      eventBus.on(EVENTS.ORDONNANCE_DELETED, handleRefresh),
      eventBus.on(EVENTS.STATS_REFRESH_NEEDED, handleRefresh),
      eventBus.on(EVENTS.DOSSIER_CHANGED, handleRefresh)
    ];

    console.log('👂 Composant Statistiques en écoute des événements');

    // Nettoyage lors du démontage du composant
    return () => {
      console.log('🧹 Nettoyage des listeners Statistiques');
      unsubscribeList.forEach(unsubscribe => unsubscribe());
    };
  }, [handleRefresh]);
};

// Hook pour émettre des événements de changement de données
export const useDataEvents = () => {
  const notifyMedecinCreated = useCallback((medecin) => {
    eventBus.emit(EVENTS.MEDECIN_CREATED, medecin);
  }, []);

  const notifyMedecinDeleted = useCallback((medecinId) => {
    eventBus.emit(EVENTS.MEDECIN_DELETED, { id: medecinId });
  }, []);

  const notifyOrdonnanceCreated = useCallback((ordonnance) => {
    eventBus.emit(EVENTS.ORDONNANCE_CREATED, ordonnance);
  }, []);

  const notifyOrdonnanceDeleted = useCallback((ordonnanceId) => {
    eventBus.emit(EVENTS.ORDONNANCE_DELETED, { id: ordonnanceId });
  }, []);

  const requestStatsRefresh = useCallback(() => {
    eventBus.emit(EVENTS.STATS_REFRESH_NEEDED);
  }, []);

  return {
    notifyMedecinCreated,
    notifyMedecinDeleted,
    notifyOrdonnanceCreated,
    notifyOrdonnanceDeleted,
    requestStatsRefresh
  };
};