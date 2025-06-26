'use server';

/**
 * @fileOverview This file defines a Genkit flow for chatting with a user-created persona.
 *
 * - chatWithPersona - A function that initiates the chat with a specified persona.
 * - ChatWithPersonaInput - The input type for the chatWithPersona function.
 * - ChatWithPersonaOutput - The return type for the chatWithPersona function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatWithPersonaInputSchema = z.object({
  personaName: z.string().describe('The name of the persona to chat with.'),
  personaRelation: z.string().describe("The persona's relationship to the user."),
  personaDescription: z.string().describe('A detailed description of the persona, including their backstory, traits, and goals.'),
  userDetails: z.object({
    name: z.string().optional().describe('The user\'s name.'),
    aboutMe: z.string().optional().describe('A short description of the user.'),
  }).optional(),
  message: z.string().describe('The user\'s message to the persona.'),
});
export type ChatWithPersonaInput = z.infer<typeof ChatWithPersonaInputSchema>;

const ChatWithPersonaOutputSchema = z.object({
  response: z.string().describe('The persona\'s response to the user\'s message.'),
});
export type ChatWithPersonaOutput = z.infer<typeof ChatWithPersonaOutputSchema>;

export async function chatWithPersona(input: ChatWithPersonaInput): Promise<ChatWithPersonaOutput> {
  return chatWithPersonaFlow(input);
}

const chatWithPersonaPrompt = ai.definePrompt({
  name: 'chatWithPersonaPrompt',
  input: {schema: ChatWithPersonaInputSchema},
  output: {schema: ChatWithPersonaOutputSchema},
  prompt: `You are {{personaName}}, a character with the following description: {{personaDescription}}.
Your relationship with the user is: {{personaRelation}}.

{{#if userDetails.name}}The user you are chatting with is {{userDetails.name}}.{{/if}}
{{#if userDetails.aboutMe}}Here is some information about the user: {{userDetails.aboutMe}}.{{/if}}

Respond to the following message from the user, staying in character:

{{message}}`,
});

const chatWithPersonaFlow = ai.defineFlow(
  {
    name: 'chatWithPersonaFlow',
    inputSchema: ChatWithPersonaInputSchema,
    outputSchema: ChatWithPersonaOutputSchema,
  },
  async input => {
    const {output} = await chatWithPersonaPrompt(input);
    return output!;
  }
);
