
'use client';

/**
 * @fileOverview This file defines a client-side function for generating a chat title.
 */

import { callGeminiApi } from '@/lib/api-key-manager';
import { z } from 'zod';

export const GenerateChatTitleInputSchema = z.object({
  userMessage: z.string(),
  assistantResponse: z.string(),
});
export type GenerateChatTitleInput = z.infer<typeof GenerateChatTitleInputSchema>;

export const GenerateChatTitleOutputSchema = z.object({
  title: z.string().describe('A very short chat title, 4-5 words maximum.'),
});
export type GenerateChatTitleOutput = z.infer<typeof GenerateChatTitleOutputSchema>;

// Manually define the OpenAPI schema for the Gemini API
const GenerateChatTitleOutputOpenAPISchema = {
  type: 'OBJECT',
  properties: {
    title: {
      type: 'STRING',
      description: 'A very short chat title, 4-5 words maximum.',
    },
  },
  required: ['title'],
};

export async function generateChatTitle(input: GenerateChatTitleInput): Promise<GenerateChatTitleOutput> {
  const prompt = `You are a title generator. Your task is to create a very short, descriptive chat title based on the first user message and the first AI response.

**CRITICAL RULE:** The title MUST be a maximum of 4-5 words.

**CONTEXT:**
- **User's First Message:** "${input.userMessage}"
- **AI's First Response:** "${input.assistantResponse}"

Now, generate the title.`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
      responseSchema: GenerateChatTitleOutputOpenAPISchema,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  const response = await callGeminiApi<any>('gemini-3-flash-preview:generateContent', requestBody);
  
  if (!response.candidates || !response.candidates[0].content.parts[0].text) {
    throw new Error('Invalid response from AI model for title generation.');
  }
  
  const jsonResponse = JSON.parse(response.candidates[0].content.parts[0].text);
  return GenerateChatTitleOutputSchema.parse(jsonResponse);
}
