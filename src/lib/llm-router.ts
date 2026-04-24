'use client';

import { getApiKeys } from '@/lib/db';
import { callGeminiApi } from '@/lib/api-key-manager';
import { safeParseJson } from '@/lib/safe-json';
import { GROQ_API_URL, GROQ_TEXT_MODEL, GROQ_MAX_BASE64_SIZE, GROQ_MAX_IMAGES_PER_REQUEST, SUPPORTED_IMAGE_TYPES } from '@/lib/constants';
import type { FileAttachment } from '@/lib/types';

const TEST_MODE_SUFFIX = '_TEST_MODE_360';
let groqKeyIndex = 0;

function normalizeProviderError(error: unknown, provider: 'Groq' | 'Gemini'): Error {
  if (error instanceof Error) {
    const isNetworkFailure =
      error instanceof TypeError &&
      /failed to fetch|network ?error|network request failed|load failed/i.test(error.message);
    if (isNetworkFailure) {
      return new Error(
        `${provider} request failed to reach the API. Check your network/CORS settings and try again.`
      );
    }
    return error;
  }
  return new Error(`${provider} request failed with an unknown error.`);
}

interface LLMCallOptions {
  /** Gemini model string, e.g. 'gemini-3-flash-preview:generateContent' */
  geminiModel: string;
  /** The Gemini-format request body */
  body: Record<string, any>;
  /** Optional attachments to check for Groq compatibility */
  attachments?: FileAttachment[];
  /** Context label for error messages */
  context?: string;
}

/**
 * Check if attachments are compatible with Groq's vision capabilities.
 * Groq supports: images only, max 5 per request, max 4MB base64 each.
 */
function attachmentsCompatibleWithGroq(attachments?: FileAttachment[]): boolean {
  if (!attachments || attachments.length === 0) return true;
  if (attachments.length > GROQ_MAX_IMAGES_PER_REQUEST) return false;
  return attachments.every(a =>
    SUPPORTED_IMAGE_TYPES.includes(a.mimeType) &&
    a.data.length * 0.75 <= GROQ_MAX_BASE64_SIZE // base64 string length * 0.75 ≈ byte size
  );
}

/**
 * Translate a Gemini-format request body into OpenAI chat completions format for Groq.
 */
function translateToOpenAI(body: Record<string, any>): Record<string, any> {
  const messages: any[] = [];

  // Gemini uses contents[].parts[] — convert to OpenAI messages[]
  if (body.contents) {
    for (const content of body.contents) {
      const role = content.role || 'user';
      const parts = content.parts || [];
      const openAIParts: any[] = [];

      for (const part of parts) {
        if (part.text) {
          openAIParts.push({ type: 'text', text: part.text });
        } else if (part.inlineData) {
          // Convert Gemini inlineData to OpenAI image_url format
          openAIParts.push({
            type: 'image_url',
            image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }
          });
        }
      }

      // If only one text part, simplify to string content
      if (openAIParts.length === 1 && openAIParts[0].type === 'text') {
        messages.push({ role, content: openAIParts[0].text });
      } else {
        messages.push({ role, content: openAIParts });
      }
    }
  }

  const result: Record<string, any> = {
    model: GROQ_TEXT_MODEL,
    messages,
  };

  // Translate generation config
  const gc = body.generationConfig;
  if (gc) {
    if (gc.temperature !== undefined) result.temperature = gc.temperature;
    if (gc.topP !== undefined) result.top_p = gc.topP;
    if (gc.responseMimeType === 'application/json') {
      result.response_format = { type: 'json_object' };
    }
    // Groq doesn't support responseSchema enforcement — we rely on Zod validation
    // Groq doesn't support thinkingConfig — skip
  }

  return result;
}

/**
 * Call Groq API with key rotation and retry logic.
 */
async function callGroqApi(body: Record<string, any>): Promise<string> {
  const apiKeys = await getApiKeys();
  const validKeys = apiKeys.groq?.filter(Boolean) || [];
  if (validKeys.length === 0) throw new Error('NO_GROQ_KEYS');

  let lastError: Error | null = null;
  const startIndex = groqKeyIndex % validKeys.length;
  groqKeyIndex = (groqKeyIndex + 1) % validKeys.length;

  for (let i = 0; i < validKeys.length; i++) {
    const keyIndex = (startIndex + i) % validKeys.length;
    const key = validKeys[keyIndex].replace(TEST_MODE_SUFFIX, '');

    const maxRetries = 3;
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = `Groq API Error (${response.status}): ${errorData?.error?.message || 'Unknown error'}`;

          // Retry on 429 (rate limit) and 503 with backoff
          if ((response.status === 429 || response.status === 503) && retry < maxRetries - 1) {
            const retryAfter = response.headers.get('retry-after');
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retry) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          throw new Error(errorMsg);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error('Groq returned empty response');
        return text;
      } catch (error: any) {
        const normalizedError = normalizeProviderError(error, 'Groq');
        if (
          retry === maxRetries - 1 ||
          (!normalizedError.message?.includes('429') && !normalizedError.message?.includes('503'))
        ) {
          lastError = normalizedError;
          break;
        }
      }
    }
    console.warn('Groq API key failed. Trying next key.');
  }

  throw lastError || new Error('All Groq API keys failed');
}

/**
 * Unified LLM caller. Routes to Groq (preferred) or Gemini (fallback).
 * 
 * For text-only and small-image requests: tries Groq first, falls back to Gemini.
 * For large files, video, audio, documents: goes directly to Gemini.
 * 
 * Returns the raw Gemini-format response when using Gemini,
 * or a Gemini-compatible wrapper when using Groq.
 */
export async function callLLM<T>(
  geminiModel: string,
  body: Record<string, any>,
  options?: { attachments?: FileAttachment[]; context?: string }
): Promise<T> {
  const apiKeys = await getApiKeys();
  const hasGroqKeys = (apiKeys.groq?.filter(Boolean) || []).length > 0;
  const hasGeminiKeys = (apiKeys.gemini?.filter(Boolean) || []).length > 0;
  const groqCompatible = attachmentsCompatibleWithGroq(options?.attachments);

  // Try Groq first if available and compatible
  if (hasGroqKeys && groqCompatible) {
    try {
      const openAIBody = translateToOpenAI(body);
      const responseText = await callGroqApi(openAIBody);

      // Wrap in Gemini-compatible response format so callers don't need to change
      return {
        candidates: [{
          content: {
            parts: [{ text: responseText }]
          }
        }]
      } as T;
    } catch (error: any) {
      // If no Gemini keys to fall back to, throw
      if (!hasGeminiKeys) {
        if (error.message === 'NO_GROQ_KEYS') {
          throw new Error('No API key provided. Please add your Groq or Gemini API key in the settings page.');
        }
        throw error;
      }
      // Fall through to Gemini
      console.warn('Groq failed, falling back to Gemini:', error.message);
    }
  }

  // Gemini fallback (or primary if no Groq keys)
  if (hasGeminiKeys) {
    return callGeminiApi<T>(geminiModel, body);
  }

  throw new Error('No API key provided. Please add your Groq or Gemini API key in the settings page to use the application.');
}
