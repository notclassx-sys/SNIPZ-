
export type UserRole = 'ADMIN' | 'MEMBER';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  lastActive: number;
  roomId?: string;
  role: UserRole;
}

export interface Room {
  id: string;
  name: string;
  adminId: string;
  inviteCode: string;
}

export type TaskStatus = 'PENDING' | 'COMPLETED';

export interface Task {
  id: string;
  roomId: string;
  name: string;
  description: string;
  deadline: string;
  assignedToId: string;
  assignedToName: string;
  createdById: string;
  createdByName: string;
  status: TaskStatus;
  createdAt: number;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text?: string;
  audioData?: string;
  type: 'text' | 'audio';
  timestamp: number;
}

export interface TaskLog {
  id: string;
  taskId: string;
  taskName: string;
  roomId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  action: 'PUSHED' | 'COMPLETED' | 'CREATED';
  timestamp: number;
}

export type TabType = 'ALL_TASKS' | 'MY_TASKS' | 'DASHBOARD' | 'CHAT' | 'PROFILE';
