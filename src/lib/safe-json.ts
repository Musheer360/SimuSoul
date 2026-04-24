/**
 * Safely parse JSON from LLM responses, handling common malformations.
 * Strips markdown fences, fixes trailing commas, and provides meaningful errors.
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
    return JSON.parse(cleaned) as T;
  } catch (e) {
    throw new Error(`Failed to parse AI response as JSON (${context}): ${(e as Error).message}. Raw text: ${text.substring(0, 200)}...`);
  }
}
