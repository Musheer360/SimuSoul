export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isIgnored?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  summary?: string;
}

export interface Persona {
  id: string;
  name: string;
  relation: string;
  age?: number;
  backstory: string;
  traits: string;
  goals: string;
  responseStyle: string;
  profilePictureUrl: string;
  minWpm: number;
  maxWpm: number;
  chats: ChatSession[];
  memories: string[];
  ignoredState?: {
    isIgnored: boolean;
    reason?: string;
    chatId?: string;
  } | null;
}

export interface UserDetails {
  name: string;
  about: string;
  hasAcceptedTerms?: boolean;
}

export interface ApiKeys {
  gemini: string[];
}
