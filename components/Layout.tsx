
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
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      {/* Immersive Android 15 Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass-effect edge-to-edge-header px-6 pb-3 flex justify-between items-center h-auto shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100/50">
            <i className="fas fa-shapes text-white"></i>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold tracking-tight text-slate-900 text-lg leading-none">SNIPX</span>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Library Cloud</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
             <span className="text-[9px] font-black text-emerald-700 uppercase tracking-tighter">Secure</span>
          </div>
          <button className="text-slate-400 touch-target p-2 hover:bg-slate-100 rounded-full transition-all relative">
            <i className="fa-solid fa-bell-concierge"></i>
          </button>
        </div>
      </header>

      {/* Main Content Area with Adaptive Padding */}
      <main className="flex-1 pt-32 pb-32 px-5 max-w-2xl mx-auto w-full">
        {children}
      </main>

      {/* Material 3 Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-slate-100 edge-to-edge-nav shadow-[0_-15px_40px_rgba(0,0,0,0.04)] rounded-t-[2.5rem]">
        <div className="max-w-2xl mx-auto flex justify-around items-center h-full px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 transition-all duration-300 touch-target ${
                activeTab === tab.id ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              <div className={`px-5 py-2 rounded-2xl transition-all duration-500 relative ${
                activeTab === tab.id ? 'bg-emerald-100/60' : 'hover:bg-slate-50'
              }`}>
                <i className={`fa-solid ${tab.icon} ${activeTab === tab.id ? 'text-xl' : 'text-lg'}`}></i>
              </div>
              <span className={`text-[10px] font-extrabold mt-1.5 transition-all tracking-tight ${
                activeTab === tab.id ? 'opacity-100 scale-100' : 'opacity-60 scale-95'
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
