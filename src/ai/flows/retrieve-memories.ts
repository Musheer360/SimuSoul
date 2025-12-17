
'use client';

/**
 * @fileOverview Advanced agentic memory retrieval system.
 * This module allows the AI to intelligently query and retrieve relevant past conversations
 * based on the user's current message, enabling better long-term memory recall.
 */

import { callGeminiApi } from '@/lib/api-key-manager';
import type { ChatSession, ChatMessage } from '@/lib/types';
import { z } from 'zod';

// Schema for memory retrieval decision
const MemoryRetrievalDecisionSchema = z.object({
  needsRetrieval: z.boolean().describe('Whether the user message requires looking up past conversations'),
  searchQueries: z.array(z.string()).max(3).describe('Up to 3 search queries to find relevant past conversations. Empty if needsRetrieval is false.'),
  timeFrameHint: z.string().optional().describe('Optional time frame hint like "last week", "a month ago", "recently" if user mentions time'),
});

type MemoryRetrievalDecision = z.infer<typeof MemoryRetrievalDecisionSchema>;

// Schema for chat relevance scoring
const ChatRelevanceSchema = z.object({
  relevantChatIds: z.array(z.string()).max(3).describe('IDs of the most relevant chats to retrieve, ordered by relevance. Maximum 3.'),
});

type ChatRelevance = z.infer<typeof ChatRelevanceSchema>;

// OpenAPI schema for Gemini API
const MemoryRetrievalDecisionOpenAPISchema = {
  type: 'OBJECT',
  properties: {
    needsRetrieval: {
      type: 'BOOLEAN',
      description: 'Whether the user message requires looking up past conversations',
    },
    searchQueries: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Up to 3 search queries to find relevant past conversations. Empty if needsRetrieval is false.',
    },
    timeFrameHint: {
      type: 'STRING',
      description: 'Optional time frame hint like "last week", "a month ago", "recently" if user mentions time',
    },
  },
  required: ['needsRetrieval', 'searchQueries'],
};

const ChatRelevanceOpenAPISchema = {
  type: 'OBJECT',
  properties: {
    relevantChatIds: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'IDs of the most relevant chats to retrieve, ordered by relevance. Maximum 3.',
    },
  },
  required: ['relevantChatIds'],
};

/** Maximum number of message excerpts to include per retrieved chat */
const MAX_MESSAGES_PER_CHAT = 8;

/**
 * Metadata for a chat session used in memory retrieval.
 * @property id - Unique identifier for the chat session
 * @property title - Title of the chat session
 * @property summary - AI-generated summary of the conversation
 * @property date - Human-readable date string (e.g., "December 17, 2024")
 * @property messageCount - Total number of messages in the chat
 */
export interface ChatMetadata {
  id: string;
  title: string;
  summary: string;
  date: string;
  messageCount: number;
}

/**
 * A retrieved memory containing relevant past conversation data.
 * @property chatId - Unique identifier of the source chat
 * @property title - Title of the chat session
 * @property date - Human-readable date of the conversation
 * @property summary - AI-generated summary of the conversation
 * @property relevantMessages - Extracted messages most relevant to the user's query
 */
export interface RetrievedMemory {
  chatId: string;
  title: string;
  date: string;
  summary: string;
  relevantMessages: ChatMessage[];
}

/**
 * Determines if the user's message requires looking up past conversations
 * and generates search queries for finding relevant chats.
 */
async function decideMemoryRetrieval(
  userMessages: string[],
  existingMemories: string[],
  recentSummaries: { date: string; summary: string }[]
): Promise<MemoryRetrievalDecision> {
  const prompt = `You are an intelligent memory retrieval system. Analyze the user's message(s) to determine if they are asking about or referencing past conversations.

USER'S MESSAGE(S):
${userMessages.map(m => `"${m}"`).join('\n')}

CURRENT MEMORIES ABOUT USER:
${existingMemories.length > 0 ? existingMemories.map(m => `- ${m}`).join('\n') : 'No memories yet'}

RECENT CONVERSATION SUMMARIES:
${recentSummaries.length > 0 ? recentSummaries.map(s => `${s.date}: ${s.summary}`).join('\n') : 'No recent conversations'}

ANALYZE:
1. Is the user asking about something from a past conversation? (e.g., "remember when we talked about...", "what did I tell you about...", "last time...", "when did we...")
2. Is the user referencing a specific topic that might have been discussed before?
3. Are they asking about timing of past conversations?

If the user is asking about past conversations or referencing something from before, you MUST set needsRetrieval to true and provide search queries.

**IMPORTANT FOR SEARCH QUERIES:**
- Generate **semantic** search queries that include synonyms and related concepts
- For "job" also include: work, career, office, gig, employment
- For "relationship" also include: partner, dating, boyfriend, girlfriend, spouse
- For "health" also include: fitness, exercise, doctor, sick, wellness
- Think about what words the user might have used in past conversations

Examples that NEED retrieval:
- "When did we last talk?" → needsRetrieval: true, searchQueries: ["conversation date", "last chat", "recent talk"]
- "What did I tell you about my job?" → needsRetrieval: true, searchQueries: ["job", "work", "career", "office"]
- "How's the gig going?" (about work) → needsRetrieval: true, searchQueries: ["job", "work", "gig", "career"]
- "Remember our conversation about movies?" → needsRetrieval: true, searchQueries: ["movies", "film", "watching", "cinema"]
- "What were we talking about yesterday?" → needsRetrieval: true, searchQueries: ["yesterday conversation"], timeFrameHint: "yesterday"
- "Did I mention my sister?" → needsRetrieval: true, searchQueries: ["sister", "family", "sibling"]

Examples that DON'T need retrieval:
- "Hello!" → needsRetrieval: false
- "How are you?" → needsRetrieval: false
- "I'm feeling tired today" → needsRetrieval: false (new information, not asking about past)
- General greetings or new topics

Return your analysis as JSON.`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema: MemoryRetrievalDecisionOpenAPISchema,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  try {
    const response = await callGeminiApi<any>('gemini-2.5-flash:generateContent', requestBody);
    
    if (!response.candidates || !response.candidates[0].content.parts[0].text) {
      return { needsRetrieval: false, searchQueries: [] };
    }
    
    const jsonResponse = JSON.parse(response.candidates[0].content.parts[0].text);
    return MemoryRetrievalDecisionSchema.parse(jsonResponse);
  } catch (error) {
    console.error('Memory retrieval decision failed:', error);
    return { needsRetrieval: false, searchQueries: [] };
  }
}

/**
 * Finds the most relevant past chats based on search queries.
 */
async function findRelevantChats(
  searchQueries: string[],
  chatMetadata: ChatMetadata[],
  timeFrameHint?: string
): Promise<string[]> {
  if (chatMetadata.length === 0) {
    return [];
  }

  // Sort chats by date (most recent first) before presenting to AI
  const sortedMetadata = [...chatMetadata].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const prompt = `You are a chat search engine. Find the most relevant past conversations based on the search queries.

SEARCH QUERIES:
${searchQueries.map(q => `- "${q}"`).join('\n')}

${timeFrameHint ? `TIME FRAME HINT: "${timeFrameHint}"` : ''}

AVAILABLE PAST CONVERSATIONS (listed from most recent to oldest):
${sortedMetadata.map(c => `ID: ${c.id}
Title: ${c.title}
Date: ${c.date}
Summary: ${c.summary}
Messages: ${c.messageCount}
---`).join('\n')}

Find up to 3 chats that are most relevant to the search queries. Consider:
1. **Semantic relevance** - Match concepts, not just keywords (e.g., "job", "work", "gig", "office", "career" are related)
2. **Recency priority** - When multiple chats match equally, prefer more recent ones. If user mentions "new" or "recent", strongly prioritize newer chats
3. **Time frame hints** - If a time frame is specified, prioritize chats from that period
4. **Summary content** - Look for conceptual matches in the summary, not just exact words

Return the IDs of the most relevant chats in order of relevance. If no chats are relevant, return an empty array.`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: ChatRelevanceOpenAPISchema,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  try {
    const response = await callGeminiApi<any>('gemini-2.5-flash:generateContent', requestBody);
    
    if (!response.candidates || !response.candidates[0].content.parts[0].text) {
      return [];
    }
    
    const jsonResponse = JSON.parse(response.candidates[0].content.parts[0].text);
    const result = ChatRelevanceSchema.parse(jsonResponse);
    return result.relevantChatIds;
  } catch (error) {
    console.error('Finding relevant chats failed:', error);
    return [];
  }
}

/**
 * Extracts the most relevant messages from a chat based on search queries.
 */
function extractRelevantMessages(
  chat: ChatSession,
  searchQueries: string[],
  maxMessages: number = 10
): ChatMessage[] {
  const messages = chat.messages;
  
  if (messages.length <= maxMessages) {
    return messages;
  }
  
  // Score each message based on keyword relevance
  const scoredMessages = messages.map((msg, index) => {
    const content = msg.content.toLowerCase();
    let score = 0;
    
    // Score based on search query matches
    for (const query of searchQueries) {
      const queryTerms = query.toLowerCase().split(/\s+/);
      for (const term of queryTerms) {
        if (content.includes(term)) {
          score += 2;
        }
      }
    }
    
    // Boost recent messages
    score += (index / messages.length) * 0.5;
    
    // Boost user messages slightly (they often contain key info)
    if (msg.role === 'user') {
      score += 0.5;
    }
    
    return { message: msg, index, score };
  });
  
  // Sort by score and take top messages
  const topMessages = scoredMessages
    .sort((a, b) => b.score - a.score)
    .slice(0, maxMessages)
    .sort((a, b) => a.index - b.index) // Restore chronological order
    .map(item => item.message);
  
  return topMessages;
}

/**
 * Main function to retrieve relevant memories for the current conversation.
 * This is the agentic memory retrieval system entry point.
 */
export async function retrieveRelevantMemories(
  userMessages: string[],
  existingMemories: string[],
  allChats: ChatSession[],
  currentChatId: string
): Promise<RetrievedMemory[]> {
  // Filter out current chat and chats without messages
  const pastChats = allChats.filter(c => c.id !== currentChatId && c.messages.length > 0);
  
  if (pastChats.length === 0) {
    return [];
  }
  
  // Generate chat metadata for the AI to search
  const chatMetadata: ChatMetadata[] = pastChats
    .filter(c => c.summary?.trim()) // Only include chats with non-empty summaries
    .map(c => ({
      id: c.id,
      title: c.title,
      summary: c.summary || '',
      date: new Date(c.updatedAt || c.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      messageCount: c.messages.length,
    }));
  
  // Also include recent summaries for decision making
  const recentSummaries = chatMetadata
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map(c => ({ date: c.date, summary: c.summary }));
  
  // Step 1: Decide if we need to retrieve memories
  const decision = await decideMemoryRetrieval(userMessages, existingMemories, recentSummaries);
  
  if (!decision.needsRetrieval || decision.searchQueries.length === 0) {
    return [];
  }
  
  // Step 2: Find relevant chats
  const relevantChatIds = await findRelevantChats(
    decision.searchQueries,
    chatMetadata,
    decision.timeFrameHint
  );
  
  if (relevantChatIds.length === 0) {
    return [];
  }
  
  // Step 3: Extract relevant content from matching chats
  const retrievedMemories: RetrievedMemory[] = [];
  
  for (const chatId of relevantChatIds) {
    const chat = pastChats.find(c => c.id === chatId);
    if (chat) {
      const metadata = chatMetadata.find(m => m.id === chatId);
      const relevantMessages = extractRelevantMessages(chat, decision.searchQueries);
      
      retrievedMemories.push({
        chatId: chat.id,
        title: chat.title,
        date: metadata?.date || new Date(chat.updatedAt || chat.createdAt).toLocaleDateString(),
        summary: chat.summary || '',
        relevantMessages,
      });
    }
  }
  
  return retrievedMemories;
}

/**
 * Formats retrieved memories into a prompt section for the chat AI.
 */
export function formatRetrievedMemoriesForPrompt(
  memories: RetrievedMemory[],
  userIdentifier: string
): string {
  if (memories.length === 0) {
    return '';
  }
  
  const formattedMemories = memories.map(memory => {
    const messageExcerpts = memory.relevantMessages
      .slice(0, MAX_MESSAGES_PER_CHAT)
      .map(msg => `  ${msg.role === 'user' ? userIdentifier : 'You'}: ${msg.content}`)
      .join('\n');
    
    return `📅 **${memory.title}** (${memory.date})
Summary: ${memory.summary}
Key exchanges:
${messageExcerpts}`;
  }).join('\n\n');
  
  return `
RETRIEVED PAST CONVERSATIONS (These are relevant to what ${userIdentifier} is asking about):
${formattedMemories}

⚠️ IMPORTANT: The user seems to be asking about past conversations. Use the retrieved memories above to provide accurate, specific answers about what you discussed before. Reference specific details from these conversations naturally.`;
}
