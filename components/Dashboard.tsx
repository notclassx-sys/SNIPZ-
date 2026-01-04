
import React, { useState, useEffect } from 'react';
import { User, Task, TaskLog } from '../types';
import { db } from '../services/mockDb';
import { getTeamActivitySummary } from '../services/geminiService';

const formatTimeAgo = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  if (diff < 30000) return 'Just now';
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
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="px-1">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Ops Center</h2>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Real-time metrics</p>
      </div>

      {/* STAT GRID - RESILIENT 2x2 */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total', value: stats.total, color: '#10b981', icon: 'fa-cubes' },
          { label: 'Done', value: stats.completed, color: '#3b82f6', icon: 'fa-check' },
          { label: 'Wait', value: stats.pending, color: '#f59e0b', icon: 'fa-clock' },
          { label: 'Tasks', value: stats.activeMembers, color: '#6366f1', icon: 'fa-users' },
        ].map((stat, i) => (
          <div key={i} className="m3-card" style={{ textAlign: 'center', background: 'white', borderRadius: '24px', padding: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ 
              width: '40px', height: '40px', margin: '0 auto 12px',
              borderRadius: '12px', background: `${stat.color}15`, color: stat.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
            }}>
              <i className={`fas ${stat.icon}`} style={{ margin: 'auto' }}></i>
            </div>
            <span className="label-text" style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{stat.label}</span>
            <div className="text-3xl font-black text-slate-900 mt-1">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* MOVEMENT LOGS */}
      <section>
        <h3 className="text-xl font-black text-slate-900 mb-4 px-1 flex items-center gap-2">
          <i className="fas fa-bolt text-emerald-500 text-sm"></i> Movement
        </h3>
        <div className="space-y-3">
          {logs.slice(0, 5).map(log => (
            <div key={log.id} className="m3-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'white', borderRadius: '24px', padding: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0 }}>
                <i className={`fas ${log.action === 'PUSHED' ? 'fa-shuffle' : 'fa-check'} text-slate-400`}></i>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.fromUserName} <span style={{ color: '#94a3b8', fontSize: '9px', textTransform: 'uppercase' }}>{log.action}</span> <span className="text-emerald-600">"{log.taskName}"</span>
                </div>
                <div style={{ fontSize: '8px', fontWeight: '900', color: '#cbd5e1', textTransform: 'uppercase', marginTop: '2px' }}>
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="p-10 text-center opacity-20">
              <i className="fas fa-wind text-4xl mb-2"></i>
              <p className="text-xs font-black uppercase">No recent activity</p>
            </div>
          )}
        </div>
      </section>

      {/* RESTORED TEAM STATUS (ACTIVITY BAR) */}
      <section>
        <h3 className="text-xl font-black text-slate-900 mb-4 px-1">Team Status</h3>
        <div className="grid grid-cols-1 gap-3">
          {members.map((m) => (
            <div key={m.id} className="m3-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', background: 'white', borderRadius: '24px', padding: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                  <img 
                    src={m.avatar} 
                    style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: 'cover', background: '#f8fafc' }} 
                    alt="" 
                  />
                  <div style={{ 
                    position: 'absolute', bottom: '-2px', right: '-2px', 
                    width: '12px', height: '12px', borderRadius: '50%', border: '2px solid white',
                    background: (Date.now() - m.lastActive < 60000) ? '#10b981' : '#cbd5e1'
                  }}></div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.name} {m.id === user.id ? '(You)' : ''}
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', tracking: '0.05em' }}>
                    {m.role}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: '#10b981', background: '#f0fdf4', padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>
                  {formatTimeAgo(m.lastActive)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
