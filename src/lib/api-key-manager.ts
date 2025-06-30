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
 * Wraps an API call with failover logic. It prioritizes custom keys if provided,
 * otherwise it uses the server-side key pool.
 * @param apiCallFn The function to execute, which receives a single API key.
 * @param customKeys An optional array of user-provided keys.
 * @returns The result of the successful API call.
 */
export async function callWithFailover<T>(
  apiCallFn: (apiKey: string) => Promise<T>,
  customKeys?: string[]
): Promise<T> {
  // If user provides valid keys, use them.
  if (customKeys && customKeys.length > 0) {
    let lastError: Error | null = null;
    for (const key of customKeys) {
        try {
            return await apiCallFn(key);
        } catch (error: any) {
            lastError = error;
            console.warn(`Custom API key ending in ...${key.slice(-4)} failed. Retrying with next key.`);
        }
    }
    throw new Error(`All custom API keys failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  // Otherwise, use the server-side pool.
  const numServerKeys = serverApiKeys.length;
  if (numServerKeys === 0) {
    throw new Error("No server-side API keys are configured and no custom key was provided.");
  }

  let lastServerError: Error | null = null;
  for (let i = 0; i < numServerKeys; i++) {
    const apiKey = getRoundRobinKey();
    if (!apiKey) continue;

    try {
      return await apiCallFn(apiKey);
    } catch (error: any) {
      lastServerError = error;
      console.warn(`Server API key ending in ...${apiKey.slice(-4)} failed. Retrying with next key.`);
    }
  }

  // If the loop completes, all server keys have failed.
  throw new Error(`All server-side API keys failed. Last error: ${lastServerError?.message || 'Unknown error'}`);
}
