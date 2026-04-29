// Supported file types
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
export const SUPPORTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];
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

// Memory retrieval limits
export const MAX_CHAT_CONTEXTS = 50;
export const MAX_MESSAGES_PER_CHAT = 8;

// Groq API
export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_TEXT_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
export const GROQ_MAX_BASE64_SIZE = 4 * 1024 * 1024; // 4MB base64 limit for Groq
export const GROQ_MAX_IMAGES_PER_REQUEST = 5;