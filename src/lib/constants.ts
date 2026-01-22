/**
 * Shared constants used across the application.
 * Centralized to avoid duplication and ensure consistency.
 */

// Supported file types for Gemini API multimodal messages
export const SUPPORTED_IMAGE_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const SUPPORTED_VIDEO_TYPES: readonly string[] = ['video/mp4', 'video/webm', 'video/quicktime'];
export const SUPPORTED_DOCUMENT_TYPES: readonly string[] = ['application/pdf', 'text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript', 'application/json', 'application/xml'];
export const SUPPORTED_AUDIO_TYPES: readonly string[] = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];

// Combined list of all supported types for file input accept attribute
export const ALL_SUPPORTED_TYPES: readonly string[] = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_VIDEO_TYPES,
  ...SUPPORTED_DOCUMENT_TYPES,
  ...SUPPORTED_AUDIO_TYPES,
];

// Maximum file size for uploads (20MB)
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Chat summarization thresholds
export const MIN_MESSAGES_FOR_SUMMARY = 7;
export const SUMMARY_NEW_MESSAGES_THRESHOLD = 15;

// Utility functions for file type checking
export function isImageType(mimeType: string): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(mimeType);
}

export function isVideoType(mimeType: string): boolean {
  return SUPPORTED_VIDEO_TYPES.includes(mimeType);
}

export function isAudioType(mimeType: string): boolean {
  return SUPPORTED_AUDIO_TYPES.includes(mimeType);
}

export function isDocumentType(mimeType: string): boolean {
  return SUPPORTED_DOCUMENT_TYPES.includes(mimeType);
}

export function isSupportedFileType(mimeType: string): boolean {
  return ALL_SUPPORTED_TYPES.includes(mimeType);
}

export type MediaType = 'image' | 'video' | 'audio' | 'document';

export function getMediaType(mimeType: string): MediaType {
  if (isImageType(mimeType)) return 'image';
  if (isVideoType(mimeType)) return 'video';
  if (isAudioType(mimeType)) return 'audio';
  return 'document';
}
