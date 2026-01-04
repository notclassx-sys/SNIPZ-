
import React, { useState, useEffect } from 'react';
import { User, Task } from '../types';
import { db } from '../services/mockDb';

const CreateTaskModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: User;
  members: User[];
  onTaskCreated: () => void;
}> = ({ isOpen, onClose, user, members, onTaskCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!name || !assignedToId || !deadline) return;
    setIsSubmitting(true);
    const assignedUser = members.find(m => m.id === assignedToId);
    try {
      const result = await db.createTask({
        roomId: user.roomId!, name, description, deadline,
        assignedToId, assignedToName: assignedUser?.name || 'Unknown',
        createdById: user.id, createdByName: user.name, status: 'PENDING'
      });
      if (result.data) {
        onTaskCreated();
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="w-full max-w-xl bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-m3-up">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-slate-900">New Task</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><i className="fas fa-times"></i></button>
        </div>
        <div className="space-y-4">
          <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-emerald-500" placeholder="Task Name" value={name} onChange={e => setName(e.target.value)} />
          <textarea className="w-full p-4 bg-slate-50 rounded-2xl h-24 border-none focus:ring-2 focus:ring-emerald-500" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <select className="p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500" value={assignedToId} onChange={e => setAssignedToId(e.target.value)}>
              <option value="">Assign To...</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="date" className="p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <button onClick={handleConfirm} disabled={isSubmitting || !name || !assignedToId || !deadline} className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest mt-4 shadow-xl shadow-emerald-100 disabled:opacity-50">
            {isSubmitting ? 'Syncing...' : 'Deploy Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TaskBoard: React.FC<{ mode: 'ALL' | 'MY', user: User }> = ({ mode, user }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [pushingTaskId, setPushingTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [mode, user.roomId]);

  const loadData = async () => {
    if (!user.roomId) return;
    const [allTasks, roomMembers] = await Promise.all([
      db.getTasks(user.roomId),
      db.getRoomMembers(user.roomId)
    ]);
    setTasks(mode === 'MY' ? allTasks.filter(t => t.assignedToId === user.id) : allTasks);
    setMembers(roomMembers);
  };

  const handleComplete = async (id: string) => {
    (window as any).haptic?.('heavy');
    await db.completeTask(id, user.id);
    loadData();
  };

  const handlePush = async (taskId: string, targetMemberId: string) => {
    (window as any).haptic?.('light');
    const success = await db.pushTask(taskId, targetMemberId, user.id);
    if (success) {
      setPushingTaskId(null);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end px-1">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{mode === 'MY' ? 'My Scope' : 'Operations'}</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Live Board</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 active:scale-95 transition-transform">
          <i className="fas fa-plus text-xl"></i>
        </button>
      </div>

      <div className="space-y-4">
        {tasks.map(task => (
          <div key={task.id} className="m3-card" style={{ background: 'white', borderRadius: '24px', padding: '16px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', marginBottom: '16px' }}>
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-lg font-black text-slate-900 leading-tight">{task.name}</h3>
              {task.status === 'COMPLETED' && (
                <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Done</span>
              )}
            </div>
            <p className="text-slate-500 text-sm mb-4 line-clamp-2">{task.description}</p>
            
            <div className="flex items-center gap-6 py-4 border-t border-slate-50 mt-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignedToName}`} 
                  style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f8fafc' }} 
                  alt="" 
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="label-text" style={{ display: 'block', marginBottom: '2px', fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Assignee</span>
                  <span className="value-text" style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{task.assignedToName}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #f1f5f9', paddingLeft: '16px' }}>
                <span className="label-text" style={{ display: 'block', marginBottom: '2px', fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Deadline</span>
                <span className="value-text" style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{task.deadline}</span>
              </div>
            </div>

            {task.status === 'PENDING' && mode === 'MY' && (
              <div className="mt-4 flex gap-2">
                <button 
                  onClick={() => handleComplete(task.id)} 
                  className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[11px] uppercase tracking-widest border border-emerald-100 active:bg-emerald-100 transition-colors"
                >
                  Complete
                </button>
                <button 
                  onClick={() => setPushingTaskId(pushingTaskId === task.id ? null : task.id)} 
                  className={`w-14 rounded-xl flex items-center justify-center border transition-all ${pushingTaskId === task.id ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                >
                  <i className="fas fa-share-nodes"></i>
                </button>
              </div>
            )}

            {pushingTaskId === task.id && (
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl animate-fade-in">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Push to teammate:</p>
                <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                  {members.filter(m => m.id !== user.id).map(m => (
                    <button 
                      key={m.id} 
                      onClick={() => handlePush(task.id, m.id)}
                      className="flex flex-col items-center gap-1 flex-shrink-0"
                    >
                      <img 
                        src={m.avatar} 
                        className="w-10 h-10 rounded-xl border-2 border-white shadow-sm" 
                        alt={m.name} 
                        style={{ width: '40px', height: '40px', borderRadius: '12px' }}
                      />
                      <span className="text-[9px] font-bold text-slate-600 truncate w-12 text-center">{m.name.split(' ')[0]}</span>
                    </button>
                  ))}
                  {members.filter(m => m.id !== user.id).length === 0 && (
                    <p className="text-[10px] font-bold text-slate-300 italic">No other members in room</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="py-20 text-center opacity-30">
            <i className="fas fa-clipboard-list text-6xl mb-4"></i>
            <p className="font-bold">No active tasks found</p>
          </div>
        )}
      </div>

      <CreateTaskModal isOpen={showCreate} onClose={() => setShowCreate(false)} user={user} members={members} onTaskCreated={loadData} />
    </div>
  );
};

export default TaskBoard;
