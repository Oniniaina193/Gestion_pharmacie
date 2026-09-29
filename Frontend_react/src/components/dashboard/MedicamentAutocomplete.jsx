import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

// Hook personnalisé pour le debouncing
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

// Composant d'autocomplétion pour les médicaments
const MedicamentAutocomplete = ({ 
  value, 
  onChange, 
  onSelect, 
  onSearch, 
  placeholder = "Saisissez le nom d'un médicament...",
  suggestions = [],
  loading = false,
  disabled = false,
  showSearchButton = true 
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const containerRef = useRef(null);

  const debouncedInputValue = useDebounce(inputValue, 300);

  // Synchroniser avec la prop value externe
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || '');
    }
  }, [value]);

  const filteredSuggestions = suggestions.filter(suggestion =>
  suggestion.designation.toLowerCase().includes(debouncedInputValue.toLowerCase())
).slice(0, 10);

  // Gérer les changements d'input
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1);
  
    if (newValue.trim().length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
    onChange(newValue);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion.designation);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    onChange(suggestion.designation);
 
    if (onSelect) {
      onSelect(suggestion.designation);
    }
    
    inputRef.current?.focus();
  };

  const handleSearch = useCallback(async () => {
    if (!inputValue.trim() || isSearching) return;
    
    setIsSearching(true);
    setShowSuggestions(false);
    
    try {
      await onSearch(inputValue.trim());
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    } finally {
      setIsSearching(false);
    }
  }, [inputValue, onSearch, isSearching]);

  // Gérer les touches du clavier
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
        handleSuggestionClick(filteredSuggestions[selectedIndex]);
      } else {
        if (onSearch) {
          handleSearch();
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (showSuggestions && filteredSuggestions.length > 0) {
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showSuggestions && filteredSuggestions.length > 0) {
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
      }
      return;
    }

    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
      return;
    }
  };

  // Gérer les clics à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  // Vider le champ
  const handleClear = () => {
    setInputValue('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim().length > 0) {
              setShowSuggestions(true);
            }
          }}
          disabled={disabled || loading}
          placeholder={placeholder}
          className={`
            block w-full pl-10 pr-20 py-2 border border-gray-300 rounded-md 
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${loading ? 'bg-gray-50' : 'bg-white'}
          `}
        />
      </div>

      {/* Liste des suggestions */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div ref={suggestionsRef}>
            {filteredSuggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.designation}-${index}`}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`
                  px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0
                  ${index === selectedIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}
                `}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">
                    {suggestion.designation}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicamentAutocomplete;