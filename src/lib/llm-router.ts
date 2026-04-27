'use client';

import { getApiKeys } from '@/lib/db';
import { GROQ_API_URL, GROQ_TEXT_MODEL, GROQ_MAX_BASE64_SIZE, GROQ_MAX_IMAGES_PER_REQUEST, SUPPORTED_IMAGE_TYPES } from '@/lib/constants';
import { isLikelyNetworkFailure, normalizeProviderNetworkError } from '@/lib/network-error';
import type { FileAttachment } from '@/lib/types';

const TEST_MODE_SUFFIX = '_TEST_MODE_360';
let groqKeyIndex = 0;

export async function isTestModeActive(): Promise<boolean> {
  const apiKeys = await getApiKeys();
  const validKeys = apiKeys.groq?.filter(Boolean) || [];
  if (validKeys.length === 0) return false;
  return validKeys.every(key => key.endsWith(TEST_MODE_SUFFIX));
}

/**
 * Check if attachments are compatible with Groq's vision capabilities.
 * Groq supports: images only, max 5 per request, max 4MB base64 each.
 */
export function attachmentsCompatibleWithGroq(attachments?: FileAttachment[]): boolean {
  if (!attachments || attachments.length === 0) return true;
  if (attachments.length > GROQ_MAX_IMAGES_PER_REQUEST) return false;
  return attachments.every(a =>
    SUPPORTED_IMAGE_TYPES.includes(a.mimeType) &&
    a.data.length * 0.75 <= GROQ_MAX_BASE64_SIZE
  );
}

/**
 * Translate a legacy-format request body into OpenAI chat completions format for Groq.
 */
export function translateToOpenAI(body: Record<string, any>): Record<string, any> {
  const messages: any[] = [];

  if (body.contents) {
    for (const content of body.contents) {
      const role = content.role || 'user';
      const parts = content.parts || [];
      const openAIParts: any[] = [];

      for (const part of parts) {
        if (part.text) {
          openAIParts.push({ type: 'text', text: part.text });
        } else if (part.inlineData) {
          openAIParts.push({
            type: 'image_url',
            image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }
          });
        }
      }

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

  const gc = body.generationConfig;
  if (gc) {
    if (gc.temperature !== undefined) result.temperature = gc.temperature;
    if (gc.topP !== undefined) result.top_p = gc.topP;
    if (gc.responseMimeType === 'application/json') {
      result.response_format = { type: 'json_object' };
      let schemaHint = 'Respond with valid JSON only. Use lowercase camelCase keys.';
      if (gc.responseSchema) {
        const schema = gc.responseSchema;
        if (schema?.properties) {
          const fields = Object.entries(schema.properties)
            .map(([k, v]: [string, any]) => `${k}: ${(v as any).type?.toLowerCase() || 'string'}`)
            .join(', ');
          schemaHint += ` Required JSON fields: { ${fields} }. All string fields must be plain strings, not arrays.`;
        }
      }
      messages.unshift({ role: 'system', content: schemaHint });
    }
  }

  return result;
}

/**
 * Call Groq API with key rotation and retry logic.
 */
async function callGroqApi(body: Record<string, any>): Promise<string> {
  const apiKeys = await getApiKeys();
  const validKeys = apiKeys.groq?.filter(Boolean) || [];
  if (validKeys.length === 0) throw new Error('No API keys configured. Please add your Groq API key in Settings.');

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
          const rawMsg = errorData?.error?.message || 'Unknown error';
          console.error(`Groq API Error (${response.status}):`, rawMsg);
          const errorMsg = response.status === 429 ? 'Rate limit exceeded. Please wait a moment and try again.'
            : response.status === 401 ? 'Invalid API key. Please check your Groq key in Settings.'
            : `AI service error (${response.status}). Please try again.`;

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
        const rawMessage = error?.message || '';
        const isRetryableError =
          rawMessage.includes('429') ||
          rawMessage.includes('503') ||
          isLikelyNetworkFailure(error);
        const normalizedError = normalizeProviderNetworkError(error, 'Groq');
        if (retry === maxRetries - 1 || !isRetryableError) {
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
 * Unified LLM caller. Routes to Groq only.
 * Returns a legacy-compatible response wrapper for API compatibility.
 */
export async function callLLM<T>(
  _model: string, // kept for API compat, ignored
  body: Record<string, any>,
  options?: { attachments?: FileAttachment[]; context?: string }
): Promise<T> {
  if (!attachmentsCompatibleWithGroq(options?.attachments)) {
    throw new Error(
      'Attachments include unsupported file types (video, audio, or files too large for Groq). ' +
      'Only images under 4MB are supported.'
    );
  }

  const openAIBody = translateToOpenAI(body);
  const responseText = await callGroqApi(openAIBody);
  return {
    candidates: [{ content: { parts: [{ text: responseText }] } }]
  } as T;
}
