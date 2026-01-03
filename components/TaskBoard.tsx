
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

  // Create Task Form State
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
    const allTasks = await db.getTasks(user.roomId);
    setTasks(mode === 'MY' ? allTasks.filter(t => t.assignedToId === user.id) : allTasks);
    
    let roomMembers = await db.getRoomMembers(user.roomId);
    // Ensure the current user is always available for assignment even if fetch is pending
    if (!roomMembers.find(m => m.id === user.id)) {
      roomMembers = [user, ...roomMembers];
    }
    setMembers(roomMembers);
  };

  const handleCreateTask = async () => {
    if (!newTask.name || !newTask.assignedToId || !newTask.deadline) return;
    const assignedUser = members.find(m => m.id === newTask.assignedToId);
    await db.createTask({
      roomId: user.roomId!,
      name: newTask.name,
      description: newTask.description,
      deadline: newTask.deadline,
      assignedToId: newTask.assignedToId,
      assignedToName: assignedUser?.name || 'Unknown',
      createdById: user.id,
      createdByName: user.name,
      status: 'PENDING'
    });
    setShowCreate(false);
    setNewTask({ name: '', description: '', deadline: '', assignedToId: '' });
    loadData();
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
          <p className="text-slate-400 font-medium text-sm">Organized team delivery</p>
        </div>
        {user.role === 'ADMIN' && (
          <button 
            onClick={() => setShowCreate(true)}
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
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignedToName}`} className="w-6 h-6 rounded-lg bg-gray-100" />
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

              <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-2">
                 <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Creator:</span>
                 <span className="text-[10px] font-bold text-slate-500 uppercase">{task.createdByName}</span>
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

      {/* Modal: Create Task */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-[2.5rem] p-8 animate-in slide-in-from-bottom duration-300 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Assign Task</h3>
                <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mt-1">Creating as: {user.name}</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-slate-400">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Task Title</label>
                <input 
                  type="text" 
                  placeholder="What needs to be done?"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 font-bold"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                  <button 
                    onClick={handleSmartSuggest}
                    disabled={aiLoading || !newTask.name}
                    className="text-[10px] bg-green-50 text-green-600 px-3 py-1 rounded-full font-black uppercase tracking-wider hover:bg-green-100 transition-all disabled:opacity-50"
                  >
                    {aiLoading ? 'Thinking...' : <><i className="fas fa-wand-magic-sparkles mr-1"></i> AI Suggestions</>}
                  </button>
                </div>
                <textarea 
                  placeholder="Add details here..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium h-32 resize-none"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Assign To</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 font-bold appearance-none"
                    value={newTask.assignedToId}
                    onChange={(e) => setNewTask({ ...newTask, assignedToId: e.target.value })}
                  >
                    <option value="">Select...</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.id === user.id ? `Me (${m.name})` : m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Deadline</label>
                  <input 
                    type="date" 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 font-bold"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-6">
                <button 
                  onClick={handleCreateTask}
                  className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black transition-all shadow-xl shadow-slate-200 btn-bounce"
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Push Task */}
      {showPush && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl animate-scale-in">
            <h3 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Delegate To...</h3>
            <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar px-1">
              {members.filter(m => m.id !== user.id).map(member => (
                <button 
                  key={member.id}
                  onClick={() => handlePushTask(showPush, member.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-transparent hover:bg-green-50 hover:border-green-200 transition-all text-left btn-bounce"
                >
                  <img src={member.avatar} className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-100" alt={member.name} />
                  <div>
                    <div className="font-extrabold text-slate-800 text-base leading-tight">{member.name}</div>
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{member.role}</div>
                  </div>
                </button>
              ))}
              {members.filter(m => m.id !== user.id).length === 0 && (
                <p className="text-slate-400 font-bold text-center py-6">Invite others to push tasks</p>
              )}
            </div>
            <button 
              onClick={() => setShowPush(null)}
              className="w-full mt-8 py-4 bg-white border border-gray-100 text-slate-400 rounded-2xl text-sm font-bold btn-bounce"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskBoard;
