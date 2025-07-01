
'use client';

import { getApiKeys } from '@/lib/db';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

let userKeyIndex = 0;

function getRoundRobinUserKey(customKeys: string[]): string {
  if (userKeyIndex >= customKeys.length) {
    userKeyIndex = 0;
  }
  const key = customKeys[userKeyIndex];
  userKeyIndex = (userKeyIndex + 1) % customKeys.length;
  return key;
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
  const { gemini: customKeys } = await getApiKeys();
  const validKeys = customKeys?.filter(Boolean) || [];

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
        const errorData = await response.json();
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
