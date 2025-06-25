'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a profile picture for a persona based on its traits.
 *
 * - generatePersonaProfilePicture - A function that handles the persona profile picture generation process.
 * - GeneratePersonaProfilePictureInput - The input type for the generatePersonaProfilePicture function.
 * - GeneratePersonaProfilePictureOutput - The return type for the generatePersonaProfilePicture function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePersonaProfilePictureInputSchema = z.object({
  personaTraits: z
    .string()
    .describe('A description of the persona, including traits, backstory, and appearance.'),
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

const generateProfilePicturePrompt = ai.definePrompt({
  name: 'generateProfilePicturePrompt',
  input: {schema: GeneratePersonaProfilePictureInputSchema},
  output: {schema: GeneratePersonaProfilePictureOutputSchema},
  prompt: `You are an AI that generates profile pictures for fictional personas.

  Based on the following persona traits, generate a profile picture that visually represents the persona.
  Ensure the generated image accurately reflects the described traits and backstory.

  Persona Traits: {{{personaTraits}}}

  Output:
  A data URI containing the generated profile picture image.
  `,
});

const generatePersonaProfilePictureFlow = ai.defineFlow(
  {
    name: 'generatePersonaProfilePictureFlow',
    inputSchema: GeneratePersonaProfilePictureInputSchema,
    outputSchema: GeneratePersonaProfilePictureOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: input.personaTraits,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('No profile picture was generated.');
    }

    return {profilePictureDataUri: media.url};
  }
);
