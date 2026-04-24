export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

// Supported file types for Gemini API
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
export const SUPPORTED_DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript', 'application/json', 'application/xml'];
export const SUPPORTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];
export const ALL_SUPPORTED_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES, ...SUPPORTED_DOCUMENT_TYPES, ...SUPPORTED_AUDIO_TYPES];
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB max file size

// Constants for chat summarization
export const MIN_MESSAGES_FOR_SUMMARY = 7;
export const SUMMARY_NEW_MESSAGES_THRESHOLD = 15;

// Typing and response timing
export const MIN_TYPING_DELAY_MS = 900;
export const MAX_TYPING_DELAY_MS = 4000;
export const RESPONSE_TIMER_MIN_MS = 2500;
export const RESPONSE_TIMER_MAX_MS = 5000;

// Mobile keyboard detection
export const KEYBOARD_HEIGHT_THRESHOLD = 150;

// Gemini model identifiers
export const GEMINI_TEXT_MODEL = 'gemini-3-flash-preview';
export const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

// Memory retrieval limits
export const MAX_CHAT_CONTEXTS = 50;
export const MAX_MESSAGES_PER_CHAT = 8;