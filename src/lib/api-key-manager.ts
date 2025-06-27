'use server';

// Added the two new keys to a hardcoded list as requested.
const hardcodedKeys = [
  'AIzaSyBW9E2ki_FYhM7utlaBV3oxCTcECjM0M-8',
  'AIzaSyColbtdfV0a_BU1-k7apw-WIVX12YmEvTQ',
];

const serverApiKeys = [
  ...hardcodedKeys,
  ...(process.env.GEMINI_API_KEYS || '').split(','),
  process.env.GEMINI_API_KEY,
]
  .map(k => k?.trim())
  .filter(Boolean) as string[];

let keyIndex = 0;

function getRoundRobinKey(): string | undefined {
  if (serverApiKeys.length === 0) {
    return undefined;
  }
  const key = serverApiKeys[keyIndex];
  keyIndex = (keyIndex + 1) % serverApiKeys.length;
  return key;
}

/**
 * Wraps an API call with failover logic. If the call fails, it retries
 * with the next key in the server-side pool.
 * @param apiCallFn The function to execute, which receives an API key.
 * @param customKey An optional user-provided key, which skips failover.
 * @returns The result of the successful API call.
 */
export async function callWithFailover<T>(
  apiCallFn: (apiKey: string) => Promise<T>,
  customKey?: string
): Promise<T> {
  // If user provides a key, just use it once. No failover.
  if (customKey) {
    return apiCallFn(customKey);
  }

  const numKeys = serverApiKeys.length;
  if (numKeys === 0) {
    throw new Error("No server-side API keys are configured.");
  }

  let lastError: Error | null = null;

  // We will try each key once in a round-robin sequence.
  for (let i = 0; i < numKeys; i++) {
    const apiKey = getRoundRobinKey();
    if (!apiKey) continue; // Should not happen if numKeys > 0

    try {
      const result = await apiCallFn(apiKey);
      return result; // Success!
    } catch (error: any) {
      lastError = error;
      console.warn(`API key ending in ...${apiKey.slice(-4)} failed. Retrying with next key.`);
    }
  }

  // If the loop completes, all keys have failed.
  throw new Error(`All API keys failed. Last error: ${lastError?.message || 'Unknown error'}`);
}
