export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

export interface Persona {
  id: string;
  name: string;
  relation: string;
  backstory: string;
  traits: string;
  goals: string;
  profilePictureUrl: string;
  chats: ChatSession[];
  memories: string[];
}

export interface UserDetails {
  name: string;
  about: string;
}

export interface ApiKeys {
  gemini: string;
}

export interface CreatePersonaState {
  message?: string | null;
  errors?: {
    name?: string[];
    relation?: string[];
    traits?: string[];
    backstory?: string[];
    goals?: string[];
  };
  success?: boolean;
  persona?: Omit<Persona, 'id' | 'chats' | 'memories'> | null;
}

export interface UpdatePersonaState {
  message?: string | null;
  errors?: {
    name?: string[];
    relation?: string[];
    traits?: string[];
    backstory?: string[];
    goals?: string[];
  };
  success?: boolean;
  persona?: Omit<Persona, 'chats' | 'memories'> | null;
}
