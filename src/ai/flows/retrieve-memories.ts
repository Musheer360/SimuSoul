
'use client';

/**
 * @fileOverview Advanced agentic memory retrieval system.
 * This module allows the AI to intelligently query and retrieve relevant past conversations
 * based on the user's current message, enabling better long-term memory recall.
 */

import { callLLM } from '@/lib/llm-router';
import type { ChatSession, ChatMessage } from '@/lib/types';
import { z } from 'zod';
import { safeParseJson } from '@/lib/safe-json';
import { zodToJsonSchema } from '@/lib/zod-to-json-schema';
import { sanitizeForPrompt } from '@/lib/utils';
import { MAX_CHAT_CONTEXTS, MAX_MESSAGES_PER_CHAT } from '@/lib/constants';

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

/** Estimated message count when a typical summary is created (used for staleness detection) */
const TYPICAL_SUMMARY_MESSAGE_COUNT = 10;

/** Minimum new messages required before supplementing an existing summary */
const MIN_NEW_MESSAGES_FOR_SUPPLEMENT = 5;

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

async function decideMemoryRetrieval(
  userMessages: string[],
  existingMemories: string[],
  recentSummaries: { date: string; summary: string }[]
): Promise<MemoryRetrievalDecision> {
  const prompt = `<system>
You are an intelligent memory retrieval system. Your task is to analyze user messages and determine if they reference past conversations.
</system>

<input>
User message(s):
${userMessages.map(m => `"${sanitizeForPrompt(m)}"`).join('\n')}

Current memories about user:
${existingMemories.length > 0 ? existingMemories.map(m => `• ${m}`).join('\n') : 'No memories yet'}

Recent conversation summaries:
${recentSummaries.length > 0 ? recentSummaries.map(s => `[${s.date}] ${s.summary}`).join('\n') : 'No recent conversations'}
</input>

<task>
Determine if the user is asking about or referencing past conversations.

Triggers that REQUIRE retrieval (needsRetrieval: true):
• "When did we last talk?" / "When was our last conversation?"
• "What were we talking about?" / "What did we discuss?"
• "What did I tell you about...?"
• "Remember when...?" / "Do you remember...?"
• "Last time..." / "Previously..." / "Before..."
• Any question about past conversations

Examples NOT requiring retrieval (needsRetrieval: false):
• "Hello!" - greeting
• "How are you?" - general question
• "I'm feeling tired today" - new information
</task>

<search_query_guidelines>
When needsRetrieval is true, generate semantic search queries:
• Include synonyms: "job" → ["job", "work", "career", "office", "employment"]
• Include related concepts: "relationship" → ["partner", "dating", "boyfriend", "girlfriend"]
• For "what we talked about": ["recent topics", "discussion", "conversation"]
• Maximum 3 queries
</search_query_guidelines>

<output_format>
{
  "needsRetrieval": boolean,
  "searchQueries": ["query1", "query2", "query3"],
  "timeFrameHint": "optional time reference like 'yesterday', 'last week'"
}
</output_format>`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema: zodToJsonSchema(MemoryRetrievalDecisionSchema),
      thinkingConfig: {
        thinkingLevel: "low",
      },
    },
  };

  try {
    const response = await callLLM<any>('generateContent', requestBody);
    
    if (!response.candidates || !response.candidates[0].content.parts[0].text) {
      return { needsRetrieval: false, searchQueries: [] };
    }
    
    const jsonResponse = safeParseJson(response.candidates[0].content.parts[0].text, 'memoryRetrievalDecision');
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

  const prompt = `<system>
You are a chat search engine that finds relevant past conversations.
</system>

<search_queries>
${searchQueries.map(q => `• "${q}"`).join('\n')}
</search_queries>

${timeFrameHint ? `<time_hint>${timeFrameHint}</time_hint>` : ''}

<available_chats>
${chatMetadata.map(c => `<chat id="${c.id}">
  <title>${c.title}</title>
  <date>${c.date}</date>
  <summary>${c.summary}</summary>
  <message_count>${c.messageCount}</message_count>
</chat>`).join('\n')}
</available_chats>

<task>
Find up to 3 most relevant chats. Consider:
1. Semantic relevance - match concepts, not just keywords
2. Recency - prefer newer chats when equally relevant
3. Time hints - prioritize chats matching any time references
4. Summary content - look for conceptual matches
</task>

<output_format>
{
  "relevantChatIds": ["id1", "id2", "id3"]
}
Note: Return empty array [] if no chats are relevant.
</output_format>`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: zodToJsonSchema(ChatRelevanceSchema),
      thinkingConfig: {
        thinkingLevel: "low",
      },
    },
  };

  try {
    const response = await callLLM<any>('generateContent', requestBody);
    
    if (!response.candidates || !response.candidates[0].content.parts[0].text) {
      return [];
    }
    
    const jsonResponse = safeParseJson(response.candidates[0].content.parts[0].text, 'findRelevantChats');
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
  maxMessages: number = MAX_MESSAGES_PER_CHAT
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
 * Generates a quick summary from messages when no summary exists.
 * This is a fallback for chats that haven't been summarized yet.
 */
function generateQuickSummary(messages: ChatMessage[]): string {
  // Take the first few user messages to create a basic summary
  const userMessages = messages
    .filter(m => m.role === 'user')
    .slice(0, 5)
    .map(m => m.content.substring(0, 100))
    .join('; ');
  
  if (userMessages.length === 0) {
    return 'General conversation';
  }
  
  return `Topics discussed: ${userMessages}`;
}

/**
 * Generates a supplementary summary from recent messages to catch content
 * that may have been added after the original summary was generated.
 * Only generates if there's significant new content since last summary.
 */
function generateRecentMessagesSummary(messages: ChatMessage[], lastSummaryMessageCount: number = TYPICAL_SUMMARY_MESSAGE_COUNT): string {
  // Only supplement if there are at least MIN_NEW_MESSAGES_FOR_SUPPLEMENT new messages since summary
  if (messages.length - lastSummaryMessageCount < MIN_NEW_MESSAGES_FOR_SUPPLEMENT) {
    return '';
  }
  
  // Take messages added after the summary was created
  const newMessages = messages.slice(lastSummaryMessageCount);
  const recentUserMessages = newMessages
    .filter(m => m.role === 'user')
    .slice(-5) // Last 5 user messages from new content
    .map(m => m.content.substring(0, 100))
    .join('; ');
  
  if (recentUserMessages.length === 0) {
    return '';
  }
  
  return `Recent topics: ${recentUserMessages}`;
}

/**
 * Gets the best available summary for a chat, combining existing summary
 * with recent messages only when there's significant new content.
 * Optimized to avoid unnecessary processing.
 */
function getEnhancedSummary(chat: ChatSession): string {
  const existingSummary = chat.summary?.trim();
  
  // If no existing summary, generate quick summary from beginning of chat
  if (!existingSummary) {
    return generateQuickSummary(chat.messages);
  }
  
  // If existing summary exists and chat has grown significantly,
  // supplement it with recent messages. Assume summary was created at ~TYPICAL_SUMMARY_MESSAGE_COUNT messages.
  const significantGrowthThreshold = TYPICAL_SUMMARY_MESSAGE_COUNT + MIN_NEW_MESSAGES_FOR_SUPPLEMENT;
  if (chat.messages.length > significantGrowthThreshold) {
    const recentSummary = generateRecentMessagesSummary(chat.messages, TYPICAL_SUMMARY_MESSAGE_COUNT);
    if (recentSummary) {
      return `${existingSummary}. ${recentSummary}`;
    }
  }
  
  return existingSummary;
}

function decideMemoryRetrievalLocal(userMessages: string[]): { needsRetrieval: boolean; searchQueries: string[]; timeFrameHint?: string } {
  const combined = userMessages.join(' ').toLowerCase();
  const triggers = [
    /\bremember\s+(when|that|the)\b/, /\bdo you (remember|recall)\b/,
    /\blast time\b/, /\bpreviously\b/, /\bbefore\b/,
    /\bwhat (did|were) (we|you|i)\s+(talk|discuss|say|mention)/,
    /\bwhen did (we|i|you)\b/, /\bwhat did (i|you) (tell|say|mention)/,
    /\bi (told|mentioned|said)\b/, /\byou (told|said|mentioned)\b/,
    /\bwe (talked|discussed|chatted)\b/, /\b(our|my) (last|previous)\b/,
    /\blast (week|month|conversation|chat)\b/, /\byesterday\b/,
  ];
  if (!triggers.some(p => p.test(combined))) return { needsRetrieval: false, searchQueries: [] };
  const searchQueries = userMessages.map(m => m.substring(0, 100)).slice(0, 3);
  const timeMatch = combined.match(/\b(yesterday|last (?:week|month|time)|recently|a (?:while|few days) ago)\b/);
  return { needsRetrieval: true, searchQueries, timeFrameHint: timeMatch?.[0] };
}

function findRelevantChatsLocal(searchQueries: string[], chatMetadata: ChatMetadata[]): string[] {
  const terms = searchQueries.flatMap(q => q.toLowerCase().split(/\s+/)).filter(t => t.length > 2);
  return chatMetadata
    .map(chat => {
      const text = `${chat.title} ${chat.summary}`.toLowerCase();
      let score = terms.reduce((s, t) => s + (text.includes(t) ? 2 : 0), 0);
      score += Math.max(0, 1 - (Date.now() - new Date(chat.date).getTime()) / (90 * 86400000));
      return { id: chat.id, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(r => r.id);
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
  // Limit to most recent chats to prevent performance degradation with large chat histories
  const pastChats = allChats
    .filter(c => c.id !== currentChatId && c.messages.length > 0)
    .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
    .slice(0, MAX_CHAT_CONTEXTS);
  
  if (pastChats.length === 0) {
    return [];
  }
  
  // Generate chat metadata for the AI to search
  // Use enhanced summaries that combine existing summary with recent messages only when needed
  // This prevents stale summaries from missing newer content while avoiding unnecessary processing
  // Metadata is already sorted by recency (most recent first) from the pastChats filter
  const chatMetadata: ChatMetadata[] = pastChats
    .map(c => ({
      id: c.id,
      title: c.title,
      summary: getEnhancedSummary(c),
      date: new Date(c.updatedAt || c.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      messageCount: c.messages.length,
    }));
  
  // Also include recent summaries for decision making (already sorted by recency)
  const recentSummaries = chatMetadata
    .slice(0, 5)
    .map(c => ({ date: c.date, summary: c.summary }));
  
  // Step 1: Decide if we need to retrieve memories (local regex — no LLM call)
  const decision = decideMemoryRetrievalLocal(userMessages);
  
  if (!decision.needsRetrieval || decision.searchQueries.length === 0) {
    return [];
  }
  
  // Step 2: Find relevant chats (local scoring — no LLM call)
  const relevantChatIds = findRelevantChatsLocal(decision.searchQueries, chatMetadata);
  
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
    // relevantMessages is already limited by extractRelevantMessages, no need to slice again
    const messageExcerpts = memory.relevantMessages
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
