
import React from 'react';
import { TabType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'DASHBOARD' as TabType, label: 'Ops', icon: 'fa-chart-pie' },
    { id: 'ALL_TASKS' as TabType, label: 'Board', icon: 'fa-layer-group' },
    { id: 'MY_TASKS' as TabType, label: 'Scope', icon: 'fa-circle-check' },
    { id: 'CHAT' as TabType, label: 'Chat', icon: 'fa-message' },
    { id: 'PROFILE' as TabType, label: 'Me', icon: 'fa-user' },
  ];

  const handleTabClick = (id: TabType) => {
    (window as any).haptic?.('light');
    setActiveTab(id);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc]">
      <header className="fixed top-0 left-0 right-0 z-[1000] bg-white/80 backdrop-blur-3xl px-6 flex justify-between items-center border-b border-slate-100 h-24">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-100">
            <i className="fas fa-shapes text-white text-xl"></i>
          </div>
          <div>
            <h1 className="font-black text-xl text-slate-900 tracking-tight leading-none">TEAMS</h1>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Operational</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <i className="fas fa-bell text-slate-400 text-sm"></i>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-32 pb-32 px-5 max-w-xl mx-auto w-full">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur-2xl border-t border-slate-100 h-24 flex items-center justify-around px-4 rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`relative flex flex-col items-center justify-center flex-1 transition-all h-16 ${
              activeTab === tab.id ? 'text-emerald-500 scale-110' : 'text-slate-400'
            }`}
          >
            <div className={`w-12 h-10 rounded-2xl flex items-center justify-center transition-all ${
              activeTab === tab.id ? 'bg-emerald-50' : 'bg-transparent'
            }`}>
              <i className={`fa-solid ${tab.icon} ${activeTab === tab.id ? 'text-lg' : 'text-base'}`}></i>
            </div>
            <span className={`text-[9px] font-black mt-1 uppercase tracking-wider ${
              activeTab === tab.id ? 'opacity-100' : 'opacity-40'
            }`}>
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <div className="absolute -bottom-1 w-1 h-1 bg-emerald-500 rounded-full"></div>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
