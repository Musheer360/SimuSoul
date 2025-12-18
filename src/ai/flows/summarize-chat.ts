
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
  
  const prompt = `You are a summarization expert. Analyze the following conversation between a user and an AI assistant. Your task is to create a concise summary that captures the most important information, events, and decisions. The summary will be used for long-term memory, so focus on key takeaways.

**CRITICAL RULES:** 
1. The summary MUST be between 3-5 bullet points.
2. Keep the total summary under 500 characters.
3. Focus on factual information, decisions, and important context.

---
**Conversation History to Summarize:**
${input.chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}
---

Generate the summary now.
`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.5, // Moderate temperature for balanced summarization
      responseMimeType: 'application/json',
      responseSchema: SummarizeChatOutputOpenAPISchema,
      // Low thinking for fast summarization
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
