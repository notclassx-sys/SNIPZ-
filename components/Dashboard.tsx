
import React, { useState, useEffect } from 'react';
import { User, Task, TaskLog } from '../types';
import { db } from '../services/mockDb';
import { getTeamActivitySummary } from '../services/geminiService';

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, activeMembers: 0 });
  const [logs, setLogs] = useState<TaskLog[]>([]);

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
  };

  return (
    <div className="space-y-8">
      <div className="px-1">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Ops Center</h2>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Real-time metrics</p>
      </div>

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

      <section>
        <h3 className="text-xl font-black text-slate-900 mb-4 px-1">Movement</h3>
        <div className="space-y-3">
          {logs.slice(0, 5).map(log => (
            <div key={log.id} className="m3-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'white', borderRadius: '24px', padding: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0 }}>
                <i className="fas fa-history text-slate-400"></i>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.fromUserName} <span style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase' }}>{log.action}</span> {log.taskName}
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
