import React, { useState, useEffect } from 'react';
import { Printer, AlertCircle, CheckCircle, Download } from 'lucide-react';

// Composant de notification d'impression
export const PrintNotification = ({ 
  isVisible, 
  type = 'success', 
  message = '', 
  onClose,
  autoClose = 3000 
}) => {
  useEffect(() => {
    if (isVisible && autoClose > 0) {
      const timer = setTimeout(onClose, autoClose);
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoClose, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'info':
        return <Printer className="w-5 h-5 text-blue-500" />;
      default:
        return <Printer className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-fadeIn">
      <div className={`flex items-center p-3 border rounded-lg shadow-lg max-w-md ${getBgColor()}`}>
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-2 text-gray-400 hover:text-gray-600"
        >
          <span className="sr-only">Fermer</span>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Composant d'indicateur de statut d'imprimante
export const PrinterStatusIndicator = ({ status }) => {
  if (!status) return null;

  const getStatusColor = () => {
    if (status.available) {
      return status.method === 'modern' ? 'text-green-600' : 'text-yellow-600';
    }
    return 'text-red-600';
  };

  const getStatusIcon = () => {
    if (status.available) {
      return <CheckCircle className="w-4 h-4" />;
    }
    return <AlertCircle className="w-4 h-4" />;
  };

  return (
    <div className="flex items-center space-x-2 text-xs">
      <div className={getStatusColor()}>
        {getStatusIcon()}
      </div>
      <span className="text-gray-600">{status.message}</span>
    </div>
  );
};

export const usePrintNotifications = () => {
  const [notification, setNotification] = useState({
    isVisible: false,
    type: 'info',
    message: ''
  });

  const showNotification = (type, message) => {
    setNotification({
      isVisible: true,
      type,
      message
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({
      ...prev,
      isVisible: false
    }));
  };

  const showSuccess = (message) => showNotification('success', message);
  const showError = (message) => showNotification('error', message);
  const showInfo = (message) => showNotification('info', message);

  return {
    notification,
    showSuccess,
    showError,
    showInfo,
    hideNotification
  };
};

// Composant de test d'impression
export const PrintTestComponent = ({ onTestPrint }) => {
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    try {
      await onTestPrint();
    } finally {
      setTesting(false);
    }
  };
};

export const printUtilsCSS = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }

  /* Styles spécifiques pour l'impression */
  @media print {
    .no-print,
    .no-print * {
      display: none !important;
    }
    
    .print-only {
      display: block !important;
    }
    
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

export default { 
  PrintNotification, 
  PrinterStatusIndicator, 
  usePrintNotifications, 
  PrintTestComponent 
};