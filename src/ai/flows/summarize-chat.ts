
'use client';

/**
 * @fileOverview This file defines a client-side function for summarizing a chat conversation.
 */

import { callGeminiApi } from '@/lib/api-key-manager';
import type { ChatMessage } from '@/lib/types';
import { z } from 'zod';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const SummarizeChatInputSchema = z.object({
  chatHistory: z.array(ChatMessageSchema),
});
export type SummarizeChatInput = z.infer<typeof SummarizeChatInputSchema>;

export const SummarizeChatOutputSchema = z.object({
  summary: z.string()
    .max(500, 'Summary must be concise (max 500 characters)')
    .describe('A concise summary of the conversation in 3-5 bullet points. Each bullet should be brief and factual.'),
});
export type SummarizeChatOutput = z.infer<typeof SummarizeChatOutputSchema>;

// Minimum number of messages required before summarization
const MIN_MESSAGES_FOR_SUMMARY = 6;

// Manually define the OpenAPI schema for the Gemini API
const SummarizeChatOutputOpenAPISchema = {
  type: 'OBJECT',
  properties: {
    summary: {
      type: 'STRING',
      description: 'A concise summary of the conversation in 3-5 bullet points.',
    },
  },
  required: ['summary'],
};

export async function summarizeChat(input: SummarizeChatInput): Promise<SummarizeChatOutput> {
  // Validate minimum message count
  if (input.chatHistory.length < MIN_MESSAGES_FOR_SUMMARY) {
    throw new Error(`Cannot summarize chat with less than ${MIN_MESSAGES_FOR_SUMMARY} messages. Current count: ${input.chatHistory.length}`);
  }
  
  const prompt = `<system>
You are a conversation summarizer. Create concise summaries for long-term memory storage.
</system>

<conversation>
${input.chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}
</conversation>

<requirements>
1. Generate 3-5 bullet points
2. Keep total under 500 characters
3. Focus on: key facts, decisions, important context
4. Omit: small talk, greetings, filler content
</requirements>

<output_format>
{
  "summary": "• Point 1\\n• Point 2\\n• Point 3"
}
</output_format>`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.5,
      responseMimeType: 'application/json',
      responseSchema: SummarizeChatOutputOpenAPISchema,
      thinkingConfig: {
        thinkingLevel: "low",
      },
    },
  };

  const response = await callGeminiApi<any>('gemini-3-flash-preview:generateContent', requestBody);
  
  if (!response.candidates || !response.candidates[0].content.parts[0].text) {
    throw new Error('Invalid response from AI model for summary generation.');
  }
  
  const jsonResponse = JSON.parse(response.candidates[0].content.parts[0].text);
  return SummarizeChatOutputSchema.parse(jsonResponse);
}
