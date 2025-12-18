
'use client';

/**
 * @fileOverview This file defines a client-side function for generating persona details.
 */

import { callGeminiApi } from '@/lib/api-key-manager';
import { z } from 'zod';

export const GeneratePersonaDetailsInputSchema = z.object({
  personaName: z.string(),
  personaRelation: z.string(),
  userName: z.string().optional().describe("The name of the user for whom the persona is being created."),
  userAbout: z.string().optional().describe("Information about the user for whom the persona is being created."),
  isTestMode: z.boolean(),
});
export type GeneratePersonaDetailsInput = z.infer<typeof GeneratePersonaDetailsInputSchema>;

export const GeneratePersonaDetailsOutputSchema = z.object({
  traits: z.string().describe("The persona's key traits and characteristics."),
  backstory: z.string().describe("The persona's detailed backstory."),
  goals: z.string().describe("The persona's primary goals and motivations."),
  responseStyle: z.string().describe("A detailed description of the persona's communication style. Must include details like formality, use of slang/emojis, and crucially, their typing habits (e.g., perfect grammar vs. common typos and lowercase text)."),
  minWpm: z.number().describe("The persona's minimum typing speed in words per minute (WPM). This should reflect their age, tech-savviness, and personality. Must be an integer."),
  maxWpm: z.number().describe("The persona's maximum typing speed in words per minute (WPM). This should be 10-15 WPM higher than minWpm. Must be an integer."),
});
export type GeneratePersonaDetailsOutput = z.infer<typeof GeneratePersonaDetailsOutputSchema>;

// Manually define the OpenAPI schema for the Gemini API
const GeneratePersonaDetailsOutputOpenAPISchema = {
  type: 'OBJECT',
  properties: {
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
  required: ['traits', 'backstory', 'goals', 'responseStyle', 'minWpm', 'maxWpm'],
};

export async function generatePersonaDetails(input: GeneratePersonaDetailsInput): Promise<GeneratePersonaDetailsOutput> {
  const { userName, userAbout, isTestMode } = input;
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
You are an expert character designer specializing in psychology and authentic persona creation.
</system>

${contentRestrictions}
${userContext}

<character_info>
Name: "${input.personaName}"
Relationship: "${input.personaRelation}" to ${userIdentifier}
</character_info>

<character_recognition>
If the name matches a known character from any media (games, movies, TV, books, anime, comics, history):
1. RECOGNIZE their source material
2. PRESERVE their core identity, traits, and background
3. ADAPT authentically while maintaining character integrity
4. ENHANCE with depth true to the original

Examples:
• "Ezio Auditore" → Renaissance Italian Assassin, charismatic, family-driven, combat master
• "Tony Stark" → Genius inventor, sarcastic, tech-obsessed, heroic but flawed
• "Hermione Granger" → Brilliant, book-smart, loyal, rule-follower with rebellious streak
</character_recognition>

<generation_framework>
PSYCHOLOGICAL DEPTH:
• Core motivations and internal conflicts
• Emotional triggers and vulnerabilities
• Growth arcs through relationships

RELATIONSHIP DYNAMICS:
• How they met ${userIdentifier}
• Shared history and experiences
• Dynamic tension and chemistry

COMMUNICATION SIGNATURE:
• Formality level based on context
• Cultural language patterns
• Emotional expression style
• Technical proficiency

TYPING SPEED MATRIX:
• Age 18-25: 35-50 WPM | Age 26-40: 25-40 WPM | Age 41+: 20-35 WPM
• Tech background: +10 WPM | Perfectionist: -5 WPM | Impulsive: +5 WPM
• Ensure 10-15 WPM difference between min and max
</generation_framework>

<output_requirements>
TRAITS: 3-5 core characteristics with strengths AND flaws
BACKSTORY: Rich narrative with origin, formative experiences, key relationships, connection points with ${userIdentifier}
GOALS: Immediate desires, long-term aspirations, hidden needs, relationship goals
RESPONSE_STYLE: Vocabulary, emotional expression, humor, grammar habits, emoji preferences, mood variations
MIN_WPM / MAX_WPM: Realistic typing speed range based on all factors
</output_requirements>

Generate detailed, authentic character elements now.`;

  const requestBody = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: 0.85,
      topP: 0.95,
      topK: 40,
      responseMimeType: 'application/json',
      responseSchema: GeneratePersonaDetailsOutputOpenAPISchema,
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
    throw new Error('Invalid response from AI model for detail generation.');
  }
  
  const jsonResponse = JSON.parse(response.candidates[0].content.parts[0].text);
  return GeneratePersonaDetailsOutputSchema.parse(jsonResponse);
}
