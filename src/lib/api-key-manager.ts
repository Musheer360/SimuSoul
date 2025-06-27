
const serverApiKeys = [
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
 * Selects an API key for a request.
 * 1. Prioritizes the custom key if provided by the user.
 * 2. Falls back to a round-robin selection from server-side keys for load balancing.
 * 3. Returns undefined if no keys are available.
 */
export function selectApiKey(customKey?: string): string | undefined {
  if (customKey) {
    return customKey;
  }
  return getRoundRobinKey();
}
