
import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../services/mockDb';

interface RoomManagerProps {
  user: User;
  onUpdate: () => void;
  onCancel?: () => void;
}

const RoomManager: React.FC<RoomManagerProps> = ({ user, onUpdate, onCancel }) => {
  const [roomName, setRoomName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [view, setView] = useState<'CHOICE' | 'CREATE' | 'JOIN'>('CHOICE');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!roomName.trim()) return;
    setLoading(true);
    (window as any).haptic?.('medium');
    const room = await db.createRoom(roomName, user);
    setLoading(false);
    if (room) onUpdate();
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    (window as any).haptic?.('medium');
    const room = await db.joinRoom(inviteCode, user);
    setLoading(false);
    if (room) {
      onUpdate();
    } else {
      alert("Invalid Invite Code or Connection Error.");
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-slate-50 flex items-center justify-center p-6 animate-fade overflow-y-auto">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-brand rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-brand/10">
            <i className="fas fa-network-wired text-white text-2xl"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Sync Workspace</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Operational Environment Setup</p>
        </div>

        {view === 'CHOICE' && (
          <div className="space-y-4">
            <button 
              onClick={() => setView('CREATE')}
              className="w-full p-6 bg-white border border-slate-100 rounded-4xl text-left hover:border-brand/30 transition-all group shadow-lg shadow-slate-200/20 btn-bounce animate-m3"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-brand group-hover:bg-brand group-hover:text-white transition-all">
                  <i className="fas fa-plus text-xl"></i>
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-800 leading-none">New Center</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-1.5">Admin Ops Control</p>
                </div>
              </div>
            </button>
            <button 
              onClick={() => setView('JOIN')}
              className="w-full p-6 bg-white border border-slate-100 rounded-4xl text-left hover:border-brand/30 transition-all group shadow-lg shadow-slate-200/20 btn-bounce animate-m3"
              style={{ animationDelay: '0.1s' }}
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                  <i className="fas fa-key text-xl"></i>
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-800 leading-none">Enter Code</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-1.5">Join Existing Sync</p>
                </div>
              </div>
            </button>
            
            {onCancel && (
              <button onClick={onCancel} className="w-full py-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 hover:text-slate-500 transition-colors">
                Return to Dashboard
              </button>
            )}
          </div>
        )}

        {(view === 'CREATE' || view === 'JOIN') && (
          <div className="bg-white p-8 rounded-4xl shadow-2xl shadow-slate-200/50 border border-slate-100 animate-m3">
            <button onClick={() => setView('CHOICE')} className="text-slate-300 text-[10px] font-black mb-6 flex items-center gap-1 uppercase tracking-widest hover:text-brand">
              <i className="fas fa-chevron-left"></i> Change Method
            </button>
            
            {view === 'CREATE' ? (
              <>
                <h3 className="text-xl font-black text-slate-900 mb-6 tracking-tight">Workspace Label</h3>
                <input 
                  type="text" 
                  placeholder="e.g. ALPHA UNIT" 
                  className="w-full bg-slate-50 p-5 rounded-2xl border-none focus:ring-2 focus:ring-brand font-bold text-lg mb-6"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  autoFocus
                  disabled={loading}
                />
                <button 
                  onClick={handleCreate}
                  disabled={!roomName.trim() || loading}
                  className="w-full py-5 bg-brand text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand/20 btn-bounce"
                >
                  {loading ? 'DEPLOYING...' : 'INITIATE DEPLOY'}
                </button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-black text-slate-900 mb-6 tracking-tight">Access Key</h3>
                <input 
                  type="text" 
                  placeholder="CODE" 
                  className="w-full bg-slate-50 p-5 rounded-2xl border-none focus:ring-2 focus:ring-brand text-slate-800 uppercase tracking-[0.5em] text-center text-2xl font-black mb-6"
                  maxLength={6}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  autoFocus
                  disabled={loading}
                />
                <button 
                  onClick={handleJoin}
                  disabled={inviteCode.length !== 6 || loading}
                  className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-300 btn-bounce"
                >
                  {loading ? 'SYNCING...' : 'VERIFY & SYNC'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomManager;
