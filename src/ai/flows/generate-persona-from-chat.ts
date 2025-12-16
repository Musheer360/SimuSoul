'use client';

import { callGeminiApi } from '@/lib/api-key-manager';
import { z } from 'zod';

export const GeneratePersonaFromChatInputSchema = z.object({
  chatContent: z.string().describe("The raw WhatsApp chat export content"),
  personName: z.string().describe("The name of the person to clone from the chat"),
  userName: z.string().optional().describe("The name of the user for context"),
  userAbout: z.string().optional().describe("Information about the user for context"),
});
export type GeneratePersonaFromChatInput = z.infer<typeof GeneratePersonaFromChatInputSchema>;

export const GeneratePersonaFromChatOutputSchema = z.object({
  name: z.string(),
  age: z.number(),
  relation: z.string(),
  traits: z.string(),
  backstory: z.string(),
  interests: z.string(),
  communicationStyle: z.string(),
  emotionalTone: z.string(),
  values: z.string(),
  quirks: z.string(),
});
export type GeneratePersonaFromChatOutput = z.infer<typeof GeneratePersonaFromChatOutputSchema>;

/**
 * Parses WhatsApp chat export and filters messages by person name
 */
function parseWhatsAppChat(chatContent: string, personName: string): string[] {
  const lines = chatContent.split('\n');
  const personMessages: string[] = [];
  
  // WhatsApp format: DD/MM/YYYY, HH:MM - Name: Message
  // or: [DD/MM/YYYY, HH:MM:SS] Name: Message
  const messageRegex = /^[\[\(]?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})[,\s]+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\]?\s?[-:]\s?([^:]+):\s?(.+)$/i;
  
  let currentMessage = '';
  let currentSender = '';
  
  for (const line of lines) {
    const match = line.match(messageRegex);
    
    if (match) {
      // Save previous message if it was from target person
      if (currentSender.toLowerCase().includes(personName.toLowerCase()) && currentMessage) {
        personMessages.push(currentMessage.trim());
      }
      
      // Start new message
      currentSender = match[3].trim();
      currentMessage = match[4];
    } else if (currentMessage) {
      // Multi-line message continuation
      currentMessage += '\n' + line;
    }
  }
  
  // Save last message if from target person
  if (currentSender.toLowerCase().includes(personName.toLowerCase()) && currentMessage) {
    personMessages.push(currentMessage.trim());
  }
  
  return personMessages;
}

type GeminiApiError = { status?: number; code?: string; message?: string };

type PersonaGenerationConfig = {
  temperature?: number;
  responseMimeType?: string;
  responseSchema?: unknown;
  topP?: number;
  topK?: number;
  thinkingConfig?: { thinkingBudget?: number };
  [key: string]: unknown;
};

// Tuned fallback config for the free-tier Gemini Flash model to balance quality and quota-free availability.
const FLASH_FALLBACK_TEMPERATURE = 0.45;
const FLASH_FALLBACK_TOP_P = 0.95;
const FLASH_FALLBACK_TOP_K = 32;
const FLASH_FALLBACK_THINKING_BUDGET = 1024;

function isGeminiApiError(error: unknown): error is GeminiApiError {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as Partial<GeminiApiError>;
  return (
    typeof candidate.message === 'string' ||
    typeof candidate.status === 'number' ||
    typeof candidate.code === 'string'
  );
}

function getGeminiErrorDetails(error: GeminiApiError) {
  const rawCode = (error.code || '').toString();
  return {
    status: error.status,
    rawCode,
    normalizedCode: rawCode.toUpperCase(),
    message: (error.message || '').toLowerCase(),
  };
}

function shouldFallbackToFlash(error: unknown): boolean {
  if (!isGeminiApiError(error)) return false;
  const { status, normalizedCode, message } = getGeminiErrorDetails(error);
  const isRateLimited = status === 429 || message.includes('429');
  const isQuotaBlocked = normalizedCode === 'RESOURCE_EXHAUSTED' || normalizedCode.includes('QUOTA') || message.includes('quota');
  const isBillingBlocked = message.includes('billing') || message.includes('limit: 0');
  return isRateLimited || isQuotaBlocked || isBillingBlocked;
}

function isThinkingConfigUnsupported(error: unknown): boolean {
  if (!isGeminiApiError(error)) return false;
  const { normalizedCode, message } = getGeminiErrorDetails(error);
  const mentionsThinkingConfig = /thinking[_\s]?config/.test(message);
  const mentionsUnsupportedField = message.includes('unknown field "thinkingconfig"') || message.includes('unknown field "thinking config"') || message.includes('unsupported field "thinkingconfig"');
  return mentionsThinkingConfig || mentionsUnsupportedField;
}

export async function generatePersonaFromChat(input: GeneratePersonaFromChatInput): Promise<GeneratePersonaFromChatOutput> {
  const { chatContent, personName, userName, userAbout } = input;
  
  // Parse and filter messages
  const personMessages = parseWhatsAppChat(chatContent, personName);
  
  if (personMessages.length === 0) {
    throw new Error(`No messages found from "${personName}". Please check the name spelling and chat format.`);
  }
  
  if (personMessages.length < 10) {
    throw new Error(`Only ${personMessages.length} messages found. Need at least 10 messages for accurate persona cloning.`);
  }
  
  // Prepare context
  const userContext = userName || userAbout 
    ? `\n\nCONTEXT: This persona will interact with ${userName || 'the user'}${userAbout ? `, who is ${userAbout}` : ''}.`
    : '';
  
  // Sample messages for analysis (use up to 200 messages to stay within token limits)
  const messageSample = personMessages.slice(0, 200).join('\n---\n');
  
  const prompt = `You are an elite psychological profiler and communication analyst specializing in creating hyper-realistic digital personas. Your task is to analyze WhatsApp messages and create an EXTRAORDINARILY accurate persona clone.

ANALYSIS FRAMEWORK:

1. MICRO-LINGUISTIC PATTERNS:
   - Specific phrases, catchphrases, verbal tics
   - Emoji usage patterns and combinations
   - Punctuation habits (ellipsis, exclamation marks, capitalization)
   - Typo patterns and autocorrect tendencies
   - Message length preferences and rhythm

2. EMOTIONAL INTELLIGENCE MAPPING:
   - Emotional range and expression patterns
   - How they handle different emotions (joy, frustration, sadness, excitement)
   - Empathy levels and emotional support style
   - Vulnerability patterns and boundaries

3. PERSONALITY DEPTH ANALYSIS:
   - Core values and beliefs (inferred from topics and reactions)
   - Humor style (sarcasm, puns, dark humor, wholesome)
   - Decision-making patterns
   - Conflict resolution approach
   - Optimism vs realism spectrum

4. CONVERSATIONAL DYNAMICS:
   - Response timing patterns (quick replies vs thoughtful pauses)
   - Topic initiation vs response patterns
   - Question-asking frequency and style
   - How they change tone based on context
   - Level of formality vs casualness

5. UNIQUE IDENTITY MARKERS:
   - Distinctive quirks and idiosyncrasies
   - Inside jokes or references
   - Cultural or regional language patterns
   - Professional or hobby-specific terminology
   - Personal storytelling style

MESSAGES FROM ${personName.toUpperCase()}:
${messageSample}

TOTAL MESSAGES ANALYZED: ${personMessages.length}${userContext}

CRITICAL INSTRUCTIONS:
- Be EXTREMELY specific about communication patterns
- Capture the ESSENCE of their personality, not generic traits
- Include actual phrases they use frequently
- Note subtle patterns others might miss
- Make the persona feel ALIVE and AUTHENTIC

OUTPUT REQUIREMENTS (JSON format):
{
  "name": "${personName}",
  "age": <estimated age based on language/references/life stage - ALWAYS provide a number, use best estimate>,
  "relation": "<relationship type with confidence level: 'Friend (Established)', 'Best Friend (Established)', 'Partner (Established)', 'Coworker (Presumed)', 'Family Member (Established)', etc. Use (Established) if relationship is explicitly confirmed by both parties in chat, use (Presumed) if inferred from context>",
  "traits": "<5-7 core personality traits with specific examples from messages>",
  "backstory": "<inferred life context: profession, lifestyle, interests, life stage - be specific based on message content>",
  "interests": "<hobbies, passions, topics they frequently discuss - with specific details>",
  "communicationStyle": "<DETAILED description: message length, emoji use, punctuation, formality, humor style, response patterns, specific phrases they use>",
  "emotionalTone": "<emotional range, how they express feelings, empathy level, vulnerability patterns - with examples>",
  "values": "<core values and beliefs inferred from conversations, what matters to them>",
  "quirks": "<unique characteristics: typos, autocorrect patterns, specific emoji combos, verbal tics, inside jokes>"
}

Respond ONLY with valid JSON. Make every field rich with specific, authentic details.`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          relation: { type: 'string' },
          traits: { type: 'string' },
          backstory: { type: 'string' },
          interests: { type: 'string' },
          communicationStyle: { type: 'string' },
          emotionalTone: { type: 'string' },
          values: { type: 'string' },
          quirks: { type: 'string' },
        },
        required: ['name', 'age', 'relation', 'traits', 'backstory', 'interests', 'communicationStyle', 'emotionalTone', 'values', 'quirks']
      }
    },
  };

  let response;
  try {
    response = await callGeminiApi<any>('gemini-2.5-pro:generateContent', requestBody);
  } catch (error) {
    if (!shouldFallbackToFlash(error)) {
      throw error;
    }

    // Fall back to the best free-tier option with a small thinking budget to preserve quality without billing.
    const flashRequestBody = {
      ...requestBody,
      generationConfig: {
        ...requestBody.generationConfig,
        temperature: FLASH_FALLBACK_TEMPERATURE,
        topP: FLASH_FALLBACK_TOP_P,
        topK: FLASH_FALLBACK_TOP_K,
        thinkingConfig: {
          thinkingBudget: FLASH_FALLBACK_THINKING_BUDGET,
        },
      },
    };

    try {
      response = await callGeminiApi<any>('gemini-2.5-flash:generateContent', flashRequestBody);
    } catch (flashError) {
      if (isThinkingConfigUnsupported(flashError)) {
        const generationConfig: PersonaGenerationConfig = flashRequestBody.generationConfig && typeof flashRequestBody.generationConfig === 'object'
          ? flashRequestBody.generationConfig
          : {};
        const { thinkingConfig, ...restGenerationConfig } = generationConfig;
        response = await callGeminiApi<any>('gemini-2.5-flash:generateContent', {
          ...flashRequestBody,
          generationConfig: restGenerationConfig,
        });
      } else {
        throw flashError;
      }
    }
  }
  
  const textContent = response.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textContent) {
    throw new Error('No response from AI model');
  }

  const result = JSON.parse(textContent);
  
  return {
    name: result.name || personName,
    age: result.age,
    relation: result.relation,
    traits: result.traits,
    backstory: result.backstory,
    interests: result.interests,
    communicationStyle: result.communicationStyle,
    emotionalTone: result.emotionalTone,
    values: result.values,
    quirks: result.quirks,
  };
}
