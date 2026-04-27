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
    console.error(`[safeParseJson] Failed (${context}):`, (e as Error).message, 'Raw:', text.substring(0, 200));
    throw new Error('Failed to process AI response. Please try again.');
  }
}

/**
 * Convert UPPER_CASE, SCREAMING_SNAKE_CASE, or PascalCase keys to camelCase.
 * Coerces non-primitive values to strings when they look like they should be strings
 * (handles Groq returning objects/arrays for fields that schemas expect as strings).
 */
function normalizeKeys(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    let camelKey: string;
    if (key.includes('_')) {
      camelKey = key.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    } else if (key === key.toUpperCase() && key.length > 1) {
      camelKey = key.toLowerCase();
    } else {
      camelKey = key.charAt(0).toLowerCase() + key.slice(1);
    }
    // Coerce non-array objects to string (Groq sometimes returns {tone: "casual"} instead of "casual tone")
    // But preserve arrays (e.g. response: ["msg1", "msg2"] is intentional)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[camelKey] = Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(', ');
    } else {
      result[camelKey] = value;
    }
  }
  return result;
}
