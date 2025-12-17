
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
  
  let promptText = `You are an AI content moderator. Your task is to review the following persona details and determine if they violate critical content policies. 

**IMPORTANT: Be LENIENT and only flag content that CLEARLY and EXPLICITLY violates policies. Do NOT flag innocent, creative, or fictional characters like cowboys, superheroes, fantasy characters, historical figures, etc. When in doubt, approve the content.**

**Content Policies (ONLY flag if EXPLICITLY violated):**

1.  **Strictly Prohibited Topics:**
    *   **Gender & Sexuality:** ONLY flag if there is explicit mention of non-binary/transgender identities, sexual orientation, or LGBTQ+ themes. Do NOT flag characters just because gender isn't explicitly stated - assume they are male or female.
    *   **Harmful Content:** ONLY flag graphic violence, self-harm instructions, hate speech, harassment, or sexually explicit material. Action/adventure themes, weapons (guns, lassos, swords), fighting, or conflict are ALLOWED for fictional characters.
    *   **Religion:** ONLY flag direct depictions of religious deities or prophets. General spiritual themes or characters with moral values are ALLOWED.

2.  **Minor Safety Policy:**
    *   The persona MUST NOT be a minor (under 18). 
    *   ONLY flag if the age is explicitly stated as under 18, OR if the character is explicitly described as a child/teen in school.
    *   If age is not specified, ASSUME the character is an adult.

**CRITICAL: Characters like cowboys, pirates, knights, warriors, detectives, adventurers, and other action-oriented personas are ALLOWED. Themes involving guns, horses, the Wild West, combat, or adventure are NOT violations.**

**Your Task:**
- Set \`isSafe\` to \`true\` unless there is a CLEAR, EXPLICIT violation.
- Only set \`isSafe\` to \`false\` if content is genuinely harmful or inappropriate.

**Persona Content to Review:**
- Name: ${input.name}
- Relationship: ${input.relation}`;

  if (input.age) {
    promptText += `
- Age: ${input.age}`;
  }

  promptText += `
- Traits: ${input.traits}
- Backstory: ${input.backstory}
- Goals: ${input.goals}
- Response Style: ${input.responseStyle}
`;
  
  const requestBody = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: 0.0, // Zero temperature for deterministic moderation
      responseMimeType: 'application/json',
      responseSchema: ModeratePersonaContentOutputOpenAPISchema,
      // Low thinking for fast moderation decisions
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
      // Fail closed - if moderation doesn't respond, assume it's unsafe.
      return { isSafe: false, reason: 'Content could not be verified by the moderation service.' };
    }
    
    const jsonResponse = JSON.parse(response.candidates[0].content.parts[0].text);
    return ModeratePersonaContentOutputSchema.parse(jsonResponse);

  } catch (error) {
     // Fail closed on any other error during moderation.
     console.error("Moderation API call failed:", error);
     return { isSafe: false, reason: 'An error occurred during content moderation.' };
  }
}
