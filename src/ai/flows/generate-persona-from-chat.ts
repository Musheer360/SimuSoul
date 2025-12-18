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

function isThinkingConfigUnsupported(error: unknown): boolean {
  if (!isGeminiApiError(error)) return false;
  const { message } = getGeminiErrorDetails(error);
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
  
  const prompt = `<system>
You are an elite psychological profiler specializing in creating hyper-realistic digital personas from chat analysis.
</system>

<task>
Analyze WhatsApp messages to create an extraordinarily accurate persona clone.
</task>

<analysis_framework>
MICRO-LINGUISTIC PATTERNS:
• Specific phrases, catchphrases, verbal tics
• Emoji usage patterns and combinations
• Punctuation habits (ellipsis, exclamation, capitalization)
• Typo patterns and autocorrect tendencies
• Message length preferences

EMOTIONAL INTELLIGENCE:
• Emotional range and expression patterns
• How they handle joy, frustration, sadness, excitement
• Empathy levels and emotional support style
• Vulnerability patterns and boundaries

PERSONALITY DEPTH:
• Core values and beliefs (inferred from topics/reactions)
• Humor style (sarcasm, puns, dark, wholesome)
• Decision-making patterns
• Conflict resolution approach

CONVERSATIONAL DYNAMICS:
• Response timing patterns
• Topic initiation vs response patterns
• Question-asking style
• Tone shifts based on context

UNIQUE MARKERS:
• Distinctive quirks and idiosyncrasies
• Inside jokes or references
• Cultural/regional language patterns
• Professional/hobby terminology
</analysis_framework>

<messages person="${personName.toUpperCase()}">
${messageSample}
</messages>

<metadata>
Total messages analyzed: ${personMessages.length}
${userContext}
</metadata>

<requirements>
• Be EXTREMELY specific about communication patterns
• Capture the ESSENCE of their personality
• Include actual phrases they use frequently
• Note subtle patterns others might miss
• Make the persona feel ALIVE and AUTHENTIC
</requirements>

<output_format>
{
  "name": "${personName}",
  "age": <estimated age - ALWAYS provide a number based on language/references>,
  "relation": "<relationship type: 'Friend (Established)', 'Best Friend (Established)', 'Partner (Established)', 'Coworker (Presumed)', 'Family Member (Established)' - use (Established) if confirmed, (Presumed) if inferred>",
  "traits": "<5-7 core traits with specific examples from messages>",
  "backstory": "<inferred life context: profession, lifestyle, interests, life stage>",
  "interests": "<hobbies, passions, frequently discussed topics with details>",
  "communicationStyle": "<DETAILED: message length, emoji use, punctuation, formality, humor, specific phrases>",
  "emotionalTone": "<emotional range, expression patterns, empathy level with examples>",
  "values": "<core values and beliefs inferred from conversations>",
  "quirks": "<unique characteristics: typos, autocorrect, specific emoji combos, verbal tics>"
}
</output_format>`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      topP: 0.95,
      topK: 40,
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
      },
      thinkingConfig: {
        thinkingLevel: "high",
      },
    },
  };

  let response;
  try {
    response = await callGeminiApi<any>('gemini-3-flash-preview:generateContent', requestBody);
  } catch (error) {
    // If thinking config is not supported, retry without it
    if (isThinkingConfigUnsupported(error)) {
      console.log('Thinking config not supported, retrying without it...');
      const { thinkingConfig, ...restGenerationConfig } = requestBody.generationConfig;
      response = await callGeminiApi<any>('gemini-3-flash-preview:generateContent', {
        ...requestBody,
        generationConfig: restGenerationConfig,
      });
    } else {
      throw error;
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
