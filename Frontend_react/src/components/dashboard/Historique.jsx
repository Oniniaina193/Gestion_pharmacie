import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Eye, 
  Printer, 
  Calendar,
  FileText,
  X,
  Filter,
  Clock,
  FolderOpen,
  Download,
  RefreshCw
} from 'lucide-react';

import { useData } from '../../contexts/DataContext';
import MedicamentAutocomplete from './MedicamentAutocomplete';
import { 
  PrintNotification, 
  usePrintNotifications 
} from '../../utils/PrinterUtils';
import eventBus, { EVENTS } from '../../utils/EventBus';

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Composant Modal details
const ModalDetailsHistorique = ({ selectedOrdonnance, onClose, onPrint, onDownload }) => {
  if (!selectedOrdonnance) return null;

  return (
    <div className="absolute inset-0 flex items-start justify-start mt-2 ml-10 z-20">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-lg relative">
        
        {/* Contenu de l'ordonnance */}
        <div className="p-6">
          <div className="flex items-center justify-center relative mb-6">
            <button
              onClick={onClose}
              className="absolute left-0 text-gray-500 hover:text-gray-700 transition-colors"
              title="Fermer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-2xl font-medium text-gray-900 text-center">
              ORDONNANCE MÉDICALE - HISTORIQUE
            </h2>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <p className="font-semibold text-gray-900 mb-2">Médecin prescripteur</p>
                <div className="text-sm flex space-x-4">
                  <div>
                    <strong>Dr. {selectedOrdonnance.medecin?.nom_complet}</strong>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span>ONM: {selectedOrdonnance.medecin?.ONM}</span>
                    <span>Adresse: {selectedOrdonnance.medecin?.adresse || 'Non renseignée'}</span>
                    <span>Téléphone: {selectedOrdonnance.medecin?.telephone || 'Non renseigné'}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="space-y-2 text-sm">
                  <p><strong>N° ordonnance:</strong> {selectedOrdonnance.numero_ordonnance}</p>
                  <p><strong>Date:</strong> {new Date(selectedOrdonnance.date).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </div>

            {/* Informations patient */}
            <div className="mb-6 text-sm space-y-1">
              <p><strong>Nom patient:</strong> {selectedOrdonnance.client?.nom_complet}</p>
              <p><strong>Adresse:</strong> {selectedOrdonnance.client?.adresse}</p>
              {selectedOrdonnance.client?.telephone && (
                <p><strong>Téléphone:</strong> {selectedOrdonnance.client.telephone}</p>
              )}
            </div>

            <div className="mb-4">
              <p className="font-semibold text-gray-900 mb-3">Médicaments prescrits</p>
              <div className="bg-white border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b">
                        Nom du médicament
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b">
                        Quantité
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b">
                        Posologie
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b">
                        Durée
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrdonnance.lignes?.map((ligne, index) => (
                      <tr key={ligne.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm border-b">
                          <strong>{ligne.designation}</strong>
                        </td>
                        <td className="px-4 py-3 text-sm text-center border-b">
                          {ligne.quantite}
                        </td>
                        <td className="px-4 py-3 text-sm border-b">
                          {ligne.posologie || 'Non renseigné'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center border-b">
                          {ligne.duree || 'Non renseigné'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="border-t bg-gray-50 px-6 py-4 rounded-b-lg">
          <div className="flex justify-between items-center">
            <div className="flex space-x-3">
              <button
                onClick={() => onPrint(selectedOrdonnance)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimer
              </button>
              <button
                onClick={() => onDownload(selectedOrdonnance)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger PDF
              </button>
            </div>
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composanat principal historique
const Historique = () => {
 
  const {
    ordonnances: contextOrdonnances,
    loading: contextLoading,
    errors: contextErrors,
    getHistoriqueParMedicament,
    getHistoriqueParMedicamentLibre,
    printOrdonnance,
    downloadPdfOrdonnance,
    exportHistoriqueList,
    printHistoriqueList,
    getSuggestionsMedicaments,
    searchMedicamentsRapide
  } = useData();

  // Etats principaux
  const [ordonnances, setOrdonnances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [medicamentAffichage, setMedicamentAffichage] = useState(''); 
  const [medicamentRecherche, setMedicamentRecherche] = useState(''); 
  
  const [moisFiltre, setMoisFiltre] = useState('');
  const [anneeFiltre, setAnneeFiltre] = useState(new Date().getFullYear().toString());
  const [medicamentsDisponibles, setMedicamentsDisponibles] = useState([]);
  const [loadingMedicaments, setLoadingMedicaments] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Etats pour modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrdonnance, setSelectedOrdonnance] = useState(null);
  const [totalOrdonnances, setTotalOrdonnances] = useState(0);
  const [currentDossier, setCurrentDossier] = useState('');

  const { 
    notification, 
    showSuccess, 
    showError, 
    showInfo, 
    hideNotification 
  } = usePrintNotifications();

  const debouncedMois = useDebounce(moisFiltre, 300);
  const debouncedAnnee = useDebounce(anneeFiltre, 300);
  
 // Fonction pour convertir mois/année en format date pour l'API - MODIFIÉE
const getDateFilterForAPI = useMemo(() => {
  // Si on a un médicament ET une année (avec ou sans mois)
  if (medicamentRecherche && anneeFiltre) {
    if (moisFiltre) {
      const moisFormate = moisFiltre.padStart(2, '0');
      return `${anneeFiltre}-${moisFormate}-01`;
    } else {
      return `${anneeFiltre}-01-01`;
    }
  }
  if (!medicamentRecherche && moisFiltre && anneeFiltre) {
    const moisFormate = moisFiltre.padStart(2, '0');
    return `${anneeFiltre}-${moisFormate}-01`;
  }
  
  return '';
}, [medicamentRecherche, moisFiltre, anneeFiltre]);

  // Fonction pour obtenir les informations du dossier actuel
  const getCurrentDossierInfo = useCallback(async () => {
    try {
      const dossier = 'Dossier Principal'; 
      setCurrentDossier(dossier);
      return dossier;
    } catch (error) {
      console.error('Erreur récupération dossier:', error);
      setError('Erreur lors de la récupération du dossier actuel');
      return 'default';
    }
  }, []);

  // Charger les suggestions de médicaments via DataContext
  const loadSuggestionsMedicaments = useCallback(async (forceRefresh = false) => {
    console.log('Début loadSuggestionsMedicaments'); 
    setLoadingSuggestions(true);
    setError('');
    
    try {
      console.log('Appel getSuggestionsMedicaments...'); 
      
      const response = await getSuggestionsMedicaments(forceRefresh);
      
      console.log('Réponse getSuggestionsMedicaments:', response); 
      
      if (response.success && response.data) {
        const suggestions = response.data.map(med => ({
          id: med.id,
          designation: med.nom || med.designation || med.name || `Médicament ${med.id}`,
          code: med.code || med.id
        }));
        
        setMedicamentsDisponibles(suggestions);
        console.log(`${suggestions.length} suggestions chargées`);
      } else {
        console.log('Pas de données dans la réponse');
        setError('Aucune suggestion trouvée');
        setMedicamentsDisponibles([]);
      }
    } catch (err) {
      console.error('Erreur chargement suggestions:', err);
      setError('Erreur lors du chargement des suggestions');
      setMedicamentsDisponibles([]);
    } finally {
      console.log('FIN loadSuggestionsMedicaments'); 
      setLoadingSuggestions(false);
    }
  }, [getSuggestionsMedicaments]);
  
  // Recherche d'historique 
const loadHistoriqueOrdonnances = useCallback(async () => {
  if (!medicamentRecherche && !getDateFilterForAPI) return;

  setLoading(true);
  setError('');
  
  try {
    const params = {
      page: currentPage,
      per_page: 10
    };

    // Ajouter le médicament si présent
    if (medicamentRecherche) {
      params.medicament_libre = medicamentRecherche;
    }

    if (getDateFilterForAPI) {
      params.date = getDateFilterForAPI;
      
      if (medicamentRecherche && anneeFiltre && !moisFiltre) {
        params.filter_type = 'year';
      } else if (moisFiltre && anneeFiltre) {
        params.filter_type = 'month';
      }
    }

    console.log(`Recherche historique - Page ${currentPage}:`, params);

    const response = await getHistoriqueParMedicamentLibre(params);
    
    if (response.success) {
      setOrdonnances(response.data.ordonnances || []);
      setTotalPages(response.data.pagination?.last_page || 1);
      setTotalOrdonnances(response.data.total_ordonnances || 0);
      
      console.log(`${response.data.ordonnances?.length || 0} ordonnances trouvées - Page ${currentPage}/${response.data.pagination?.last_page || 1}`);
      console.log(`Type de filtre appliqué: ${response.data.filter_type}`);
    } else {
      setError(response.message || 'Aucune ordonnance trouvée');
      setOrdonnances([]);
      setTotalOrdonnances(0);
    }
  } catch (err) {
    const errorMessage = err.message || 'Erreur lors du chargement de l\'historique';
    setError(errorMessage);
    setOrdonnances([]);
    setTotalOrdonnances(0);
    console.error('Erreur historique:', err);
  } finally {
    setLoading(false);
  }
}, [currentPage, medicamentRecherche, getDateFilterForAPI, anneeFiltre, moisFiltre, getHistoriqueParMedicamentLibre]);

  // Handler pour la sélection d'un médicament dans la liste
  const handleMedicamentSelect = useCallback((medicament) => {
    console.log('Médicament sélectionné dans la liste:', medicament);
    setMedicamentAffichage(medicament);
    setMedicamentRecherche(medicament); 
    setCurrentPage(1);
  }, []);
  
  // Gestionnaire de recherche 
  const handleMedicamentSearch = useCallback((medicament) => {
    if (!medicament.trim()) return;
    
    console.log('Recherche déclenchée par Entrée pour:', medicament);
    setMedicamentAffichage(medicament);
    setMedicamentRecherche(medicament); 
    setCurrentPage(1);
  }, []);

  // Handler pour les changements dans le champ 
  const handleMedicamentChange = useCallback((medicament) => {
    setMedicamentAffichage(medicament); 
    
    if (!medicament.trim()) {
      setMedicamentRecherche(''); 
      setOrdonnances([]);
      setTotalOrdonnances(0);
      setError('');
      setCurrentPage(1);
    }
  }, []);
  
  //Initialisation du composant
  useEffect(() => {
    const initializeComponent = async () => {
      console.log('Initialisation du composant Historique');
      await getCurrentDossierInfo();
      loadSuggestionsMedicaments();
    };
    
    initializeComponent();
  }, [getCurrentDossierInfo, loadSuggestionsMedicaments]);

  // Surveiller les changements de dossier 
  useEffect(() => {
    const handleDossierChange = () => {
      resetFiltres();
      getCurrentDossierInfo().then(() => {
        loadSuggestionsMedicaments(true);
      });
    };

    const handleOrdonnanceCreated = () => {
      console.log('Ordonnance créée détectée - rafraîchissement des suggestions');
      loadSuggestionsMedicaments(true);
      
      if (medicamentRecherche || getDateFilterForAPI) {
        loadHistoriqueOrdonnances();
      }
    };
    
    // Écouter les événements système
    window.addEventListener('storage', handleDossierChange);
    window.addEventListener('dossier-changed', handleDossierChange);
    eventBus.on(EVENTS.ORDONNANCE_CREATED, handleOrdonnanceCreated);
    window.addEventListener('stats-refresh-needed', handleOrdonnanceCreated);
    
    return () => {
      window.removeEventListener('storage', handleDossierChange);
      window.removeEventListener('dossier-changed', handleDossierChange);
      eventBus.off(EVENTS.ORDONNANCE_CREATED, handleOrdonnanceCreated);
      window.removeEventListener('stats-refresh-needed', handleOrdonnanceCreated);
    };
  }, [getCurrentDossierInfo, loadSuggestionsMedicaments, medicamentRecherche, getDateFilterForAPI, loadHistoriqueOrdonnances]);

  useEffect(() => {
  const shouldSearch = medicamentRecherche || getDateFilterForAPI;
  
  if (!shouldSearch) {
    setOrdonnances([]);
    setTotalOrdonnances(0);
    return;
  }

  // Déclencher la recherche
  console.log(`Recherche déclenchée - Page: ${currentPage}, Médicament: ${medicamentRecherche}, Date: ${getDateFilterForAPI}`);
  loadHistoriqueOrdonnances();
}, [medicamentRecherche, getDateFilterForAPI, currentPage, loadHistoriqueOrdonnances]);

  // réinitialiser la page lors des changements de filtres
 useEffect(() => {
  if (currentPage !== 1) {
    console.log('Réinitialisation à la page 1 suite au changement de filtre');
    setCurrentPage(1);
  }
}, [medicamentRecherche, debouncedMois, debouncedAnnee]);

  
  // Voir les détails d'une ordonnance
  const handleViewDetails = async (ordonnance) => {
    try {
      setSelectedOrdonnance(ordonnance);
      setShowDetailModal(true);
    } catch (err) {
      setError('Erreur lors du chargement: ' + err.message);
    }
  };

  const handlePrintOrdonnance = async (ordonnance) => {
    try {
      showInfo('Lancement de l\'impression...');
      const result = await printOrdonnance(ordonnance.id);
      if (result.success) {
        showSuccess('Impression lancée avec succès');
      } else {
        throw new Error(result.message || 'Erreur lors de l\'impression');
      }
    } catch (error) {
      showError(`Erreur impression: ${error.message}`);
    }
  };

  const handleDownloadOrdonnance = async (ordonnance) => {
    try {
      showInfo('Génération du PDF...');
      const result = await downloadPdfOrdonnance(ordonnance.id, ordonnance.numero_ordonnance);
      if (result.success) {
        showSuccess('PDF téléchargé avec succès');
      } else {
        throw new Error(result.message || 'Erreur lors du téléchargement');
      }
    } catch (error) {
      showError(`Erreur téléchargement: ${error.message}`);
    }
  };
  
  // Générer le titre pour les exports
  const generateExportTitle = useMemo(() => {
    const parts = ['Ordonnances'];
    
    if (medicamentRecherche) {
      const medicament = medicamentsDisponibles.find(m => m.designation === medicamentRecherche);
      parts.push(`- ${medicament ? medicament.designation : medicamentRecherche}`);
    }
    
    if (getDateFilterForAPI || (medicamentRecherche && anneeFiltre)) {
      const moisNoms = [
        '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
      ];
      
      if (moisFiltre) {
        const moisNom = moisNoms[parseInt(moisFiltre)] || moisFiltre;
        parts.push(`- ${moisNom} ${anneeFiltre}`);
      } else if (anneeFiltre) {
        parts.push(`- ${anneeFiltre}`);
      }
    }
    
    if (currentDossier && currentDossier !== 'default') {
      parts.push(`(${currentDossier})`);
    }
    
    return parts.join(' ');
  }, [medicamentRecherche, getDateFilterForAPI, anneeFiltre, moisFiltre, currentDossier, medicamentsDisponibles]);

  // Exporter la liste en PDF 
  const handleExportListPDF = async () => {
    if (ordonnances.length === 0) {
      showError('Aucune ordonnance à exporter');
      return;
    }

    setExportLoading(true);
    try {
      showInfo('Génération de l\'export PDF...');
      
      const params = {
        medicament: medicamentRecherche,
        date: getDateFilterForAPI || (medicamentRecherche && anneeFiltre ? `${anneeFiltre}-01-01` : ''),
        titre: generateExportTitle,
        format: 'pdf'
      };
      
      const result = await exportHistoriqueList(params);
      if (result.success) {
        showSuccess('Export PDF généré avec succès');
      } else {
        throw new Error(result.message || 'Erreur lors de l\'export');
      }
    } catch (error) {
      showError(`Erreur export: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  // Imprimer la liste 
  const handlePrintList = async () => {
    if (ordonnances.length === 0) {
      showError('Aucune ordonnance à imprimer');
      return;
    }

    setExportLoading(true);
    try {
      showInfo('Préparation de l\'impression...');
      
      const params = {
        medicament: medicamentRecherche,
        date: getDateFilterForAPI || (medicamentRecherche && anneeFiltre ? `${anneeFiltre}-01-01` : ''),
        titre: generateExportTitle
      };
      
      const result = await printHistoriqueList(params);
      if (result.success) {
        showSuccess('Impression lancée');
      } else {
        throw new Error(result.message || 'Erreur lors de l\'impression');
      }
    } catch (error) {
      showError(`Erreur impression: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  
  // Reset des filtres
  const resetFiltres = () => {
    setMedicamentAffichage('');
    setMedicamentRecherche('');
    setMoisFiltre('');
    setAnneeFiltre(new Date().getFullYear().toString()); 
    setCurrentPage(1);
    setOrdonnances([]);
    setTotalOrdonnances(0);
    setError('');
  };

  const refreshDossierData = async () => {
    setError('');
    setLoading(true);
    
    try {
      await getCurrentDossierInfo();
      await loadSuggestionsMedicaments(true);
      
      if (medicamentRecherche || getDateFilterForAPI) {
        setCurrentPage(1);
        await loadHistoriqueOrdonnances();
      }
    } catch (error) {
      setError('Erreur lors de la mise à jour des données');
    } finally {
      setLoading(false);
    }
  };

  // Générer le texte de résumé des résultats
  const getTexteSummary = () => {
    if (!medicamentRecherche && !getDateFilterForAPI) return null;

    const dossierText = currentDossier ? ` (Dossier: ${currentDossier})` : '';

    if (medicamentRecherche) {
      const medicament = medicamentsDisponibles.find(m => m.designation === medicamentRecherche);
      const nomMedicament = medicament ? medicament.designation : medicamentRecherche;
      
      if (moisFiltre && anneeFiltre) {
        const moisNoms = [
          '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];
        const moisNom = moisNoms[parseInt(moisFiltre)] || moisFiltre;
        return `${totalOrdonnances} ordonnance(s) pour ${nomMedicament} en ${moisNom} ${anneeFiltre}${dossierText}`;
      } else if (anneeFiltre) {
        return `${totalOrdonnances} ordonnance(s) pour ${nomMedicament} en ${anneeFiltre}${dossierText}`;
      } else {
        return `${totalOrdonnances} ordonnance(s) pour ${nomMedicament}${dossierText}`;
      }
    } else if (getDateFilterForAPI) {
      if (moisFiltre) {
        const moisNoms = [
          '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];
        const moisNom = moisNoms[parseInt(moisFiltre)] || moisFiltre;
        return `${totalOrdonnances} ordonnance(s) enregistrée(s) en ${moisNom} ${anneeFiltre}${dossierText}`;
      } else {
        return `${totalOrdonnances} ordonnance(s) enregistrée(s) en ${anneeFiltre}${dossierText}`;
      }
    }
  };

  const peutRechercher = medicamentRecherche || getDateFilterForAPI;

  // ==================== RENDU PRINCIPAL ====================
  return (
    <div className="space-y-6 relative">
      <PrintNotification
        isVisible={notification.isVisible}
        type={notification.type}
        message={notification.message}
        onClose={hideNotification}
      />

      {/* ==================== HEADER ==================== */}
      <div className="flex justify-between items-center">
        <div></div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 font-serif">Historique des Ordonnances</h2>
        </div>
        <div className="flex space-x-2 items-center">
          {/* Boutons d'export */}
          {peutRechercher && ordonnances.length > 0 && (
            <>
              <button
                onClick={handlePrintList}
                disabled={loading || exportLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium flex items-center"
                title="Imprimer Liste"
              >
                <Printer className="w-4 h-4 mr-1" />
                {exportLoading ? 'Impression...' : 'Imprimer'}
              </button>
              <button
                onClick={handleExportListPDF}
                disabled={loading || exportLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium flex items-center"
                title="Exporter PDF"
              >
                <Download className="w-4 h-4 mr-1" />
                {exportLoading ? 'Export...' : 'Export'}
              </button>
            </>
          )}
          
          {/* Bouton réinitialiser */}
          <button
            onClick={resetFiltres}
            className="text-gray-500 hover:text-gray-700 p-2 rounded transition-colors"
            title="Réinitialiser les filtres"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Bouton actualiser */}
          <button
            onClick={refreshDossierData}
            className="text-gray-500 hover:text-gray-700 p-2 rounded transition-colors"
            title="Actualiser les données"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ==================== RÉSUMÉ DES RÉSULTATS ==================== */}
      {peutRechercher && ordonnances.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm text-blue-800 font-medium">
            <strong>Résultats:</strong> {getTexteSummary()}
          </div>
        </div>
      )}

      {/* ==================== FILTRES ==================== */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          
          {/* Autocomplétion médicament */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Nom :
            </label>
            <div className="flex-1">
              <MedicamentAutocomplete
                value={medicamentAffichage}
                onChange={handleMedicamentChange}        
                onSearch={handleMedicamentSearch}        
                onSelect={handleMedicamentSelect}        
                suggestions={medicamentsDisponibles}
                loading={loadingSuggestions}
                placeholder="Saisissez le nom d'un médicament et appuyez sur Entrée..."
              />
              {loadingSuggestions && (
                <p className="text-xs text-gray-500 mt-1">Chargement des suggestions...</p>
              )}
            </div>
          </div>

          {/* Filtre par mois et année avec indication */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Période :
            </label>
            <div className="flex-1">
              <div className="flex space-x-2 mb-1">
                <select
                  value={moisFiltre}
                  onChange={(e) => {
                    setMoisFiltre(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Mois</option>
                  <option value="1">Janvier</option>
                  <option value="2">Février</option>
                  <option value="3">Mars</option>
                  <option value="4">Avril</option>
                  <option value="5">Mai</option>
                  <option value="6">Juin</option>
                  <option value="7">Juillet</option>
                  <option value="8">Août</option>
                  <option value="9">Septembre</option>
                  <option value="10">Octobre</option>
                  <option value="11">Novembre</option>
                  <option value="12">Décembre</option>
                </select>
                
                {/* Sélecteur d'année */}
                <input
                  type="number"
                  value={anneeFiltre}
                  onChange={(e) => {
                    setAnneeFiltre(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Année (ex: 2025)"
                  min="2000"
                  max="2099"
                  className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== MESSAGE D'ERREUR ==================== */}
      {(error || contextErrors.ordonnances) && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          <div className="flex justify-between items-center">
            <span>{error || contextErrors.ordonnances}</span>
            <button 
              onClick={() => setError('')}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================== CONTENU PRINCIPAL ==================== */}
      <div className={`${showDetailModal ? 'blur-sm opacity-60 pointer-events-none' : ''}`}>
        {!peutRechercher ? (
          <div className="text-center py-12">
            <Filter className="w-16 h-16 text-gray-300 mb-4 mx-auto" />
            <p className="text-gray-500">Sélectionnez un médicament et/ou une période pour voir l'historique des ordonnances</p>
            <p className="text-sm text-gray-400 mt-2">
              Pour rechercher un médicament, tapez son nom et appuyez sur <kbd className="px-1 py-0.5 bg-gray-100 border rounded text-xs">Entrée</kbd>
            </p>
          </div>
        ) : (loading || contextLoading.ordonnances) ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement de l'historique...</p>
          </div>
        ) : ordonnances.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mb-4 mx-auto" />
            <p className="text-gray-500">Aucune ordonnance trouvée avec ces critères</p>
            {medicamentRecherche && (
              <p className="text-sm text-gray-400 mt-2">
                Recherche effectuée pour : "{medicamentRecherche}"
                {anneeFiltre && (
                  <span> en {anneeFiltre}</span>
                )}
              </p>
            )}
          </div>
        ) : (
          <>
            {/* ==================== TABLEAU DES RÉSULTATS ==================== */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nom Patient
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Médecin
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nom Médicament
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date Ordonnance
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        N° Ordonnance
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ordonnances.map((ordonnance) => (
                      <tr key={ordonnance.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-sm font-medium text-gray-900">
                                {ordonnance.client?.nom_complet}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="text-sm font-medium text-gray-900">
                            Dr. {ordonnance.medecin?.nom_complet} ({ordonnance.medecin?.ONM})
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {ordonnance.medicament_principal || medicamentRecherche || 'Divers médicaments'}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">
                            {new Date(ordonnance.date).toLocaleDateString('fr-FR')}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900 font-medium">
                            {ordonnance.numero_ordonnance}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleViewDetails(ordonnance)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors text-sm font-medium flex items-center mx-auto"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Détails
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ==================== PAGINATION ==================== */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-4">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    currentPage === 1 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Précédent
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      page === currentPage 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    currentPage === totalPages 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Suivant
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ==================== MODAL DE DÉTAIL ==================== */}
      {showDetailModal && selectedOrdonnance && (
        <ModalDetailsHistorique 
          selectedOrdonnance={selectedOrdonnance}
          onClose={() => setShowDetailModal(false)}
          onPrint={handlePrintOrdonnance}
          onDownload={handleDownloadOrdonnance}
        />
      )}
    </div>
  );
};

export default Historique;