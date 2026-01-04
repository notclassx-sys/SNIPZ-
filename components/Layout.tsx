
import React from 'react';
import { TabType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'ALL_TASKS' as TabType, label: 'Tasks', icon: 'fa-list-check' },
    { id: 'MY_TASKS' as TabType, label: 'My', icon: 'fa-user-check' },
    { id: 'DASHBOARD' as TabType, label: 'Board', icon: 'fa-chart-pie' },
    { id: 'CHAT' as TabType, label: 'Chat', icon: 'fa-message' },
    { id: 'PROFILE' as TabType, label: 'Me', icon: 'fa-circle-user' },
  ];

  const handleTabClick = (id: TabType) => {
    (window as any).haptic?.('light');
    setActiveTab(id);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      {/* Immersive Android 15 Header */}
      <header className="edge-to-edge-header bg-white/70 backdrop-blur-xl px-6 pb-4 flex justify-between items-center shadow-sm border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
            <i className="fas fa-shapes text-white"></i>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold tracking-tight text-slate-900 text-lg leading-tight">SNIPX</span>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Library Cloud</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
             <span className="text-[9px] font-black text-emerald-700 uppercase">Live</span>
          </div>
        </div>
      </header>

      {/* Content Area with Top Offset to clear fixed header */}
      <main className="flex-1 pt-32 pb-32 px-5 max-w-xl mx-auto w-full">
        {children}
      </main>

      {/* Navigation */}
      <nav className="edge-to-edge-nav bg-white/90 border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] rounded-t-[2.5rem]">
        <div className="max-w-xl mx-auto flex justify-around items-center h-16 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 transition-all h-12 ${
                activeTab === tab.id ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              <div className={`px-4 py-1.5 rounded-2xl transition-all ${
                activeTab === tab.id ? 'bg-emerald-100' : ''
              }`}>
                <i className={`fa-solid ${tab.icon} ${activeTab === tab.id ? 'text-lg' : 'text-base'}`}></i>
              </div>
              <span className={`text-[9px] font-black mt-1 uppercase tracking-wider ${
                activeTab === tab.id ? 'opacity-100' : 'opacity-40'
              }`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
