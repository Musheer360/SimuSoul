export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface Persona {
  id: string;
  name: string;
  relation: string;
  backstory: string;
  traits: string;
  goals: string;
  responseStyle: string;
  profilePictureUrl: string;
  minWpm: number;
  maxWpm: number;
  chats: ChatSession[];
  memories: string[];
}

export interface UserDetails {
  name: string;
  about: string;
  hasAcceptedTerms?: boolean;
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
    responseStyle?: string[];
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
    responseStyle?: string[];
  };
  success?: boolean;
  persona?: Omit<Persona, 'chats' | 'memories'> | null;
}
