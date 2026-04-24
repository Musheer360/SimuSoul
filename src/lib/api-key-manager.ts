
'use client';

import { getApiKeys } from '@/lib/db';

import { GEMINI_API_URL } from '@/lib/constants';
import { isLikelyNetworkFailure, normalizeProviderNetworkError } from '@/lib/network-error';
const TEST_MODE_SUFFIX = '_TEST_MODE_360';

let userKeyIndex = 0;

function getNextKeyIndex(keysLength: number): number {
  const idx = userKeyIndex % keysLength;
  userKeyIndex = (userKeyIndex + 1) % keysLength;
  return idx;
}

/**
 * Checks if the application is in "test mode" based on the stored API keys.
 * Test mode is active if at least one key exists and all keys have the secret suffix.
 * @returns {Promise<boolean>} A promise that resolves to true if test mode is active, false otherwise.
 */
export async function isTestModeActive(): Promise<boolean> {
  const apiKeys = await getApiKeys();
  const allKeys = [...(apiKeys.gemini?.filter(Boolean) || []), ...(apiKeys.groq?.filter(Boolean) || [])];
  if (allKeys.length === 0) return false;
  return allKeys.every(key => key.endsWith(TEST_MODE_SUFFIX));
}

/**
 * Executes a direct, client-side fetch call to the Gemini API with failover logic.
 * @param model The Gemini model to use (e.g., 'gemini-pro:generateContent').
 * @param body The request body for the API call.
 * @returns The JSON response from the API.
 */
export async function callGeminiApi<T>(
  model: string,
  body: Record<string, any>
): Promise<T> {
  // Add retry logic for database initialization
  let apiKeys;
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      apiKeys = await getApiKeys();
      break;
    } catch (error) {
      retryCount++;
      if (retryCount >= maxRetries) {
        throw new Error('Failed to retrieve API keys from database. Please refresh the page and try again.');
      }
      await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
    }
  }

  const validKeys = apiKeys?.gemini?.filter(Boolean) || [];

  if (validKeys.length === 0) {
    throw new Error('No API key provided. Please add your Gemini API key in the settings page to use the application.');
  }

  let lastError: Error | null = null;
  const attempts = validKeys.length;

  const startIndex = getNextKeyIndex(validKeys.length);

  for (let i = 0; i < attempts; i++) {
    const keyIndex = (startIndex + i) % validKeys.length;
    const keyToTry = validKeys[keyIndex].replace(TEST_MODE_SUFFIX, '');
    const url = `${GEMINI_API_URL}${model}`;

    // Retry logic for 503 errors
    const maxApiRetries = 3;
    for (let retry = 0; retry < maxApiRetries; retry++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': keyToTry,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = `API Error (${response.status}): ${errorData?.error?.message || 'Unknown error'}`;
          
          // Retry on 503 (overloaded) with exponential backoff
          if (response.status === 503 && retry < maxApiRetries - 1) {
            const delay = Math.pow(2, retry) * 1000; // 1s, 2s, 4s
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          const enrichedError = new Error(errorMsg) as Error & { status?: number; code?: string };
          enrichedError.status = response.status;
          enrichedError.code = errorData?.error?.status || errorData?.error?.code;
          throw enrichedError;
        }

        return await response.json();
      } catch (error: any) {
        const rawMessage = error?.message || '';
        const isRetryableError = rawMessage.includes('503') || isLikelyNetworkFailure(error);
        const normalizedError = normalizeProviderNetworkError(error, 'Gemini');
        // If it's the last retry or not a 503 error, save and break
        if (retry === maxApiRetries - 1 || !isRetryableError) {
          lastError = normalizedError;
          break;
        }
      }
    }
    
    console.warn('API key failed. Retrying with next key.');
  }
  
  throw new Error(`All provided API keys failed. Last error: ${lastError?.message || 'Unknown error'}`);
}
