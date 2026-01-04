
import React, { useState, useEffect } from 'react';
import { User, Task } from '../types';
import { db } from '../services/mockDb';
import { getSmartTaskDescription } from '../services/geminiService';

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
  const [aiLoading, setAiLoading] = useState(false);
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
    <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center">
      <div className="w-full max-w-xl bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-m3-up">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-slate-900">New Task</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><i className="fas fa-times"></i></button>
        </div>
        <div className="space-y-4">
          <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold" placeholder="Task Name" value={name} onChange={e => setName(e.target.value)} />
          <textarea className="w-full p-4 bg-slate-50 rounded-2xl h-24" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <select className="p-4 bg-slate-50 rounded-2xl" value={assignedToId} onChange={e => setAssignedToId(e.target.value)}>
              <option value="">Assign To...</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="date" className="p-4 bg-slate-50 rounded-2xl" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <button onClick={handleConfirm} disabled={isSubmitting} className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest mt-4">
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

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [mode, user.roomId]);

  const loadData = async () => {
    if (!user.roomId) return;
    const allTasks = await db.getTasks(user.roomId);
    setTasks(mode === 'MY' ? allTasks.filter(t => t.assignedToId === user.id) : allTasks);
    setMembers(await db.getRoomMembers(user.roomId));
  };

  const handleComplete = async (id: string) => {
    await db.completeTask(id, user.id);
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end px-1">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{mode === 'MY' ? 'My Scope' : 'Operations'}</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Live Board</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><i className="fas fa-plus text-xl"></i></button>
      </div>

      <div className="space-y-4">
        {tasks.map(task => (
          <div key={task.id} className="m3-card">
            <h3 className="text-lg font-black text-slate-900 mb-1">{task.name}</h3>
            <p className="text-slate-500 text-sm mb-4">{task.description}</p>
            
            <div className="flex items-center gap-6 py-4 border-t border-slate-50 mt-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignedToName}`} 
                  style={{ width: '40px', height: '40px', borderRadius: '12px' }} 
                  alt="" 
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="label-text">Assignee</span>
                  <span className="value-text">{task.assignedToName}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #f1f5f9', paddingLeft: '16px' }}>
                <span className="label-text">Deadline</span>
                <span className="value-text">{task.deadline}</span>
              </div>
            </div>

            {task.status === 'PENDING' && mode === 'MY' && (
              <button onClick={() => handleComplete(task.id)} className="w-full mt-4 py-4 bg-emerald-50 text-emerald-600 rounded-xl font-black text-xs uppercase tracking-widest border border-emerald-100">
                Complete Task
              </button>
            )}
          </div>
        ))}
      </div>

      <CreateTaskModal isOpen={showCreate} onClose={() => setShowCreate(false)} user={user} members={members} onTaskCreated={loadData} />
    </div>
  );
};

export default TaskBoard;
