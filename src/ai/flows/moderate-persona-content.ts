
'use client';

/**
 * @fileOverview This file defines a client-side function for moderating persona content.
 */

import { callGeminiApi } from '@/lib/api-key-manager';
import { z } from 'zod';

export const ModeratePersonaContentInputSchema = z.object({
  name: z.string(),
  relation: z.string(),
  age: z.number().optional(),
  traits: z.string(),
  backstory: z.string(),
  goals: z.string(),
  responseStyle: z.string(),
  isTestMode: z.boolean(),
});
export type ModeratePersonaContentInput = z.infer<typeof ModeratePersonaContentInputSchema>;

export const ModeratePersonaContentOutputSchema = z.object({
  isSafe: z.boolean().describe('Whether the content is safe and adheres to all rules.'),
  reason: z
    .string()
    .describe('A brief, technical explanation for an internal reviewer if the content is not safe. Empty if safe.'),
});
export type ModeratePersonaContentOutput = z.infer<typeof ModeratePersonaContentOutputSchema>;

// Manually define the OpenAPI schema for the Gemini API
const ModeratePersonaContentOutputOpenAPISchema = {
    type: 'OBJECT',
    properties: {
        isSafe: {
            type: 'BOOLEAN',
            description: 'Whether the content is safe and adheres to all rules.',
        },
        reason: {
            type: 'STRING',
            description: 'A brief, technical explanation for an internal reviewer if the content is not safe. Empty if safe.',
        },
    },
    required: ['isSafe', 'reason'],
};

export async function moderatePersonaContent(input: ModeratePersonaContentInput): Promise<ModeratePersonaContentOutput> {
  if (input.isTestMode) {
    return { isSafe: true, reason: 'Test Mode Active' };
  }
  
  let promptText = `<system>
You are an AI content moderator. Review persona details for policy violations.
Be LENIENT - only flag CLEAR, EXPLICIT violations. Creative and fictional characters are allowed.
</system>

<policies>
STRICTLY PROHIBITED (flag only if EXPLICITLY present):
• Gender/Sexuality: Non-binary/transgender identities, LGBTQ+ themes explicitly mentioned
• Harmful Content: Graphic violence, self-harm instructions, hate speech, sexually explicit material
• Religion: Direct depictions of religious deities or prophets

ALLOWED:
• Action/adventure themes, weapons, fighting, conflict for fictional characters
• Cowboys, pirates, knights, warriors, detectives, adventurers
• Characters without explicit gender (assume male or female)
• General spiritual themes or moral values

MINOR SAFETY:
• Flag ONLY if age explicitly stated under 18 OR described as child/teen in school
• If age unspecified, ASSUME adult
</policies>

<persona_content>
Name: ${input.name}
Relationship: ${input.relation}`;

  if (input.age) {
    promptText += `
Age: ${input.age}`;
  }

  promptText += `
Traits: ${input.traits}
Backstory: ${input.backstory}
Goals: ${input.goals}
Response Style: ${input.responseStyle}
</persona_content>

<output_format>
{
  "isSafe": true/false,
  "reason": "Brief explanation if unsafe, empty if safe"
}
Set isSafe to true unless there is a CLEAR, EXPLICIT violation.
</output_format>`;
  
  const requestBody = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: 0.0,
      responseMimeType: 'application/json',
      responseSchema: ModeratePersonaContentOutputOpenAPISchema,
      thinkingConfig: {
        thinkingLevel: "low",
      },
    },
     safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  try {
    const response = await callGeminiApi<any>('gemini-3-flash-preview:generateContent', requestBody);
    
    if (!response.candidates || !response.candidates[0].content.parts[0].text) {
      return { isSafe: false, reason: 'Content could not be verified by the moderation service.' };
    }
    
    const jsonResponse = JSON.parse(response.candidates[0].content.parts[0].text);
    return ModeratePersonaContentOutputSchema.parse(jsonResponse);

  } catch (error) {
     console.error("Moderation API call failed:", error);
     return { isSafe: false, reason: 'An error occurred during content moderation.' };
  }
}
