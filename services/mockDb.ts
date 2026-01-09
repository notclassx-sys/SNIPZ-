
import { User, Room, Task, Message, TaskLog, UserRole } from '../types';
import { supabase } from './supabase';

export interface DbResult<T> {
  data: T | null;
  error?: string;
}

/**
 * Utility to ensure we always have a valid numeric timestamp for the UI
 */
const parseTimestamp = (val: any): number => {
  if (!val) return Date.now();
  if (typeof val === 'number') return Math.floor(val);
  // Handle numeric strings (bigint from Postgres often comes as string in JS)
  if (typeof val === 'string' && /^\d+$/.test(val)) return parseInt(val, 10);
  // Handle ISO strings just in case some old data exists
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? Date.now() : Math.floor(parsed);
};

/**
 * Utility to format dates for Supabase BigInt consumption (Numeric Epoch)
 * Returns a clean integer to satisfy Postgres BIGINT columns.
 */
const toDbTime = (): number => Math.floor(Date.now());

class DbService {
  private currentUser: User | null = null;

  async setCurrentUser(user: User) {
    this.currentUser = user;
    localStorage.setItem('snipx_user', JSON.stringify(user));
    
    try {
      const payload: any = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        last_active: toDbTime(),
        role: user.role
      };
      
      if (user.roomId) {
        payload.room_id = user.roomId;
      }

      await supabase.from('profiles').upsert(payload);
    } catch (e) {
      console.error('User profile sync failed:', e);
    }
  }

  async heartbeat(userId: string, roomId?: string) {
    if (!userId) return;
    try {
      const payload: any = { last_active: toDbTime() };
      if (roomId) payload.room_id = roomId;
      await supabase.from('profiles').update(payload).eq('id', userId);
    } catch (e) {
      console.error('Heartbeat failed:', e);
    }
  }

  async signUp(email: string, password: string, name: string): Promise<User | null> {
    try {
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
          last_active: toDbTime(),
          role: newUser.role,
          password: password
        }]);

      if (error) return null;
      await this.setCurrentUser(newUser);
      return newUser;
    } catch (e) {
      return null;
    }
  }

  async login(email: string, password: string): Promise<User | null> {
    try {
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
    } catch (e) {
      return null;
    }
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
    try {
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
    } catch (e) {
      return null;
    }
  }

  async joinRoom(inviteCode: string, user: User): Promise<Room | null> {
    try {
      const { data: room, error } = await supabase.from('rooms').select('*').eq('invite_code', inviteCode.toUpperCase()).maybeSingle();
      if (error || !room) return null;

      if (this.currentUser) {
        this.currentUser.roomId = room.id;
        this.currentUser.role = 'MEMBER';
        await this.setCurrentUser(this.currentUser);
      }
      return { id: room.id, name: room.name, adminId: room.admin_id, inviteCode: room.invite_code };
    } catch (e) {
      return null;
    }
  }

  async getRoomMembers(roomId: string): Promise<User[]> {
    if (!roomId) return [];
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('room_id', roomId);
      if (error || !data) return [];
      return data.map((d: any) => ({
        id: d.id, name: d.name, email: d.email, avatar: d.avatar,
        lastActive: parseTimestamp(d.last_active),
        roomId: d.room_id, role: d.role
      }));
    } catch (e) {
      return [];
    }
  }

  async createTask(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<DbResult<Task>> {
    if (!taskData.roomId) return { data: null, error: "Missing Room ID" };

    try {
      const payload = {
        room_id: taskData.roomId,
        name: taskData.name,
        description: taskData.description,
        deadline: taskData.deadline,
        assigned_to_id: taskData.assignedToId,
        assigned_to_name: taskData.assignedToName,
        created_by_id: taskData.createdById,
        created_by_name: taskData.createdByName,
        status: taskData.status,
        created_at: toDbTime()
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert([payload])
        .select();
        
      if (error) {
        console.error('Task Insert Error:', error);
        return { data: null, error: error.message };
      }
      
      if (!data?.[0]) return { data: null, error: "No data returned." };

      const task: Task = { 
        ...taskData, 
        id: data[0].id, 
        createdAt: parseTimestamp(data[0].created_at) 
      };

      await this.addLog({
        taskId: task.id, taskName: task.name, roomId: task.roomId,
        fromUserId: task.createdById, fromUserName: task.createdByName,
        toUserId: task.assignedToId, toUserName: task.assignedToName,
        action: 'CREATED', timestamp: toDbTime()
      });

      return { data: task };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }

  async pushTask(taskId: string, newAssigneeId: string, currentUserId: string): Promise<boolean> {
    try {
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
          action: 'PUSHED', timestamp: toDbTime()
        });
        return true;
      }
    } catch (e) {
      console.error('Push failed:', e);
    }
    return false;
  }

  async completeTask(taskId: string, userId: string): Promise<DbResult<boolean>> {
    try {
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
      const { data: user } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      
      if (task && user) {
        const { error: patchError } = await supabase.from('tasks').update({ 
          status: 'COMPLETED',
          completed_at: toDbTime()
        }).eq('id', taskId);

        if (patchError) {
          console.error('Complete Task DB Error:', patchError);
          return { data: false, error: patchError.message };
        }

        await this.addLog({
          taskId: task.id, taskName: task.name, roomId: task.room_id,
          fromUserId: userId, fromUserName: user.name,
          toUserId: task.created_by_id, toUserName: task.created_by_name,
          action: 'COMPLETED', timestamp: toDbTime()
        });
        return { data: true };
      }
      return { data: false, error: "Task or User not found" };
    } catch (e: any) {
      return { data: false, error: e.message };
    }
  }

  async getTasks(roomId: string): Promise<Task[]> {
    if (!roomId) return [];
    try {
      const { data, error } = await supabase.from('tasks').select('*').eq('room_id', roomId);
      if (error || !data) return [];
      
      return data.map((d: any) => ({
        id: d.id, roomId: d.room_id, name: d.name, description: d.description, deadline: d.deadline,
        assignedToId: d.assigned_to_id, assignedToName: d.assigned_to_name,
        createdById: d.created_by_id, createdByName: d.created_by_name, status: d.status,
        createdAt: parseTimestamp(d.created_at),
        completedAt: d.completed_at ? parseTimestamp(d.completed_at) : undefined
      }));
    } catch (e) {
      return [];
    }
  }

  async getLogs(roomId: string): Promise<TaskLog[]> {
    if (!roomId) return [];
    try {
      const { data, error } = await supabase.from('task_logs').select('*').eq('room_id', roomId);
      if (error || !data) return [];
      return data.map((d: any) => ({
        id: d.id, taskId: d.task_id, taskName: d.task_name, roomId: d.room_id,
        fromUserId: d.from_user_id, fromUserName: d.from_user_name,
        toUserId: d.to_user_id, toUserName: d.to_user_name, action: d.action,
        timestamp: parseTimestamp(d.timestamp || d.created_at)
      })).sort((a: any, b: any) => b.timestamp - a.timestamp);
    } catch (e) {
      return [];
    }
  }

  async addMessage(roomId: string, senderId: string, senderName: string, text?: string, audioData?: string): Promise<DbResult<Message>> {
    try {
      const msgTime = toDbTime();
      const payload: any = { 
        room_id: roomId, 
        sender_id: senderId, 
        sender_name: senderName, 
        text: text || null,
        timestamp: msgTime // Numeric BIGINT
      };

      if (audioData) {
        payload.audio_data = audioData;
        payload.type = 'audio';
      } else {
        payload.type = 'text';
      }
      
      // LOG TO CONSOLE TO VERIFY TYPE IN BROWSER
      console.log('Sending message payload:', payload);

      const { data, error } = await supabase.from('messages').insert([payload]).select();
      if (error) {
        console.error('Chat Insert Error:', error);
        return { data: null, error: error.message };
      }
      if (!data?.[0]) return { data: null, error: "No data returned" };
      
      const msg: Message = { 
        id: data[0].id, 
        roomId: data[0].room_id, 
        senderId: data[0].sender_id, 
        senderName: data[0].sender_name, 
        text: data[0].text, 
        audioData: data[0].audio_data, 
        type: data[0].type || 'text', 
        timestamp: parseTimestamp(data[0].timestamp || data[0].created_at) 
      };
      return { data: msg };
    } catch (e: any) {
      return { data: null, error: e.message };
    }
  }

  async getMessages(roomId: string): Promise<Message[]> {
    if (!roomId) return [];
    try {
      const { data, error } = await supabase.from('messages').select('*').eq('room_id', roomId);
      if (error || !data) return [];
      return data.sort((a: any, b: any) => (parseTimestamp(a.timestamp || a.created_at) - parseTimestamp(b.timestamp || b.created_at))).map((d: any) => ({
        id: d.id, roomId: d.room_id, senderId: d.sender_id, senderName: d.sender_name, text: d.text, audioData: d.audio_data, type: d.type || 'text', timestamp: parseTimestamp(d.timestamp || d.created_at)
      }));
    } catch (e) {
      return [];
    }
  }

  private async addLog(log: Omit<TaskLog, 'id'>) {
    try {
      await supabase.from('task_logs').insert([{
        task_id: log.taskId, task_name: log.taskName, room_id: log.roomId,
        from_user_id: log.fromUserId, from_user_name: log.fromUserName,
        to_user_id: log.toUserId, to_user_name: log.toUserName,
        action: log.action,
        timestamp: toDbTime()
      }]);
    } catch (e) {
      console.error('Logging failed:', e);
    }
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('snipx_user');
  }
}

export const db = new DbService();
