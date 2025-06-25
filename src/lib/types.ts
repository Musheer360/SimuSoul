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
  backstory: string;
  traits: string;
  goals: string;
  profilePictureUrl: string;
  chats: ChatSession[];
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
    traits?: string[];
    backstory?: string[];
    goals?: string[];
  };
  success?: boolean;
  persona?: Omit<Persona, 'id' | 'chats'> | null;
}
