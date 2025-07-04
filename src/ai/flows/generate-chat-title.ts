
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
  const prompt = `Based on the following first user message and the first AI response, create a concise and descriptive chat title. The title MUST be a maximum of 4-5 words.

User Message: "${input.userMessage}"
AI Response: "${input.assistantResponse}"

Generate a short title that captures the essence of this initial exchange.
`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GenerateChatTitleOutputOpenAPISchema,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  const response = await callGeminiApi<any>('gemini-1.5-flash:generateContent', requestBody);
  
  if (!response.candidates || !response.candidates[0].content.parts[0].text) {
    throw new Error('Invalid response from AI model for title generation.');
  }
  
  const jsonResponse = JSON.parse(response.candidates[0].content.parts[0].text);
  return GenerateChatTitleOutputSchema.parse(jsonResponse);
}
