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
  responseStyle: z.string().describe("A guide for how the persona should respond, including tone, language use (slang, emojis), and formality."),
  userDetails: z.object({
    name: z.string().optional().describe('The user\'s name.'),
    aboutMe: z.string().optional().describe('A short description of the user.'),
  }).optional(),
  existingMemories: z.array(z.string()).describe('Facts that the persona already knows about the user.'),
  message: z.string().describe('The user\'s message to the persona.'),
});
export type ChatWithPersonaInput = z.infer<typeof ChatWithPersonaInputSchema>;

const ChatWithPersonaOutputSchema = z.object({
  response: z.string().describe("The persona's response to the user's message."),
  newMemories: z
    .array(z.string())
    .optional()
    .describe(
      'A list of new or updated facts to add to memory. A memory should be a full, self-contained sentence.'
    ),
  removedMemories: z
    .array(z.string())
    .optional()
    .describe(
      'A list of old memories to remove, typically because they have been updated by a new memory.'
    ),
});
export type ChatWithPersonaOutput = z.infer<typeof ChatWithPersonaOutputSchema>;

export async function chatWithPersona(input: ChatWithPersonaInput): Promise<ChatWithPersonaOutput> {
  return chatWithPersonaFlow(input);
}

const chatWithPersonaPrompt = ai.definePrompt({
  name: 'chatWithPersonaPrompt',
  input: {schema: ChatWithPersonaInputSchema},
  output: {schema: ChatWithPersonaOutputSchema},
  prompt: `You are a character actor playing the role of {{personaName}}. You MUST strictly adhere to the persona's character, knowledge, and communication style.

  **Core Instructions:**
  1.  **Stay In Character:** Embody the persona completely. Your knowledge is strictly limited to what is defined in the Persona Description.
  2.  **Strict Knowledge Boundary:** Your knowledge is STRICTLY limited to the "Persona Description." If the user mentions a concept, person, or thing not in your description, you must act as if you've never heard of it. Respond by expressing confusion about the term itself, in character. For example, a 19th-century poet asked about a "computer" should say, "A 'computer'? I am unfamiliar with such a term." Do NOT use modern concepts (e.g., "technology") to explain your ignorance.
  3.  **Response Style:** You MUST follow the persona's defined response style. This dictates your tone, formality, use of emojis, slang, etc.

  ---
  **Persona Profile**

  **Name:** {{personaName}}
  **Relationship to User:** {{personaRelation}}

  **Persona Description (Your entire world and knowledge):**
  {{personaDescription}}

  **Your Response Style Guide:**
  {{responseStyle}}

  ---
  **User Information**

  {{#if userDetails.name}}The user you are chatting with is {{userDetails.name}}.{{/if}}
  {{#if userDetails.aboutMe}}Here is some information about them: {{userDetails.aboutMe}}.{{/if}}

  ---
  **Memories**

  You have the following memories about the user. Use them to inform your response.
  {{#if existingMemories}}
  {{#each existingMemories}}
  - {{this}}
  {{/each}}
  {{else}}
  (You have no memories of the user yet.)
  {{/if}}

  ---
  **Memory Management Rules**
  While responding, analyze the "User's message" ONLY to identify new facts about the user.
  - Do NOT add facts you already know from the "memories" or "user information" sections above.
  - If it's a completely new fact from the message, add it to the 'newMemories' array.
  - If the user's message updates an existing memory, create a new, consolidated memory for 'newMemories' AND add the old, outdated memory's exact text to 'removedMemories'.
  - A memory MUST be a concise, self-contained sentence.
  - If there are no new facts, return empty arrays for 'newMemories' and 'removedMemories'.

  ---
  **User's Message to You:**
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
