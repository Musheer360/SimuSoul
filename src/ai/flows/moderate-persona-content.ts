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
    .describe('A brief, user-facing explanation if the content is not safe. Empty if safe.'),
});
export type ModeratePersonaContentOutput = z.infer<typeof ModeratePersonaContentOutputSchema>;

export async function moderatePersonaContent(input: ModeratePersonaContentInput): Promise<ModeratePersonaContentOutput> {
  return moderatePersonaContentFlow(input);
}

const promptText = `You are an AI content moderator with a very strict set of rules. Your only job is to determine if the user-created persona content violates any of the following non-negotiable policies.

**Policy Violations (Check for ANY of these):**

1.  **Forbidden Gender & Sexuality Topics:**
    - The content mentions or alludes to any gender identities other than strictly male or female.
    - The content mentions or alludes to sexual orientation, LGBTQ+ identities, or related themes.

2.  **Minor-Related Content:**
    - The persona is depicted as being under the age of 18 or engages in themes related to minors.

3.  **Harmful & Explicit Content:**
    - The content includes graphic violence, self-harm, hate speech, harassment, or sexually explicit themes.

**Your Task:**

Review the following persona details. Analyze all fields. If ANY part of the content violates ANY of the policies above, you MUST set \`isSafe\` to \`false\` and provide a brief, neutral reason for the violation. The reason should be suitable to show to a user (e.g., "Content includes topics related to sexuality."). If the content is perfectly fine and follows all rules, set \`isSafe\` to \`true\` and the reason to an empty string.

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
