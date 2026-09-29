import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Search, Package, Loader, AlertCircle } from 'lucide-react';
import { useAutoReload } from '../../../central/hooks/useDataRefresh';

class DirectSearchService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  }

  async searchArticles(searchTerm = '', page = 1, limit = 100) {
    const queryParams = new URLSearchParams();
    if (searchTerm.trim()) {
      queryParams.append('search', searchTerm.trim());
    }
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());

    const response = await fetch(`${this.baseURL}/direct-access/search?${queryParams}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include'
    });

    const result = await response.json();
    return result;
  }

  async checkSession() {
    try {
      const response = await fetch(`${this.baseURL}/folder-selection/current`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      });
      const data = await response.json();
      return data.success && data.data;
    } catch (error) {
      console.error('Erreur vérification session:', error);
      return false;
    }
  }
}

const Accueil = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [sessionValid, setSessionValid] = useState(null);

  // États pour les suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const suggestionDebounceRef = useRef(null);
  const searchService = useRef(new DirectSearchService());
  const [searchCache, setSearchCache] = useState(new Map());

  const handleDataRefresh = useCallback(() => {
    setSearchCache(new Map());
    setSearchResults([]);
    setHasSearched(false);
    setSearchError('');
    setSuggestions([]);
    setIsSuggestionsVisible(false);

    const checkSession = async () => {
      const isValid = await searchService.current.checkSession();
      setSessionValid(isValid);
    };
    checkSession();
  }, []);

  const { isRefreshing: globalIsRefreshing } = useAutoReload(handleDataRefresh);

  useEffect(() => {
    if (!globalIsRefreshing) {
      const checkSession = async () => {
        const isValid = await searchService.current.checkSession();
        setSessionValid(isValid);
      };
      checkSession();
    }
  }, [globalIsRefreshing]);

  // Fermer suggestions si clic en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setIsSuggestionsVisible(false);
        setActiveSuggestionIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Charger les suggestions avec debounce
  const loadSuggestions = useCallback(async (term) => {
    if (term.trim().length < 2 || sessionValid === false || globalIsRefreshing) {
      setSuggestions([]);
      setIsSuggestionsVisible(false);
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const result = await searchService.current.searchArticles(term.trim(), 1, 10);
      if (result.success && result.data?.articles?.length > 0) {
        setSuggestions(result.data.articles.slice(0, 10));
        setIsSuggestionsVisible(true);
      } else {
        setSuggestions([]);
        setIsSuggestionsVisible(false);
      }
    } catch (error) {
      setSuggestions([]);
      setIsSuggestionsVisible(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [sessionValid, globalIsRefreshing]);

  // Fonction de recherche complète (tableau)
  const performSearch = useCallback(async (term) => {
    if (globalIsRefreshing) return;
    const trimmedTerm = term.trim();
    if (!trimmedTerm) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    if (sessionValid === false) {
      setSearchError('Aucun dossier sélectionné. Veuillez d\'abord sélectionner un dossier.');
      return;
    }

    setIsSuggestionsVisible(false);
    setSuggestions([]);
    setActiveSuggestionIndex(-1);

    if (searchCache.has(trimmedTerm.toLowerCase())) {
      const cachedResult = searchCache.get(trimmedTerm.toLowerCase());
      setSearchResults(cachedResult.articles);
      setHasSearched(true);
      setSearchError('');
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      const result = await searchService.current.searchArticles(trimmedTerm, 1, 100);
      if (result.success) {
        setSearchResults(result.data.articles);
        setHasSearched(true);
        setSearchCache(prev => {
          const newCache = new Map(prev);
          if (newCache.size >= 50) {
            const firstKey = newCache.keys().next().value;
            newCache.delete(firstKey);
          }
          newCache.set(trimmedTerm.toLowerCase(), {
            articles: result.data.articles,
            timestamp: Date.now()
          });
          return newCache;
        });
      } else {
        throw new Error(result.message || 'Erreur lors de la recherche');
      }
    } catch (error) {
      setSearchError(error.message || 'Erreur lors de la recherche');
      setSearchResults([]);
      if (error.message?.includes('dossier sélectionné')) {
        setSessionValid(false);
      }
    } finally {
      setIsSearching(false);
    }
  }, [sessionValid, searchCache, globalIsRefreshing]);

  // Clic sur une suggestion → résultat direct dans le tableau
  const handleSuggestionClick = useCallback((article) => {
    setSearchTerm(article.libelle || '');
    setIsSuggestionsVisible(false);
    setSuggestions([]);
    setActiveSuggestionIndex(-1);
    // Afficher directement ce seul article dans le tableau
    setSearchResults([article]);
    setHasSearched(true);
    setSearchError('');
  }, []);

  const handleInputChange = useCallback((e) => {
    if (globalIsRefreshing) return;
    const value = e.target.value;
    setSearchTerm(value);
    setActiveSuggestionIndex(-1);

    if (!value.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      setSearchError('');
      setSuggestions([]);
      setIsSuggestionsVisible(false);
      return;
    }

    // Debounce suggestions : 250ms
    if (suggestionDebounceRef.current) clearTimeout(suggestionDebounceRef.current);
    suggestionDebounceRef.current = setTimeout(() => {
      loadSuggestions(value);
    }, 250);
  }, [globalIsRefreshing, loadSuggestions]);

  const handleKeyDown = useCallback((e) => {
    if (globalIsRefreshing) return;

    if (isSuggestionsVisible && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => Math.max(prev - 1, -1));
        return;
      }
      if (e.key === 'Escape') {
        setIsSuggestionsVisible(false);
        setActiveSuggestionIndex(-1);
        return;
      }
      if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
        e.preventDefault();
        handleSuggestionClick(suggestions[activeSuggestionIndex]);
        return;
      }
    }

    if (e.key === 'Enter' && searchTerm.trim()) {
      e.preventDefault();
      performSearch(searchTerm);
    }
  }, [searchTerm, performSearch, globalIsRefreshing, isSuggestionsVisible, suggestions, activeSuggestionIndex, handleSuggestionClick]);

  const formatPrice = useCallback((price) => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return '0,00 Ar';
    return `${numPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} Ar`;
  }, []);

  const getAvailability = useCallback((stock) => {
    const stockNum = parseInt(stock) || 0;
    if (stockNum >= 1) {
      return { text: `Disponible (${stockNum})`, className: 'bg-green-100 text-green-800' };
    } else {
      return { text: 'Non disponible', className: 'bg-red-100 text-red-800' };
    }
  }, []);

  const resultRows = useMemo(() => {
    return searchResults.map((article, index) => {
      const availability = getAvailability(article.stock);
      return (
        <tr
          key={`${article.code || 'no-code'}-${index}`}
          className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
        >
          <td className="px-4 py-3">
            <div className="text-sm font-medium text-gray-900">{article.libelle || 'Sans nom'}</div>
          </td>
          <td className="px-4 py-3">
            {article.famille ? (
              <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium text-gray-800">{article.famille}</span>
            ) : (
              <span className="text-gray-400 text-sm">Non définie</span>
            )}
          </td>
          <td className="px-4 py-3">
            <div className="text-sm font-semibold text-gray-600">{formatPrice(article.prix_ttc)}</div>
          </td>
          <td className="px-4 py-3">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${availability.className}`}>
              {availability.text}
            </span>
          </td>
        </tr>
      );
    });
  }, [searchResults, getAvailability, formatPrice]);

  // Mettre en gras la partie correspondant au terme recherché dans la suggestion
  const highlightMatch = useCallback((text, term) => {
    if (!term.trim() || !text) return text;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part)
        ? <span key={i} className="font-bold text-blue-600">{part}</span>
        : part
    );
  }, []);

  return (
    <div className="bg-white min-h-screen overflow-y-auto">
      {globalIsRefreshing && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <div className="flex items-center justify-center space-x-2 max-w-4xl mx-auto">
            <Loader className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="text-blue-700 text-sm font-medium">Mise à jour des données en cours...</span>
          </div>
        </div>
      )}

      <div className="px-6 py-8 border-b border-gray-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center font-serif">
            Recherche rapide des articles
          </h2>

          <div className="flex flex-col lg:flex-row lg:items-end lg:space-x-4 space-y-4 lg:space-y-0 max-w-4xl mx-auto">
            {/* Barre de recherche + suggestions */}
            <div className="relative flex-1 max-w-2xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0 && searchTerm.trim().length >= 2) {
                    setIsSuggestionsVisible(true);
                  }
                }}
                placeholder={
                  globalIsRefreshing ? "Mise à jour en cours..." :
                  sessionValid === false ? "Sélectionnez d'abord un dossier..." :
                  "Saisissez le nom de l'article..."
                }
                disabled={sessionValid === false || globalIsRefreshing}
                className="w-full pl-10 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-lg"
                autoComplete="off"
              />
              {(isSearching || isLoadingSuggestions || globalIsRefreshing) && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              )}

              {/* Liste des suggestions */}
              {isSuggestionsVisible && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
                >
                  {suggestions.map((article, index) => {
                    const availability = getAvailability(article.stock);
                    const isActive = index === activeSuggestionIndex;
                    return (
                      <div
                        key={`suggestion-${article.code || index}`}
                        onMouseDown={(e) => {
                          e.preventDefault(); // éviter blur avant click
                          handleSuggestionClick(article);
                        }}
                        onMouseEnter={() => setActiveSuggestionIndex(index)}
                        className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0 ${
                          isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm text-gray-800 truncate">
                              {highlightMatch(article.libelle || 'Sans nom', searchTerm)}
                            </div>
                            {article.famille && (
                              <div className="text-xs text-gray-400">{article.famille}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 flex-shrink-0 ml-3">
                          <span className="text-sm font-semibold text-gray-600">{formatPrice(article.prix_ttc)}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${availability.className}`}>
                            {availability.text}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-center">
                    Appuyez sur Entrée pour une recherche complète · ↑↓ pour naviguer · Échap pour fermer
                  </div>
                </div>
              )}
            </div>

            {searchResults.length > 0 && !isSearching && !globalIsRefreshing && (
              <div className="flex items-center space-x-3">
                <div className="text-sm font-medium text-gray-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                  {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}
                </div>
                {searchCache.has(searchTerm.trim().toLowerCase()) && (
                  <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                    Cache
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 text-center">
            {globalIsRefreshing && <p className="text-blue-600">Actualisation des données en cours...</p>}
            {!globalIsRefreshing && sessionValid === null && <p className="text-blue-600">Vérification de la session...</p>}
            {!globalIsRefreshing && sessionValid === true && searchResults.length === 0 && !hasSearched && (
              <p className="text-green-600">✓ Prêt pour la recherche</p>
            )}
            {!globalIsRefreshing && sessionValid === false && (
              <div className="text-red-600">
                <p>✗ Aucun dossier sélectionné</p>
                <a href="/folder-selection" className="mt-2 inline-block text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition-colors">
                  Sélectionner un dossier
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {searchError && !globalIsRefreshing && (
        <div className="px-6 py-4 max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Erreur de recherche</h3>
                <p className="text-sm text-red-700 mt-1">{searchError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`px-6 ${searchResults.length > 0 ? 'py-0' : 'py-2'}`}>
        <div className="max-w-6xl mx-auto">
          {(isSearching || globalIsRefreshing) && (
            <div className="flex items-center justify-center py-6">
              <Loader className="w-6 h-6 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-600">
                {globalIsRefreshing ? 'Actualisation en cours...' : 'Recherche en cours...'}
              </span>
            </div>
          )}

          {!isSearching && !globalIsRefreshing && hasSearched && searchResults.length === 0 && searchTerm && !searchError && (
            <div className="text-center py-6">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-xl mb-2">Aucun article trouvé</p>
              <p className="text-gray-400">Aucun résultat pour "{searchTerm}"</p>
            </div>
          )}

          {!hasSearched && !searchTerm && sessionValid === true && !globalIsRefreshing && (
            <div className="text-center py-6">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-xl mb-2">Recherche instantanée</p>
              <p className="text-gray-400">Saisissez le nom d'un article — des suggestions apparaîtront automatiquement</p>
            </div>
          )}

          {searchResults.length > 0 && !isSearching && !globalIsRefreshing && (
            <div className="bg-white rounded-lg overflow-hidden shadow-sm max-h-96 overflow-y-auto mt-1">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Nom du médicament</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Famille</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Prix</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Disponibilité</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">{resultRows}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Accueil;