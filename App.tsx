
import React, { useState, useEffect, useRef } from 'react';
import { User, TabType, TaskLog } from './types';
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
  
  const [activeToast, setActiveToast] = useState<{from: string, task: string, avatar: string} | null>(null);
  const lastCheckRef = useRef<number>(Date.now());

  useEffect(() => {
    const checkAuth = () => {
      const currentUser = db.getCurrentUser();
      if (currentUser) {
        setUser({ ...currentUser });
        requestNotificationPermission();
      }
      setTimeout(() => setLoading(false), 800);
    };
    checkAuth();
  }, []);

  // REAL-TIME HEARTBEAT & PRESENCE
  useEffect(() => {
    if (!user?.id) return;

    // Initial heartbeat
    db.heartbeat(user.id, user.roomId);

    const interval = setInterval(() => {
      db.heartbeat(user.id, user.roomId);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [user?.id, user?.roomId]);

  useEffect(() => {
    if (!user?.id || !user?.roomId) return;

    const pollNotifications = async () => {
      try {
        const logs = await db.getLogs(user.roomId!);
        const newLogs = logs.filter(log => 
          log.timestamp > lastCheckRef.current && 
          log.toUserId === user.id && 
          (log.action === 'PUSHED' || log.action === 'CREATED')
        );

        if (newLogs.length > 0) {
          triggerNotification(newLogs[0]);
        }
        lastCheckRef.current = Date.now();
      } catch (err) {
        console.error("Notify sync error", err);
      }
    };

    const interval = setInterval(pollNotifications, 5000);
    return () => clearInterval(interval);
  }, [user?.id, user?.roomId]);

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const triggerNotification = (log: TaskLog) => {
    (window as any).haptic?.('heavy');
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification("New Task Assigned", {
        body: `${log.fromUserName} assigned: ${log.taskName}`,
        icon: "https://api.dicebear.com/7.x/shapes/png?seed=Teams&backgroundColor=3b33ff"
      });
    }
    setActiveToast({
      from: log.fromUserName,
      task: log.taskName,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${log.fromUserName}`
    });
    setTimeout(() => setActiveToast(null), 5000);
  };

  const handleAuth = async () => {
    setAuthError('');
    if (authMode === 'SIGN_UP' && (!name || !agreedToTerms)) {
      setAuthError("Name and terms are required.");
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

      if (result) {
        setUser(result);
        requestNotificationPermission();
      }
      else setAuthError("Invalid credentials.");
    } catch (e) {
      setAuthError("Network error.");
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
          setAuthError('Password reset! Login now.');
          setRecoveryStep('EMAIL');
        }
      }
    }
    setIsProcessing(false);
  };

  const onRoomUpdated = () => {
    const updatedUser = db.getCurrentUser();
    setUser(updatedUser ? { ...updatedUser } : null);
    setShowRoomSetup(false);
    setActiveTab('DASHBOARD');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-brand rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-200 animate-pulse">
          <i className="fas fa-cubes text-white text-3xl"></i>
        </div>
        <p className="mt-8 text-slate-300 font-black text-[10px] tracking-[0.5em] uppercase animate-pulse">Initializing</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-fade">
        <div className="mb-10 text-center">
          <div className="w-20 h-20 bg-brand rounded-4xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand/20">
            <i className="fas fa-shapes text-4xl text-white"></i>
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-1 tracking-tighter">TEAMS</h1>
          <p className="text-slate-400 font-bold text-[10px] tracking-[0.3em] uppercase opacity-60">Operational Cloud</p>
        </div>

        <div className="w-full max-w-sm bg-white p-8 rounded-4xl shadow-xl shadow-slate-200/50 space-y-6 border border-slate-100">
          <div className="flex bg-slate-50 p-1.5 rounded-2xl">
            <button onClick={() => setAuthMode('LOGIN')} className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all ${authMode === 'LOGIN' ? 'bg-white shadow-sm text-brand' : 'text-slate-400'}`}>LOGIN</button>
            <button onClick={() => setAuthMode('SIGN_UP')} className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all ${authMode === 'SIGN_UP' ? 'bg-white shadow-sm text-brand' : 'text-slate-400'}`}>JOIN</button>
          </div>
          
          <div className="space-y-4">
            {authMode === 'FORGOT' ? (
              <div className="animate-m3 text-left">
                <button onClick={() => setAuthMode('LOGIN')} className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-1"><i className="fas fa-chevron-left"></i> Back</button>
                <input type="email" placeholder="Email Address" className="w-full bg-slate-50 p-5 rounded-2xl border-none focus:ring-2 focus:ring-brand font-bold" value={email} onChange={(e) => setEmail(e.target.value)} />
                {recoveryStep === 'RESET' && <input type="password" placeholder="New Password" className="w-full bg-slate-50 p-5 rounded-2xl border-none focus:ring-2 focus:ring-brand font-bold mt-4" value={password} onChange={(e) => setPassword(e.target.value)} />}
                <button onClick={handleRecovery} className="w-full py-5 bg-brand text-white rounded-3xl font-black uppercase tracking-widest mt-6 shadow-xl shadow-brand/30">{isProcessing ? 'Syncing...' : 'Continue'}</button>
              </div>
            ) : (
              <div className="animate-m3 space-y-4">
                {authMode === 'SIGN_UP' && (
                  <input type="text" placeholder="Full Name" className="w-full bg-slate-50 p-5 rounded-2xl border-none focus:ring-2 focus:ring-brand font-bold" value={name} onChange={(e) => setName(e.target.value)} />
                )}
                <input type="email" placeholder="Email" className="w-full bg-slate-50 p-5 rounded-2xl border-none focus:ring-2 focus:ring-brand font-bold" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input type="password" placeholder="Password" className="w-full bg-slate-50 p-5 rounded-2xl border-none focus:ring-2 focus:ring-brand font-bold" value={password} onChange={(e) => setPassword(e.target.value)} />
                
                {authMode === 'LOGIN' && (
                  <button onClick={() => setAuthMode('FORGOT')} className="text-[9px] font-black text-brand uppercase mt-2 block text-left ml-2">Trouble Accessing?</button>
                )}

                {authError && <p className="text-[10px] font-black uppercase text-rose-500 bg-rose-50 p-3 rounded-xl">{authError}</p>}
                
                {authMode === 'SIGN_UP' && (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl text-left">
                    <input type="checkbox" id="terms" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="w-5 h-5 accent-brand rounded cursor-pointer" />
                    <label htmlFor="terms" className="text-[10px] text-slate-500 font-bold leading-tight cursor-pointer">Agree to Team Operational Guidelines</label>
                  </div>
                )}
                <button onClick={handleAuth} className="w-full py-6 bg-brand text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand/20 btn-bounce">{isProcessing ? 'Verifying...' : authMode === 'LOGIN' ? 'Enter Hub' : 'Register Now'}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!user.roomId || showRoomSetup) {
    return <RoomManager user={user} onUpdate={onRoomUpdated} onCancel={user.roomId ? () => setShowRoomSetup(false) : undefined} />;
  }

  return (
    <>
      {activeToast && (
        <div className="toast-container">
          <div className="notification-toast animate-toast">
            <img src={activeToast.avatar} className="w-10 h-10 rounded-xl bg-white/10" alt="" />
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">Incoming Sync</p>
              <p className="text-xs font-bold truncate">Task "{activeToast.task}" from {activeToast.from}</p>
            </div>
            <button onClick={() => setActiveToast(null)} className="p-2 opacity-40"><i className="fas fa-times"></i></button>
          </div>
        </div>
      )}

      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        <div className="animate-m3">
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
    </>
  );
};

export default App;
