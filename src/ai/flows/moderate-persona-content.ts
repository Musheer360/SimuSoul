
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
});
export type ModeratePersonaContentInput = z.infer<typeof ModeratePersonaContentInputSchema>;

export const ModeratePersonaContentOutputSchema = z.object({
  isSafe: z.boolean().describe('Whether the content is safe and adheres to all rules.'),
  reason: z
    .string()
    .describe('A brief, technical explanation for an internal reviewer if the content is not safe. Empty if safe.'),
});
export type ModeratePersonaContentOutput = z.infer<typeof ModeratePersonaContentOutputSchema>;

export async function moderatePersonaContent(input: ModeratePersonaContentInput): Promise<ModeratePersonaContentOutput> {
  let promptText = `You are an AI content moderator. Your task is to review the following persona details and determine if they violate critical content policies. Be precise and avoid flagging content based on weak inferences.

**Content Policies:**

1.  **Strictly Prohibited Topics:**
    *   **Gender & Sexuality:** Any mention of non-binary/transgender identities, sexual orientation, or LGBTQ+ themes. The persona must be clearly male or female.
    *   **Harmful Content:** Graphic violence, self-harm, hate speech, harassment, or sexually explicit material.
    *   **Religion:** Depictions of religious figures or direct engagement with religious themes.

2.  **Minor Safety Policy:**
    *   The persona MUST NOT be a minor (under 18). The provided age, if any, MUST be 18 or greater.
    *   **Your Guideline:** Do not flag content as minor-related unless the text *explicitly* states the character is under 18, describes them in a context that is unambiguously related to childhood (e.g., "attends middle school"), or their provided age is less than 18. Ambiguous or youthful-sounding traits in an adult character are NOT a violation. If age is not specified, assume the character is an adult unless there is clear evidence to the contrary.

**Your Task:**
Analyze all fields below.
- If ANY policy is violated, set \`isSafe\` to \`false\` and provide a brief, internal reason.
- If the content adheres to ALL rules, set \`isSafe\` to \`true\`.

**Persona Content to Review:**
- Name: ${input.name}
- Relationship: ${input.relation}`;

  if (input.age) {
    promptText += `\n- Age: ${input.age}`;
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
      responseMimeType: 'application/json',
      responseSchema: ModeratePersonaContentOutputSchema,
      temperature: 0.0,
    },
     safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  try {
    const response = await callGeminiApi<any>('gemini-1.5-flash:generateContent', requestBody);
    
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
