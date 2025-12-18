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
  /** 
   * AI-generated summary of the conversation.
   * Should be present for chats with 7+ messages.
   * May become stale if chat grows significantly after summary creation.
   */
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
  /** 
   * Facts that the persona knows about the user.
   * Each memory should be a complete, self-contained sentence with a date prefix (YYYY-MM-DD: fact).
   */
  memories: string[];
  lastChatTime?: number; // Timestamp of last chat interaction
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
