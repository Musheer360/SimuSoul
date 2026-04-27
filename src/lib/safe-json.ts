/**
 * Safely parse JSON from LLM responses, handling common malformations.
 * Strips markdown fences, fixes trailing commas, normalizes keys to camelCase.
 */
export function safeParseJson<T>(text: string, context: string): T {
  let cleaned = text.trim();
  // Strip markdown code fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  // Fix common LLM JSON issues
  cleaned = cleaned.replace(/,\s*}/g, '}');   // trailing comma before }
  cleaned = cleaned.replace(/,\s*]/g, ']');   // trailing comma before ]
  cleaned = cleaned.replace(/",\s*,/g, '",'); // double commas
  try {
    const parsed = JSON.parse(cleaned);
    // Normalize top-level object keys to camelCase (handles Groq returning UPPERCASE/SNAKE_CASE keys)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return normalizeKeys(parsed) as T;
    }
    return parsed as T;
  } catch (e) {
    throw new Error(`Failed to parse AI response as JSON (${context}): ${(e as Error).message}. Raw text: ${text.substring(0, 200)}...`);
  }
}

/**
 * Convert UPPER_CASE, SCREAMING_SNAKE_CASE, or PascalCase keys to camelCase.
 * Only normalizes top-level keys — nested objects are left as-is.
 */
function normalizeKeys(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    // SCREAMING_SNAKE_CASE → camelCase (e.g. RESPONSE_STYLE → responseStyle)
    // UPPERCASE → lowercase (e.g. NAME → name)
    // Already camelCase → unchanged
    let camelKey: string;
    if (key.includes('_')) {
      camelKey = key.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    } else if (key === key.toUpperCase() && key.length > 1) {
      camelKey = key.toLowerCase();
    } else {
      camelKey = key.charAt(0).toLowerCase() + key.slice(1);
    }
    result[camelKey] = value;
  }
  return result;
}
