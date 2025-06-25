export interface Persona {
  id: string;
  name: string;
  backstory: string;
  traits: string;
  goals: string;
  profilePictureUrl: string;
}

export interface UserDetails {
  name: string;
  about: string;
}

export interface ApiKeys {
  gemini: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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
  persona?: Omit<Persona, 'id'> | null;
}
