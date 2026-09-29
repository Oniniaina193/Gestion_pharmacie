import React, { useState, useMemo, useEffect } from 'react';
import { Search, Loader, AlertCircle, CheckCircle, X, Edit2, Save, XCircle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

// Composant de notification Windows (remplace les anciens messages error/success)
const WindowsNotification = ({ type, title, message, onClose, isVisible }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const getNotificationStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-white',
          border: 'border-l-4 border-l-green-500',
          icon: <CheckCircle className="w-6 h-6 text-green-500" />,
          titleColor: 'text-green-800',
          messageColor: 'text-green-600'
        };
      case 'error':
        return {
          bg: 'bg-white',
          border: 'border-l-4 border-l-red-500',
          icon: <AlertCircle className="w-6 h-6 text-red-500" />,
          titleColor: 'text-red-800',
          messageColor: 'text-red-600'
        };
      default:
        return {
          bg: 'bg-white',
          border: 'border-l-4 border-l-blue-500',
          icon: <AlertCircle className="w-6 h-6 text-blue-500" />,
          titleColor: 'text-blue-800',
          messageColor: 'text-blue-600'
        };
    }
  };

  const styles = getNotificationStyles();

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-full duration-300">
      <div className={`${styles.bg} ${styles.border} rounded-lg shadow-2xl border border-gray-200 min-w-80 max-w-md`}>
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {styles.icon}
            </div>
            <div className="ml-3 flex-1">
              <h3 className={`text-sm font-semibold ${styles.titleColor}`}>
                {title}
              </h3>
              <p className={`mt-1 text-sm ${styles.messageColor}`}>
                {message}
              </p>
            </div>
            <div className="flex-shrink-0 ml-2">
              <button
                onClick={onClose}
                className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="h-1 bg-gray-200 rounded-b-lg overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

const Medicaments = () => {
  // États du formulaire
  const [nouveauMedicament, setNouveauMedicament] = useState({
    nom: '',
    famille: ''
  });

  // États de modification en ligne
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({
    nom: '',
    famille: ''
  });

  // États de recherche et filtres locaux
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // ✅ REMPLACÉ: Les anciens error/success par une notification Windows
  const [notification, setNotification] = useState({
    isVisible: false,
    type: '',
    title: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // ✅ GARDÉ: Utiliser le DataContext optimisé avec chargement lazy
  const {
    medicaments,
    families,
    loading,
    addMedicament,
    updateMedicament,
    deleteMedicament,
    loadMedicamentsLazy,
    loadFullMedicaments
  } = useData();

  // ✅ GARDÉ: Chargement automatique des médicaments si pas encore chargés
  useEffect(() => {
    if (medicaments.length === 0 && !loading.medicaments) {
      console.log('🚀 Chargement automatique des médicaments...');
      loadMedicamentsLazy(50);
    }
  }, [medicaments.length, loading.medicaments, loadMedicamentsLazy]);

  // ✅ NOUVEAU: Fonctions pour les notifications Windows
  const showNotification = (type, title, message) => {
    setNotification({
      isVisible: true,
      type,
      title,
      message
    });
  };

  const closeNotification = () => {
    setNotification(prev => ({
      ...prev,
      isVisible: false
    }));
  };

  // ✅ GARDÉ: Fonction pour charger plus de médicaments si nécessaire
  const handleLoadMore = () => {
    console.log('📦 Chargement complet des médicaments...');
    loadFullMedicaments();
  };

  // Filtrage et pagination côté client (ultra-rapide)
  const filteredMedicaments = useMemo(() => {
    return medicaments.filter(med => {
      const matchSearch = !searchTerm.trim() || 
        med.nom?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchFamily = !selectedFamily || 
        med.famille === selectedFamily;
      return matchSearch && matchFamily;
    });
  }, [medicaments, searchTerm, selectedFamily]);

  // Pagination côté client
  const paginatedMedicaments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredMedicaments.slice(startIndex, endIndex);
  }, [filteredMedicaments, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredMedicaments.length / itemsPerPage);

  // Gérer les changements du formulaire
  const handleInputChange = (field, value) => {
    setNouveauMedicament(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // ✅ MODIFIÉ: Ajouter un médicament - Remplacer setError/setSuccess par showNotification
  const handleAjouter = async () => {
    if (!nouveauMedicament.nom.trim() || !nouveauMedicament.famille.trim()) {
      showNotification('error', 'Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setSubmitting(true);

    try {
      await addMedicament({
        nom: nouveauMedicament.nom.trim(),
        famille: nouveauMedicament.famille.trim()
      });

      setNouveauMedicament({ nom: '', famille: '' });
      showNotification('success', 'Succès', 'Médicament ajouté avec succès !');
    } catch (error) {
      showNotification('error', 'Erreur', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Commencer la modification
  const handleStartEdit = (medicament) => {
    setEditingId(medicament.id);
    setEditingData({
      nom: medicament.nom || '',
      famille: medicament.famille || ''
    });
  };

  // Annuler la modification
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData({ nom: '', famille: '' });
  };

  // Gérer les changements dans le formulaire d'édition
  const handleEditChange = (field, value) => {
    setEditingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // ✅ MODIFIÉ: Sauvegarder la modification - Remplacer setError/setSuccess par showNotification
  const handleSaveEdit = async (id) => {
    if (!editingData.nom.trim() || !editingData.famille.trim()) {
      showNotification('error', 'Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      await updateMedicament(id, {
        nom: editingData.nom.trim(),
        famille: editingData.famille.trim()
      });

      showNotification('success', 'Succès', 'Médicament modifié avec succès !');
      setEditingId(null);
      setEditingData({ nom: '', famille: '' });
    } catch (error) {
      showNotification('error', 'Erreur', error.message);
    }
  };

  // ✅ GARDÉ: Supprimer un médicament - Garder le confirm() + remplacer setSuccess/setError par showNotification
  const handleSupprimer = async (medicament) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${medicament.nom}" ?`)) {
      return;
    }

    try {
      await deleteMedicament(medicament.id);
      showNotification('success', 'Succès', 'Médicament supprimé avec succès !');
    } catch (error) {
      showNotification('error', 'Erreur', error.message);
    }
  };

  // Changer de page
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Reset des filtres
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFamilyChange = (value) => {
    setSelectedFamily(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-bold text-gray-900 mb-0 font-serif">Gestion des Médicaments</h2>

      {/* ✅ REMPLACÉ: Les anciennes div error/success par WindowsNotification */}
      <WindowsNotification
        type={notification.type}
        title={notification.title}
        message={notification.message}
        isVisible={notification.isVisible}
        onClose={closeNotification}
      />

      {/* ✅ GARDÉ: Bouton pour charger plus de médicaments si nécessaire */}
      {medicaments.length > 0 && medicaments.length % 50 === 0 && !loading.medicaments && (
        <div className="text-center bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700 mb-2">
            {medicaments.length} médicaments chargés. Il pourrait y en avoir plus.
          </p>
          <button
            onClick={handleLoadMore}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm"
          >
            Charger tous les médicaments
          </button>
        </div>
      )}

      {/* Formulaire d'ajout */}
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={nouveauMedicament.nom}
            onChange={(e) => handleInputChange('nom', e.target.value)}
            placeholder="Nom du médicament"
            disabled={submitting}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          />
        </div>
        
        <div className="flex-1">
          <input
            type="text"
            value={nouveauMedicament.famille}
            onChange={(e) => handleInputChange('famille', e.target.value)}
            placeholder="Famille médicament"
            disabled={submitting}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            list="families-list"
          />
          <datalist id="families-list">
            {families.map((famille, index) => (
              <option key={index} value={famille} />
            ))}
          </datalist>
        </div>
        
        <button
          onClick={handleAjouter}
          disabled={submitting || !nouveauMedicament.nom.trim() || !nouveauMedicament.famille.trim()}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center"
        >
          {submitting ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Ajout...
            </>
          ) : (
            'Ajouter'
          )}
        </button>
      </div>

      {/* Filtres de recherche */}
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher par nom..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Tableau des médicaments */}
      <div className="bg-white shadow rounded-lg border border-black overflow-hidden">
        {loading.medicaments ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600">Chargement des médicaments...</span>
          </div>
        ) : (
          <>
            <table className="min-w-full border border-black">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-black">
                    Nom du médicament
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-black">
                    Famille
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-black">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {paginatedMedicaments.map((med) => (
                  <tr key={med.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-2 py-1 text-sm border border-black text-center">
                      {editingId === med.id ? (
                        <input
                          type="text"
                          value={editingData.nom}
                          onChange={(e) => handleEditChange('nom', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <span className="font-medium text-gray-900">{med.nom || 'Nom non renseigné'}</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-sm border border-black text-center">
                      {editingId === med.id ? (
                        <input
                          type="text"
                          value={editingData.famille}
                          onChange={(e) => handleEditChange('famille', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          list="families-list-edit"
                        />
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {med.famille || 'Non renseigné'}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-sm border border-black">
                      {editingId === med.id ? (
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleSaveEdit(med.id)}
                            className="text-green-600 hover:text-green-800 flex items-center"
                            title="Sauvegarder"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-gray-600 hover:text-gray-800 flex items-center"
                            title="Annuler"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleStartEdit(med)}
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSupprimer(med)}
                            className="text-red-600 hover:text-red-800"
                            title="Supprimer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Datalist pour l'édition */}
            <datalist id="families-list-edit">
              {families.map((famille, index) => (
                <option key={index} value={famille} />
              ))}
            </datalist>
            
            {filteredMedicaments.length === 0 && !loading.medicaments && (
              <div className="text-center py-8 border-t border-black">
                <p className="text-gray-500">
                  {searchTerm || selectedFamily ? 'Aucun médicament trouvé avec ces critères' : 'Aucun médicament enregistré'}
                </p>
                {medicaments.length === 0 && (
                  <button
                    onClick={() => loadFullMedicaments()}
                    className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    Recharger les médicaments
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Pagination côté client - Ultra rapide */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 border-t-2 border-black">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, filteredMedicaments.length)} sur {filteredMedicaments.length} résultats
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                <span className="px-3 py-1 text-sm">
                  Page {currentPage} sur {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Medicaments;