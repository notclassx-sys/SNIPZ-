
import React, { useState, useEffect } from 'react';
import { User, Task } from '../types';
import { db } from '../services/mockDb';
import { adService } from '../services/adService';

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
        adService.requestInterstitial();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Critical: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade">
      <div className="w-full max-w-xl bg-white rounded-t-4xl sm:rounded-4xl p-8 shadow-2xl animate-m3">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Deploy Task</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><i className="fas fa-times"></i></button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Task Identification</label>
            <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-brand" placeholder="e.g. Asset Audit" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Context & Brief</label>
            <textarea className="w-full p-4 bg-slate-50 rounded-2xl h-24 border-none focus:ring-2 focus:ring-brand font-medium" placeholder="Specific requirements..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Assign Unit</label>
              <select className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand font-bold" value={assignedToId} onChange={e => setAssignedToId(e.target.value)}>
                <option value="">Select Member</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Deadline</label>
              <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand font-bold" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>
          <button onClick={handleConfirm} disabled={isSubmitting || !name || !assignedToId || !deadline} className="w-full py-5 bg-brand text-white rounded-3xl font-black uppercase tracking-widest mt-4 shadow-xl shadow-brand/20 disabled:opacity-50 btn-bounce">
            {isSubmitting ? 'SYNCING...' : 'CONFIRM DEPLOY'}
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
    
    setPendingTasks(relevantTasks.filter(t => t.status === 'PENDING'));
    setCompletedTasks(relevantTasks.filter(t => {
      if (t.status !== 'COMPLETED') return false;
      return !t.completedAt || (now - t.completedAt) < THREE_HOURS_MS;
    }).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)));
    setMembers(roomMembers);
  };

  const handleComplete = async (id: string) => {
    (window as any).haptic?.('heavy');
    const result = await db.completeTask(id, user.id);
    if (result.data) loadData();
  };

  const handlePush = async (taskId: string, targetMemberId: string) => {
    (window as any).haptic?.('light');
    const success = await db.pushTask(taskId, targetMemberId, user.id);
    if (success) {
      setPushingTaskId(null);
      loadData();
    }
  };

  const TaskCard: React.FC<{ task: Task, isCompleted: boolean }> = ({ task, isCompleted }) => (
    <div className={`m3-card bg-white animate-m3 overflow-hidden ${isCompleted ? 'opacity-40 grayscale' : 'hover:border-slate-200 shadow-sm'}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className={`text-lg font-black leading-tight tracking-tight ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.name}</h3>
        {isCompleted ? (
          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">Verified</div>
        ) : (
          <div className="text-[8px] font-black text-brand uppercase tracking-[0.2em] bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">Active</div>
        )}
      </div>
      <p className="text-slate-500 text-sm mb-6 font-medium line-clamp-2">{task.description}</p>
      
      <div className="flex items-center justify-between pt-5 border-t border-slate-50">
        <div className="flex items-center gap-3">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignedToName}`} className="w-8 h-8 rounded-xl bg-slate-50" alt="" />
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-300 uppercase leading-none mb-0.5">Assigned</span>
            <span className="text-[11px] font-bold text-slate-800">{task.assignedToName}</span>
          </div>
        </div>
        {!isCompleted && (
          <div className="text-right">
            <span className="text-[8px] font-black text-slate-300 uppercase leading-none mb-0.5">Due</span>
            <span className="block text-[11px] font-bold text-slate-800">{task.deadline}</span>
          </div>
        )}
      </div>

      {!isCompleted && mode === 'MY' && (
        <div className="mt-6 flex gap-2">
          <button 
            onClick={() => handleComplete(task.id)} 
            className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-emerald-100 active:bg-emerald-100 transition-colors btn-bounce"
          >
            Complete Task
          </button>
          <button 
            onClick={() => setPushingTaskId(pushingTaskId === task.id ? null : task.id)} 
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${pushingTaskId === task.id ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-400 border-slate-100'} btn-bounce`}
          >
            <i className="fas fa-shuffle"></i>
          </button>
        </div>
      )}

      {pushingTaskId === task.id && (
        <div className="mt-4 p-4 bg-slate-50 rounded-2xl animate-fade">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">Push to teammate:</p>
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {members.filter(m => m.id !== user.id).map(m => (
              <button key={m.id} onClick={() => handlePush(task.id, m.id)} className="flex flex-col items-center gap-1.5 flex-shrink-0 btn-bounce">
                <img src={m.avatar} className="w-10 h-10 rounded-xl border-2 border-white shadow-sm" alt="" />
                <span className="text-[9px] font-bold text-slate-600 truncate w-12 text-center">{m.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end px-1">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{mode === 'MY' ? 'My Scope' : 'Ops Board'}</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Active Tasking Queue</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="w-14 h-14 bg-brand text-white rounded-2xl flex items-center justify-center shadow-xl shadow-brand/20 active:scale-95 transition-transform btn-bounce">
          <i className="fas fa-plus text-xl"></i>
        </button>
      </div>

      <div className="space-y-4">
        {pendingTasks.map(task => <TaskCard key={task.id} task={task} isCompleted={false} />)}
        
        {completedTasks.length > 0 && (
          <div className="pt-10">
            <div className="flex items-center gap-4 mb-8 opacity-20">
              <div className="flex-1 h-[1px] bg-slate-900"></div>
              <span className="text-[9px] font-black uppercase tracking-[0.3em] whitespace-nowrap">Archive Sync</span>
              <div className="flex-1 h-[1px] bg-slate-900"></div>
            </div>
            <div className="space-y-4">
              {completedTasks.map(task => <TaskCard key={task.id} task={task} isCompleted={true} />)}
            </div>
          </div>
        )}

        {pendingTasks.length === 0 && completedTasks.length === 0 && (
          <div className="py-24 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-4xl flex items-center justify-center mx-auto mb-6 text-slate-200">
               <i className="fas fa-clipboard-check text-4xl"></i>
            </div>
            <p className="font-black text-slate-300 uppercase tracking-widest text-[10px]">Queue Clear</p>
          </div>
        )}
      </div>

      <CreateTaskModal isOpen={showCreate} onClose={() => setShowCreate(false)} user={user} members={members} onTaskCreated={loadData} />
    </div>
  );
};

export default TaskBoard;
