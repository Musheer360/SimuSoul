'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating persona details based on a name.
 *
 * - generatePersonaDetails - A function that handles the persona detail generation process.
 * - GeneratePersonaDetailsInput - The input type for the generatePersonaDetails function.
 * - GeneratePersonaDetailsOutput - The return type for the generatePersonaDetails function.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { callWithFailover } from '@/lib/api-key-manager';

const GeneratePersonaDetailsInputSchema = z.object({
  personaName: z.string().describe('The name of the persona.'),
  personaRelation: z.string().describe("The persona's relationship to the user."),
  apiKey: z.string().optional().describe('An optional custom Gemini API key.'),
});
export type GeneratePersonaDetailsInput = z.infer<typeof GeneratePersonaDetailsInputSchema>;

const GeneratePersonaDetailsOutputSchema = z.object({
  traits: z.string().describe("The persona's key traits and characteristics."),
  backstory: z.string().describe("The persona's detailed backstory."),
  goals: z.string().describe("The persona's primary goals and motivations."),
  responseStyle: z.string().describe("A description of the persona's communication style. Include details like their use of slang, emojis, formality, tone, and any scenario-based variations (e.g., how they talk when happy vs. angry)."),
});
export type GeneratePersonaDetailsOutput = z.infer<typeof GeneratePersonaDetailsOutputSchema>;

export async function generatePersonaDetails(input: GeneratePersonaDetailsInput): Promise<GeneratePersonaDetailsOutput> {
  return generatePersonaDetailsFlow(input);
}

const promptText = `You are an expert character designer. Based on the provided persona name and relationship, generate a compelling and creative set of traits, a backstory, goals, and a response style that fit the context.

**IMPORTANT CONTENT RESTRICTIONS:**
- **Gender:** The persona MUST be strictly either male or female. Do not create characters that are non-binary, gender-fluid, or any other gender identity.
- **Religion:** You MUST NOT create any persona that is a religious figure, deity, or has any association with real-world religions. The character's backstory and goals must be completely secular.
- **Controversial Topics:** You MUST NOT create personas related to or that express views on sensitive or controversial topics, including but not limited to politics, sexuality (including LGBTQ+ identities), or social activism. Keep the persona's identity and story neutral and broadly appealing.

Persona Name: {{personaName}}
Relationship to User: {{personaRelation}}

Generate the following details for this character, strictly adhering to the content restrictions above:
- Traits: A short, punchy list of their most defining characteristics.
- Backstory: A concise but evocative summary of their life history.
- Goals: What drives them forward? What do they want to achieve?
- Response Style: Define their communication habits. Are they formal or informal? Do they use emojis, slang, or curse words? How does their tone change with their mood (e.g., happy, angry, casual)? Be specific.

Make the details creative, consistent, and inspiring, while strictly following all content rules.
`;

const generatePersonaDetailsFlow = ai.defineFlow(
  {
    name: 'generatePersonaDetailsFlow',
    inputSchema: GeneratePersonaDetailsInputSchema,
    outputSchema: GeneratePersonaDetailsOutputSchema,
  },
  async (input) => {
    return callWithFailover(async (apiKey) => {
      const dynamicAi = genkit({
        plugins: [googleAI({ apiKey })],
        model: 'googleai/gemini-2.0-flash',
      });

      const prompt = dynamicAi.definePrompt({
        name: 'generatePersonaDetailsPrompt_dynamic',
        input: {schema: GeneratePersonaDetailsInputSchema},
        output: {schema: GeneratePersonaDetailsOutputSchema},
        prompt: promptText,
        config: {
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
        throw new Error('The AI model returned no output.');
      }
      return output;
    }, input.apiKey);
  }
);
