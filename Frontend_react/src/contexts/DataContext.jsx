// contexts/DataContext.js - VERSION ÉTENDUE AVEC ORDONNANCES ET STATISTIQUES
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import directAccessService from '../services/directAccessService';
import medicamentService from '../services/medicamentService';
import medecinService from '../services/medecinService';
import ordonnanceService from '../services/OrdonnanceService';
import statistiquesService from '../services/StatistiquesService';
import eventBus, { EVENTS } from '../utils/EventBus';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData doit être utilisé dans un DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  
  const [articles, setArticles] = useState([]);
  const [families, setFamilies] = useState([]);
  const [medicaments, setMedicaments] = useState([]);
  const [medecins, setMedecins] = useState([]);
  const [ordonnances, setOrdonnances] = useState([]);
  const [statistiques, setStatistiques] = useState({
    dashboard: null,
    ventes: null,
    topMedicaments: null
  });
  
  const [loading, setLoading] = useState({
    articles: false,
    families: false,
    medicaments: false,
    medecins: false,
    ordonnances: false,
    statistiques: false,
    initial: false 
  });

  const [errors, setErrors] = useState({});
  
  const [cache, setCache] = useState({
    articlesSearches: new Map(),
    ordonnancesSearches: new Map(),
    statistiquesCache: null,
    statistiquesTimestamp: 0,
    lastSearch: '',
    lastFamily: ''
  });

  // Références pour éviter les appels multiples simultanés
  const searchAbortControllerRef = useRef(null);
  const ordonnanceAbortControllerRef = useRef(null);
  const statistiquesAbortControllerRef = useRef(null);
  const lastSearchRef = useRef('');
  const lastOrdonnanceSearchRef = useRef('');
  
  // Flag pour éviter les chargements multiples
  const isLoadingRef = useRef({
    families: false,
    medicaments: false,
    medecins: false,
    ordonnances: false,
    statistiques: false
  });

  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  
  useEffect(() => {
    const handleOrdonnanceCreated = (data) => {
      console.log('Ordonnance créée, ajout local:', data);
      setOrdonnances(prev => [data, ...prev]);
      
      // Invalider le cache des statistiques
      setCache(prev => ({
        ...prev,
        statistiquesCache: null,
        statistiquesTimestamp: 0
      }));
    };

    const handleOrdonnanceUpdated = ({ id, data }) => {
      console.log('Ordonnance mise à jour:', id, data);
      setOrdonnances(prev => prev.map(ord => 
        ord.id === id ? { ...ord, ...data } : ord
      ));
    };

    const handleOrdonnanceDeleted = ({ id }) => {
      console.log('Ordonnance supprimée:', id);
      setOrdonnances(prev => prev.filter(ord => ord.id !== id));
      
      // Invalider le cache des statistiques
      setCache(prev => ({
        ...prev,
        statistiquesCache: null,
        statistiquesTimestamp: 0
      }));
    };

    const handleStatsRefreshNeeded = (data) => {
      console.log('Refresh des statistiques demandé depuis:', data.source);
      if (cache.statistiquesCache) {
        loadStatistiquesLazy(true);
      }
    };

    // Enregistrer les listeners
    eventBus.on(EVENTS.ORDONNANCE_CREATED, handleOrdonnanceCreated);
    eventBus.on(EVENTS.ORDONNANCE_UPDATED, handleOrdonnanceUpdated);
    eventBus.on(EVENTS.ORDONNANCE_DELETED, handleOrdonnanceDeleted);
    eventBus.on(EVENTS.STATS_REFRESH_NEEDED, handleStatsRefreshNeeded);

    // Nettoyage à la destruction
    return () => {
      eventBus.off(EVENTS.ORDONNANCE_CREATED, handleOrdonnanceCreated);
      eventBus.off(EVENTS.ORDONNANCE_UPDATED, handleOrdonnanceUpdated);
      eventBus.off(EVENTS.ORDONNANCE_DELETED, handleOrdonnanceDeleted);
      eventBus.off(EVENTS.STATS_REFRESH_NEEDED, handleStatsRefreshNeeded);
    };
  }, [cache.statistiquesCache]);
  
  const loadEssentialDataAfterFolder = useCallback(async () => {
    console.log('Chargement essentiel après sélection dossier...');
    
    setLoading(prev => ({ ...prev, initial: true }));
    setInitialDataLoaded(false);
    
    try {
      const families = await loadFamilies();
      console.log('Chargement de la première page d\'articles...');
      const initialArticles = await searchArticles('', '', 1, 20);
      
      setTimeout(() => {
        loadMedicamentsLazy(50);
      }, 500);
      
      setTimeout(() => {
        loadMedecinsLazy(30);
      }, 1000);

      setTimeout(() => {
        loadOrdonnancesLazy(20);
      }, 1500);
      
      setTimeout(() => {
        loadStatistiquesLazy();
      }, 2000);
      
      setInitialDataLoaded(true);
      
      console.log('Chargement essentiel terminé avec articles:', initialArticles?.articles?.length || 0);
      return { 
        success: true, 
        families, 
        initialArticles: initialArticles?.articles || [],
        pagination: initialArticles?.pagination || {}
      };
      
    } catch (error) {
      console.error('Erreur chargement essentiel:', error);
      setErrors(prev => ({ ...prev, essential: error.message }));
      return { success: false, error: error.message };
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
    }
  }, []);

  // Charger les familles 
  const loadFamilies = useCallback(async () => {
    if (families.length > 0) return families;
    if (isLoadingRef.current.families) return [];
    
    isLoadingRef.current.families = true;
    setLoading(prev => ({ ...prev, families: true }));
    
    try {
      const result = await directAccessService.getFamilies();
      
      if (result.success) {
        setFamilies(result.data);
        setErrors(prev => ({ ...prev, families: null }));
        console.log('Familles chargées:', result.data.length);
        return result.data;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, families: error.message }));
      return [];
    } finally {
      setLoading(prev => ({ ...prev, families: false }));
      isLoadingRef.current.families = false;
    }
  }, [families.length]);

  // Chargement  des médicaments 
  const loadMedicamentsLazy = useCallback(async (limit = 50) => {
    if (medicaments.length > 0) return medicaments; 
    if (isLoadingRef.current.medicaments) return []; 
    
    isLoadingRef.current.medicaments = true;
    setLoading(prev => ({ ...prev, medicaments: true }));
    
    try {
      const result = await medicamentService.getMedicaments({ 
        per_page: limit 
      });
      
      if (result.success) {
        setMedicaments(result.data.medicaments);
        setErrors(prev => ({ ...prev, medicaments: null }));
        console.log('Médicaments chargés (lazy):', result.data.medicaments.length);
        return result.data.medicaments;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, medicaments: error.message }));
      return [];
    } finally {
      setLoading(prev => ({ ...prev, medicaments: false }));
      isLoadingRef.current.medicaments = false;
    }
  }, [medicaments.length]);

  // Chargement lazy des médecins 
  const loadMedecinsLazy = useCallback(async (limit = 30) => {
    if (medecins.length > 0) return medecins; 
    if (isLoadingRef.current.medecins) return [];
    
    isLoadingRef.current.medecins = true;
    setLoading(prev => ({ ...prev, medecins: true }));
    
    try {
      const result = await medecinService.getMedecins({ 
        per_page: limit
      });
      
      if (result.success) {
        setMedecins(result.data.medecins);
        setErrors(prev => ({ ...prev, medecins: null }));
        console.log('Médecins chargés (lazy):', result.data.medecins.length);
        return result.data.medecins;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, medecins: error.message }));
      return [];
    } finally {
      setLoading(prev => ({ ...prev, medecins: false }));
      isLoadingRef.current.medecins = false;
    }
  }, [medecins.length]);
  
  const loadOrdonnancesLazy = useCallback(async (limit = 20, params = {}) => {
    if (isLoadingRef.current.ordonnances) return ordonnances;
    
    isLoadingRef.current.ordonnances = true;
    setLoading(prev => ({ ...prev, ordonnances: true }));
    
    try {
      const result = await ordonnanceService.getOrdonnances({
        per_page: limit,
        page: 1,
        ...params
      });
      
      if (result.success) {
        const newOrdonnances = result.data.ordonnances || [];
        setOrdonnances(newOrdonnances);
        setErrors(prev => ({ ...prev, ordonnances: null }));
        console.log('Ordonnances chargées (lazy):', newOrdonnances.length);
        return newOrdonnances;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erreur chargement ordonnances lazy:', error);
      setErrors(prev => ({ ...prev, ordonnances: error.message }));
      return [];
    } finally {
      setLoading(prev => ({ ...prev, ordonnances: false }));
      isLoadingRef.current.ordonnances = false;
    }
  }, [ordonnances]);
  
  const loadStatistiquesLazy = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    const cacheMaxAge = 5 * 60 * 1000; 
    
    // Utiliser le cache 
    if (!forceRefresh && 
        cache.statistiquesCache && 
        (now - cache.statistiquesTimestamp) < cacheMaxAge) {
      console.log('Statistiques depuis le cache');
      setStatistiques(cache.statistiquesCache);
      return cache.statistiquesCache;
    }
    
    if (isLoadingRef.current.statistiques && !forceRefresh) return statistiques;
    
    isLoadingRef.current.statistiques = true;
    setLoading(prev => ({ ...prev, statistiques: true }));
    
    // Annuler la requête précédente si elle existe
    if (statistiquesAbortControllerRef.current) {
      statistiquesAbortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    statistiquesAbortControllerRef.current = abortController;
    
    try {
      const result = await statistiquesService.getAllStatistiques();
      
      if (abortController.signal.aborted) {
        return statistiques;
      }
      
      const newStats = {
        dashboard: result.dashboard,
        ventes: result.ventes,
        topMedicaments: result.topMedicaments
      };
      
      setStatistiques(newStats);
      setErrors(prev => ({ ...prev, statistiques: null }));
      
      // Mettre en cache
      setCache(prev => ({
        ...prev,
        statistiquesCache: newStats,
        statistiquesTimestamp: now
      }));
      
      console.log('Statistiques chargées:', {
        dashboard: !!result.dashboard,
        ventes: !!result.ventes,
        topMedicaments: !!result.topMedicaments,
        errors: result.errors?.length || 0
      });
      
      return newStats;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Chargement statistiques annulé');
        return statistiques;
      }
      
      console.error('Erreur chargement statistiques:', error);
      setErrors(prev => ({ ...prev, statistiques: error.message }));
      return statistiques;
    } finally {
      setLoading(prev => ({ ...prev, statistiques: false }));
      isLoadingRef.current.statistiques = false;
      if (statistiquesAbortControllerRef.current === abortController) {
        statistiquesAbortControllerRef.current = null;
      }
    }
  }, [cache.statistiquesCache, cache.statistiquesTimestamp, statistiques]);

  // Chargement complet à la demande
  const loadFullMedicaments = useCallback(async () => {
    return loadMedicamentsLazy(1000);
  }, [loadMedicamentsLazy]);

  const loadFullMedecins = useCallback(async () => {
    return loadMedecinsLazy(1000); 
  }, [loadMedecinsLazy]);

  const loadFullOrdonnances = useCallback(async (params = {}) => {
    return loadOrdonnancesLazy(1000, params);
  }, [loadOrdonnancesLazy]);


  const searchArticles = useCallback(async (searchTerm = '', selectedFamily = '', page = 1, limit = 20) => {
    const trimmedTerm = searchTerm.trim();
    const cacheKey = `${trimmedTerm.toLowerCase()}-${selectedFamily}-${page}-${limit}`;
    
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    
    if (cache.articlesSearches.has(cacheKey)) {
      const cachedResult = cache.articlesSearches.get(cacheKey);
      console.log('Résultat instantané du cache:', cacheKey);
      return cachedResult;
    }

    // Éviter les doublons
    if (lastSearchRef.current === cacheKey) {
      return { articles: [], pagination: {} };
    }
    lastSearchRef.current = cacheKey;

    setLoading(prev => ({ ...prev, articles: true }));
    
    const abortController = new AbortController();
    searchAbortControllerRef.current = abortController;
    
    try {
      const result = await directAccessService.searchArticles({
        search: trimmedTerm,
        family: selectedFamily,
        page,
        limit
      });

      if (abortController.signal.aborted) {
        return { articles: [], pagination: {} };
      }

      if (result.success) {
        const searchResult = {
          articles: result.data.articles || [],
          pagination: result.data.pagination || {},
          timestamp: Date.now()
        };

        // Mise en cache optimisée
        setCache(prev => {
          const newSearches = new Map(prev.articlesSearches);
          
          if (newSearches.size >= 100) {
            const entries = Array.from(newSearches.entries())
              .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            for (let i = 0; i < 20; i++) {
              newSearches.delete(entries[i][0]);
            }
          }
          
          newSearches.set(cacheKey, searchResult);
          
          return {
            ...prev,
            articlesSearches: newSearches
          };
        });
        
        setErrors(prev => ({ ...prev, articles: null }));
        console.log('Mise en cache:', cacheKey, `(${result.data.articles?.length || 0} résultats)`);
        
        return searchResult;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Recherche annulée:', cacheKey);
        return { articles: [], pagination: {} };
      }
      
      setErrors(prev => ({ ...prev, articles: error.message }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, articles: false }));
      if (searchAbortControllerRef.current === abortController) {
        searchAbortControllerRef.current = null;
      }
      lastSearchRef.current = '';
    }
  }, [cache.articlesSearches]);
  
  const searchOrdonnances = useCallback(async (params = {}, page = 1, limit = 20) => {
    const {
      search = '',
      medecin_id = '',
      client_id = '',
      date_debut = '',
      date_fin = ''
    } = params;
    
    const cacheKey = `${search.toLowerCase()}-${medecin_id}-${client_id}-${date_debut}-${date_fin}-${page}-${limit}`;
    
    if (ordonnanceAbortControllerRef.current) {
      ordonnanceAbortControllerRef.current.abort();
    }
    
    // Vérifier le cache
    if (cache.ordonnancesSearches.has(cacheKey)) {
      const cachedResult = cache.ordonnancesSearches.get(cacheKey);
      console.log('Ordonnances depuis le cache:', cacheKey);
      return cachedResult;
    }

    // Éviter les doublons
    if (lastOrdonnanceSearchRef.current === cacheKey) {
      return { ordonnances: [], pagination: {} };
    }
    lastOrdonnanceSearchRef.current = cacheKey;

    setLoading(prev => ({ ...prev, ordonnances: true }));
    
    const abortController = new AbortController();
    ordonnanceAbortControllerRef.current = abortController;
    
    try {
      const result = await ordonnanceService.getOrdonnances({
        search: search.trim(),
        medecin_id,
        client_id,
        date_debut,
        date_fin,
        page,
        per_page: limit
      });

      if (abortController.signal.aborted) {
        return { ordonnances: [], pagination: {} };
      }

      if (result.success) {
        const searchResult = {
          ordonnances: result.data.ordonnances || [],
          pagination: result.data.pagination || {},
          timestamp: Date.now()
        };

        // Mise en cache optimisée
        setCache(prev => {
          const newSearches = new Map(prev.ordonnancesSearches);
          
          if (newSearches.size >= 50) {
            const entries = Array.from(newSearches.entries())
              .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            for (let i = 0; i < 10; i++) {
              newSearches.delete(entries[i][0]);
            }
          }
          
          newSearches.set(cacheKey, searchResult);
          
          return {
            ...prev,
            ordonnancesSearches: newSearches
          };
        });
        
        setErrors(prev => ({ ...prev, ordonnances: null }));
        console.log('Ordonnances mises en cache:', cacheKey, `(${result.data.ordonnances?.length || 0} résultats)`);
        
        return searchResult;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Recherche ordonnances annulée:', cacheKey);
        return { ordonnances: [], pagination: {} };
      }
      
      setErrors(prev => ({ ...prev, ordonnances: error.message }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, ordonnances: false }));
      if (ordonnanceAbortControllerRef.current === abortController) {
        ordonnanceAbortControllerRef.current = null;
      }
      lastOrdonnanceSearchRef.current = '';
    }
  }, [cache.ordonnancesSearches]);

  useEffect(() => {
    const cacheCleanInterval = setInterval(() => {
      cleanOldCache();
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(cacheCleanInterval);
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
      }
      if (ordonnanceAbortControllerRef.current) {
        ordonnanceAbortControllerRef.current.abort();
      }
      if (statistiquesAbortControllerRef.current) {
        statistiquesAbortControllerRef.current.abort();
      }
    };
  }, []);

  const cleanOldCache = useCallback(() => {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; 
    const maxAgeOrdonnances = 15 * 60 * 1000; 
    const maxAgeStats = 5 * 60 * 1000; 

    setCache(prev => {
      const newArticlesSearches = new Map();
      const newOrdonnancesSearches = new Map();
      
      // Nettoyer le cache des articles
      for (const [key, value] of prev.articlesSearches) {
        if (now - value.timestamp < maxAge) {
          newArticlesSearches.set(key, value);
        }
      }
      
      // Nettoyer le cache des ordonnances
      for (const [key, value] of prev.ordonnancesSearches) {
        if (now - value.timestamp < maxAgeOrdonnances) {
          newOrdonnancesSearches.set(key, value);
        }
      }
      
      // Nettoyer le cache des statistiques
      let newStatsCache = prev.statistiquesCache;
      let newStatsTimestamp = prev.statistiquesTimestamp;
      
      if (prev.statistiquesCache && (now - prev.statistiquesTimestamp) > maxAgeStats) {
        newStatsCache = null;
        newStatsTimestamp = 0;
      }
      
      const totalCleaned = (prev.articlesSearches.size - newArticlesSearches.size) + 
                          (prev.ordonnancesSearches.size - newOrdonnancesSearches.size) +
                          (prev.statistiquesCache && !newStatsCache ? 1 : 0);
      
      if (totalCleaned > 0) {
        console.log('Cache nettoyé:', totalCleaned, 'entrées supprimées');
      }
      
      return {
        ...prev,
        articlesSearches: newArticlesSearches,
        ordonnancesSearches: newOrdonnancesSearches,
        statistiquesCache: newStatsCache,
        statistiquesTimestamp: newStatsTimestamp
      };
    });
  }, []);

  const clearCache = useCallback(() => {
    setCache({
      articlesSearches: new Map(),
      ordonnancesSearches: new Map(),
      statistiquesCache: null,
      statistiquesTimestamp: 0,
      lastSearch: '',
      lastFamily: ''
    });
    console.log('Cache vidé');
  }, []);

  const addMedicament = async (medicamentData) => {
    try {
      const result = await medicamentService.createMedicament(medicamentData);
      
      if (result.success) {
        const newMedicament = {
          id: result.data.id || Date.now(),
          nom: medicamentData.nom,
          famille: medicamentData.famille
        };
        
        setMedicaments(prev => [newMedicament, ...prev]);
        
        if (!families.includes(medicamentData.famille)) {
          setFamilies(prev => [...prev, medicamentData.famille]);
        }
        
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erreur ajout médicament:', error);
      throw error;
    }
  };

  const updateMedicament = async (id, medicamentData) => {
    try {
      const result = await medicamentService.updateMedicament(id, medicamentData);
      
      if (result.success) {
        setMedicaments(prev => prev.map(med => 
          med.id === id 
            ? { ...med, nom: medicamentData.nom, famille: medicamentData.famille }
            : med
        ));
        
        if (!families.includes(medicamentData.famille)) {
          setFamilies(prev => [...prev, medicamentData.famille]);
        }
        
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erreur modification médicament:', error);
      throw error;
    }
  };

  const deleteMedicament = async (id) => {
    try {
      const result = await medicamentService.deleteMedicament(id);
      
      if (result.success) {
        setMedicaments(prev => prev.filter(med => med.id !== id));
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erreur suppression médicament:', error);
      throw error;
    }
  };

  const addMedecin = async (medecinData) => {
    try {
      const result = await medecinService.createMedecin(medecinData);
      
      if (result.success) {
        const newMedecin = {
          id: result.data.id || Date.now(),
          ...medecinData
        };
        
        setMedecins(prev => [newMedecin, ...prev]);
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erreur ajout médecin:', error);
      throw error;
    }
  };

  const updateMedecin = async (id, medecinData) => {
    try {
      const result = await medecinService.updateMedecin(id, medecinData);
      
      if (result.success) {
        setMedecins(prev => prev.map(med => 
          med.id === id ? { ...med, ...medecinData } : med
        ));
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erreur modification médecin:', error);
      throw error;
    }
  };

  const deleteMedecin = async (id) => {
    try {
      const result = await medecinService.deleteMedecin(id);
      
      if (result.success) {
        setMedecins(prev => prev.filter(med => med.id !== id));
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erreur suppression médecin:', error);
      throw error;
    }
  };

  const addOrdonnance = async (ordonnanceData) => {
    try {
      const result = await ordonnanceService.createOrdonnance(ordonnanceData);
      
      if (result.success) {
        setCache(prev => ({
          ...prev,
          ordonnancesSearches: new Map()
        }));
        
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erreur ajout ordonnance:', error);
      throw error;
    }
  };

  const updateOrdonnance = async (id, ordonnanceData) => {
    try {
      const result = await ordonnanceService.updateOrdonnance(id, ordonnanceData);
      
      if (result.success) {
        
        setCache(prev => ({
          ...prev,
          ordonnancesSearches: new Map()
        }));
        
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erreur modification ordonnance:', error);
      throw error;
    }
  };

  const deleteOrdonnance = async (id) => {
    try {
      const result = await ordonnanceService.deleteOrdonnance(id);
      
      if (result.success) {
        setCache(prev => ({
          ...prev,
          ordonnancesSearches: new Map()
        }));
        
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erreur suppression ordonnance:', error);
      throw error;
    }
  };

  const getSuggestionsMedicaments = useCallback(async (forceRefresh = false) => {
  try {
    return await ordonnanceService.getSuggestionsMedicaments(forceRefresh);
  } catch (error) {
    console.error('Erreur getSuggestionsMedicaments:', error);
    return { success: false, data: [], message: error.message };
  }
}, []);


  const refreshStatistiques = useCallback(async (force = false) => {
    return await loadStatistiquesLazy(force);
  }, [loadStatistiquesLazy]);

  const getStatistiquesFormatees = useCallback(() => {
    if (!statistiques.dashboard || !statistiques.ventes || !statistiques.topMedicaments) {
      return null;
    }

    return {
      cartes: statistiquesService.formatDashboardCards(statistiques.dashboard),
      graphiqueVentes: statistiquesService.formatVentesForChart(statistiques.ventes),
      graphiqueTop: statistiquesService.formatTopMedicamentsForChart(statistiques.topMedicaments)
    };
  }, [statistiques]);

  const searchMedicamentsRapide = useCallback(async (query, limit = 10) => {
    try {
      return await ordonnanceService.searchMedicamentsRapide(query, limit);
    } catch (error) {
      console.error('Erreur recherche médicaments rapide:', error);
      return { success: false, data: [], message: error.message };
    }
  }, []);

  const getHistoriqueParMedicament = useCallback(async (params = {}) => {
    try {
      return await ordonnanceService.getHistoriqueParMedicament(params);
    } catch (error) {
      console.error('Erreur historique par médicament:', error);
      throw error;
    }
  }, []);

  const getHistoriqueParMedicamentLibre = useCallback(async (params = {}) => {
    try {
      return await ordonnanceService.getHistoriqueParMedicamentLibre(params);
    } catch (error) {
      console.error('Erreur historique par médicament libre:', error);
      throw error;
    }
  }, []);

  const printOrdonnance = useCallback(async (ordonnanceId) => {
    try {
      return await ordonnanceService.printOrdonnance(ordonnanceId);
    } catch (error) {
      console.error('Erreur impression ordonnance:', error);
      throw error;
    }
  }, []);

  const downloadPdfOrdonnance = useCallback(async (ordonnanceId, numeroOrdonnance) => {
    try {
      return await ordonnanceService.downloadPdfOrdonnance(ordonnanceId, numeroOrdonnance);
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error);
      throw error;
    }
  }, []);

  const exportHistoriqueList = useCallback(async (params = {}) => {
    try {
      return await ordonnanceService.exportHistoriqueList(params);
    } catch (error) {
      console.error('Erreur export historique:', error);
      throw error;
    }
  }, []);

  const printHistoriqueList = useCallback(async (params = {}) => {
    try {
      return await ordonnanceService.printHistoriqueList(params);
    } catch (error) {
      console.error('Erreur impression historique:', error);
      throw error;
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    clearCache();
    
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    if (ordonnanceAbortControllerRef.current) {
      ordonnanceAbortControllerRef.current.abort();
    }
    if (statistiquesAbortControllerRef.current) {
      statistiquesAbortControllerRef.current.abort();
    }
    
    isLoadingRef.current = {
      families: false,
      medicaments: false,
      medecins: false,
      ordonnances: false,
      statistiques: false
    };
    
    setFamilies([]);
    setMedicaments([]);
    setMedecins([]);
    setOrdonnances([]);
    setStatistiques({
      dashboard: null,
      ventes: null,
      topMedicaments: null
    });
    setInitialDataLoaded(false);
    
    await loadEssentialDataAfterFolder();
  }, [clearCache, loadEssentialDataAfterFolder]);

//Récupération des données
const getOrdonnance = useCallback(async (id) => {
  try {
    return await ordonnanceService.getOrdonnance(id);
  } catch (error) {
    console.error('Erreur getOrdonnance:', error);
    throw error;
  }
}, []);

const getMedecinsForSelection = useCallback(async () => {
  try {
    return await ordonnanceService.getMedecinsForSelection();
  } catch (error) {
    console.error('Erreur getMedecinsForSelection:', error);
    throw error;
  }
}, []);

const suggestNumeroOrdonnance = useCallback(async () => {
  try {
    return await ordonnanceService.suggestNumeroOrdonnance();
  } catch (error) {
    console.error('Erreur suggestNumeroOrdonnance:', error);
    throw error;
  }
}, []);

const checkNumeroUnique = useCallback(async (numero) => {
  try {
    return await ordonnanceService.checkNumeroUnique(numero);
  } catch (error) {
    console.error('Erreur checkNumeroUnique:', error);
    throw error;
  }
}, []);

const getMedicamentsAvecOrdonnances = useCallback(async () => {
  try {
    return await ordonnanceService.getMedicamentsAvecOrdonnances();
  } catch (error) {
    console.error('Erreur getMedicamentsAvecOrdonnances:', error);
    throw error;
  }
}, []);

const getStatistiquesDossier = useCallback(async () => {
  try {
    return await ordonnanceService.getStatistiquesDossier();
  } catch (error) {
    console.error('Erreur getStatistiquesDossier:', error);
    throw error;
  }
}, []);

//recherche de tickets
const searchTickets = useCallback(async (query, limit = 10) => {
  try {
    return await ordonnanceService.searchTickets(query, limit);
  } catch (error) {
    console.error('Erreur searchTickets:', error);
    throw error;
  }
}, []);

const getTicketDetails = useCallback(async (codeTicket) => {
  try {
    return await ordonnanceService.getTicketDetails(codeTicket);
  } catch (error) {
    console.error('Erreur getTicketDetails:', error);
    throw error;
  }
}, []);

const formatOrdonnanceForSubmit = useCallback((formData, medicaments, clientExistant = null) => {
  return ordonnanceService.formatOrdonnanceForSubmit(formData, medicaments, clientExistant);
}, []);

const formatOrdonnanceForUpdate = useCallback((formData, medicaments) => {
  return ordonnanceService.formatOrdonnanceForUpdate(formData, medicaments);
}, []);

const validateOrdonnanceData = useCallback((ordonnanceData, isUpdate = false) => {
  return ordonnanceService.validateOrdonnanceData(ordonnanceData, isUpdate);
}, []);

// ==================== IMPRESSION AVANCÉE ====================

const printOrdonnanceDirectly = useCallback(async (ordonnanceId) => {
  try {
    return await ordonnanceService.printOrdonnanceDirectly(ordonnanceId);
  } catch (error) {
    console.error('Erreur printOrdonnanceDirectly:', error);
    throw error;
  }
}, []);

const printHistoriqueListDirect = useCallback(async (params = {}) => {
  try {
    return await ordonnanceService.printHistoriqueListDirect(params);
  } catch (error) {
    console.error('Erreur printHistoriqueListDirect:', error);
    throw error;
  }
}, []);

const checkPrinterAvailability = useCallback(async () => {
  try {
    return await ordonnanceService.checkPrinterAvailability();
  } catch (error) {
    console.error('Erreur checkPrinterAvailability:', error);
    throw error;
  }
}, []);

//Gestion des dossiers
const debugCurrentDossier = useCallback(async () => {
  try {
    return await ordonnanceService.debugCurrentDossier();
  } catch (error) {
    console.error('Erreur debugCurrentDossier:', error);
    throw error;
  }
}, []);

const syncCurrentDossier = useCallback(async () => {
  try {
    return await ordonnanceService.syncCurrentDossier();
  } catch (error) {
    console.error('Erreur syncCurrentDossier:', error);
    throw error;
  }
}, []);

const syncCurrentDossierSmart = useCallback(async () => {
  try {
    return await ordonnanceService.syncCurrentDossierSmart();
  } catch (error) {
    console.error('Erreur syncCurrentDossierSmart:', error);
    throw error;
  }
}, []);

const invalidateDossierCache = useCallback(() => {
  ordonnanceService.invalidateDossierCache();
}, []);

const invalidateSuggestionsCache = useCallback(() => {
  ordonnanceService.invalidateSuggestionsCache();
}, []);

const verifyDossierConfiguration = useCallback(async () => {
  try {
    return await ordonnanceService.verifyDossierConfiguration();
  } catch (error) {
    console.error('Erreur verifyDossierConfiguration:', error);
    throw error;
  }
}, []);

  const contextValue = {
    // Données
    articles,
    families,
    medicaments,
    medecins,
    ordonnances,
    statistiques,
    
    // États
    loading,
    errors,
    initialDataLoaded,

    getSuggestionsMedicaments,
    loadEssentialDataAfterFolder,
    
    // Recherche
    searchArticles,
    searchOrdonnances,
    
    // CRUD médicaments
    addMedicament,
    updateMedicament,
    deleteMedicament,
    
    // CRUD médecins
    addMedecin,
    updateMedecin,
    deleteMedecin,
    
    // CRUD ordonnances
    addOrdonnance,
    updateOrdonnance,
    deleteOrdonnance,
    
    // Statistiques
    refreshStatistiques,
    getStatistiquesFormatees,
    
    // Utilitaires ordonnances/historique
    searchMedicamentsRapide,
    getHistoriqueParMedicament,
    getHistoriqueParMedicamentLibre,
    printOrdonnance,
    downloadPdfOrdonnance,
    exportHistoriqueList,
    printHistoriqueList,
    
    // Utilitaires
    loadFamilies,
    loadMedicamentsLazy,
    loadMedecinsLazy,
    loadOrdonnancesLazy,
    loadStatistiquesLazy,
    loadFullMedicaments,
    loadFullMedecins,
    loadFullOrdonnances,
    clearCache,
    refreshAllData,

     // Récupération de données
  getOrdonnance,
  getMedecinsForSelection,
  suggestNumeroOrdonnance,
  checkNumeroUnique,
  getMedicamentsAvecOrdonnances,
  getStatistiquesDossier,
  
  // Recherche de tickets
  searchTickets,
  getTicketDetails,
  
  // Utilitaires de formatage
  formatOrdonnanceForSubmit,
  formatOrdonnanceForUpdate,
  validateOrdonnanceData,
  
  // Impression avancée
  printOrdonnanceDirectly,
  printHistoriqueListDirect,
  checkPrinterAvailability,
  
  // Gestion du dossier
  debugCurrentDossier,
  syncCurrentDossier,
  syncCurrentDossierSmart,
  invalidateDossierCache,
  invalidateSuggestionsCache,
  verifyDossierConfiguration,
    
    // Cache stats
    cacheSize: cache.articlesSearches.size + cache.ordonnancesSearches.size,
    getCacheStats: () => ({
      articles: {
        size: cache.articlesSearches.size,
        entries: Array.from(cache.articlesSearches.keys()),
      },
      ordonnances: {
        size: cache.ordonnancesSearches.size,
        entries: Array.from(cache.ordonnancesSearches.keys()),
      },
      statistiques: {
        cached: !!cache.statistiquesCache,
        timestamp: cache.statistiquesTimestamp ? new Date(cache.statistiquesTimestamp) : null,
        age: cache.statistiquesTimestamp ? Date.now() - cache.statistiquesTimestamp : null
      }
    })
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};