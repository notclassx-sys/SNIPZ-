
import React, { useState, useEffect } from 'react';
import { User, TabType } from './types';
import { db } from './services/mockDb';
import RoomManager from './components/RoomManager';
import Layout from './components/Layout';
import TaskBoard from './components/TaskBoard';
import Dashboard from './components/Dashboard';
import Chat from './components/Chat';
import Profile from './components/Profile';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(db.getCurrentUser());
  const [activeTab, setActiveTab] = useState<TabType>('DASHBOARD');
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGN_UP' | 'FORGOT'>('LOGIN');
  const [recoveryStep, setRecoveryStep] = useState<'EMAIL' | 'RESET'>('EMAIL');
  const [recoveryUserId, setRecoveryUserId] = useState<string | null>(null);
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRoomSetup, setShowRoomSetup] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const currentUser = db.getCurrentUser();
      if (currentUser) setUser({ ...currentUser });
      setTimeout(() => setLoading(false), 800);
    };
    checkAuth();
  }, []);

  const handleAuth = async () => {
    setAuthError('');
    if (authMode === 'SIGN_UP' && (!name || !agreedToTerms)) {
      setAuthError("Check all fields and agree to be cool.");
      return;
    }
    if (authMode !== 'FORGOT' && (!email || !password)) {
      setAuthError("Credentials required.");
      return;
    }

    setIsProcessing(true);
    try {
      let result;
      if (authMode === 'SIGN_UP') {
        result = await db.signUp(email, password, name);
      } else {
        result = await db.login(email, password);
      }

      if (result) setUser(result);
      else setAuthError("Auth failed. Check details.");
    } catch (e) {
      setAuthError("Sync error.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecovery = async () => {
    setAuthError('');
    setIsProcessing(true);
    if (recoveryStep === 'EMAIL') {
      const uid = await db.findUserByEmail(email);
      if (uid) {
        setRecoveryUserId(uid);
        setRecoveryStep('RESET');
        (window as any).haptic?.('medium');
      } else {
        setAuthError("Email not found.");
      }
    } else {
      if (password.length < 6) {
        setAuthError("Min 6 chars.");
      } else {
        const success = await db.updatePassword(recoveryUserId!, password);
        if (success) {
          setAuthMode('LOGIN');
          setAuthError('Key updated! Login now.');
          setRecoveryStep('EMAIL');
        }
      }
    }
    setIsProcessing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="animate-spring">
          <div className="w-20 h-20 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-200 animate-float">
             <i className="fas fa-cubes text-white text-3xl"></i>
          </div>
        </div>
        <p className="mt-8 text-slate-300 font-black text-[10px] tracking-[0.5em] uppercase">Initializing Hub</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#fdfdfd] flex flex-col items-center justify-center p-6 text-center animate-spring">
        <div className="mb-12">
          <div className="w-24 h-24 bg-emerald-500 rounded-[2.8rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-200 rotate-6 transition-transform hover:rotate-0 duration-500 cursor-pointer">
            <i className="fas fa-shapes text-5xl text-white"></i>
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-1 tracking-tight">TEAMS</h1>
          <p className="text-slate-400 font-bold text-sm tracking-widest uppercase opacity-60">Operations Cloud</p>
        </div>

        <div className="w-full max-w-sm bg-white border border-slate-100 p-8 rounded-[3.5rem] shadow-2xl shadow-slate-200/40 space-y-6 animate-spring stagger-1">
          <div className="flex bg-slate-50 p-1.5 rounded-2xl">
            <button onClick={() => setAuthMode('LOGIN')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${authMode === 'LOGIN' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>LOGIN</button>
            <button onClick={() => setAuthMode('SIGN_UP')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${authMode === 'SIGN_UP' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>JOIN</button>
          </div>
          
          <div className="space-y-4 text-left">
            {authMode === 'FORGOT' ? (
              <div className="animate-slide">
                <button onClick={() => setAuthMode('LOGIN')} className="text-[10px] font-black text-slate-400 uppercase mb-4 block"><i className="fas fa-arrow-left mr-1"></i> Back</button>
                <h3 className="text-xl font-black text-slate-800 mb-6">Recovery</h3>
                <input type="email" placeholder="Email" className="w-full input-m3 mb-4" value={email} onChange={(e) => setEmail(e.target.value)} />
                {recoveryStep === 'RESET' && <input type="password" placeholder="New Password" className="w-full input-m3" value={password} onChange={(e) => setPassword(e.target.value)} />}
                <button onClick={handleRecovery} className="w-full py-5 btn-primary mt-6">{isProcessing ? 'Syncing...' : 'Continue'}</button>
              </div>
            ) : (
              <div className="animate-spring">
                {authMode === 'SIGN_UP' && (
                  <input type="text" placeholder="Name" className="w-full input-m3 mb-4" value={name} onChange={(e) => setName(e.target.value)} />
                )}
                <input type="email" placeholder="Email" className="w-full input-m3 mb-4" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input type="password" placeholder="Password" className="w-full input-m3" value={password} onChange={(e) => setPassword(e.target.value)} />
                
                {authMode === 'LOGIN' && (
                  <button onClick={() => setAuthMode('FORGOT')} className="text-[9px] font-black text-emerald-600 uppercase mt-3 ml-2 hover:underline">Forgot Key?</button>
                )}

                {authError && <p className="text-[10px] font-black uppercase text-center mt-4 text-rose-500">{authError}</p>}
                
                {authMode === 'SIGN_UP' && (
                  <div className="flex items-center gap-3 p-5 bg-emerald-50/50 rounded-3xl mt-4 border border-emerald-100">
                    <input type="checkbox" id="terms" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="w-6 h-6 accent-emerald-500 rounded-lg cursor-pointer" />
                    <label htmlFor="terms" className="text-[11px] text-emerald-800 font-bold leading-none cursor-pointer">I'll be a cool team player 🤝</label>
                  </div>
                )}
                <button onClick={handleAuth} className="btn-primary w-full py-6 text-sm tracking-widest uppercase mt-6">{isProcessing ? 'Verifying...' : authMode === 'LOGIN' ? 'Access Hub' : 'Register Now'}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="animate-spring">
        {activeTab === 'ALL_TASKS' && <TaskBoard mode="ALL" user={user} />}
        {activeTab === 'MY_TASKS' && <TaskBoard mode="MY" user={user} />}
        {activeTab === 'DASHBOARD' && <Dashboard user={user} />}
        {activeTab === 'CHAT' && <Chat user={user} />}
        {activeTab === 'PROFILE' && (
          <Profile 
            user={user} 
            onLogout={() => { db.logout(); setUser(null); }} 
            onSwitchRoom={() => setUser({...db.getCurrentUser()!})} 
            onAddRoom={() => setShowRoomSetup(true)}
          />
        )}
      </div>
    </Layout>
  );
};

export default App;
