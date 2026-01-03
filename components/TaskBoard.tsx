
import React, { useState, useEffect } from 'react';
import { User, Task, UserRole } from '../types';
import { db } from '../services/mockDb';
import { getSmartTaskDescription } from '../services/geminiService';

interface TaskBoardProps {
  mode: 'ALL' | 'MY';
  user: User;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ mode, user }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showPush, setShowPush] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    deadline: '',
    assignedToId: '',
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [mode, user.roomId]);

  const loadData = async () => {
    if (!user.roomId) return;
    setIsRefreshing(true);
    try {
      const allTasks = await db.getTasks(user.roomId);
      setTasks(mode === 'MY' ? allTasks.filter(t => t.assignedToId === user.id) : allTasks);
      const roomMembers = await db.getRoomMembers(user.roomId);
      setMembers(roomMembers);
    } catch (e) {
      console.error("Data load failed", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.name || !newTask.assignedToId || !newTask.deadline) {
      alert("Missing info: Title, Assignee, and Deadline are required.");
      return;
    }
    
    if (!user.roomId) {
      alert("Session Error: No Room ID found.");
      return;
    }
    
    setIsSubmitting(true);
    const assignedUser = members.find(m => m.id === newTask.assignedToId);
    
    try {
      const result = await db.createTask({
        roomId: user.roomId,
        name: newTask.name,
        description: newTask.description,
        deadline: newTask.deadline,
        assignedToId: newTask.assignedToId,
        assignedToName: assignedUser?.name || 'Unknown',
        createdById: user.id,
        createdByName: user.name,
        status: 'PENDING'
      });

      if (result.data) {
        setShowCreate(false);
        setNewTask({ name: '', description: '', deadline: '', assignedToId: '' });
        await loadData();
      } else {
        // SHOW ACTUAL DB ERROR TO THE USER
        alert(`DATABASE ERROR: ${result.error}\n\nThis usually means a column is missing in your Supabase table or RLS is blocking the insert.`);
      }
    } catch (e: any) {
      alert(`CRITICAL ERROR: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSmartSuggest = async () => {
    if (!newTask.name) return;
    setAiLoading(true);
    const suggestion = await getSmartTaskDescription(newTask.name);
    setNewTask(prev => ({ ...prev, description: suggestion }));
    setAiLoading(false);
  };

  const handleCompleteTask = async (taskId: string) => {
    await db.completeTask(taskId, user.id);
    loadData();
  };

  const handlePushTask = async (taskId: string, targetUserId: string) => {
    await db.pushTask(taskId, targetUserId, user.id);
    setShowPush(null);
    loadData();
  };

  return (
    <div className="space-y-6 pb-10 animate-fade-up">
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{mode === 'MY' ? 'My Tasks' : 'Project Board'}</h2>
          <div className="flex items-center gap-2">
             <p className="text-slate-400 font-medium text-sm">Organized team delivery</p>
             {isRefreshing && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
          </div>
        </div>
        
        {user.roomId && (
          <button 
            onClick={() => {
              loadData(); 
              setShowCreate(true);
            }}
            className="w-14 h-14 bg-green-500 rounded-[1.5rem] flex items-center justify-center hover:bg-green-600 transition-all shadow-xl shadow-green-100 btn-bounce"
          >
            <i className="fas fa-plus text-white text-xl"></i>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-300">
               <i className="fas fa-tasks text-3xl"></i>
            </div>
            <p className="text-slate-400 font-bold">No tasks active</p>
          </div>
        ) : (
          tasks.map((task, i) => (
            <div 
              key={task.id} 
              className={`bg-white p-6 rounded-[2rem] relative transition-all border border-gray-100 shadow-sm animate-fade-up hover:shadow-md ${task.status === 'COMPLETED' ? 'opacity-60' : ''}`}
              style={{animationDelay: `${i*0.1}s`}}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 pr-4">
                  <h3 className={`font-black text-xl text-slate-800 leading-tight mb-1 ${task.status === 'COMPLETED' ? 'line-through' : ''}`}>
                    {task.name}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium line-clamp-2">{task.description}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                  task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {task.status === 'COMPLETED' ? 'Done' : 'Active'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-50">
                <div className="flex items-center gap-2.5">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignedToName}`} className="w-6 h-6 rounded-lg bg-gray-100" alt="" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase">Assignee</span>
                    <span className="text-xs font-bold text-slate-800">{task.assignedToName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center text-red-400 text-[10px]">
                    <i className="far fa-calendar"></i>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase">Deadline</span>
                    <span className="text-xs font-bold text-slate-800">{task.deadline}</span>
                  </div>
                </div>
              </div>

              {task.status === 'PENDING' && mode === 'MY' && (
                <div className="flex gap-3 mt-6">
                  <button 
                    onClick={() => handleCompleteTask(task.id)}
                    className="flex-1 py-4 bg-green-500 text-white rounded-2xl text-sm font-black hover:bg-green-600 transition-all shadow-lg shadow-green-100 btn-bounce"
                  >
                    <i className="fas fa-check-circle mr-2"></i> COMPLETE
                  </button>
                  <button 
                    onClick={() => setShowPush(task.id)}
                    className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl text-sm font-black hover:bg-slate-100 transition-all btn-bounce"
                  >
                    <i className="fas fa-arrow-right-arrow-left mr-2"></i> PUSH
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-[2rem] flex flex-col max-h-[90vh] shadow-2xl animate-scale-in">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Assign Task</h3>
                <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mt-0.5">Sync with team</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-slate-400">
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Task Title</label>
                <input 
                  type="text" 
                  placeholder="What needs to be done?"
                  className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 font-bold text-sm"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                  <button 
                    onClick={handleSmartSuggest}
                    disabled={aiLoading || !newTask.name || isSubmitting}
                    className="text-[9px] bg-green-50 text-green-600 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider hover:bg-green-100 transition-all"
                  >
                    {aiLoading ? 'Thinking...' : <><i className="fas fa-wand-magic-sparkles mr-1"></i> Smart Suggest</>}
                  </button>
                </div>
                <textarea 
                  placeholder="Add details here..."
                  className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium h-20 resize-none text-xs leading-relaxed"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Assign To</label>
                <div className="relative">
                  <select 
                    className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 font-bold appearance-none text-xs"
                    value={newTask.assignedToId}
                    onChange={(e) => setNewTask({ ...newTask, assignedToId: e.target.value })}
                    disabled={isSubmitting}
                  >
                    <option value="">Choose team member...</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[10px]">
                    <i className="fas fa-chevron-down"></i>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Deadline Date</label>
                <input 
                  type="date" 
                  className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 font-bold text-xs"
                  value={newTask.deadline}
                  onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="p-5 border-t border-gray-100">
              <button 
                onClick={handleCreateTask}
                disabled={isSubmitting || !newTask.name || !newTask.assignedToId || !newTask.deadline}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black transition-all shadow-xl shadow-slate-100 btn-bounce disabled:opacity-50 text-xs tracking-widest uppercase"
              >
                {isSubmitting ? 'Syncing...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPush && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-[2rem] p-6 shadow-2xl animate-scale-in">
            <h3 className="text-xl font-black text-slate-900 mb-5 tracking-tight">Delegate To...</h3>
            <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {members.filter(m => m.id !== user.id).map(member => (
                <button 
                  key={member.id}
                  onClick={() => handlePushTask(showPush, member.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-transparent hover:bg-green-50 hover:border-green-100 transition-all text-left btn-bounce"
                >
                  <img src={member.avatar} className="w-10 h-10 rounded-lg bg-white shadow-sm" alt={member.name} />
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-800 text-xs truncate">{member.name}</div>
                    <div className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-0.5 truncate">{member.email}</div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowPush(null)} className="w-full mt-6 py-3 bg-white border border-gray-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest btn-bounce">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskBoard;
