
'use client';

import { getApiKeys } from '@/lib/db';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
const TEST_MODE_SUFFIX = '_TEST_MODE_360';

let userKeyIndex = 0;

/**
 * Checks if the application is in "test mode" based on the stored API keys.
 * Test mode is active if at least one key exists and all keys have the secret suffix.
 * @returns {Promise<boolean>} A promise that resolves to true if test mode is active, false otherwise.
 */
export async function isTestModeActive(): Promise<boolean> {
  const { gemini: customKeys } = await getApiKeys();
  const validKeys = customKeys?.filter(Boolean) || [];

  if (validKeys.length === 0) {
    return false; // No keys, no test mode.
  }

  // All valid keys must have the suffix for test mode to be active.
  return validKeys.every(key => key.endsWith(TEST_MODE_SUFFIX));
}

function getRoundRobinUserKey(customKeys: string[]): string {
  if (userKeyIndex >= customKeys.length) {
    userKeyIndex = 0;
  }
  const key = customKeys[userKeyIndex];
  userKeyIndex = (userKeyIndex + 1) % customKeys.length;
  // Strip the suffix before returning the key for use.
  return key.replace(TEST_MODE_SUFFIX, '');
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
      // Wait briefly before retrying
      await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
    }
  }

  const validKeys = apiKeys?.gemini?.filter(Boolean) || [];

  if (validKeys.length === 0) {
    throw new Error('No API key provided. Please add your Gemini API key in the settings page to use the application.');
  }

  let lastError: Error | null = null;
  const attempts = validKeys.length;

  for (let i = 0; i < attempts; i++) {
    const keyToTry = getRoundRobinUserKey(validKeys);
    const url = `${GEMINI_API_URL}${model}?key=${keyToTry}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error (${response.status}): ${errorData?.error?.message || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error: any) {
      lastError = error;
      console.warn(`API key ending in ...${keyToTry.slice(-4)} failed. Retrying with next key.`);
    }
  }
  
  throw new Error(`All provided API keys failed. Last error: ${lastError?.message || 'Unknown error'}`);
}
