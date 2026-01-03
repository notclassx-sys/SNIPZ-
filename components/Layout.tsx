
import React from 'react';
import { TabType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'ALL_TASKS' as TabType, label: 'All Tasks', icon: 'fa-list-check' },
    { id: 'MY_TASKS' as TabType, label: 'My Tasks', icon: 'fa-user-check' },
    { id: 'DASHBOARD' as TabType, label: 'Board', icon: 'fa-chart-pie' },
    { id: 'CHAT' as TabType, label: 'Chat', icon: 'fa-comments' },
    { id: 'PROFILE' as TabType, label: 'Me', icon: 'fa-user-circle' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-slate-800">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass-effect border-b border-gray-100 px-6 py-3 flex justify-between items-center h-18">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-100 rotate-2">
            <i className="fas fa-cubes text-sm text-white"></i>
          </div>
          <span className="font-extrabold tracking-tight text-slate-900 text-lg">SNIPX</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-slate-400 p-2.5 hover:bg-gray-100 rounded-full transition-all relative">
            <i className="fas fa-bell"></i>
            <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full border-2 border-white"></span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-20 pb-28 px-4 max-w-2xl mx-auto w-full">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 px-4 py-2 h-20 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] rounded-t-[2.5rem]">
        <div className="max-w-2xl mx-auto flex justify-between items-center h-full px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center w-14 transition-all duration-300 btn-bounce ${
                activeTab === tab.id ? 'text-green-600' : 'text-slate-400'
              }`}
            >
              <div className={`p-2.5 rounded-2xl transition-all ${
                activeTab === tab.id ? 'bg-green-50 shadow-sm' : ''
              }`}>
                <i className={`fas ${tab.icon} ${activeTab === tab.id ? 'text-xl' : 'text-lg'}`}></i>
              </div>
              <span className={`text-[9px] font-bold mt-1 tracking-wide ${activeTab === tab.id ? 'opacity-100' : 'opacity-70'}`}>
                {tab.label.toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
