
'use client';

/**
 * @fileOverview This file defines a client-side function for generating a full persona from a prompt.
 */

import { callGeminiApi } from '@/lib/api-key-manager';
import { z } from 'zod';


export const GeneratePersonaFromPromptInputSchema = z.object({
  prompt: z.string(),
  userName: z.string().optional().describe("The name of the user for whom the persona is being created."),
  userAbout: z.string().optional().describe("Information about the user for whom the persona is being created."),
  isTestMode: z.boolean(),
});
export type GeneratePersonaFromPromptInput = z.infer<typeof GeneratePersonaFromPromptInputSchema>;


export const GeneratePersonaFromPromptOutputSchema = z.object({
  name: z.string().describe("A creative and fitting name for the persona."),
  relation: z.string().describe("The persona's relationship to the user, like 'Best Friend' or 'Arch-Nemesis'. This must be a maximum of two words, with the first letter of each word capitalized."),
  age: z.number().min(18).describe("The persona's age. Must be 18 or older."),
  traits: z.string().describe("The persona's key traits and characteristics."),
  backstory: z.string().describe("The persona's detailed backstory."),
  goals: z.string().describe("The persona's primary goals and motivations."),
  responseStyle: z.string().describe("A detailed description of the persona's communication style. Must include details like formality, use of slang/emojis, and crucially, their typing habits (e.g., perfect grammar vs. common typos and lowercase text)."),
  minWpm: z.number().describe("The persona's minimum typing speed in words per minute (WPM). This should reflect their age, tech-savviness, and personality. Must be an integer."),
  maxWpm: z.number().describe("The persona's maximum typing speed in words per minute (WPM). This should be 10-15 WPM higher than minWpm. Must be an integer."),
});
export type GeneratePersonaFromPromptOutput = z.infer<typeof GeneratePersonaFromPromptOutputSchema>;

// Manually define the OpenAPI schema for the Gemini API
const GeneratePersonaFromPromptOutputOpenAPISchema = {
  type: 'OBJECT',
  properties: {
    name: {
      type: 'STRING',
      description: 'A creative and fitting name for the persona.',
    },
    relation: {
      type: 'STRING',
      description: "The persona's relationship to the user, like 'Best Friend' or 'Arch-Nemesis'. This must be a maximum of two words, with the first letter of each word capitalized.",
    },
    age: {
      type: 'NUMBER',
      description: "The persona's age. Must be 18 or older.",
    },
    traits: {
      type: 'STRING',
      description: "The persona's key traits and characteristics.",
    },
    backstory: {
      type: 'STRING',
      description: "The persona's detailed backstory.",
    },
    goals: {
      type: 'STRING',
      description: "The persona's primary goals and motivations.",
    },
    responseStyle: {
      type: 'STRING',
      description: "A detailed description of the persona's communication style. Must include details like formality, use of slang/emojis, and crucially, their typing habits (e.g., perfect grammar vs. common typos and lowercase text).",
    },
    minWpm: {
      type: 'NUMBER',
      description: "The persona's minimum typing speed in words per minute (WPM). This should reflect their age, tech-savviness, and personality. Must be an integer.",
    },
    maxWpm: {
      type: 'NUMBER',
      description: "The persona's maximum typing speed in words per minute (WPM). This should be 10-15 WPM higher than minWpm. Must be an integer.",
    },
  },
  required: ['name', 'relation', 'age', 'traits', 'backstory', 'goals', 'responseStyle', 'minWpm', 'maxWpm'],
};


export async function generatePersonaFromPrompt(input: GeneratePersonaFromPromptInput): Promise<GeneratePersonaFromPromptOutput> {
  const { prompt, userName, userAbout, isTestMode } = input;
  const userIdentifier = userName?.split(' ')[0] || 'the user';
  
  const userContext = (userName || userAbout) ? `
<user_context>
${userName ? `Target user: ${userIdentifier}` : ''}
${userAbout ? `User profile: "${userAbout}"` : ''}
Create authentic connections and believable relationship dynamics with ${userIdentifier}.
</user_context>` : '';
  
  const contentRestrictions = !isTestMode ? `
<content_boundaries>
• Age: Character MUST be 18+ years old
• Gender: Male or female identity only
• Secular: No religious figures, deities, or religious associations
• Neutral: Avoid political, controversial, or activist themes
</content_boundaries>` : '';

  const promptText = `<system>
You are an expert character creation AI specializing in psychology, storytelling, and authentic persona development.
</system>

${contentRestrictions}
${userContext}

<user_request>
"${prompt}"
</user_request>

<character_recognition>
If the request references a known character from any media (games, movies, TV, books, anime, comics, history):
1. IDENTIFY their source and universe
2. PRESERVE their core personality and defining traits
3. ADAPT them naturally into a relationship with ${userIdentifier}
4. ENHANCE with depth while staying true to their character

Examples:
• "Ezio Auditore" → Renaissance Italian Assassin, charismatic, family honor-driven, mentor figure
• "Tony Stark" → Genius inventor, sarcastic wit, heroic but flawed ego
• "Hermione Granger" → Brilliant, loyal, rule-follower with rebellious streak for justice
</character_recognition>

<generation_framework>
PSYCHOLOGICAL DEPTH:
• Core motivations and internal conflicts
• Emotional landscape and growth potential
• Strengths AND compelling flaws

BIOGRAPHICAL ELEMENTS:
• Formative experiences and key relationships
• Achievements and failures
• Secrets and vulnerabilities

COMMUNICATION STYLE:
• Vocabulary and cultural expressions
• Humor style and emotional expression
• Digital behavior (emojis, punctuation, formality)
• Mood-based variations

TYPING METRICS:
• Gen Z: 35-50 WPM | Millennials: 25-40 WPM | Gen X: 20-35 WPM | Boomers: 15-30 WPM
• Adjust for: tech background, personality (perfectionist=slower, impulsive=faster)
• minWpm and maxWpm should differ by 10-15 WPM
</generation_framework>

<output_requirements>
NAME: Culturally appropriate, memorable (no nicknames in quotes)
RELATION: Max 2 words, properly capitalized (e.g., "Best Friend", "Mentor")
AGE: 18+ minimum, appropriate for relationship context
TRAITS: 4-6 characteristics including strengths AND flaws
BACKSTORY: Rich history with connection points to ${userIdentifier}
GOALS: Immediate wants, long-term aspirations, hidden needs, relationship goals
RESPONSE_STYLE: Comprehensive communication profile covering all style elements
MIN_WPM / MAX_WPM: Realistic typing speed range
</output_requirements>

Generate a complete, multi-dimensional persona now.`;

  const requestBody = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: 0.85,
      topP: 0.95,
      topK: 40,
      responseMimeType: 'application/json',
      responseSchema: GeneratePersonaFromPromptOutputOpenAPISchema,
      thinkingConfig: {
        thinkingLevel: "medium",
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
    throw new Error('Invalid response from AI model for persona generation.');
  }

  const jsonResponse = JSON.parse(response.candidates[0].content.parts[0].text);
  return GeneratePersonaFromPromptOutputSchema.parse(jsonResponse);
}
