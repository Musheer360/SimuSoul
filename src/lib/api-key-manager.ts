'use server';

let userKeyIndex = 0;

/**
 * Gets the next key from the user's provided list in a round-robin fashion.
 * @param customKeys The list of keys provided by the user.
 * @returns The next API key to use.
 */
function getRoundRobinUserKey(customKeys: string[]): string {
  // Ensure the index is always valid, even if the key list changes.
  if (userKeyIndex >= customKeys.length) {
    userKeyIndex = 0;
  }
  const key = customKeys[userKeyIndex];
  userKeyIndex = (userKeyIndex + 1) % customKeys.length;
  return key;
}

/**
 * Wraps an AI API call with failover and round-robin logic for user-provided API keys.
 * It requires custom keys to be provided and will throw an error if none are available.
 * @param apiCallFn The function to execute, which receives a single API key.
 * @param customKeys An array of user-provided keys from settings.
 * @returns The result of the successful API call.
 */
export async function callWithFailover<T>(
  apiCallFn: (apiKey: string) => Promise<T>,
  customKeys?: string[]
): Promise<T> {
  const validKeys = customKeys?.filter(Boolean) || [];

  if (validKeys.length === 0) {
    throw new Error("No API key provided. Please add your Gemini API key in the settings page to use the application.");
  }

  let lastError: Error | null = null;
  
  // Try each key once, starting from the current round-robin index.
  const attempts = validKeys.length;
  for (let i = 0; i < attempts; i++) {
    const keyToTry = getRoundRobinUserKey(validKeys);
    try {
      // On success, return the result.
      return await apiCallFn(keyToTry);
    } catch (error: any) {
      lastError = error;
      console.warn(`API key ending in ...${keyToTry.slice(-4)} failed. Retrying with next key.`);
    }
  }

  // If the loop completes, all keys have failed.
  throw new Error(`All provided API keys failed. Last error: ${lastError?.message || 'Unknown error'}`);
}
