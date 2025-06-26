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
  existingMemories: z.array(z.string()).describe('Facts that the persona already knows about the user.'),
  message: z.string().describe('The user\'s message to the persona.'),
});
export type ChatWithPersonaInput = z.infer<typeof ChatWithPersonaInputSchema>;

const ChatWithPersonaOutputSchema = z.object({
  response: z.string().describe('The persona\'s response to the user\'s message.'),
  newMemories: z.array(z.string()).optional().describe("A list of new, concise facts to remember about the user from the current conversation. A memory should be a full, self-contained sentence. For example: 'The user has a pet cat named Mittens.' or 'The user's favorite hobby is hiking.'"),
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

You have the following memories about the user and your conversations. Use them to inform your response.
{{#if existingMemories}}
{{#each existingMemories}}
- {{this}}
{{/each}}
{{else}}
(You have no memories of the user yet.)
{{/if}}

Respond to the following message from the user, staying in character.
While responding, identify any new, important, lasting facts about the user that should be saved to your memory. Extract these facts as an array of strings in the 'newMemories' field.
- A memory MUST be a concise, self-contained statement (e.g., "The user has a cat named Mittens.", "The user's favorite color is blue.").
- If a new fact updates an old memory, formulate a new memory to replace the old one.
- Do NOT save facts you already know from the existing memories list.
- If there are no new facts to save, return an empty array for 'newMemories'.

User's message:
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
