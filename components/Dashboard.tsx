
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
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    activeMembers: 0
  });
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
    let roomMembers = await db.getRoomMembers(user.roomId);
    
    // Ensure the list is sorted by most recent activity
    const sortedMembers = roomMembers.sort((a, b) => b.lastActive - a.lastActive);
    
    setStats({
      total: allTasks.length,
      completed: allTasks.filter(t => t.status === 'COMPLETED').length,
      pending: allTasks.filter(t => t.status === 'PENDING').length,
      activeMembers: sortedMembers.length > 0 ? sortedMembers.length : 1
    });
    setLogs(roomLogs);
    setMembers(sortedMembers.length > 0 ? sortedMembers : [user]);

    if (roomLogs.length > 0) {
      const summary = await getTeamActivitySummary(roomLogs);
      setAiPulse(summary);
    } else {
      setAiPulse("Your team workspace is ready for action.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Ops Center</h2>
        <p className="text-slate-400 font-medium">Workspace performance & metrics</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Total Tasks', value: stats.total, color: 'green', icon: 'fa-layer-group' },
          { label: 'Completed', value: stats.completed, color: 'emerald', icon: 'fa-circle-check' },
          { label: 'In Pipeline', value: stats.pending, color: 'amber', icon: 'fa-clock' },
          { label: 'Team Size', value: stats.activeMembers, color: 'blue', icon: 'fa-users' },
        ].map((stat, i) => (
          <div key={i} className={`bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm animate-scale-in`} style={{animationDelay: `${i*0.05}s`}}>
            <div className={`text-${stat.color}-500 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-2`}>
              <i className={`fas ${stat.icon}`}></i>
              {stat.label}
            </div>
            <div className="text-4xl font-black text-slate-800 tracking-tighter">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-green-500 p-6 rounded-[2.5rem] shadow-xl shadow-green-100 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
           <i className="fas fa-wand-magic-sparkles text-8xl text-white"></i>
        </div>
        <div className="flex items-center gap-2 mb-2 relative z-10">
          <i className="fas fa-microchip text-white"></i>
          <span className="text-[10px] font-black text-green-100 uppercase tracking-widest">Team Pulse AI</span>
        </div>
        <p className="text-lg font-bold text-white leading-tight relative z-10">"{aiPulse}"</p>
      </div>

      <div>
        <h3 className="text-xl font-extrabold text-slate-900 mb-4 flex items-center justify-between">
          Movement
          <span className="text-[10px] bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold uppercase tracking-wider">Real-time</span>
        </h3>
        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-200 text-slate-400 font-medium">No activity yet.</div>
          ) : (
            logs.map((log, i) => (
              <div key={log.id} className="flex gap-4 items-start animate-fade-up" style={{animationDelay: `${i*0.05}s`}}>
                <div className={`mt-1.5 w-3 h-3 rounded-full flex-shrink-0 border-2 border-white shadow-sm ${
                  log.action === 'PUSHED' ? 'bg-amber-400' : log.action === 'COMPLETED' ? 'bg-green-500' : 'bg-green-400'
                }`}></div>
                <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
                  <div className="text-sm leading-relaxed">
                    <span className="font-bold text-slate-800">{log.fromUserName || 'System'}</span>
                    <span className="text-slate-400 mx-1.5 lowercase font-medium">
                      {log.action === 'PUSHED' ? 'pushed' : log.action === 'COMPLETED' ? 'finished' : 'created'}
                    </span>
                    <span className="font-extrabold text-green-600">"{log.taskName}"</span>
                    {log.action === 'PUSHED' && (
                      <>
                        <span className="text-slate-400 mx-1.5 font-medium">to</span>
                        <span className="font-bold text-slate-800">{log.toUserName}</span>
                      </>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1.5 font-bold uppercase tracking-widest">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-6">
        <h3 className="text-xl font-extrabold text-slate-900 mb-4 flex items-center justify-between">
          Live Status
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </h3>
        <div className="space-y-3">
          {members.map((m, i) => (
            <div key={m.id} className="flex items-center justify-between p-4 rounded-3xl bg-white border border-gray-100 shadow-sm animate-fade-up" style={{animationDelay: `${i*0.1}s`}}>
              <div className="flex items-center gap-4">
                <img src={m.avatar} className="w-12 h-12 rounded-2xl border-2 border-green-50 shadow-sm" alt="" />
                <div>
                  <div className="text-base font-bold text-slate-800">{m.name}</div>
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    {m.role} {m.id === user.id && "• YOU"}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                 <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-slate-500 font-bold">{formatTimeAgo(m.lastActive)}</span>
                    <div className={`w-2.5 h-2.5 rounded-full ${Date.now() - m.lastActive < 60000 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-gray-300'}`}></div>
                 </div>
                 <span className="text-[9px] text-slate-300 font-black uppercase tracking-tighter">
                    Activity Monitor
                 </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
