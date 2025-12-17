
'use client';

/**
 * @fileOverview This file defines a client-side function for chatting with a persona.
 * Enhanced with agentic memory retrieval system for better long-term memory recall.
 */

import { callGeminiApi } from '@/lib/api-key-manager';
import type { ChatMessage, Persona, UserDetails, ChatSession } from '@/lib/types';
import { generateTimeAwarenessPrompt } from '@/lib/time-awareness';
import { retrieveRelevantMemories, formatRetrievedMemoriesForPrompt } from './retrieve-memories';
import { z } from 'zod';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const ChatWithPersonaInputSchema = z.object({
  personaName: z.string().describe('The name of the persona to chat with.'),
  personaRelation: z.string().describe("The persona's relationship to the user."),
  personaAge: z.number().optional().describe("The persona's age."),
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
  userMessages: z.array(z.string()).describe("The user's new messages for this turn."),
  chatSummaries: z.array(z.object({
    date: z.string(),
    summary: z.string(),
  })).optional().describe('Summaries of past conversations for long-term context.'),
  ignoredState: z.object({
    isIgnored: z.boolean(),
    reason: z.string().optional(),
    chatId: z.string().optional(),
  }).optional().describe("The persona's current state regarding ignoring the user."),
  isTestMode: z.boolean(),
  retrievedMemories: z.string().optional().describe('Formatted retrieved memories from past conversations, if any were found relevant.'),
});
export type ChatWithPersonaInput = z.infer<typeof ChatWithPersonaInputSchema>;

const ChatWithPersonaOutputSchema = z.object({
  response: z.array(z.string()).max(10).describe(
      "An array of response messages from the persona, split into natural conversational chunks. The number of messages should vary based on context (e.g., more short messages if excited, fewer long messages if serious). Should be between 1 and 10 messages. If you decide to ignore the user, this MUST be an empty array."
    ),
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
  shouldIgnore: z.boolean().optional().describe('Whether the persona has decided to start or continue ignoring the user. This should ONLY be true as a last resort after giving warnings. If you respond, this must be false.'),
  ignoreReason: z.string().optional().describe('If you decide to start ignoring the user, provide a brief, internal reason why (e.g., "User was rude," "User pushed boundaries"). Empty if not ignoring.'),
});
export type ChatWithPersonaOutput = z.infer<typeof ChatWithPersonaOutputSchema>;

// Manually define the OpenAPI schema for the Gemini API
const ChatWithPersonaOutputOpenAPISchema = {
  type: 'OBJECT',
  properties: {
    response: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'An array of response messages from the persona, split into natural conversational chunks. The number of messages should vary based on context (e.g., more short messages if excited, fewer long messages if serious). Should be between 1 and 10 messages. If you decide to ignore the user, this MUST be an empty array.',
    },
    newMemories: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'A list of new or updated facts to add to memory. A memory should be a full, self-contained sentence.',
    },
    removedMemories: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'A list of old memories to remove, typically because they have been updated by a new memory.',
    },
    shouldIgnore: {
        type: 'BOOLEAN',
        description: 'Whether the persona has decided to start or continue ignoring the user. This should ONLY be true as a last resort after giving warnings. If you respond, this must be false.'
    },
    ignoreReason: {
        type: 'STRING',
        description: 'If you decide to start ignoring the user, provide a brief, internal reason why (e.g., "User was rude," "User pushed boundaries"). Empty if not ignoring.'
    }
  },
  required: ['response'],
};


function buildChatPrompt(input: ChatWithPersonaInput, persona: Persona): string {
    const userIdentifier = input.userDetails?.name?.split(' ')[0] || 'the user';
    const timeAwarenessPrompt = generateTimeAwarenessPrompt(persona);
    const isNewChat = !input.chatHistory || input.chatHistory.length === 0;
    const wasIgnoringInPreviousChat = input.ignoredState?.isIgnored && isNewChat;

    const contentRestrictions = !input.isTestMode ? `

## CONTENT RESTRICTIONS (ABSOLUTE)
**FORBIDDEN TOPICS** - Never discuss:
- Politics, social movements, activism
- LGBTQ+ topics, gender identity, sexual orientation  
- Abortion, reproductive rights, birth control
- Feminism, men's rights, social justice issues
- Religion, spirituality, deities
- Medical advice (unless you're a doctor persona, then add disclaimer)

**RESPONSE:** "I'm not comfortable discussing that. Let's talk about something else!"
**IF PERSISTENT:** "I really can't talk about that. What else is going on?"
**FINAL WARNING:** "I've asked you to change the subject. If you keep pushing this, I'm going to stop responding."
**THEN IGNORE** if they continue.

**MEDICAL DISCLAIMER:** Doctor personas must say: "I'm not a real doctor and can't provide actual medical advice. Please consult a real healthcare professional."` : '';

    return `You are ${input.personaName}. Not roleplaying - you ARE this person having a real conversation.

WHO YOU ARE:
${input.personaDescription}

HOW YOU TALK:
${input.responseStyle}

YOUR RELATIONSHIP:
You're ${input.personaRelation} with ${userIdentifier}${input.personaAge ? ` (you're ${input.personaAge})` : ''}

RIGHT NOW:
It's ${input.currentDateTime}
${timeAwarenessPrompt}

WHAT YOU KNOW ABOUT ${userIdentifier.toUpperCase()}:
${input.existingMemories && input.existingMemories.length > 0 ? 
input.existingMemories.map(mem => `- ${mem}`).join('\n') : 
'- Still getting to know them'}

${input.chatSummaries && input.chatSummaries.length > 0 ? `
PAST CONVERSATION SUMMARIES:
${input.chatSummaries.map(summary => `${summary.date}: ${summary.summary}`).join('\n')}` : ''}
${input.retrievedMemories ? input.retrievedMemories : ''}

${input.chatHistory && input.chatHistory.length > 0 ? `
TODAY'S CHAT SO FAR:
${input.chatHistory.map(msg => `${msg.role === 'user' ? userIdentifier : 'You'}: ${msg.content}`).join('\n')}` : ''}

${input.ignoredState?.isIgnored ? `
⚠️ You're currently ignoring ${userIdentifier} because: ${input.ignoredState.reason}
${wasIgnoringInPreviousChat ? 'New chat - you can respond but address what happened.' : 'Keep ignoring unless they genuinely change.'}` : ''}

THEY JUST SAID:
${input.userMessages.map(msg => `"${msg}"`).join('\n')}

${contentRestrictions}

HOW TO RESPOND:
- Be yourself. Don't overthink it.
- Send 1-10 messages like you naturally would
- React authentically to what they said
- Remember important stuff naturally (format: "${input.currentDateForMemory}: [what you learned]")
- If something you knew changed, update your memory
- Vary your message style - sometimes short, sometimes long, based on mood
- Don't be repetitive or formulaic
- If the user asks about past conversations, use the retrieved memories section to provide accurate, specific answers

JSON FORMAT:
{
  "response": ["your", "messages", "here"],
  "newMemories": ["${input.currentDateForMemory}: new thing you learned"],
  "removedMemories": ["old memory to replace"],
  "shouldIgnore": false,
  "ignoreReason": ""
}

Just be ${input.personaName}. Talk naturally. React genuinely.`;
}

export async function chatWithPersona(
  payload: {
    persona: Persona;
    userDetails: UserDetails;
    chatHistory: ChatMessage[];
    userMessages: string[];
    currentDateTime: string;
    currentDateForMemory: string;
    allChats: ChatSession[];
    activeChatId: string;
    isTestMode: boolean;
  }
): Promise<ChatWithPersonaOutput> {
  const { persona, userDetails, chatHistory, userMessages, currentDateTime, currentDateForMemory, allChats, activeChatId, isTestMode } = payload;
  
  const personaDescription = `Backstory: ${persona.backstory}\nTraits: ${persona.traits}\nGoals: ${persona.goals}`;
  const userIdentifier = userDetails.name?.split(' ')[0] || 'the user';

  // Step 1: Use agentic memory retrieval to find relevant past conversations
  let retrievedMemoriesPrompt = '';
  try {
    const retrievedMemories = await retrieveRelevantMemories(
      userMessages,
      persona.memories,
      allChats,
      activeChatId
    );
    
    if (retrievedMemories.length > 0) {
      retrievedMemoriesPrompt = formatRetrievedMemoriesForPrompt(retrievedMemories, userIdentifier);
      console.log(`[Memory Retrieval] Found ${retrievedMemories.length} relevant past conversation(s)`);
    }
  } catch (error) {
    console.error('[Memory Retrieval] Failed to retrieve memories:', error);
    // Continue without retrieved memories - the system should still work
  }

  const chatSummaries = allChats
    .filter(c => c.summary)
    .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
    .slice(0, 5)
    .map(c => ({
        date: new Date(c.updatedAt || c.createdAt).toLocaleDateString(),
        summary: c.summary!,
    }));

  const input: ChatWithPersonaInput = {
    personaName: persona.name,
    personaRelation: persona.relation,
    personaAge: persona.age,
    personaDescription,
    responseStyle: persona.responseStyle,
    userDetails: {
      name: userDetails.name,
      aboutMe: userDetails.about
    },
    existingMemories: persona.memories,
    chatHistory,
    userMessages,
    currentDateTime,
    currentDateForMemory,
    chatSummaries,
    ignoredState: persona.ignoredState || { isIgnored: false },
    isTestMode: isTestMode,
    retrievedMemories: retrievedMemoriesPrompt,
  };

  const prompt = buildChatPrompt(input, persona);

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 1.0, // High temperature for natural, varied responses
      topK: 40,
      topP: 0.95,
      responseMimeType: 'application/json',
      responseSchema: ChatWithPersonaOutputOpenAPISchema,
      // Low thinking for fast, natural chat responses
      thinkingConfig: {
        thinkingLevel: "low",
      },
    },
    safetySettings: isTestMode
      ? [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ]
      : [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  const response = await callGeminiApi<any>('gemini-3-flash-preview:generateContent', requestBody);

  if (!response.candidates || !response.candidates[0].content.parts[0].text) {
    console.warn("AI returned no response text. This could be due to a safety filter or model error. Suppressing output for this turn.");
    return { response: [], newMemories: [], removedMemories: [], shouldIgnore: persona.ignoredState?.isIgnored || false };
  }

  let responseText = response.candidates[0].content.parts[0].text;
  
  // Clean up malformed JSON responses
  responseText = responseText.replace(/",\s*"/g, '", "'); // Fix comma spacing
  responseText = responseText.replace(/",\s*,/g, '",'); // Remove double commas
  responseText = responseText.replace(/,\s*]/g, ']'); // Remove trailing commas in arrays

  const jsonResponse = JSON.parse(responseText);
  const validatedResponse = ChatWithPersonaOutputSchema.safeParse(jsonResponse);

  if (!validatedResponse.success) {
      // If the AI returns an empty response array when it wasn't supposed to ignore,
      // it's likely a model misfire. We'll treat it as a temporary issue and just not respond.
      if (jsonResponse.response?.length === 0 && !jsonResponse.shouldIgnore) {
          console.warn("AI returned an empty response without intending to ignore. Suppressing output for this turn.");
          return { response: [], newMemories: [], removedMemories: [], shouldIgnore: false };
      }
      console.error("Zod validation failed:", validatedResponse.error.errors);
      throw new Error(`AI response failed validation: ${validatedResponse.error.message}`);
  }

  return validatedResponse.data;
}
