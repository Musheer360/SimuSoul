import { openDB, deleteDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Persona, UserDetails, ApiKeys, ChatSession, ChatSessionHeader } from '@/lib/types';

const DB_NAME = 'SimuSoulDB';
const DB_VERSION = 3;
const PERSONAS_STORE = 'personas';
const CHATS_STORE = 'chats';
const USER_DETAILS_STORE = 'userDetails';
const API_KEYS_STORE = 'apiKeys';

/**
 * Legacy Persona type that includes chats array.
 * Used only for migration from v2 to v3.
 */
interface LegacyPersona extends Omit<Persona, 'chats'> {
  chats?: Array<Omit<ChatSession, 'personaId'> & { personaId?: string }>;
}

interface SimuSoulDBSchema extends DBSchema {
  [PERSONAS_STORE]: {
    key: string;
    value: Persona;
  };
  [CHATS_STORE]: {
    key: string;
    value: ChatSession;
    indexes: { 'by-personaId': string };
  };
  [USER_DETAILS_STORE]: {
    key: string;
    value: UserDetails;
  };
  [API_KEYS_STORE]: {
    key: string;
    value: ApiKeys;
  };
}

const dbPromise =
  typeof window !== 'undefined'
    ? openDB<SimuSoulDBSchema>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, _newVersion, tx) {
          // Create personas store if it doesn't exist
          if (!db.objectStoreNames.contains(PERSONAS_STORE)) {
            db.createObjectStore(PERSONAS_STORE, { keyPath: 'id' });
          }
          
          // Create chats store if it doesn't exist (new in v3)
          if (!db.objectStoreNames.contains(CHATS_STORE)) {
            const chatsStore = db.createObjectStore(CHATS_STORE, { keyPath: 'id' });
            chatsStore.createIndex('by-personaId', 'personaId', { unique: false });
          }
          
          // Create userDetails store if it doesn't exist
          if (!db.objectStoreNames.contains(USER_DETAILS_STORE)) {
            db.createObjectStore(USER_DETAILS_STORE);
          }
          
          // Create apiKeys store if it doesn't exist
          if (!db.objectStoreNames.contains(API_KEYS_STORE)) {
            db.createObjectStore(API_KEYS_STORE);
          }
          
          // Migrate from v2 to v3: Move chats from personas to separate store
          if (oldVersion < 3) {
            const personasStore = tx.objectStore(PERSONAS_STORE);
            const chatsStore = tx.objectStore(CHATS_STORE);
            
            // Migrate all existing personas' chats
            personasStore.getAll().then(personas => {
              for (const persona of personas as LegacyPersona[]) {
                if (persona.chats && persona.chats.length > 0) {
                  // Move each chat to the new chats store
                  for (const chat of persona.chats) {
                    const chatWithPersonaId: ChatSession = {
                      ...chat,
                      personaId: persona.id,
                    };
                    chatsStore.put(chatWithPersonaId);
                  }
                }
                // Remove chats from persona and save
                const { chats, ...personaWithoutChats } = persona;
                personasStore.put(personaWithoutChats as Persona);
              }
            });
          }
        },
      })
    : null;

// Persona operations
export async function getAllPersonas(): Promise<Persona[]> {
    if (!dbPromise) return [];
    return (await dbPromise).getAll(PERSONAS_STORE);
}

export async function getPersona(id: string): Promise<Persona | undefined> {
    if (!dbPromise) return undefined;
    return (await dbPromise).get(PERSONAS_STORE, id);
}

export async function savePersona(persona: Persona): Promise<string> {
    if (!dbPromise) throw new Error("Database not available on server.");
    return (await dbPromise).put(PERSONAS_STORE, persona);
}

export async function deletePersona(id: string): Promise<void> {
    if (!dbPromise) throw new Error("Database not available on server.");
    const db = await dbPromise;
    
    // Delete all chats associated with this persona
    const chats = await db.getAllFromIndex(CHATS_STORE, 'by-personaId', id);
    const tx = db.transaction(CHATS_STORE, 'readwrite');
    await Promise.all([
      ...chats.map(chat => tx.store.delete(chat.id)),
      tx.done,
    ]);
    
    // Delete the persona
    return db.delete(PERSONAS_STORE, id);
}

// Chat operations
/**
 * Get all chat headers for a persona (without full messages).
 * Used for sidebar display to avoid loading entire chat history.
 */
export async function getPersonaChats(personaId: string): Promise<ChatSessionHeader[]> {
    if (!dbPromise) return [];
    const db = await dbPromise;
    const chats = await db.getAllFromIndex(CHATS_STORE, 'by-personaId', personaId);
    
    // Return chat headers without messages
    return chats.map(({ messages, ...header }) => header);
}

/**
 * Get all full chat sessions for a persona.
 * Use sparingly - prefer getPersonaChats for listing.
 */
export async function getPersonaChatsWithMessages(personaId: string): Promise<ChatSession[]> {
    if (!dbPromise) return [];
    const db = await dbPromise;
    return db.getAllFromIndex(CHATS_STORE, 'by-personaId', personaId);
}

/**
 * Get a single chat session with full messages.
 * Use this when loading the active chat.
 */
export async function getChatSession(chatId: string): Promise<ChatSession | undefined> {
    if (!dbPromise) return undefined;
    return (await dbPromise).get(CHATS_STORE, chatId);
}

/**
 * Save a chat session.
 */
export async function saveChatSession(chat: ChatSession): Promise<string> {
    if (!dbPromise) throw new Error("Database not available on server.");
    return (await dbPromise).put(CHATS_STORE, chat);
}

/**
 * Delete a single chat session.
 */
export async function deleteChatSession(chatId: string): Promise<void> {
    if (!dbPromise) throw new Error("Database not available on server.");
    return (await dbPromise).delete(CHATS_STORE, chatId);
}

/**
 * Delete all chats for a persona.
 */
export async function deleteAllPersonaChats(personaId: string): Promise<void> {
    if (!dbPromise) throw new Error("Database not available on server.");
    const db = await dbPromise;
    const chats = await db.getAllFromIndex(CHATS_STORE, 'by-personaId', personaId);
    const tx = db.transaction(CHATS_STORE, 'readwrite');
    await Promise.all([
      ...chats.map(chat => tx.store.delete(chat.id)),
      tx.done,
    ]);
}

// UserDetails operations
const USER_DETAILS_KEY = 'currentUser';
const defaultUserDetails: UserDetails = {
    name: '',
    about: '',
    hasAcceptedTerms: false,
};

export async function getUserDetails(): Promise<UserDetails> {
    if (!dbPromise) return defaultUserDetails;
    const db = await dbPromise;
    const details = await db.get(USER_DETAILS_STORE, USER_DETAILS_KEY);
    return { ...defaultUserDetails, ...details };
}

export async function saveUserDetails(details: UserDetails): Promise<void> {
    if (!dbPromise) throw new Error("Database not available on server.");
    const db = await dbPromise;
    await db.put(USER_DETAILS_STORE, details, USER_DETAILS_KEY);
}

// ApiKeys operations
const API_KEYS_KEY = 'userApiKeys';

export async function getApiKeys(): Promise<ApiKeys> {
    if (!dbPromise) return { gemini: [] };
    
    try {
        const db = await dbPromise;
        return (await db.get(API_KEYS_STORE, API_KEYS_KEY)) || { gemini: [] };
    } catch (error) {
        console.warn('Failed to retrieve API keys from database:', error);
        // Return empty keys to trigger the "no API key" error message
        return { gemini: [] };
    }
}

export async function saveApiKeys(keys: ApiKeys): Promise<void> {
    if (!dbPromise) throw new Error("Database not available on server.");
    const db = await dbPromise;
    await db.put(API_KEYS_STORE, keys, API_KEYS_KEY);
}

// Function to wipe the entire database
export async function clearDatabase(): Promise<void> {
    if (!dbPromise) throw new Error("Database not available on server.");
    const db = await dbPromise;
    db.close();
    await deleteDB(DB_NAME);
    window.location.href = '/';
}