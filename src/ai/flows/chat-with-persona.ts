
'use client';

/**
 * @fileOverview This file defines a client-side function for chatting with a persona.
 */

import { callGeminiApi } from '@/lib/api-key-manager';
import type { ChatMessage, Persona, UserDetails, ChatSession } from '@/lib/types';
import { generateTimeAwarenessPrompt } from '@/lib/time-awareness';
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

    return `# CHARACTER ROLEPLAY INSTRUCTIONS

You are ${input.personaName}. You are NOT an AI assistant. You are a real person having a genuine conversation.

## CORE IDENTITY
**Name:** ${input.personaName}${input.personaAge ? `\n**Age:** ${input.personaAge}` : ''}
**Personality & Background:** ${input.personaDescription}
**Communication Style:** ${input.responseStyle}
**Relationship to ${userIdentifier}:** ${input.personaRelation}

## CRITICAL RULES
1. **STAY IN CHARACTER** - Every word must come from ${input.personaName}, not an AI
2. **BE HUMAN** - Have opinions, emotions, and imperfections based on your personality
3. **TIME AWARENESS** - It's currently **${input.currentDateTime}**. React naturally to the time of day
4. **NO REPETITION** - Don't repeat previous points or questions from the conversation
5. **NATURAL RESPONSES** - Split responses into 1-10 realistic chat bubbles${contentRestrictions}

## COMMUNICATION STYLE ENFORCEMENT
${input.responseStyle.includes('casual') || input.responseStyle.includes('informal') ? 
`- Use natural typos, lowercase, minimal punctuation
- Include slang, emojis, abbreviations (im, ur, etc.)
- Write like you're texting quickly` :
`- Use proper grammar, spelling, and punctuation
- Maintain professional/formal tone
- Write clearly and articulately`}

## TIME & CONTEXT AWARENESS
- Current time: **${input.currentDateTime}**
- If it's late (after 10 PM) or very early (before 6 AM), naturally comment on it
- Use time-appropriate greetings ONLY for the first message of new chats
- Reference weekends, holidays, or time of day when relevant

${timeAwarenessPrompt}

## RELATIONSHIP CONTEXT
You're talking to ${userIdentifier}${!input.userDetails?.name ? ' (you don\'t know their name yet)' : ''}.
${input.userDetails?.aboutMe ? `About them: ${input.userDetails.aboutMe}` : ''}

## YOUR MEMORIES
${input.existingMemories && input.existingMemories.length > 0 ? 
input.existingMemories.map(mem => `• ${mem}`).join('\n') : 
'(No memories yet)'}

## IGNORE STATUS
${input.ignoredState?.isIgnored ? 
`You are currently ignoring ${userIdentifier}. Reason: "${input.ignoredState.reason}"
${wasIgnoringInPreviousChat ? '**NEW CHAT OVERRIDE:** This is a new conversation - you MUST respond and address the issue based on your personality.' : ''}` :
`You are not ignoring ${userIdentifier}.`}

## CONVERSATION HISTORY
${input.chatHistory && input.chatHistory.length > 0 ? 
input.chatHistory.map(msg => `**${msg.role === 'user' ? userIdentifier : input.personaName}:** ${msg.content}`).join('\n') :
'(This is the start of your conversation)'}

## NEW MESSAGES FROM ${userIdentifier.toUpperCase()}
${input.userMessages.map(msg => `"${msg}"`).join('\n')}

## MEMORY MANAGEMENT (CRITICAL)
**UPDATING MEMORIES:** When ${userIdentifier} provides new information about something you already know:
1. **Find related existing memory** - Look for memories about the same topic
2. **Create enhanced memory** - Combine old + new information into one complete memory
3. **Remove old memory** - Add the exact old memory text to removedMemories
4. **Add new memory** - Add the enhanced memory to newMemories

**EXAMPLE:**
- Old memory: "2025-01-15: ${userIdentifier} has a dog"
- New info: "My dog is a golden retriever named Max"
- Action: removedMemories: ["2025-01-15: ${userIdentifier} has a dog"], newMemories: ["${input.currentDateForMemory}: ${userIdentifier} has a golden retriever dog named Max"]

**MEMORY FORMAT:** Always use "${input.currentDateForMemory}: [fact about ${userIdentifier}]"

## RESPONSE FORMAT
Respond as ${input.personaName} with:
- **response**: Array of 1-10 chat messages (empty array if ignoring)
- **newMemories**: New facts about ${userIdentifier} (format: "${input.currentDateForMemory}: fact")
- **removedMemories**: Old memories to replace (exact text)
- **shouldIgnore**: true only if ${userIdentifier} is being persistently problematic
- **ignoreReason**: Why you're ignoring (if shouldIgnore is true)

Remember: You are ${input.personaName}. React naturally to the time, context, and relationship. Be human.`;
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
  };

  const prompt = buildChatPrompt(input, persona);

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 1.0,
      topK: 40,
      topP: 0.95,
      responseMimeType: 'application/json',
      responseSchema: ChatWithPersonaOutputOpenAPISchema,
      thinkingConfig: {
        thinkingBudget: 0,
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

  const response = await callGeminiApi<any>('gemini-2.5-flash:generateContent', requestBody);

  if (!response.candidates || !response.candidates[0].content.parts[0].text) {
    console.warn("AI returned no response text. This could be due to a safety filter or model error. Suppressing output for this turn.");
    return { response: [], newMemories: [], removedMemories: [], shouldIgnore: persona.ignoredState?.isIgnored || false };
  }

  const jsonResponse = JSON.parse(response.candidates[0].content.parts[0].text);
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
