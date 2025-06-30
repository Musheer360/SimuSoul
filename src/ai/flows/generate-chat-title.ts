'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a concise chat title.
 *
 * - generateChatTitle - A function that generates a short summary title for a chat.
 * - GenerateChatTitleInput - The input type for the generateChatTitle function.
 * - GenerateChatTitleOutput - The return type for the generateChatTitle function.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { callWithFailover } from '@/lib/api-key-manager';

const GenerateChatTitleInputSchema = z.object({
  userMessage: z.string().describe("The user's initial message in the conversation."),
  assistantResponse: z.string().describe("The assistant's first response to the user."),
  apiKey: z.array(z.string()).optional().describe('An optional list of custom Gemini API keys.'),
});
export type GenerateChatTitleInput = z.infer<typeof GenerateChatTitleInputSchema>;

const GenerateChatTitleOutputSchema = z.object({
  title: z.string().describe('A very short chat title, 4-5 words maximum.'),
});
export type GenerateChatTitleOutput = z.infer<typeof GenerateChatTitleOutputSchema>;

export async function generateChatTitle(input: GenerateChatTitleInput): Promise<GenerateChatTitleOutput> {
  return generateChatTitleFlow(input);
}

const promptText = `Based on the following first user message and the first AI response, create a concise and descriptive chat title. The title MUST be a maximum of 4-5 words.

User Message: "{{userMessage}}"
AI Response: "{{assistantResponse}}"

Generate a short title that captures the essence of this initial exchange.
`;

const generateChatTitleFlow = ai.defineFlow(
  {
    name: 'generateChatTitleFlow',
    inputSchema: GenerateChatTitleInputSchema,
    outputSchema: GenerateChatTitleOutputSchema,
  },
  async (input) => {
    return callWithFailover(async (apiKey) => {
      const dynamicAi = genkit({
        plugins: [googleAI({ apiKey })],
        model: 'googleai/gemini-2.0-flash',
      });
      
      const prompt = dynamicAi.definePrompt({
        name: 'generateChatTitlePrompt_dynamic',
        input: {schema: GenerateChatTitleInputSchema},
        output: {schema: GenerateChatTitleOutputSchema},
        prompt: promptText,
      });

      const { output } = await prompt(input);
      if (!output) {
        throw new Error('The AI model returned no output for the title.');
      }
      return output;
    }, input.apiKey);
  }
);
