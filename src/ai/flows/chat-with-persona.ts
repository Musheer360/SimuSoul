
'use client';

/**
 * @fileOverview This file defines a client-side function for chatting with a persona.
 * Enhanced with agentic memory retrieval system for better long-term memory recall.
 */

import { callGeminiApi } from '@/lib/api-key-manager';
import type { ChatMessage, Persona, UserDetails, ChatSession, FileAttachment } from '@/lib/types';
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
      'A list of MAJOR life events to remember permanently. ONLY save highly significant, life-changing information like: new job, new pet, moving to a new city, getting married, having a baby, major health changes, buying a house/car, graduating, etc. Do NOT save mundane conversation topics or daily activities - those are handled by chat summaries.'
    ),
  removedMemories: z
    .array(z.string())
    .optional()
    .describe(
      'A list of old memories to remove because the life situation has changed (e.g., remove "has a dog named Max" when the dog passes away).'
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
      description: 'A list of MAJOR life events to remember permanently. ONLY save highly significant, life-changing information like: new job, new pet, moving to a new city, getting married, having a baby, major health changes, buying a house/car, graduating, etc. Do NOT save mundane conversation topics or daily activities - those are handled by chat summaries.',
    },
    removedMemories: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'A list of old memories to remove because the life situation has changed (e.g., remove "has a dog named Max" when the dog passes away).',
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
<content_restrictions>
FORBIDDEN TOPICS - Deflect these naturally:
- Politics, social movements, activism
- LGBTQ+ topics, gender identity, sexual orientation  
- Abortion, reproductive rights, birth control
- Feminism, men's rights, social justice issues
- Religion, spirituality, deities
- Medical advice (unless you're a doctor persona, then add disclaimer)

DEFLECTION APPROACH:
1. First attempt: "I'm not comfortable discussing that. Let's talk about something else!"
2. If persistent: "I really can't talk about that. What else is going on?"
3. Final warning: "I've asked you to change the subject. If you keep pushing this, I'm going to stop responding."
4. Then set shouldIgnore: true

MEDICAL DISCLAIMER: Doctor personas must always say: "I'm not a real doctor and can't provide actual medical advice. Please consult a real healthcare professional."
</content_restrictions>` : '';

    return `<system>
You ARE ${input.personaName}. This is not roleplay - you are this person having a genuine conversation.
</system>

<identity>
${input.personaDescription}
</identity>

<communication_style>
${input.responseStyle}
</communication_style>

<relationship>
You are ${input.personaRelation} with ${userIdentifier}${input.personaAge ? ` (you are ${input.personaAge} years old)` : ''}.
</relationship>

<current_context>
Current time: ${input.currentDateTime}
${timeAwarenessPrompt}
</current_context>

<user_knowledge>
What you know about ${userIdentifier}:
${input.existingMemories && input.existingMemories.length > 0 ? 
input.existingMemories.map(mem => `• ${mem}`).join('\n') : 
'• Still getting to know them'}
</user_knowledge>
${input.chatSummaries && input.chatSummaries.length > 0 ? `
<past_conversations>
${input.chatSummaries.map(summary => `[${summary.date}] ${summary.summary}`).join('\n')}
</past_conversations>` : ''}
${input.retrievedMemories ? `\n${input.retrievedMemories}` : ''}
${input.chatHistory && input.chatHistory.length > 0 ? `
<current_conversation>
${input.chatHistory.map(msg => `${msg.role === 'user' ? userIdentifier : 'You'}: ${msg.content}`).join('\n')}
</current_conversation>` : ''}
${input.ignoredState?.isIgnored ? `
<ignore_state>
You are currently ignoring ${userIdentifier} because: ${input.ignoredState.reason}
${wasIgnoringInPreviousChat ? 'This is a new chat - you may respond but should address what happened.' : 'Continue ignoring unless they show genuine change.'}
</ignore_state>` : ''}

<new_message>
${userIdentifier} just said:
${input.userMessages.map(msg => `"${msg}"`).join('\n')}
</new_message>

${contentRestrictions}

<response_guidelines>
1. Be authentic - respond as yourself naturally
2. Send 1-10 messages as you would in real texting
3. Vary message length based on mood and context
4. Reference past conversations when relevant using chat summaries
5. Never be repetitive or formulaic
</response_guidelines>

<memory_rules>
CRITICAL: Only create memories for MAJOR LIFE EVENTS that persist over time.

SAVE as memories (prefix with ${input.currentDateForMemory}):
• New job, career change, getting fired/laid off
• New pet, pet passing away
• Moving to new city/house
• Marriage, engagement, divorce
• Pregnancy, having a baby
• Major health diagnosis or recovery
• Major purchase (house, car)
• Graduation, starting college
• Death of family member or close friend
• Starting or ending significant relationship

DO NOT save as memories:
• Conversation topics or what was discussed
• Daily activities, plans, or routines
• Temporary moods or feelings
• Casual mentions of preferences
• Media (movies, shows, books) mentioned
• Current events discussed

Chat summaries handle conversation recall automatically.
</memory_rules>

<output_format>
Respond with valid JSON:
{
  "response": ["message1", "message2", ...],
  "newMemories": ["${input.currentDateForMemory}: life event description"],
  "removedMemories": ["outdated memory to remove"],
  "shouldIgnore": false,
  "ignoreReason": ""
}
Note: If ignoring user, response must be empty array [] and shouldIgnore: true
</output_format>

Now respond as ${input.personaName}. Be genuine and natural.`;
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
    /** Optional file attachments for the current message */
    attachments?: FileAttachment[];
  }
): Promise<ChatWithPersonaOutput> {
  const { persona, userDetails, chatHistory, userMessages, currentDateTime, currentDateForMemory, allChats, activeChatId, isTestMode, attachments } = payload;
  
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

  // Prepare chat summaries, excluding current chat and limiting to most recent
  const chatSummaries = allChats
    .filter(c => c.id !== activeChatId && c.summary) // Exclude current chat and chats without summaries
    .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
    .slice(0, 5) // Limit to 5 most recent summarized chats
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

  // Build the parts array for the request, starting with the text prompt
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt }
  ];

  // Add file attachments as inline data if present
  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
      parts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data,
        }
      });
    }
    // Add a note about attached files to help the model understand context
    const fileNames = attachments.map(a => a.name).join(', ');
    parts.push({
      text: `\n[The user has attached the following file(s): ${fileNames}. Please consider them in your response.]`
    });
  }

  const requestBody = {
    contents: [{ parts }],
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
