
import React, { useState, useEffect } from 'react';
import { User, Task, TaskLog } from '../types';
import { db } from '../services/mockDb';

const formatTimeAgo = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  if (diff < 15000) return 'Just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, activeMembers: 0 });
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [members, setMembers] = useState<User[]>([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000); // Tight polling for live feel
    return () => clearInterval(interval);
  }, [user.roomId]);

  const loadData = async () => {
    if (!user.roomId) return;
    try {
      const [allTasks, roomLogs, roomMembers] = await Promise.all([
        db.getTasks(user.roomId),
        db.getLogs(user.roomId),
        db.getRoomMembers(user.roomId)
      ]);
      
      const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
      const now = Date.now();

      const liveTasks = allTasks.filter(t => {
        if (t.status === 'PENDING') return true;
        if (t.status === 'COMPLETED' && t.completedAt) {
          return (now - t.completedAt) < THREE_HOURS_MS;
        }
        return false;
      });
      
      setStats({
        total: liveTasks.length,
        completed: liveTasks.filter(t => t.status === 'COMPLETED').length,
        pending: liveTasks.filter(t => t.status === 'PENDING').length,
        activeMembers: roomMembers.length
      });
      setLogs(roomLogs);
      setMembers(roomMembers.sort((a, b) => b.lastActive - a.lastActive));
    } catch (err) {
      console.error("Dashboard Load Error", err);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'PUSHED': return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      case 'CREATED': return 'bg-indigo-100 text-indigo-600 border-indigo-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="px-1 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Ops Center</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Real-time Monitoring
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Syncing', value: stats.total, color: 'emerald', icon: 'fa-signal' },
          { label: 'Archived', value: stats.completed, color: 'blue', icon: 'fa-box-archive' },
          { label: 'Active', value: stats.pending, color: 'amber', icon: 'fa-spinner fa-spin' },
          { label: 'Units', value: stats.activeMembers, color: 'indigo', icon: 'fa-user-astronaut' },
        ].map((stat, i) => (
          <div key={i} className="m3-card relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-16 h-16 -mr-6 -mt-6 bg-${stat.color}-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500`}></div>
            <div className={`w-10 h-10 mb-4 rounded-xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center text-xs border border-${stat.color}-100`}>
              <i className={`fas ${stat.icon}`}></i>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{stat.label}</span>
            <div className="text-3xl font-black text-slate-900 mt-1">{stat.value}</div>
          </div>
        ))}
      </div>

      <section>
        <div className="flex items-center justify-between mb-6 px-1">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            Movement Feed
          </h3>
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Live Log</span>
        </div>
        
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="m3-card py-12 text-center border-dashed border-2 border-slate-100 bg-transparent">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Awaiting First Movement</p>
            </div>
          ) : (
            logs.slice(0, 6).map(log => (
              <div key={log.id} className="m3-card flex items-center gap-4 group hover:border-brand/20">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black border uppercase transition-colors ${getActionBadge(log.action)}`}>
                  {log.action[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-slate-800 leading-tight">
                    {log.fromUserName} <span className="text-slate-400 font-medium">processed</span> <span className="text-indigo-600 font-black">"{log.taskName}"</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{formatTimeAgo(log.timestamp)}</span>
                    <span className="text-slate-100">•</span>
                    <span className="text-[9px] font-black text-brand/50 uppercase tracking-widest">{log.action}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6 px-1">
          <h3 className="text-xl font-black text-slate-900">Unit Presence</h3>
          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{stats.activeMembers} Online</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {members.map((m) => {
            const isOnline = (Date.now() - m.lastActive < 65000);
            return (
              <div key={m.id} className="m3-card flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img 
                      src={m.avatar} 
                      className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm" 
                      alt="" 
                    />
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white transition-colors duration-500 ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900">
                      {m.name} {m.id === user.id ? <span className="text-indigo-500 text-[10px] font-black uppercase ml-1">(HOST)</span> : ''}
                    </div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                      {m.role} • {isOnline ? 'Direct Feed' : 'Signal Lost'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-[9px] font-black px-3 py-1.5 rounded-full border tracking-widest uppercase ${isOnline ? 'text-emerald-500 border-emerald-100 bg-emerald-50' : 'text-slate-300 border-slate-100 bg-slate-50'}`}>
                    {isOnline ? 'ACTIVE' : formatTimeAgo(m.lastActive)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
