import { z } from 'zod';

type JsonSchemaType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';

interface JsonSchema {
  type: JsonSchemaType;
  description?: string;
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  nullable?: boolean;
}

/**
 * Convert a Zod object schema to a JSON responseSchema for LLM structured output.
 * Supports: string, number, boolean, array, object, optional, nullable.
 */
export function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
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
      items: zodToJsonSchema(schema.element),
      ...(schema.description ? { description: schema.description } : {}),
    };
  }
  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema(schema.unwrap());
  }
  if (schema instanceof z.ZodNullable) {
    return { ...zodToJsonSchema(schema.unwrap()), nullable: true };
  }
  if (schema instanceof z.ZodEnum) {
    return { type: 'STRING', ...(schema.description ? { description: schema.description } : {}) };
  }
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value as z.ZodTypeAny);
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
