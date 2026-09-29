import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

const LoginApp = ({ onLoginSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    // Validation côté client
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (!email.includes('@')) {
      setError('Veuillez entrer un email valide');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Simulation d'appel API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simuler une connexion réussie
      const mockUser = { 
        id: 1, 
        name: 'Administrateur', 
        email: email,
        role: 'admin' 
      };
      
      if (onLoginSuccess) {
        onLoginSuccess(mockUser);
      }
    } catch (error) {
      setError('Erreur de connexion inattendue');
      console.error('Erreur login:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin();
    }
  };

  return (
    // Container principal qui occupe toute la hauteur et centre le contenu
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-4 ">
      <div className="w-full max-w-md">
        {/* Formulaire de login */}
        <div className="bg-gray-100 rounded-xl shadow-lg p-8">
          <div className="space-y-6">
            {/* Message d'erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Erreur de connexion</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Champ email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="votre@email.com"
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                />
              </div>
            </div>

            {/* Champ mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Votre mot de passe"
                  disabled={loading}
                  className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  disabled={loading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Options additionnelles */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">Se souvenir de moi</span>
              </label>
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                Mot de passe oublié ?
              </button>
            </div>

            {/* Bouton de connexion */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 text-lg font-medium"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Connexion...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Se connecter</span>
                </>
              )}
            </button>
          </div>

          {/* Bouton retour */}
          {onBack && (
            <div className="mt-6 text-center">
              <button
                onClick={onBack}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Retour à l'application
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginApp;