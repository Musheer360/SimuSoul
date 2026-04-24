import { z } from 'zod';

type GeminiSchemaType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';

interface GeminiSchema {
  type: GeminiSchemaType;
  description?: string;
  items?: GeminiSchema;
  properties?: Record<string, GeminiSchema>;
  required?: string[];
  nullable?: boolean;
}

/**
 * Convert a Zod object schema to a Gemini API responseSchema.
 * Supports: string, number, boolean, array, object, optional, nullable.
 */
export function zodToGeminiSchema(schema: z.ZodTypeAny): GeminiSchema {
  if (schema instanceof z.ZodString) {
    return { type: 'STRING', ...(schema.description ? { description: schema.description } : {}) };
  }
  if (schema instanceof z.ZodNumber) {
    return { type: 'NUMBER', ...(schema.description ? { description: schema.description } : {}) };
  }
  if (schema instanceof z.ZodBoolean) {
    return { type: 'BOOLEAN', ...(schema.description ? { description: schema.description } : {}) };
  }
  if (schema instanceof z.ZodArray) {
    return {
      type: 'ARRAY',
      items: zodToGeminiSchema(schema.element),
      ...(schema.description ? { description: schema.description } : {}),
    };
  }
  if (schema instanceof z.ZodOptional) {
    return zodToGeminiSchema(schema.unwrap());
  }
  if (schema instanceof z.ZodNullable) {
    return { ...zodToGeminiSchema(schema.unwrap()), nullable: true };
  }
  if (schema instanceof z.ZodEnum) {
    return { type: 'STRING', ...(schema.description ? { description: schema.description } : {}) };
  }
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, GeminiSchema> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToGeminiSchema(value as z.ZodTypeAny);
      if (!(value instanceof z.ZodOptional)) {
        required.push(key);
      }
    }
    return {
      type: 'OBJECT',
      properties,
      ...(required.length > 0 ? { required } : {}),
      ...(schema.description ? { description: schema.description } : {}),
    };
  }
  // Fallback for unhandled types
  return { type: 'STRING' };
}
