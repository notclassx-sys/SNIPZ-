
import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../services/mockDb';

interface RoomManagerProps {
  user: User;
  onUpdate: () => void;
}

const RoomManager: React.FC<RoomManagerProps> = ({ user, onUpdate }) => {
  const [roomName, setRoomName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [view, setView] = useState<'CHOICE' | 'CREATE' | 'JOIN'>('CHOICE');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!roomName.trim()) return;
    setLoading(true);
    const room = await db.createRoom(roomName, user);
    setLoading(false);
    if (room) onUpdate();
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    const room = await db.joinRoom(inviteCode, user);
    setLoading(false);
    if (room) {
      onUpdate();
    } else {
      alert("Invalid Invite Code");
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 animate-fade-up">
      <div className="w-full max-md">
        <div className="text-center mb-12 animate-scale-in">
          <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Setup Space</h2>
          <p className="text-slate-400 font-medium">Create or join your team</p>
        </div>

        {view === 'CHOICE' && (
          <div className="space-y-5">
            <button 
              onClick={() => setView('CREATE')}
              className="w-full p-8 bg-white border border-gray-100 rounded-[2.5rem] text-left hover:border-green-300 transition-all group shadow-xl shadow-gray-100 btn-bounce animate-fade-up stagger-1"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-green-50 rounded-[1.5rem] flex items-center justify-center text-green-500 group-hover:bg-green-500 group-hover:text-white transition-all shadow-sm">
                  <i className="fas fa-plus text-2xl"></i>
                </div>
                <div>
                  <h3 className="font-black text-xl text-slate-800">New Room</h3>
                  <p className="text-sm text-slate-400 font-medium mt-1">Admin control & team creation</p>
                </div>
              </div>
            </button>
            <button 
              onClick={() => setView('JOIN')}
              className="w-full p-8 bg-white border border-gray-100 rounded-[2.5rem] text-left hover:border-slate-300 transition-all group shadow-xl shadow-gray-100 btn-bounce animate-fade-up stagger-2"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                  <i className="fas fa-sign-in-alt text-2xl"></i>
                </div>
                <div>
                  <h3 className="font-black text-xl text-slate-800">Join Existing</h3>
                  <p className="text-sm text-slate-400 font-medium mt-1">Enter a 6-digit invite code</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {view === 'CREATE' && (
          <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-2xl animate-scale-in">
            <button onClick={() => setView('CHOICE')} className="text-slate-300 text-sm font-black hover:text-green-500 transition-all mb-8 block uppercase tracking-widest">
              <i className="fas fa-arrow-left mr-2"></i> Back
            </button>
            <h3 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Workspace Name</h3>
            <input 
              type="text" 
              placeholder="e.g. Design Studio" 
              className="w-full bg-gray-50 border border-transparent rounded-2xl px-6 py-5 focus:outline-none focus:ring-4 focus:ring-green-100 text-slate-800 font-bold text-lg mb-8"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              autoFocus
              disabled={loading}
            />
            <button 
              onClick={handleCreate}
              disabled={!roomName.trim() || loading}
              className="w-full py-5 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-green-100 btn-bounce disabled:opacity-50"
            >
              {loading ? 'Launching...' : 'Launch Now'}
            </button>
          </div>
        )}

        {view === 'JOIN' && (
          <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-2xl animate-scale-in">
            <button onClick={() => setView('CHOICE')} className="text-slate-300 text-sm font-black hover:text-green-500 transition-all mb-8 block uppercase tracking-widest">
              <i className="fas fa-arrow-left mr-2"></i> Back
            </button>
            <h3 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Access Key</h3>
            <input 
              type="text" 
              placeholder="000000" 
              className="w-full bg-gray-50 border border-transparent rounded-2xl px-6 py-5 focus:outline-none focus:ring-4 focus:ring-green-100 text-slate-800 uppercase tracking-[0.5em] text-center text-3xl font-black mb-8"
              maxLength={6}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              autoFocus
              disabled={loading}
            />
            <button 
              onClick={handleJoin}
              disabled={inviteCode.length !== 6 || loading}
              className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-slate-200 btn-bounce disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomManager;
