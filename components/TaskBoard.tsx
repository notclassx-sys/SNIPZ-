
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

  const handleSmartSuggest = async () => {
    (window as any).haptic?.('light');
    if (!name) return;
    setAiLoading(true);
    const suggestion = await getSmartTaskDescription(name);
    setDescription(suggestion);
    setAiLoading(false);
  };

  const handleConfirm = async () => {
    (window as any).haptic?.('medium');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-lg flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-xl bg-white rounded-t-[3rem] sm:rounded-[3rem] flex flex-col max-h-[92vh] shadow-2xl animate-m3-up overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Deploy Task</h3>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Material Cloud Assignment</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 touch-target">
            <i className="fas fa-xmark"></i>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Task Identifier</label>
            <input 
              type="text" 
              placeholder="Module Name..."
              className="w-full bg-slate-50 border border-transparent rounded-3xl px-6 py-4 text-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-lg"
              value={name} onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center px-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Context</label>
              <button onClick={handleSmartSuggest} disabled={aiLoading || !name} className="text-[10px] bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full font-bold uppercase hover:bg-emerald-100 transition-all">
                {aiLoading ? 'Thinking...' : 'AI Boost'}
              </button>
            </div>
            <textarea 
              placeholder="Deployment details..."
              className="w-full bg-slate-50 border border-transparent rounded-[2rem] px-6 py-5 text-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium h-32 resize-none text-base"
              value={description} onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Node Assignment</label>
              <select 
                className="w-full bg-slate-50 border border-transparent rounded-2xl px-6 py-4 text-slate-800 focus:outline-none font-bold appearance-none text-sm"
                value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}
              >
                <option value="">Select Node...</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Target Date</label>
              <input 
                type="date" 
                className="w-full bg-slate-50 border border-transparent rounded-2xl px-6 py-4 text-slate-800 focus:outline-none font-bold text-sm"
                value={deadline} onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-50 bg-white">
          <button 
            onClick={handleConfirm}
            disabled={isSubmitting || !name || !assignedToId || !deadline}
            className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-[2rem] font-black transition-all shadow-xl shadow-slate-200 m3-card disabled:opacity-50 text-base tracking-widest uppercase"
          >
            {isSubmitting ? 'Syncing...' : 'Authorize Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface TaskBoardProps {
  mode: 'ALL' | 'MY';
  user: User;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ mode, user }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [mode, user.roomId]);

  const loadData = async () => {
    if (!user.roomId) return;
    setIsRefreshing(true);
    const allTasks = await db.getTasks(user.roomId);
    setTasks(mode === 'MY' ? allTasks.filter(t => t.assignedToId === user.id) : allTasks);
    setMembers(await db.getRoomMembers(user.roomId));
    setIsRefreshing(false);
  };

  const handleComplete = async (id: string) => {
    (window as any).haptic?.('heavy');
    await db.completeTask(id, user.id);
    loadData();
  };

  return (
    <div className="space-y-8 pb-12 animate-m3-up">
      <div className="flex justify-between items-end px-1">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tightest">{mode === 'MY' ? 'My Nodes' : 'Project Board'}</h2>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-slate-400 font-bold text-sm">Orchestration view</span>
             {isRefreshing && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>}
          </div>
        </div>
        
        <button 
          onClick={() => { (window as any).haptic?.('light'); setShowCreate(true); }}
          className="w-16 h-16 bg-emerald-500 rounded-[2.2rem] flex items-center justify-center hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-200 m3-card"
        >
          <i className="fas fa-plus text-white text-2xl"></i>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {tasks.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-slate-200">
            <i className="fa-solid fa-wind text-4xl text-slate-100 mb-4 block"></i>
            <p className="text-slate-300 font-black uppercase tracking-widest text-xs">Clear Workspace</p>
          </div>
        ) : (
          tasks.map((task, i) => (
            <div 
              key={task.id} 
              className={`bg-white p-7 rounded-[2.8rem] relative transition-all border border-slate-100 shadow-sm animate-m3-up m3-card ${task.status === 'COMPLETED' ? 'grayscale opacity-50' : ''}`}
              style={{animationDelay: `${i*0.08}s`}}
            >
              <div className="flex justify-between items-start mb-5">
                <div className="flex-1">
                  <h3 className={`font-black text-xl text-slate-900 leading-tight mb-2 ${task.status === 'COMPLETED' ? 'line-through' : ''}`}>
                    {task.name}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-2">{task.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 mt-6 py-5 border-y border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignedToName}`} className="w-8 h-8 rounded-lg" alt="" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Assignee</span>
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[80px]">{task.assignedToName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-l border-slate-50 pl-6">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 text-sm">
                    <i className="far fa-calendar-check"></i>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Deadline</span>
                    <span className="text-xs font-bold text-slate-800">{task.deadline}</span>
                  </div>
                </div>
              </div>

              {task.status === 'PENDING' && mode === 'MY' && (
                <button 
                  onClick={() => handleComplete(task.id)}
                  className="w-full mt-6 py-4 bg-emerald-500 text-white rounded-2xl text-sm font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 m3-card flex items-center justify-center gap-2"
                >
                  <i className="fas fa-check-circle"></i> COMPLETE NODE
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <CreateTaskModal 
        isOpen={showCreate} onClose={() => setShowCreate(false)} 
        user={user} members={members} onTaskCreated={loadData} 
      />
    </div>
  );
};

export default TaskBoard;
