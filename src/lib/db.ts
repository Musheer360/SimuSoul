import { openDB, deleteDB, type DBSchema } from 'idb';
import type { Persona, UserDetails, ApiKeys, ChatMessage } from '@/lib/types';

const DB_NAME = 'SimuSoulDB';
const DB_VERSION = 2; // Version incremented for new object store
const PERSONAS_STORE = 'personas';
const USER_DETAILS_STORE = 'userDetails';
const API_KEYS_STORE = 'apiKeys';
const MESSAGE_QUEUE_STORE = 'messageQueue'; // New store for queuing

interface QueuedMessage extends ChatMessage {
  id: number;
  personaId: string;
  chatId: string;
}

interface SimuSoulDBSchema extends DBSchema {
  [PERSONAS_STORE]: {
    key: string;
    value: Persona;
  };
  [USER_DETAILS_STORE]: {
    key: string;
    value: UserDetails;
  };
  [API_KEYS_STORE]: {
    key: string;
    value: ApiKeys;
  };
  [MESSAGE_QUEUE_STORE]: {
    key: 'id';
    value: QueuedMessage;
    indexes: { 'by-chat': [string, string] };
  };
}

const dbPromise =
  typeof window !== 'undefined'
    ? openDB<SimuSoulDBSchema>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
          if (!db.objectStoreNames.contains(PERSONAS_STORE)) {
            db.createObjectStore(PERSONAS_STORE, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(USER_DETAILS_STORE)) {
            db.createObjectStore(USER_DETAILS_STORE);
          }
          if (!db.objectStoreNames.contains(API_KEYS_STORE)) {
            db.createObjectStore(API_KEYS_STORE);
          }
          // Create the new message queue store if it doesn't exist
          if (!db.objectStoreNames.contains(MESSAGE_QUEUE_STORE)) {
            const store = db.createObjectStore(MESSAGE_QUEUE_STORE, {
              keyPath: 'id',
              autoIncrement: true,
            });
            // Create an index to easily look up messages by chat
            store.createIndex('by-chat', ['personaId', 'chatId']);
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
    return (await dbPromise).delete(PERSONAS_STORE, id);
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
    const db = await dbPromise;
    return (await db.get(API_KEYS_STORE, API_KEYS_KEY)) || { gemini: [] };
}

export async function saveApiKeys(keys: ApiKeys): Promise<void> {
    if (!dbPromise) throw new Error("Database not available on server.");
    const db = await dbPromise;
    await db.put(API_KEYS_STORE, keys, API_KEYS_KEY);
}

// Message Queue operations
export async function addMessageToQueue(
  message: ChatMessage,
  personaId: string,
  chatId: string
): Promise<void> {
  if (!dbPromise) throw new Error("Database not available on server.");
  const db = await dbPromise;
  await db.add(MESSAGE_QUEUE_STORE, { ...message, personaId, chatId } as any);
}

export async function getQueuedMessages(
  personaId: string,
  chatId: string
): Promise<ChatMessage[]> {
  if (!dbPromise) return [];
  const db = await dbPromise;
  const messages = await db.getAllFromIndex(
    MESSAGE_QUEUE_STORE,
    'by-chat',
    IDBKeyRange.only([personaId, chatId])
  );
  return messages.map(({ role, content }) => ({ role, content }));
}

export async function clearQueuedMessages(
  personaId: string,
  chatId: string
): Promise<void> {
  if (!dbPromise) throw new Error("Database not available on server.");
  const db = await dbPromise;
  const tx = db.transaction(MESSAGE_QUEUE_STORE, 'readwrite');
  const index = tx.store.index('by-chat');
  let cursor = await index.openCursor(IDBKeyRange.only([personaId, chatId]));
  while (cursor) {
    cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}


// Function to wipe the entire database
export async function clearDatabase(): Promise<void> {
    if (!dbPromise) throw new Error("Database not available on server.");
    const db = await dbPromise;
    db.close();
    await deleteDB(DB_NAME);
    window.location.href = '/';
}