
'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a profile picture for a persona based on its traits.
 *
 * - generatePersonaProfilePicture - A function that handles the persona profile picture generation process.
 * - GeneratePersonaProfilePictureInput - The input type for the generatePersonaProfilePicture function.
 * - GeneratePersonaProfilePictureOutput - The return type for the generatePersonaProfilePicture function.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { callWithFailover } from '@/lib/api-key-manager';

const GeneratePersonaProfilePictureInputSchema = z.object({
  personaTraits: z
    .string()
    .describe('A description of the persona, including traits, backstory, and appearance.'),
  apiKey: z.array(z.string()).optional().describe('An optional list of custom Gemini API keys.'),
});
export type GeneratePersonaProfilePictureInput = z.infer<typeof GeneratePersonaProfilePictureInputSchema>;

const GeneratePersonaProfilePictureOutputSchema = z.object({
  profilePictureDataUri: z
    .string()
    .describe(
      'A data URI containing the generated profile picture image, must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Corrected description
    ),
});
export type GeneratePersonaProfilePictureOutput = z.infer<typeof GeneratePersonaProfilePictureOutputSchema>;

export async function generatePersonaProfilePicture(input: GeneratePersonaProfilePictureInput): Promise<GeneratePersonaProfilePictureOutput> {
  return generatePersonaProfilePictureFlow(input);
}

const generatePersonaProfilePictureFlow = ai.defineFlow(
  {
    name: 'generatePersonaProfilePictureFlow',
    inputSchema: GeneratePersonaProfilePictureInputSchema,
    outputSchema: GeneratePersonaProfilePictureOutputSchema,
  },
  async (input) => {
    return callWithFailover(async (apiKey) => {
      const dynamicAi = genkit({
        plugins: [googleAI({ apiKey })],
        model: 'googleai/gemini-2.5-flash',
      });

      const {media} = await dynamicAi.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: `Create a photorealistic, cinematic portrait of a character up to their mid-body. The character should be facing the camera. The character is described as: ${input.personaTraits}`,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      if (!media?.url) {
        throw new Error('No profile picture was generated.');
      }

      return {profilePictureDataUri: media.url};
    }, input.apiKey);
  }
);
