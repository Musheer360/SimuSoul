'use server';
/**
 * @fileOverview This file defines a Genkit flow for moderating persona content.
 *
 * - moderatePersonaContent - A function that checks persona details against content policies.
 * - ModeratePersonaContentInput - The input type for the function.
 * - ModeratePersonaContentOutput - The return type for the function.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { callWithFailover } from '@/lib/api-key-manager';

const ModeratePersonaContentInputSchema = z.object({
  name: z.string(),
  relation: z.string(),
  traits: z.string(),
  backstory: z.string(),
  goals: z.string(),
  responseStyle: z.string(),
  apiKey: z.array(z.string()).optional(),
});
export type ModeratePersonaContentInput = z.infer<typeof ModeratePersonaContentInputSchema>;

const ModeratePersonaContentOutputSchema = z.object({
  isSafe: z.boolean().describe('Whether the content is safe and adheres to all rules.'),
  reason: z
    .string()
    .describe('A brief, technical explanation for an internal reviewer if the content is not safe. Empty if safe.'),
});
export type ModeratePersonaContentOutput = z.infer<typeof ModeratePersonaContentOutputSchema>;

export async function moderatePersonaContent(input: ModeratePersonaContentInput): Promise<ModeratePersonaContentOutput> {
  return moderatePersonaContentFlow(input);
}

const promptText = `You are an AI content moderator. Your task is to review the following persona details and determine if they violate critical content policies. Be precise and avoid flagging content based on weak inferences.

**Content Policies:**

1.  **Strictly Prohibited Topics:**
    *   **Gender & Sexuality:** Any mention of non-binary/transgender identities, sexual orientation, or LGBTQ+ themes. The persona must be clearly male or female.
    *   **Harmful Content:** Graphic violence, self-harm, hate speech, harassment, or sexually explicit material.
    *   **Religion:** Depictions of religious figures or direct engagement with religious themes.

2.  **Minor Safety Policy:**
    *   The persona MUST NOT be a minor (under 18).
    *   **Your Guideline:** Do not flag content as minor-related unless the text *explicitly* states the character is under 18 or describes them in a context that is unambiguously related to childhood (e.g., "attends middle school"). Ambiguous or youthful-sounding traits in an adult character are NOT a violation. If age is not specified, assume the character is an adult unless there is clear evidence to the contrary.

**Your Task:**
Analyze all fields below.
- If ANY policy is violated, set \`isSafe\` to \`false\` and provide a brief, internal reason.
- If the content adheres to ALL rules, set \`isSafe\` to \`true\`.

**Persona Content to Review:**
- Name: {{name}}
- Relationship: {{relation}}
- Traits: {{traits}}
- Backstory: {{backstory}}
- Goals: {{goals}}
- Response Style: {{responseStyle}}
`;

const moderatePersonaContentFlow = ai.defineFlow(
  {
    name: 'moderatePersonaContentFlow',
    inputSchema: ModeratePersonaContentInputSchema,
    outputSchema: ModeratePersonaContentOutputSchema,
  },
  async (input) => {
    return callWithFailover(async (apiKey) => {
      const dynamicAi = genkit({
        plugins: [googleAI({ apiKey })],
      });

      const prompt = dynamicAi.definePrompt({
        name: 'moderatePersonaContentPrompt_dynamic',
        model: 'googleai/gemini-2.5-flash',
        input: { schema: ModeratePersonaContentInputSchema },
        output: { schema: ModeratePersonaContentOutputSchema },
        prompt: promptText,
        config: {
          temperature: 0.0, // Be deterministic for moderation
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_ONLY_HIGH',
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_ONLY_HIGH',
            },
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_ONLY_HIGH',
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_ONLY_HIGH',
            },
          ],
        },
      });

      const { output } = await prompt(input);
      if (!output) {
        // Fail closed - if moderation doesn't respond, assume it's unsafe.
        return { isSafe: false, reason: 'Content could not be verified by the moderation service.' };
      }
      return output;
    }, input.apiKey);
  }
);
