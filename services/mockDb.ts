
import { User, Room, Task, Message, TaskLog, UserRole } from '../types';
import { supabase } from './supabase';

class DbService {
  private currentUser: User | null = null;

  async setCurrentUser(user: User) {
    this.currentUser = user;
    localStorage.setItem('snipx_user', JSON.stringify(user));
    
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        last_active: Date.now(),
        room_id: user.roomId || null,
        role: user.role
      });
      
    if (error) console.error('Error updating user profile:', error);
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
        last_active: Date.now(),
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
      lastActive: data.last_active,
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
        this.currentUser = JSON.parse(stored);
      }
    }
    return this.currentUser;
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    
    if (error || !data) return null;
    
    return {
      id: data.id,
      name: data.name,
      adminId: data.admin_id,
      inviteCode: data.invite_code
    };
  }

  async createRoom(name: string, admin: User): Promise<Room | null> {
    const room: any = {
      name,
      admin_id: admin.id,
      invite_code: Math.random().toString(36).substr(2, 6).toUpperCase()
    };
    
    const { data, error } = await supabase
      .from('rooms')
      .insert([room])
      .select()
      .single();
      
    if (error) {
      console.error('Error creating room:', error);
      return null;
    }

    const newRoom: Room = {
      id: data.id,
      name: data.name,
      adminId: data.admin_id,
      inviteCode: data.invite_code
    };

    if (this.currentUser) {
      this.currentUser.roomId = newRoom.id;
      this.currentUser.role = 'ADMIN';
      await this.setCurrentUser(this.currentUser);
    }
    
    return newRoom;
  }

  async joinRoom(inviteCode: string, user: User): Promise<Room | null> {
    const { data: room, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();
      
    if (error || !room) {
      console.error('Room not found:', error);
      return null;
    }

    if (this.currentUser) {
      this.currentUser.roomId = room.id;
      this.currentUser.role = 'MEMBER';
      // Crucial: Wait for the profile update in the database so getRoomMembers sees the user immediately
      await this.setCurrentUser(this.currentUser);
    }
    
    return {
      id: room.id,
      name: room.name,
      adminId: room.admin_id,
      inviteCode: room.invite_code
    };
  }

  async getRoomMembers(roomId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('room_id', roomId);
      
    if (error) return [];
    
    return data.map((d: any) => ({
      id: d.id,
      name: d.name,
      email: d.email,
      avatar: d.avatar,
      lastActive: d.last_active,
      roomId: d.room_id,
      role: d.role
    }));
  }

  async createTask(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task | null> {
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
        created_at: Date.now()
      }])
      .select()
      .single();
      
    if (error) return null;

    const task: Task = {
      ...taskData,
      id: data.id,
      createdAt: data.created_at
    };

    await this.addLog({
      taskId: task.id,
      taskName: task.name,
      roomId: task.roomId,
      fromUserId: task.createdById,
      fromUserName: task.createdByName,
      toUserId: task.assignedToId,
      toUserName: task.assignedToName,
      action: 'CREATED',
      timestamp: Date.now()
    });

    return task;
  }

  async pushTask(taskId: string, newAssigneeId: string, currentUserId: string): Promise<boolean> {
    const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
    const { data: fromUser } = await supabase.from('profiles').select('*').eq('id', currentUserId).single();
    const { data: toUser } = await supabase.from('profiles').select('*').eq('id', newAssigneeId).single();

    if (task && fromUser && toUser) {
      const { error } = await supabase
        .from('tasks')
        .update({ assigned_to_id: newAssigneeId, assigned_to_name: toUser.name })
        .eq('id', taskId);
        
      if (error) return false;

      await this.addLog({
        taskId: task.id,
        taskName: task.name,
        roomId: task.room_id,
        fromUserId: currentUserId,
        fromUserName: fromUser.name,
        toUserId: newAssigneeId,
        toUserName: toUser.name,
        action: 'PUSHED',
        timestamp: Date.now()
      });
      return true;
    }
    return false;
  }

  async completeTask(taskId: string, userId: string): Promise<boolean> {
    const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
    const { data: user } = await supabase.from('profiles').select('*').eq('id', userId).single();
    
    if (task && user) {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'COMPLETED' })
        .eq('id', taskId);
        
      if (error) return false;

      await this.addLog({
        taskId: task.id,
        taskName: task.name,
        roomId: task.room_id,
        fromUserId: userId,
        fromUserName: user.name,
        toUserId: task.created_by_id,
        toUserName: task.created_by_name,
        action: 'COMPLETED',
        timestamp: Date.now()
      });
      return true;
    }
    return false;
  }

  async getTasks(roomId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('room_id', roomId);
      
    if (error) return [];
    
    return data.map((d: any) => ({
      id: d.id,
      roomId: d.room_id,
      name: d.name,
      description: d.description,
      deadline: d.deadline,
      assignedToId: d.assigned_to_id,
      assignedToName: d.assigned_to_name,
      createdById: d.created_by_id,
      createdByName: d.created_by_name,
      status: d.status,
      createdAt: d.created_at
    }));
  }

  async getLogs(roomId: string): Promise<TaskLog[]> {
    const { data, error } = await supabase
      .from('task_logs')
      .select('*')
      .eq('room_id', roomId)
      .order('timestamp', { ascending: false });
      
    if (error) return [];
    
    return data.map((d: any) => ({
      id: d.id,
      taskId: d.task_id,
      taskName: d.task_name,
      roomId: d.room_id,
      fromUserId: d.from_user_id,
      fromUserName: d.from_user_name, // Fixed mapping
      toUserId: d.to_user_id,
      toUserName: d.to_user_name, // Fixed mapping
      action: d.action,
      timestamp: d.timestamp
    }));
  }

  async addMessage(roomId: string, senderId: string, text?: string, audioData?: string): Promise<Message | null> {
    const { data: sender } = await supabase.from('profiles').select('name').eq('id', senderId).single();
    
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        room_id: roomId,
        sender_id: senderId,
        sender_name: sender?.name || 'Unknown',
        text: text || null,
        audio_data: audioData || null,
        type: audioData ? 'audio' : 'text',
        timestamp: Date.now()
      }])
      .select()
      .single();
      
    if (error) return null;
    
    return {
      id: data.id,
      roomId: data.room_id,
      senderId: data.sender_id,
      senderName: data.sender_name,
      text: data.text,
      audioData: data.audio_data,
      type: data.type,
      timestamp: data.timestamp
    };
  }

  async getMessages(roomId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('timestamp', { ascending: true });
      
    if (error) return [];
    
    return data.map((d: any) => ({
      id: d.id,
      roomId: d.room_id,
      senderId: d.sender_id,
      senderName: d.sender_name,
      text: d.text,
      audioData: d.audio_data,
      type: d.type,
      timestamp: d.timestamp
    }));
  }

  private async addLog(log: Omit<TaskLog, 'id'>) {
    await supabase.from('task_logs').insert([{
      task_id: log.taskId,
      task_name: log.taskName,
      room_id: log.roomId,
      from_user_id: log.fromUserId,
      from_user_name: log.fromUserName,
      to_user_id: log.toUserId,
      to_user_name: log.toUserName,
      action: log.action,
      timestamp: log.timestamp
    }]);
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('snipx_user');
  }
}

export const db = new DbService();
