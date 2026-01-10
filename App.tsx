
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
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGN_UP'>('LOGIN');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRoomSetup, setShowRoomSetup] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const currentUser = db.getCurrentUser();
      if (currentUser) {
        setUser({ ...currentUser });
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    db.heartbeat(user.id, user.roomId);
    const hbInterval = setInterval(() => {
      db.heartbeat(user.id, user.roomId);
    }, 30000);
    return () => clearInterval(hbInterval);
  }, [user?.id, user?.roomId]);

  const handleAuth = async () => {
    setAuthError('');
    if (authMode === 'SIGN_UP' && (!name || !agreedToTerms)) {
      setAuthError("Please fill all fields and agree to the rules.");
      return;
    }
    if (!email || !password) {
      setAuthError("Email and password are required.");
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

      if (result) {
        setUser(result);
      } else {
        setAuthError(authMode === 'SIGN_UP' ? "Sign up failed. User might exist." : "Invalid email or password.");
      }
    } catch (e) {
      setAuthError("Authentication error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const refreshUser = () => {
    const updated = db.getCurrentUser();
    if (updated) {
      setUser({ ...updated });
      setShowRoomSetup(false);
    }
  };

  const handleLogout = () => {
    db.logout();
    setUser(null);
    setActiveTab('DASHBOARD');
    setEmail('');
    setPassword('');
    setName('');
    setAuthMode('LOGIN');
    setAuthError('');
    setShowRoomSetup(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-green-500 border-opacity-25 border-t-green-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-fade-up">
        <div className="mb-6 animate-scale-in">
          <div className="w-20 h-20 bg-green-500 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-green-100 rotate-3 transition-transform hover:rotate-0 duration-500">
            <i className="fas fa-cubes text-4xl text-white"></i>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-1 tracking-tight uppercase">SNIPX LIBRARY</h1>
          <p className="text-slate-400 font-bold text-sm">Secure Platform Workspace</p>
        </div>
        
        <div className="w-full max-w-sm bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-[0_30px_60px_rgba(34,197,94,0.1)] space-y-6">
          <div className="flex bg-gray-50 p-1.5 rounded-2xl">
            <button onClick={() => { setAuthMode('LOGIN'); setAuthError(''); }} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${authMode === 'LOGIN' ? 'bg-white shadow-sm text-green-600' : 'text-slate-400'}`}>LOGIN</button>
            <button onClick={() => { setAuthMode('SIGN_UP'); setAuthError(''); }} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${authMode === 'SIGN_UP' ? 'bg-white shadow-sm text-green-600' : 'text-slate-400'}`}>SIGN UP</button>
          </div>
          <div className="space-y-4 text-left">
            {authMode === 'SIGN_UP' && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">Full Name</label>
                <input type="text" className="w-full bg-gray-50 border border-transparent rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-bold text-slate-800" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">Email</label>
              <input type="email" className="w-full bg-gray-50 border border-transparent rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-bold text-slate-800" placeholder="hello@snipx.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">Password</label>
              <input type="password" className="w-full bg-gray-50 border border-transparent rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-bold text-slate-800" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {authError && <p className="text-[11px] text-red-500 font-bold px-1 animate-pulse"><i className="fas fa-circle-exclamation mr-1"></i> {authError}</p>}
            {authMode === 'SIGN_UP' && (
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-2xl border border-green-100/50">
                <input type="checkbox" id="terms" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-1 w-4 h-4 accent-green-500 cursor-pointer" />
                <label htmlFor="terms" className="text-[11px] text-green-700 font-bold leading-relaxed cursor-pointer">I agree to the Rules: Be helpful, no spam, and respect the team.</label>
              </div>
            )}
            <button onClick={handleAuth} disabled={isProcessing || !email || !password || (authMode === 'SIGN_UP' && (!name || !agreedToTerms))} className="w-full py-5 bg-green-500 text-white rounded-[1.5rem] font-black transition-all shadow-xl shadow-green-100 hover:bg-green-600 disabled:opacity-40 btn-bounce mt-2 tracking-widest text-sm">
              {isProcessing ? 'PROCESSING...' : authMode === 'LOGIN' ? 'GO TO BOARD' : 'CREATE ACCOUNT'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user.roomId || showRoomSetup) {
    return (
      <>
        {showRoomSetup && (
          <button 
            onClick={() => setShowRoomSetup(false)} 
            className="fixed top-8 left-8 z-[3000] w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-slate-400 hover:text-emerald-500 transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        )}
        <RoomManager user={user} onUpdate={refreshUser} />
      </>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="animate-fade-up">
        {activeTab === 'ALL_TASKS' && <TaskBoard mode="ALL" user={user} />}
        {activeTab === 'MY_TASKS' && <TaskBoard mode="MY" user={user} />}
        {activeTab === 'DASHBOARD' && <Dashboard user={user} />}
        {activeTab === 'CHAT' && <Chat user={user} />}
        {activeTab === 'PROFILE' && (
          <Profile 
            user={user} 
            onLogout={handleLogout} 
            onSwitchRoom={refreshUser} 
            onAddRoom={() => setShowRoomSetup(true)}
          />
        )}
      </div>
    </Layout>
  );
};

export default App;
