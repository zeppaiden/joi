export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  userId: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
}

export interface ChatInput {
  sessionId?: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface ChatResponse {
  message: Message;
  error?: string;
} 