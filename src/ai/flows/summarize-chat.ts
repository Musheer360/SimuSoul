
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
  summary: z.string().describe('A concise summary of the conversation in 3-5 bullet points.'),
});
export type SummarizeChatOutput = z.infer<typeof SummarizeChatOutputSchema>;

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
  const prompt = `You are a summarization expert. Analyze the following conversation between a user and an AI assistant. Your task is to create a concise summary that captures the most important information, events, and decisions. The summary will be used for long-term memory, so focus on key takeaways.

**CRITICAL RULE:** The summary MUST be a maximum of 5 bullet points.

---
**Conversation History to Summarize:**
${input.chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}
---

Generate the summary now.
`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: SummarizeChatOutputOpenAPISchema,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  const response = await callGeminiApi<any>('gemini-2.5-flash:generateContent', requestBody);
  
  if (!response.candidates || !response.candidates[0].content.parts[0].text) {
    throw new Error('Invalid response from AI model for summary generation.');
  }
  
  const jsonResponse = JSON.parse(response.candidates[0].content.parts[0].text);
  return SummarizeChatOutputSchema.parse(jsonResponse);
}

    