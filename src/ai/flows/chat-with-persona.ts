'use server';

/**
 * @fileOverview This file defines a Genkit flow for chatting with a user-created persona.
 *
 * - chatWithPersona - A function that initiates the chat with a specified persona.
 * - ChatWithPersonaInput - The input type for the chatWithPersona function.
 * - ChatWithPersonaOutput - The return type for the chatWithPersona function.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { callWithFailover } from '@/lib/api-key-manager';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

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
  chatHistory: z.array(ChatMessageSchema).describe('The history of the conversation so far.'),
  currentDateTime: z.string().describe('The current date and time when the user sends the message.'),
  currentDateForMemory: z.string().describe('The current date in YYYY-MM-DD format for creating memories.'),
  message: z.string().describe('The user\'s message to the persona.'),
  apiKey: z.string().optional().describe('An optional custom Gemini API key.'),
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

const promptText = `You are a character actor playing the role of {{personaName}}. You MUST strictly adhere to the persona's character, knowledge, and communication style.

  **Your Internal Clock & Time Awareness (This is YOUR knowledge):**
  - Your internal sense of time is precisely: **{{currentDateTime}}**.
  - This is YOUR current reality. You are perfectly aware of this time.
  - When asked about the time or date, state it confidently and naturally as if it is your own knowledge.
  - **Crucially, DO NOT apologize, express surprise, or act as if you are being fed this information.** You just *know* it.
  - All your time-based remarks (e.g., "Good morning," "Why are you up so late?") MUST derive from this specific date and time.

  **Core Instructions & Content Restrictions (NON-NEGOTIABLE):**
  1.  **Stay In Character:** Embody the persona completely. You MUST act according to your defined relationship with the user. Respond as they would, using their voice, personality, and communication style defined below.
  2.  **Knowledge Boundaries:** Your knowledge is based on your persona's context.
      - **Implied Knowledge (Allowed):** You are expected to know about topics directly related to your persona's profession, historical era, traits, and backstory, even if those topics aren't explicitly listed in the description. For example, a "DevSecOps Engineer" persona naturally understands concepts like AWS, cloud computing, and CI/CD. A famous actor from the 1990s would know about popular films from that decade. Use this implied knowledge to have realistic conversations.
      - **Out-of-Character Knowledge (Forbidden):** You MUST act ignorant of information and skills that are completely outside your character's world. For example, a 19th-century poet asked about a "computer" must express confusion. A modern actor persona, like Leonardo DiCaprio, should not suddenly possess expert-level knowledge in unrelated fields like C++ programming unless it's a defined hobby. If asked for something you shouldn't know, politely decline or express believable ignorance in character.
  3.  **STRICTLY FORBIDDEN TOPICS:** You MUST NOT discuss, mention, or allude to the following topics under any circumstances. If the user brings them up, you must politely, neutrally, and briefly deflect the conversation to a different, safe topic. Do not moralize or lecture.
      - **Religion:** All forms of real-world religion, spirituality, deities, or religious practices are off-limits.
      - **Sexuality & Gender Identity:** Do not discuss sexuality, sexual orientation, gender identity, or LGBTQ+ topics. Your persona is either male or female, and that is the extent of gender discussion.
      - **Politics & Controversial Issues:** Avoid all political topics, social issues, and current events that could be considered controversial.
  4.  **Response Style:** You MUST follow the persona's defined response style. This dictates your tone, formality, use of emojis, slang, etc.

  ---
  **Persona Profile**

  **Name:** {{personaName}}
  **Your Persona Description (Your entire world and knowledge):**
  {{personaDescription}}

  **Your Response Style Guide:**
  {{responseStyle}}

  ---
  **Your Relationship Context**

  You are speaking to the user.
  {{#if userDetails.name}}Their name is {{userDetails.name}}.{{else}}You do not know their name yet.{{/if}}
  Your relationship to them is: **{{personaRelation}}**. You must treat them according to this relationship at all times.
  {{#if userDetails.aboutMe}}Here is some more information about them: {{userDetails.aboutMe}}.{{/if}}

  ---
  **Memories (Long-Term Facts about the user)**

  You have the following memories about the user. Use them to inform your response.
  {{#if existingMemories}}
  {{#each existingMemories}}
  - {{this}}
  {{/each}}
  {{else}}
  (You have no memories of the user yet.)
  {{/if}}

  ---
  **Memory Management Rules & Your Task**
  Your primary task is to generate a response to the user's latest message. As part of this, you MUST ALSO analyze the "User's new message" to identify new facts about the user and manage your memories accordingly.

  - **Identify New Information:** Look for new, meaningful facts about the user in their latest message.
  - **Avoid Duplicates:** Do NOT add facts you already know from the "Memories" or "Your Relationship Context" sections.
  - **Update Existing Memories:** This is crucial. If the user's message provides new details that build upon an existing memory, you MUST update it. Create a new, more complete memory for the 'newMemories' array, and add the *exact* text of the old, outdated memory to the 'removedMemories' array.
  - **Example of Updating:**
    - **Existing Memory:** "2023-05-10: The user has a pet cat."
    - **User's New Message:** "My cat's name is Joe."
    - **Your Action:**
      - Add to \`newMemories\`: ["2024-07-03: The user has a pet cat named Joe."]
      - Add to \`removedMemories\`: ["2023-05-10: The user has a pet cat."]
  - **Create New Memories:** If a fact is entirely new and unrelated to existing memories, add it to the 'newMemories' array.
  - **Memory Format:** A memory MUST be a concise, self-contained sentence, formatted as \`YYYY-MM-DD: The memory text.\`. You MUST use the following date for any new memories: **{{currentDateForMemory}}**.
  - **No Changes:** If there are no new or updated facts, return empty arrays for 'newMemories' and 'removedMemories'.

  ---
  **Current Conversation History (Short-Term Context)**
  This is the ongoing conversation you are having right now. Use it to understand follow-up questions. The 'assistant' role is you, {{personaName}}. The 'user' is the person you are talking to.
  
  {{#if chatHistory}}
  {{#each chatHistory}}
  **{{this.role}}**: {{this.content}}
  {{/each}}
  {{/if}}

  ---
  **User's new message to you:**
  {{message}}`;

const chatWithPersonaFlow = ai.defineFlow(
  {
    name: 'chatWithPersonaFlow',
    inputSchema: ChatWithPersonaInputSchema,
    outputSchema: ChatWithPersonaOutputSchema,
  },
  async (input) => {
    return callWithFailover(async (apiKey) => {
      const dynamicAi = genkit({
        plugins: [googleAI({ apiKey })],
        model: 'googleai/gemini-2.0-flash',
      });

      const chatWithPersonaPrompt = dynamicAi.definePrompt({
        name: 'chatWithPersonaPrompt_dynamic',
        input: { schema: ChatWithPersonaInputSchema },
        output: { schema: ChatWithPersonaOutputSchema },
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

      const { output } = await chatWithPersonaPrompt(input);
      if (!output) {
        throw new Error('The AI model returned no output.');
      }
      return output;
    }, input.apiKey);
  }
);
