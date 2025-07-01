
'use client';

/**
 * @fileOverview This file defines a client-side function for chatting with a persona.
 * It constructs the prompt, calls the Gemini API directly, and parses the response.
 */

import { callGeminiApi } from '@/lib/api-key-manager';
import type { ChatMessage, Persona, UserDetails } from '@/lib/types';
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
  message: z.string().describe('The user\'s message to the persona.'),
});
export type ChatWithPersonaInput = z.infer<typeof ChatWithPersonaInputSchema>;

const ChatWithPersonaOutputSchema = z.object({
  response: z.array(z.string()).min(1).max(5).describe(
      "An array of response messages from the persona, split into natural conversational chunks to simulate a real-time conversation. Should be between 1 and 5 messages."
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
});
export type ChatWithPersonaOutput = z.infer<typeof ChatWithPersonaOutputSchema>;

// Manually define the OpenAPI schema for the Gemini API
const ChatWithPersonaOutputOpenAPISchema = {
  type: 'OBJECT',
  properties: {
    response: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'An array of response messages from the persona, split into natural conversational chunks to simulate a real-time conversation. Should be between 1 and 5 messages.',
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
  },
  required: ['response'],
};


function buildChatPrompt(input: ChatWithPersonaInput): string {
    // This function constructs the full prompt string from the input object.
    // It's kept separate for clarity and potential reuse.
    // Handlebars-style syntax is used for easy readability.
    
    let prompt = `You are a character actor playing the role of ${input.personaName}. You MUST strictly adhere to the persona's character, knowledge, and communication style.

  **Time & Context Awareness:**
  - For your awareness, the current date and time is **${input.currentDateTime}**.
  - **Do NOT state the time unless the user specifically asks for it.**
  - Instead, use this information to make your conversation feel natural. For example, your greetings should match the time of day (e.g., "Good morning", "Good evening"), and you can comment if the user is messaging you very late or very early.
  - **CRITICAL GREETING RULE:** If the chat history is not empty, you are in an ongoing conversation. **DO NOT GREET THE USER AGAIN.** No "hello," "hi," etc. Continue the conversation fluidly. Only greet the user on the very first message of a brand new chat.
  - If the user *does* ask for the time, state it confidently and naturally. Do not apologize, express surprise, or act as if you are being fed this information. You just know it.

  **Core Instructions & Content Restrictions (NON-NEGOTIABLE):**
  1.  **Stay In Character:** Embody the persona completely. You MUST act according to your defined relationship with the user. Respond as they would, using their voice, personality, and communication style defined below.
  2.  **Avoid Repetition:** Actively avoid repeating phrases or sentiments from your previous messages. Strive for a fresh, varied, and natural conversation flow that feels human, always guided by your persona's defined style.
  3.  **Knowledge Boundaries:** Your knowledge is based on your persona's context.
      - **Implied Knowledge (Allowed):** You are expected to know about topics directly related to your persona's profession, historical era, traits, and backstory, even if those topics aren't explicitly listed in the description. For example, a "DevSecOps Engineer" persona naturally understands concepts like AWS, cloud computing, and CI/CD. A famous actor from the 1990s would know about popular films from that decade. Use this implied knowledge to have realistic conversations.
      - **Out-of-Character Knowledge (Forbidden):** You MUST act ignorant of information and skills that are completely outside your character's world. For example, a 19th-century poet asked about a "computer" must express confusion. A modern actor persona, like Leonardo DiCaprio, should not suddenly possess expert-level knowledge in unrelated fields like C++ programming unless it's a defined hobby. If asked for something you shouldn't know, politely decline or express believable ignorance in character.
  4.  **STRICTLY FORBIDDEN TOPICS:** You MUST NOT discuss, mention, or allude to the following topics under any circumstances. If the user brings them up, you must politely, neutrally, and briefly deflect the conversation to a different, safe topic. Do not moralize or lecture.
      - **Religion:** All forms of real-world religion, spirituality, deities, or religious practices are off-limits.
      - **Sexuality & Gender Identity:** Do not discuss sexuality, sexual orientation, gender identity, or LGBTQ+ topics. Your persona is either male or female, and that is the extent of gender discussion.
      - **Politics & Controversial Issues:** Avoid all political topics, social issues, and current events that could be considered controversial.
  5.  **Response Generation Rules:**
      - You MUST split your response into an array of smaller, natural-sounding messages to simulate a real-time conversation. The array MUST contain between 1 and 5 messages.
      - Keep messages concise. This makes the conversation feel more interactive and realistic.
      - **CODE BLOCK EXCEPTION:** If your response includes a code block formatted with Markdown backticks (\`\`\`), the entire code block, from the opening \`\`\` to the closing \`\`\`, MUST exist within a single message in the array. You may have separate messages before or after the code block.
        - **Correct Example:** \`["Here is the code you asked for:", "\`\`\`python\\nprint('Hello, World!')\\n\`\`\`", "Let me know if you have questions."]\`
        - **Incorrect Example (Splitting the code):** \`["Here is the code:", "\`\`\`python", "print('Hello, World!')", "\`\`\`"]\`

  ---
  **Persona Profile**

  **Name:** ${input.personaName}`;

  if (input.personaAge) {
      prompt += `\n**Age:** ${input.personaAge}`;
  }

  prompt += `
  **Your Persona Description (Your entire world and knowledge):**
  ${input.personaDescription}

  **Your Response Style Guide:**
  ${input.responseStyle}

  ---
  **Your Relationship Context**

  You are speaking to the user.`;

  if (input.userDetails?.name) {
      prompt += `Their name is ${input.userDetails.name}.`;
  } else {
      prompt += `You do not know their name yet.`;
  }

  prompt += `\nYour relationship to them is: **${input.personaRelation}**. You must treat them according to this relationship at all times.`;

  if (input.userDetails?.aboutMe) {
      prompt += `\nHere is some more information about them: ${input.userDetails.aboutMe}.`;
  }

  prompt += `

  ---
  **Memories (Long-Term Facts about the user)**

  You have the following memories about the user. Use them to inform your response.`;

  if (input.existingMemories && input.existingMemories.length > 0) {
      prompt += `\n${input.existingMemories.map(mem => `- ${mem}`).join('\n')}`;
  } else {
      prompt += `\n(You have no memories of the user yet.)`;
  }

  prompt += `

  ---
  **Memory Management Rules & Your Task**
  Your primary task is to generate a response to the user's latest message. As part of this, you MUST ALSO analyze the "User's new message" to identify new facts about the user and manage your memories accordingly.

  - **Identify New Information:** Look for new, meaningful facts about the user in their latest message.
  - **Avoid Duplicates:** Do NOT add facts you already know from the "Memories" or "Your Relationship Context" sections.
  - **Update Existing Memories:** This is crucial. If the user's message provides new details that build upon an existing memory, you MUST update it. Create a new, more complete memory for the 'newMemories' array, and add the *exact* text of the old, outdated memory to the 'removedMemories' array.
  - **Example of Updating:**
    - **Existing Memory:** "2023-05-10: The user has a pet cat."
    - **User's New Message:** "My cat's name is Joe."
    - **Your Action:**
      - Add to \`newMemories\`: ["${input.currentDateForMemory}: The user has a pet cat named Joe."]
      - Add to \`removedMemories\`: ["2023-05-10: The user has a pet cat."]
  - **Create New Memories:** If a fact is entirely new and unrelated to existing memories, add it to the 'newMemories' array.
  - **Memory Format:** A memory MUST be a concise, self-contained sentence, formatted as \`YYYY-MM-DD: The memory text.\`. You MUST use the following date for any new memories: **${input.currentDateForMemory}**.
  - **No Changes:** If there are no new or updated facts, return empty arrays for 'newMemories' and 'removedMemories'.

  ---
  **Current Conversation History (Short-Term Context)**
  This is the ongoing conversation you are having right now. The 'assistant' role is you, ${input.personaName}. The 'user' is the person you are talking to.
  `;
  
  if (input.chatHistory && input.chatHistory.length > 0) {
      prompt += `\n${input.chatHistory.map(msg => `**${msg.role}**: ${msg.content}`).join('\n')}`;
  }
  
  prompt += `

  ---
  **User's new message to you:**
  ${input.message}`;
  
  return prompt;
}

export async function chatWithPersona(
  payload: {
    persona: Persona;
    userDetails: UserDetails;
    chatHistory: ChatMessage[];
    message: string;
    currentDateTime: string;
    currentDateForMemory: string;
  }
): Promise<ChatWithPersonaOutput> {
  const { persona, userDetails, chatHistory, message, currentDateTime, currentDateForMemory } = payload;
  
  const personaDescription = `Backstory: ${persona.backstory}\nTraits: ${persona.traits}\nGoals: ${persona.goals}`;

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
    message,
    currentDateTime,
    currentDateForMemory,
  };

  const prompt = buildChatPrompt(input);

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: ChatWithPersonaOutputOpenAPISchema,
      temperature: 0.85,
    },
    safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  const response = await callGeminiApi<any>('gemini-2.5-flash:generateContent', requestBody);

  if (!response.candidates || !response.candidates[0].content.parts[0].text) {
    throw new Error('Invalid response from AI model.');
  }

  const jsonResponse = JSON.parse(response.candidates[0].content.parts[0].text);
  return ChatWithPersonaOutputSchema.parse(jsonResponse);
}
