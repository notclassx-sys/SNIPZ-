
import React, { useState, useEffect } from 'react';
import { User, Task, TaskLog } from '../types';
import { db } from '../services/mockDb';
import { getTeamActivitySummary } from '../services/geminiService';

interface DashboardProps {
  user: User;
}

const formatTimeAgo = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  if (diff < 30000) return 'Just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, activeMembers: 0 });
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [aiPulse, setAiPulse] = useState("Analyzing team flow...");

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [user.roomId]);

  const loadData = async () => {
    if (!user.roomId) return;
    const [allTasks, roomLogs, roomMembers] = await Promise.all([
      db.getTasks(user.roomId),
      db.getLogs(user.roomId),
      db.getRoomMembers(user.roomId)
    ]);
    
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
    <div className="space-y-8 animate-m3">
      <div className="px-1">
        <h2 className="text-4xl font-extrabold text-slate-900 tracking-tighter">Ops Center</h2>
        <p className="text-slate-500 font-bold text-sm mt-1">Workspace performance metrics</p>
      </div>

      {/* FIXED 2x2 GRID */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {[
          { label: 'Total', value: stats.total, color: 'emerald', icon: 'fa-cubes' },
          { label: 'Done', value: stats.completed, color: 'blue', icon: 'fa-check-circle' },
          { label: 'Wait', value: stats.pending, color: 'amber', icon: 'fa-clock' },
          { label: 'Nodes', value: stats.activeMembers, color: 'indigo', icon: 'fa-user-group' },
        ].map((stat, i) => (
          <div key={i} className="m3-card p-5 flex flex-col items-center text-center">
            <div className={`w-10 h-10 rounded-2xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-500 text-sm mb-3 shadow-sm`}>
              <i className={`fas ${stat.icon}`}></i>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</span>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
           <i className="fa-solid fa-brain text-9xl text-emerald-400"></i>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/30">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">AI Pulse</span>
          </div>
        </div>
        <p className="text-lg font-bold text-white leading-snug italic relative z-10">"{aiPulse}"</p>
      </div>

      <section>
        <h3 className="text-xl font-extrabold text-slate-900 mb-6 px-1 flex items-center gap-2">
          <i className="fa-solid fa-bolt text-emerald-500 text-sm"></i> Movement
        </h3>
        <div className="space-y-4">
          {logs.slice(0, 10).map((log) => (
            <div key={log.id} className="m3-card p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-sm ${
                log.action === 'PUSHED' ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'
              }`}>
                <i className={`fas ${log.action === 'PUSHED' ? 'fa-shuffle' : 'fa-check'}`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-slate-800 flex flex-wrap items-center">
                  <span>{log.fromUserName}</span>
                  <span className="mx-1.5 text-[10px] font-black text-slate-400 uppercase tracking-tighter">{log.action.toLowerCase()}</span>
                  <span className="text-emerald-600 truncate underline decoration-emerald-200 underline-offset-4">"{log.taskName}"</span>
                </div>
                <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1.5">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-12">
        <h3 className="text-xl font-extrabold text-slate-900 mb-5 px-1">Node Status</h3>
        <div className="grid grid-cols-1 gap-3">
          {members.map((m) => (
            <div key={m.id} className="m3-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative" style={{ width: '56px', height: '56px' }}>
                  <img 
                    src={m.avatar} 
                    className="avatar-fixed-md bg-slate-50 border border-slate-100 shadow-sm" 
                    style={{ width: '56px', height: '56px', borderRadius: '18px' }}
                    alt="" 
                  />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-white ${Date.now() - m.lastActive < 60000 ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">{m.name}</div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.role} {m.id === user.id ? '• YOU' : ''}</div>
                </div>
              </div>
              <div className="text-right">
                 <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase">{formatTimeAgo(m.lastActive)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
