'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a full persona from a prompt.
 *
 * - generatePersonaFromPrompt - A function that handles the full persona generation.
 * - GeneratePersonaFromPromptInput - The input type for the function.
 * - GeneratePersonaFromPromptOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePersonaFromPromptInputSchema = z.object({
  prompt: z.string().describe('A prompt or idea for a character.'),
});
export type GeneratePersonaFromPromptInput = z.infer<typeof GeneratePersonaFromPromptInputSchema>;

const GeneratePersonaFromPromptOutputSchema = z.object({
  name: z.string().describe("A creative and fitting name for the persona."),
  relation: z.string().describe("The persona's relationship to the user, like 'best friend' or 'arch-nemesis'."),
  traits: z.string().describe("The persona's key traits and characteristics."),
  backstory: z.string().describe("The persona's detailed backstory."),
  goals: z.string().describe("The persona's primary goals and motivations."),
});
export type GeneratePersonaFromPromptOutput = z.infer<typeof GeneratePersonaFromPromptOutputSchema>;

export async function generatePersonaFromPrompt(input: GeneratePersonaFromPromptInput): Promise<GeneratePersonaFromPromptOutput> {
  return generatePersonaFromPromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePersonaFromPromptPrompt',
  input: {schema: GeneratePersonaFromPromptInputSchema},
  output: {schema: GeneratePersonaFromPromptOutputSchema},
  prompt: `You are a world-class creative writer and character designer. Based on the user's prompt, generate a complete, ready-to-use fictional persona.

User's Prompt: "{{prompt}}"

Generate all of the following details for this new character:
- Name: A unique and fitting name.
- Relationship: A plausible relationship to the user (e.g., friend, mentor, rival).
- Traits: A short, punchy list of their most defining characteristics.
- Backstory: A concise but evocative summary of their life history.
- Goals: What drives them forward? What do they want to achieve?

Be creative and ensure all the generated details are consistent with each other and the original prompt.
`,
});

const generatePersonaFromPromptFlow = ai.defineFlow(
  {
    name: 'generatePersonaFromPromptFlow',
    inputSchema: GeneratePersonaFromPromptInputSchema,
    outputSchema: GeneratePersonaFromPromptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
