
import { User, Room, Task, Message, TaskLog, UserRole } from '../types';
import { supabase } from './supabase';

export interface DbResult<T> {
  data: T | null;
  error?: string;
}

const parseTimestamp = (val: any): number => {
  if (!val) return Date.now();
  if (typeof val === 'number') return val;
  // Handle numeric strings
  if (typeof val === 'string' && /^\d+$/.test(val)) return parseInt(val, 10);
  // Handle ISO strings
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? Date.now() : parsed;
};

class DbService {
  private currentUser: User | null = null;

  async setCurrentUser(user: User) {
    this.currentUser = user;
    localStorage.setItem('snipx_user', JSON.stringify(user));
    
    const payload: any = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      last_active: Date.now(), // Back to numeric for BigInt
      role: user.role
    };
    
    if (user.roomId) {
      payload.room_id = user.roomId;
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(payload);
      
    if (error) console.error('Error updating user profile:', error.message);
  }

  async heartbeat(userId: string, roomId?: string) {
    if (!userId) return;
    const payload: any = { last_active: Date.now() }; // Back to numeric for BigInt
    if (roomId) payload.room_id = roomId;
    
    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId);
      
    if (error) console.error('Heartbeat failed:', error.message);
  }

  async signUp(email: string, password: string, name: string): Promise<User | null> {
    const { data: existing } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
    if (existing) return null;

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      lastActive: Date.now(),
      role: 'MEMBER'
    };

    const { error } = await supabase
      .from('profiles')
      .insert([{
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        last_active: Date.now(), // Back to numeric for BigInt
        role: newUser.role,
        password: password
      }]);

    if (error) return null;
    await this.setCurrentUser(newUser);
    return newUser;
  }

  async login(email: string, password: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .maybeSingle();

    if (error || !data) return null;

    const user: User = {
      id: data.id,
      name: data.name,
      email: data.email,
      avatar: data.avatar,
      lastActive: parseTimestamp(data.last_active),
      roomId: data.room_id,
      role: data.role
    };

    await this.setCurrentUser(user);
    return user;
  }

  getCurrentUser(): User | null {
    if (!this.currentUser) {
      const stored = localStorage.getItem('snipx_user');
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored);
        } catch (e) {
          localStorage.removeItem('snipx_user');
        }
      }
    }
    return this.currentUser;
  }

  async getRoom(roomId: string): Promise<Room | null> {
    if (!roomId) return null;
    const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).maybeSingle();
    if (error || !data) return null;
    return { id: data.id, name: data.name, adminId: data.admin_id, inviteCode: data.invite_code };
  }

  async createRoom(name: string, admin: User): Promise<Room | null> {
    const roomPayload = { name, admin_id: admin.id, invite_code: Math.random().toString(36).substr(2, 6).toUpperCase() };
    const { data, error } = await supabase.from('rooms').insert([roomPayload]).select();
    if (error || !data?.[0]) return null;

    const newRoom: Room = { id: data[0].id, name: data[0].name, adminId: data[0].admin_id, inviteCode: data[0].invite_code };
    if (this.currentUser) {
      this.currentUser.roomId = newRoom.id;
      this.currentUser.role = 'ADMIN';
      await this.setCurrentUser(this.currentUser);
    }
    return newRoom;
  }

  async joinRoom(inviteCode: string, user: User): Promise<Room | null> {
    const { data: room, error } = await supabase.from('rooms').select('*').eq('invite_code', inviteCode.toUpperCase()).maybeSingle();
    if (error || !room) return null;

    if (this.currentUser) {
      this.currentUser.roomId = room.id;
      this.currentUser.role = 'MEMBER';
      await this.setCurrentUser(this.currentUser);
    }
    return { id: room.id, name: room.name, adminId: room.admin_id, inviteCode: room.invite_code };
  }

  async getRoomMembers(roomId: string): Promise<User[]> {
    if (!roomId) return [];
    const { data, error } = await supabase.from('profiles').select('*').eq('room_id', roomId);
    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id, name: d.name, email: d.email, avatar: d.avatar,
      lastActive: parseTimestamp(d.last_active),
      roomId: d.room_id, role: d.role
    }));
  }

  async createTask(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<DbResult<Task>> {
    if (!taskData.roomId) return { data: null, error: "Missing Room ID" };

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          room_id: taskData.roomId,
          name: taskData.name,
          description: taskData.description,
          deadline: taskData.deadline,
          assigned_to_id: taskData.assignedToId,
          assigned_to_name: taskData.assignedToName,
          created_by_id: taskData.createdById,
          created_by_name: taskData.createdByName,
          status: taskData.status,
          created_at: Date.now() // Use numeric
        }])
        .select();
        
      if (error) {
        return { data: null, error: `${error.message} (Code: ${error.code})` };
      }
      
      const task: Task = { ...taskData, id: data[0].id, createdAt: parseTimestamp(data[0].created_at) };
      await this.addLog({
        taskId: task.id, taskName: task.name, roomId: task.roomId,
        fromUserId: task.createdById, fromUserName: task.createdByName,
        toUserId: task.assignedToId, toUserName: task.assignedToName,
        action: 'CREATED', timestamp: Date.now()
      });

      return { data: task };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }

  async pushTask(taskId: string, newAssigneeId: string, currentUserId: string): Promise<boolean> {
    const { data: toUser } = await supabase.from('profiles').select('*').eq('id', newAssigneeId).maybeSingle();
    const { data: fromUser } = await supabase.from('profiles').select('*').eq('id', currentUserId).maybeSingle();
    const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();

    if (task && fromUser && toUser) {
      const { error } = await supabase.from('tasks').update({ assigned_to_id: newAssigneeId, assigned_to_name: toUser.name }).eq('id', taskId);
      if (error) return false;

      await this.addLog({
        taskId: task.id, taskName: task.name, roomId: task.room_id,
        fromUserId: currentUserId, fromUserName: fromUser.name,
        toUserId: newAssigneeId, toUserName: toUser.name,
        action: 'PUSHED', timestamp: Date.now()
      });
      return true;
    }
    return false;
  }

  async completeTask(taskId: string, userId: string): Promise<boolean> {
    const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
    const { data: user } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    
    if (task && user) {
      // FIX: Removed 'completed_at' because column doesn't exist in schema
      const { error: patchError } = await supabase.from('tasks').update({ 
        status: 'COMPLETED'
      }).eq('id', taskId);

      if (patchError) {
        console.error('Patch Error:', patchError.message);
        return false;
      }

      await this.addLog({
        taskId: task.id, taskName: task.name, roomId: task.room_id,
        fromUserId: userId, fromUserName: user.name,
        toUserId: task.created_by_id, toUserName: task.created_by_name,
        action: 'COMPLETED', timestamp: Date.now()
      });
      return true;
    }
    return false;
  }

  async getTasks(roomId: string): Promise<Task[]> {
    if (!roomId) return [];
    const { data, error } = await supabase.from('tasks').select('*').eq('room_id', roomId);
    if (error) return [];
    
    const now = Date.now();
    const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

    return data.map((d: any) => ({
      id: d.id, roomId: d.room_id, name: d.name, description: d.description, deadline: d.deadline,
      assignedToId: d.assigned_to_id, assignedToName: d.assigned_to_name,
      createdById: d.created_by_id, createdByName: d.created_by_name, status: d.status,
      createdAt: parseTimestamp(d.created_at),
      completedAt: d.completed_at ? parseTimestamp(d.completed_at) : undefined
    })).filter(task => {
      if (task.status === 'COMPLETED' && task.completedAt) return (now - task.completedAt) < FORTY_EIGHT_HOURS_MS;
      return true;
    });
  }

  async getLogs(roomId: string): Promise<TaskLog[]> {
    if (!roomId) return [];
    const { data, error } = await supabase.from('task_logs').select('*').eq('room_id', roomId);
    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id, taskId: d.task_id, taskName: d.task_name, roomId: d.room_id,
      fromUserId: d.from_user_id, fromUserName: d.from_user_name,
      toUserId: d.to_user_id, toUserName: d.to_user_name, action: d.action,
      timestamp: parseTimestamp(d.timestamp || d.created_at)
    })).sort((a: any, b: any) => b.timestamp - a.timestamp);
  }

  async addMessage(roomId: string, senderId: string, senderName: string, text?: string, audioData?: string): Promise<DbResult<Message>> {
    const payload: any = { 
      room_id: roomId, 
      sender_id: senderId, 
      sender_name: senderName, 
      text: text || null, 
      timestamp: Date.now() // Use numeric
    };

    if (audioData) {
      payload.audio_data = audioData;
      payload.type = 'audio';
    } else {
      payload.type = 'text';
    }
    
    try {
      const { data, error } = await supabase.from('messages').insert([payload]).select();
      if (error) {
        console.error('Message Sync Error:', error);
        return { data: null, error: `${error.message} (Code: ${error.code})` };
      }
      if (!data?.[0]) return { data: null, error: "Record inserted but not returned" };
      
      const msg: Message = { 
        id: data[0].id, 
        roomId: data[0].room_id, 
        senderId: data[0].sender_id, 
        senderName: data[0].sender_name, 
        text: data[0].text, 
        audioData: data[0].audio_data, 
        type: data[0].type || 'text', 
        timestamp: parseTimestamp(data[0].timestamp) 
      };
      return { data: msg };
    } catch (e: any) {
      return { data: null, error: e.message };
    }
  }

  async getMessages(roomId: string): Promise<Message[]> {
    if (!roomId) return [];
    const { data, error } = await supabase.from('messages').select('*').eq('room_id', roomId);
    if (error) return [];
    return data.sort((a: any, b: any) => (parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp))).map((d: any) => ({
      id: d.id, roomId: d.room_id, senderId: d.sender_id, senderName: d.sender_name, text: d.text, audioData: d.audio_data, type: d.type || 'text', timestamp: parseTimestamp(d.timestamp)
    }));
  }

  private async addLog(log: Omit<TaskLog, 'id'>) {
    await supabase.from('task_logs').insert([{
      task_id: log.taskId, task_name: log.taskName, room_id: log.roomId,
      from_user_id: log.fromUserId, from_user_name: log.fromUserName,
      to_user_id: log.toUserId, to_user_name: log.toUserName,
      action: log.action, timestamp: Date.now() // Use numeric
    }]);
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('snipx_user');
  }
}

export const db = new DbService();
