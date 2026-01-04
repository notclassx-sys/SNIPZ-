
import React, { useState, useEffect } from 'react';
import { User, Task, TaskLog } from '../types';
import { db } from '../services/mockDb';
import { getTeamActivitySummary } from '../services/geminiService';

interface DashboardProps {
  user: User;
}

const formatTimeAgo = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  if (diff < 15000) return 'Just now';
  if (diff < 60000) return 'Online';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, activeMembers: 0 });
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [aiPulse, setAiPulse] = useState("Analyzing recent activity...");

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [user.roomId]);

  const loadData = async () => {
    if (!user.roomId) return;
    const allTasks = await db.getTasks(user.roomId);
    const roomLogs = await db.getLogs(user.roomId);
    const roomMembers = await db.getRoomMembers(user.roomId);
    
    setStats({
      total: allTasks.length,
      completed: allTasks.filter(t => t.status === 'COMPLETED').length,
      pending: allTasks.filter(t => t.status === 'PENDING').length,
      activeMembers: roomMembers.length
    });
    setLogs(roomLogs);
    setMembers(roomMembers.sort((a, b) => b.lastActive - a.lastActive));

    if (roomLogs.length > 0) {
      const summary = await getTeamActivitySummary(roomLogs);
      setAiPulse(summary);
    }
  };

  return (
    <div className="space-y-8 animate-m3-up">
      <div className="flex flex-col px-1">
        <h2 className="text-4xl font-extrabold text-slate-900 tracking-tightest">Ops Center</h2>
        <p className="text-slate-400 font-bold text-sm tracking-wide">Dynamic team intelligence</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'emerald', icon: 'fa-cubes' },
          { label: 'Ready', value: stats.completed, color: 'blue', icon: 'fa-circle-check' },
          { label: 'Pending', value: stats.pending, color: 'amber', icon: 'fa-hourglass-half' },
          { label: 'Nodes', value: stats.activeMembers, color: 'indigo', icon: 'fa-microchip' },
        ].map((stat, i) => (
          <div key={i} className={`bg-white p-6 rounded-[2.8rem] m3-card border border-slate-100 shadow-sm animate-m3-up`} style={{animationDelay: `${i*0.05}s`}}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-500 text-xs`}>
                <i className={`fas ${stat.icon}`}></i>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
            </div>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Material 3 Surface Container (AI Section) */}
      <div className="bg-slate-900 p-8 rounded-[3.2rem] shadow-2xl relative overflow-hidden m3-card group">
        <div className="absolute top-0 right-0 p-6 opacity-20 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
           <i className="fa-solid fa-bolt-lightning text-9xl text-emerald-400"></i>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <div className="px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/30">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Team Pulse AI</span>
          </div>
        </div>
        <p className="text-xl font-bold text-white leading-snug relative z-10 italic">"{aiPulse}"</p>
      </div>

      <section>
        <h3 className="text-xl font-extrabold text-slate-900 mb-5 px-1">Movement</h3>
        <div className="space-y-4">
          {logs.map((log, i) => (
            <div key={log.id} className="flex gap-4 items-center animate-m3-up" style={{animationDelay: `${i*0.05}s`}}>
              <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-lg ${
                log.action === 'PUSHED' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                <i className={`fas ${log.action === 'PUSHED' ? 'fa-shuffle' : 'fa-check-double'}`}></i>
              </div>
              <div className="flex-1 bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm m3-card">
                <div className="text-sm font-medium text-slate-600 leading-tight">
                  <span className="font-bold text-slate-900">{log.fromUserName}</span> {log.action.toLowerCase()} <span className="text-emerald-600 font-bold underline decoration-2 underline-offset-4">"{log.taskName}"</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {log.action === 'PUSHED' && <div className="text-[9px] font-black bg-slate-50 px-2 py-0.5 rounded text-slate-400">-> {log.toUserName}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-10">
        <h3 className="text-xl font-extrabold text-slate-900 mb-5 px-1">Active Nodes</h3>
        <div className="grid grid-cols-1 gap-3">
          {members.map((m, i) => (
            <div key={m.id} className="flex items-center justify-between p-5 rounded-[2.2rem] bg-white border border-slate-100 shadow-sm m3-card animate-m3-up" style={{animationDelay: `${i*0.05}s`}}>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={m.avatar} className="w-14 h-14 rounded-3xl bg-slate-50 p-1 border border-slate-200" alt="" />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-white ${Date.now() - m.lastActive < 60000 ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                </div>
                <div>
                  <div className="text-base font-bold text-slate-900">{m.name}</div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.role} {m.id === user.id ? '• HOST' : ''}</div>
                </div>
              </div>
              <div className="text-right">
                 <div className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full">{formatTimeAgo(m.lastActive)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
