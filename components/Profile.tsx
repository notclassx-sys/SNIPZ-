
import React, { useState, useEffect } from 'react';
import { User, Room } from '../types';
import { db } from '../services/mockDb';

interface ProfileProps {
  user: User;
  onLogout: () => void;
  onSwitchRoom: () => void;
  onAddRoom: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onLogout, onSwitchRoom, onAddRoom }) => {
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user.id, user.roomId]);

  const fetchData = async () => {
    setLoading(true);
    const [roomData, memberships] = await Promise.all([
      user.roomId ? db.getRoom(user.roomId) : Promise.resolve(null),
      db.getJoinedRooms(user.id)
    ]);
    setActiveRoom(roomData);
    setAllRooms(memberships);
    setLoading(false);
  };

  const copyInviteCode = () => {
    if (activeRoom) {
      navigator.clipboard.writeText(activeRoom.inviteCode);
      setCopied(true);
      (window as any).haptic?.('light');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSwitch = async (roomId: string) => {
    if (roomId === user.roomId) return;
    (window as any).haptic?.('heavy');
    const success = await db.switchRoom(roomId, user);
    if (success) {
      onSwitchRoom();
    } else {
      alert("Could not switch room.");
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
      </div>

      <section className="space-y-4">
        <div className="flex justify-between items-end px-1">
          <div>
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">My Workspaces</h3>
            <p className="text-slate-900 font-black text-lg">Active Sessions</p>
          </div>
          <button 
            onClick={onAddRoom}
            className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <i className="fas fa-plus"></i>
          </button>
        </div>

        <div className="space-y-3">
          {allRooms.map((r) => (
            <button 
              key={r.id} 
              onClick={() => handleSwitch(r.id)}
              className={`w-full m3-card p-5 flex items-center justify-between border-2 transition-all ${
                r.id === user.roomId 
                ? 'border-emerald-500 bg-emerald-50/30' 
                : 'border-transparent bg-white hover:border-slate-100'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${
                  r.id === user.roomId ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400'
                }`}>
                  <i className="fas fa-shapes"></i>
                </div>
                <div className="text-left">
                  <span className="block font-black text-slate-800 leading-tight">{r.name}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {r.id === user.roomId ? 'Currently Operational' : 'Offline Access'}
                  </span>
                </div>
              </div>
              {r.id === user.roomId && (
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              )}
            </button>
          ))}
        </div>
      </section>

      {activeRoom && (
        <div className="m3-card p-8 border border-slate-50">
          <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6">Current Space Intel</h3>
          <div className="space-y-6">
            <div className="pt-2 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-slate-300 uppercase">Access Key</span>
                <span className="font-mono text-2xl font-black text-emerald-500 tracking-widest">{activeRoom.inviteCode}</span>
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
            <div className="pt-6 border-t border-slate-50 inline-flex items-center text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-widest">
              <i className="fas fa-shield-halved mr-2 text-sm"></i>
              {user.role} PERMISSIONS ACTIVE
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 pt-4">
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-3 p-6 bg-rose-50 text-rose-500 rounded-[2.2rem] font-black hover:bg-rose-500 hover:text-white transition-all mt-4 uppercase tracking-widest text-[11px]"
        >
          <i className="fas fa-power-off"></i>
          Close all sessions
        </button>
      </div>

      <div className="text-center text-[9px] font-black text-slate-200 uppercase tracking-[0.4em] pb-12">
        TEAMS PLATFORM • CORE 2.0 • 2025
      </div>
    </div>
  );
};

export default Profile;
