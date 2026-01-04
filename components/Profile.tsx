
import React, { useState, useEffect } from 'react';
import { User, Room } from '../types';
import { db } from '../services/mockDb';

interface ProfileProps {
  user: User;
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onLogout }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoom = async () => {
      if (user.roomId) {
        const roomData = await db.getRoom(user.roomId);
        setRoom(roomData);
      }
      setLoading(false);
    };
    fetchRoom();
  }, [user.roomId]);

  const copyInviteCode = () => {
    if (room) {
      navigator.clipboard.writeText(room.inviteCode);
      setCopied(true);
      (window as any).haptic?.('light');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8 animate-m3">
      <div className="flex flex-col items-center text-center py-6">
        <div className="relative animate-m3" style={{ width: '128px', height: '128px' }}>
          <div className="w-32 h-32 bg-white rounded-[3rem] p-1 border-4 border-slate-50 shadow-2xl overflow-hidden">
             <img 
               src={user.avatar} 
               className="avatar-fixed-lg" 
               style={{ width: '120px', height: '120px', borderRadius: '40px' }}
               alt={user.name} 
             />
          </div>
          <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center border-4 border-white shadow-lg">
            <i className="fas fa-fingerprint text-white text-xs"></i>
          </div>
        </div>
        <div className="mt-6">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">{user.name}</h2>
          <p className="text-slate-400 font-bold text-sm tracking-wide mt-1">{user.email}</p>
        </div>
        <div className="mt-4 inline-flex items-center px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-emerald-100">
          <i className="fas fa-shield-halved mr-2"></i>
          {user.role} ACCESS LEVEL
        </div>
      </div>

      <div className="m3-card p-8 border border-slate-50">
        <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6">Workspace Intel</h3>
        <div className="space-y-6">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-slate-300 uppercase">Current Workspace</span>
            <span className="font-extrabold text-xl text-slate-800">
              {loading ? 'Verifying...' : (room?.name || 'No Room Assigned')}
            </span>
          </div>
          {room && (
            <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-slate-300 uppercase">Access Code</span>
                <span className="font-mono text-2xl font-black text-emerald-500 tracking-widest">{room.inviteCode}</span>
              </div>
              <button 
                onClick={copyInviteCode}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                  copied ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} text-lg`}></i>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {[
          { icon: 'fa-gear', label: 'System Preferences' },
          { icon: 'fa-user-lock', label: 'Privacy & Permissions' },
        ].map((item, i) => (
          <button key={i} className="m3-card w-full flex items-center justify-between p-5 group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all">
                 <i className={`fas ${item.icon}`}></i>
              </div>
              <span className="font-bold text-slate-700">{item.label}</span>
            </div>
            <i className="fas fa-chevron-right text-slate-200 text-xs"></i>
          </button>
        ))}
        
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-3 p-6 bg-rose-50 text-rose-500 rounded-[2.2rem] font-black hover:bg-rose-500 hover:text-white transition-all mt-8 uppercase tracking-widest text-[11px]"
        >
          <i className="fas fa-power-off"></i>
          Disconnect Session
        </button>
      </div>

      <div className="text-center text-[9px] font-black text-slate-200 uppercase tracking-[0.4em] pb-12">
        SNIPX LIBRARY • ARCH 1.5 • 2025
      </div>
    </div>
  );
};

export default Profile;
