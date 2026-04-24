
'use client';

/**
 * @fileOverview This file defines a client-side function for generating a chat title.
 */

import { callGeminiApi } from '@/lib/api-key-manager';
import { safeParseJson } from '@/lib/safe-json';
import { zodToGeminiSchema } from '@/lib/zod-to-gemini';
import { GEMINI_TEXT_MODEL } from '@/lib/constants';
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



export async function generateChatTitle(input: GenerateChatTitleInput): Promise<GenerateChatTitleOutput> {
  const prompt = `<system>
You are a chat title generator. Create short, descriptive titles.
</system>

<context>
User's first message: "${input.userMessage}"
AI's first response: "${input.assistantResponse}"
</context>

<requirements>
Maximum 4-5 words. Be descriptive but concise.
</requirements>

<output_format>
{
  "title": "Short Title Here"
}
</output_format>`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
      responseSchema: zodToGeminiSchema(GenerateChatTitleOutputSchema),
      thinkingConfig: {
        thinkingLevel: "low",
      },
    },
  };

  const response = await callGeminiApi<any>(`${GEMINI_TEXT_MODEL}:generateContent`, requestBody);
  
  if (!response.candidates || !response.candidates[0].content.parts[0].text) {
    throw new Error('Invalid response from AI model for title generation.');
  }
  
  const jsonResponse = safeParseJson(response.candidates[0].content.parts[0].text, 'generateChatTitle');
  return GenerateChatTitleOutputSchema.parse(jsonResponse);
}
