import React, { useState, useRef } from 'react';
import { 
  BarChart3, 
  Package, 
  Users, 
  FileText, 
  History,
  ChevronRight 
} from 'lucide-react';
import Statistiques from '../dashboard/Statistiques';
import Medicaments from '../dashboard/Medicaments';
import Medecins from '../dashboard/Medecins';
import Ordonnances from '../dashboard/Ordonnances';
import Historique from '../dashboard/Historique';

const DashboardAdmin = () => {
  const [activeTab, setActiveTab] = useState('statistiques');

  // Références pour maintenir les composants en vie
  const statistiquesRef = useRef(null);
  const medicamentsRef = useRef(null);
  const medecinsRef = useRef(null);
  const ordonnancesRef = useRef(null);
  const historiqueRef = useRef(null);

  // Configuration des menus
  const menuItems = [
    {
      key: 'statistiques',
      label: 'Statistiques',
      icon: BarChart3,
      component: Statistiques,
      ref: statistiquesRef
    },
    {
      key: 'medecins',
      label: 'Médecins',
      icon: Users,
      component: Medecins,
      ref: medecinsRef
    },
    {
      key: 'ordonnances',
      label: 'Ordonnances',
      icon: FileText,
      component: Ordonnances,
      ref: ordonnancesRef
    },
    {
      key: 'historique',
      label: 'Historique',
      icon: History,
      component: Historique,
      ref: historiqueRef
    }
  ];

  // Navigation sans démontage des composants
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
  };

  // Rendu du contenu avec maintien en mémoire
  const renderContent = () => {
    return (
      <div className="relative w-full h-full">
        {menuItems.map((item) => {
          const Component = item.component;
          const isActive = activeTab === item.key;
          
          return (
            <div
              key={item.key}
              ref={item.ref}
              className={`absolute inset-0 w-full h-full transition-opacity duration-200 ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <Component />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full bg-gray-50 overflow-hidden">
      <div className="w-56 bg-white shadow-lg border-r border-gray-200 flex-shrink-0 relative z-20">
        <div className="h-full flex flex-col">
          {/* Header du sidebar */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
                <p className="text-sm text-gray-500">Administration</p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                
                return (
                  <li key={item.key}>
                    <button
                      onClick={() => handleTabChange(item.key)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-lg transition-all duration-200 group ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon 
                          className={`w-5 h-5 ${
                            isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                          }`} 
                        />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {isActive && (
                        <ChevronRight className="w-4 h-4 text-blue-600" />
                      )}
                    </button><br />
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>

      {/* Contenu principal*/}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 p-4 overflow-auto relative bg-gray-50">
          <div className="max-w-7xl mx-auto h-full">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAdmin;