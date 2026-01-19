
import React, { useEffect } from 'react';
import { TabType } from '../types';
import { adService } from '../services/adService';

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

  useEffect(() => {
    adService.initBanner();
  }, []);

  const handleTabClick = (id: TabType) => {
    (window as any).haptic?.('light');
    setActiveTab(id);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-[1000] bg-white/80 backdrop-blur-3xl px-6 flex justify-between items-center border-b border-slate-100 h-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand rounded-2xl flex items-center justify-center shadow-lg shadow-brand/10">
            <i className="fas fa-shapes text-white text-lg"></i>
          </div>
          <div>
            <h1 className="font-black text-lg text-slate-900 tracking-tighter leading-none uppercase">TEAMS</h1>
            <p className="text-[8px] font-black text-brand uppercase tracking-widest mt-1">Operational</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="bg-slate-50 h-10 w-10 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400">
             <i className="fas fa-search text-xs"></i>
           </div>
        </div>
      </header>

      <main className="flex-1 pt-24 px-5 max-w-xl mx-auto w-full mb-32">
        {children}
      </main>

      <nav className="fixed left-0 right-0 z-[1000] bg-white/95 backdrop-blur-2xl border-t border-slate-100 h-20 flex items-center justify-around px-4 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]" style={{ bottom: 'var(--admob-banner-height)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`relative flex flex-col items-center justify-center flex-1 transition-all ${
              activeTab === tab.id ? 'text-brand' : 'text-slate-300'
            }`}
          >
            <div className={`w-12 h-8 rounded-xl flex items-center justify-center transition-all ${
              activeTab === tab.id ? 'bg-indigo-50' : ''
            }`}>
              <i className={`fa-solid ${tab.icon} ${activeTab === tab.id ? 'text-sm' : 'text-sm'}`}></i>
            </div>
            <span className={`text-[8px] font-black mt-1 uppercase tracking-widest ${
              activeTab === tab.id ? 'opacity-100' : 'opacity-60'
            }`}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Reserved Spacer for Native AdMob Banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-50 z-[1001]" style={{ height: 'var(--admob-banner-height)' }}>
        <div className="w-full h-full flex items-center justify-center bg-slate-50">
          <span className="text-[8px] font-black uppercase text-slate-300 tracking-[0.4em]">Operational Unit • v2.0</span>
        </div>
      </div>
    </div>
  );
};

export default Layout;
