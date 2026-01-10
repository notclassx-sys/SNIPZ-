
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
        setName('');
        setDescription('');
        setDeadline('');
        setAssignedToId('');
      } else {
        alert(`TASK DEPLOY ERROR: ${result.error}`);
      }
    } catch (err: any) {
      alert(`CRITICAL ERROR: ${err.message}`);
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
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 block">Title</label>
            <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Weekly Report" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 block">Context</label>
            <textarea className="w-full p-4 bg-slate-50 rounded-2xl h-24 border-none focus:ring-2 focus:ring-emerald-500" placeholder="Describe the requirements..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 block">Assignee</label>
              <select className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 font-bold" value={assignedToId} onChange={e => setAssignedToId(e.target.value)}>
                <option value="">Select...</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 block">Due Date</label>
              <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 font-bold" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>
          <button onClick={handleConfirm} disabled={isSubmitting || !name || !assignedToId || !deadline} className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest mt-4 shadow-xl shadow-emerald-100 disabled:opacity-50 btn-bounce">
            {isSubmitting ? 'DEPLOYING...' : 'DEPLOY TASK'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TaskBoard: React.FC<{ mode: 'ALL' | 'MY', user: User }> = ({ mode, user }) => {
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
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
    
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    const now = Date.now();
    
    const relevantTasks = allTasks.filter(t => mode === 'MY' ? t.assignedToId === user.id : true);
    
    // Separate and Filter
    const pending = relevantTasks.filter(t => t.status === 'PENDING');
    const completed = relevantTasks.filter(t => {
      if (t.status !== 'COMPLETED') return false;
      if (!t.completedAt) return true; // Show if missing timestamp (old tasks)
      return (now - t.completedAt) < THREE_HOURS_MS;
    }).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

    setPendingTasks(pending);
    setCompletedTasks(completed);
    setMembers(roomMembers);
  };

  const handleComplete = async (id: string) => {
    // FIX: Accessing haptic on window by casting to any to satisfy TS
    (window as any).haptic?.('heavy');
    const result = await db.completeTask(id, user.id);
    if (result.data) {
      loadData();
    } else {
      alert(`COMPLETION ERROR: ${result.error}`);
    }
  };

  const handlePush = async (taskId: string, targetMemberId: string) => {
    // FIX: Accessing haptic on window by casting to any to satisfy TS
    (window as any).haptic?.('light');
    const success = await db.pushTask(taskId, targetMemberId, user.id);
    if (success) {
      setPushingTaskId(null);
      loadData();
    } else {
      alert("Push failed.");
    }
  };

  // FIX: Added optional key to the prop types to resolve the JSX assignment error
  const TaskCard = ({ task, isCompleted }: { task: Task, isCompleted: boolean, key?: string }) => (
    <div className={`m3-card bg-white rounded-[24px] p-4 border border-black/5 shadow-sm transition-all ${isCompleted ? 'opacity-60 saturate-50' : ''}`}>
      <div className="flex justify-between items-start mb-1">
        <h3 className={`text-lg font-black leading-tight ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.name}</h3>
        {isCompleted && (
          <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
            <i className="fas fa-check-double"></i> Done
          </span>
        )}
      </div>
      <p className="text-slate-500 text-sm mb-4 line-clamp-2">{task.description}</p>
      
      <div className="flex items-center gap-6 py-4 border-t border-slate-50 mt-4">
        <div className="flex items-center gap-3">
          <img 
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignedToName}`} 
            className="w-10 h-10 rounded-xl bg-slate-50" 
            alt="" 
          />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase">Assignee</span>
            <span className="text-xs font-bold text-slate-800">{task.assignedToName}</span>
          </div>
        </div>
        {!isCompleted && (
          <div className="flex flex-col border-left border-slate-100 pl-4">
            <span className="text-[10px] font-black text-slate-400 uppercase">Deadline</span>
            <span className="text-xs font-bold text-slate-800">{task.deadline}</span>
          </div>
        )}
      </div>

      {!isCompleted && mode === 'MY' && (
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
              <button key={m.id} onClick={() => handlePush(task.id, m.id)} className="flex flex-col items-center gap-1 flex-shrink-0">
                <img src={m.avatar} className="w-10 h-10 rounded-xl border-2 border-white shadow-sm" alt={m.name} />
                <span className="text-[9px] font-bold text-slate-600 truncate w-12 text-center">{m.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end px-1">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{mode === 'MY' ? 'My Scope' : 'Operations'}</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Live Queue</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 active:scale-95 transition-transform">
          <i className="fas fa-plus text-xl"></i>
        </button>
      </div>

      <div className="space-y-4">
        {pendingTasks.map(task => <TaskCard key={task.id} task={task} isCompleted={false} />)}
        
        {completedTasks.length > 0 && (
          <div className="pt-8 pb-4">
            <div className="flex items-center gap-4 mb-6 opacity-30">
              <div className="flex-1 h-[1px] bg-slate-900"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Recently Finished (3h Archive)</span>
              <div className="flex-1 h-[1px] bg-slate-900"></div>
            </div>
            <div className="space-y-4">
              {completedTasks.map(task => <TaskCard key={task.id} task={task} isCompleted={true} />)}
            </div>
          </div>
        )}

        {pendingTasks.length === 0 && completedTasks.length === 0 && (
          <div className="py-20 text-center opacity-30">
            <i className="fas fa-clipboard-list text-6xl mb-4"></i>
            <p className="font-bold">No tasks found</p>
          </div>
        )}
      </div>

      <CreateTaskModal isOpen={showCreate} onClose={() => setShowCreate(false)} user={user} members={members} onTaskCreated={loadData} />
    </div>
  );
};

export default TaskBoard;
