export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isIgnored?: boolean;
  /** Optional image URL (base64 data URL) attached to the message */
  imageUrl?: string;
  /** Index of the message being replied to (if this is a reply) */
  replyToIndex?: number;
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
   * MAJOR life events about the user that the persona remembers permanently.
   * Should ONLY contain highly significant, life-changing information like:
   * new job, new pet, moving cities, marriage, babies, major health events, etc.
   * Each memory should be a complete, self-contained sentence with a date prefix (YYYY-MM-DD: fact).
   * Mundane conversation topics should NOT be stored here - use chat summaries for that.
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
