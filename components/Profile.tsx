
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

  useEffect(() => {
    const data = localStorage.getItem('snipx_data');
    if (data) {
      const parsed = JSON.parse(data);
      const currentRoom = parsed.rooms.find((r: any) => r.id === user.roomId);
      setRoom(currentRoom);
    }
  }, [user.roomId]);

  const copyInviteCode = () => {
    if (room) {
      navigator.clipboard.writeText(room.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex flex-col items-center text-center">
        <div className="relative group animate-scale-in">
          <div className="w-32 h-32 bg-white rounded-[3rem] p-1 border-4 border-green-50 shadow-2xl relative overflow-hidden">
             <img src={user.avatar} className="w-full h-full rounded-[2.8rem] object-cover bg-gray-50" alt={user.name} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-green-500 rounded-2xl flex items-center justify-center border-4 border-white shadow-lg shadow-green-100">
            <i className="fas fa-pencil text-xs text-white"></i>
          </div>
        </div>
        <div className="mt-6">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">{user.name}</h2>
          <p className="text-slate-400 font-bold text-sm tracking-wide">{user.email}</p>
        </div>
        <div className="mt-4 inline-flex items-center px-4 py-1.5 bg-green-50 text-green-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-green-100">
          <i className="fas fa-shield-halved mr-2"></i>
          {user.role}
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 animate-fade-up stagger-1">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Workspace Intel</h3>
        <div className="space-y-6">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-slate-300 uppercase">Room Label</span>
            <span className="font-extrabold text-xl text-slate-800">{room?.name || 'Snipx Lab'}</span>
          </div>
          <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-slate-300 uppercase">Invite Code</span>
              <span className="font-mono text-2xl font-black text-green-500 tracking-widest">{room?.inviteCode || 'CODE01'}</span>
            </div>
            <button 
              onClick={copyInviteCode}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all btn-bounce ${
                copied ? 'bg-green-500 text-white' : 'bg-gray-50 text-slate-400 border border-gray-100 hover:bg-gray-100'
              }`}
            >
              <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} text-lg`}></i>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 animate-fade-up stagger-2">
        {[
          { icon: 'fa-cog', label: 'Settings', color: 'slate' },
          { icon: 'fa-shield-heart', label: 'Privacy & Security', color: 'slate' },
          { icon: 'fa-life-ring', label: 'Help & Support', color: 'slate' },
        ].map((item, i) => (
          <button key={i} className="w-full flex items-center justify-between p-5 bg-white border border-gray-50 rounded-2xl group hover:border-green-100 transition-all btn-bounce shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-green-50 group-hover:text-green-500 transition-all">
                 <i className={`fas ${item.icon}`}></i>
              </div>
              <span className="font-bold text-slate-700">{item.label}</span>
            </div>
            <i className="fas fa-chevron-right text-slate-200 text-xs group-hover:translate-x-1 transition-transform"></i>
          </button>
        ))}
        
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-3 p-6 bg-red-50 text-red-500 rounded-[2rem] font-black hover:bg-red-500 transition-all hover:text-white mt-8 shadow-sm btn-bounce uppercase tracking-widest text-xs"
        >
          <i className="fas fa-power-off"></i>
          Log out session
        </button>
      </div>

      <div className="text-center text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] pb-10">
        SNIPX LIBRARY • VER 1.0.8 • 2025
      </div>
    </div>
  );
};

export default Profile;
