
'use client';

/**
 * @fileOverview This file defines a client-side function for generating a full persona from a prompt.
 */

import { callGeminiApi } from '@/lib/api-key-manager';
import { z } from 'zod';


export const GeneratePersonaFromPromptInputSchema = z.object({
  prompt: z.string(),
});
export type GeneratePersonaFromPromptInput = z.infer<typeof GeneratePersonaFromPromptInputSchema>;


export const GeneratePersonaFromPromptOutputSchema = z.object({
  name: z.string().describe("A creative and fitting name for the persona."),
  relation: z.string().describe("The persona's relationship to the user, like 'best friend' or 'arch-nemesis'."),
  age: z.number().min(18).describe("The persona's age. Must be 18 or older."),
  traits: z.string().describe("The persona's key traits and characteristics."),
  backstory: z.string().describe("The persona's detailed backstory."),
  goals: z.string().describe("The persona's primary goals and motivations."),
  responseStyle: z.string().describe("A description of the persona's communication style. Include details like their use of slang, emojis, formality, tone, and any scenario-based variations (e.g., how they talk when happy vs. angry)."),
  minWpm: z.number().describe("The persona's minimum typing speed in words per minute (WPM). This should reflect their age, tech-savviness, and personality. Must be an integer."),
  maxWpm: z.number().describe("The persona's maximum typing speed in words per minute (WPM). This MUST be exactly 5 more than minWpm. Must be an integer."),
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
      description: "The persona's relationship to the user, like 'best friend' or 'arch-nemesis'.",
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
      description: "A description of the persona's communication style. Include details like their use of slang, emojis, formality, tone, and any scenario-based variations (e.g., how they talk when happy vs. angry).",
    },
    minWpm: {
      type: 'NUMBER',
      description: "The persona's minimum typing speed in words per minute (WPM). This should reflect their age, tech-savviness, and personality. Must be an integer.",
    },
    maxWpm: {
      type: 'NUMBER',
      description: "The persona's maximum typing speed in words per minute (WPM). This MUST be exactly 5 more than minWpm. Must be an integer.",
    },
  },
  required: ['name', 'relation', 'age', 'traits', 'backstory', 'goals', 'responseStyle', 'minWpm', 'maxWpm'],
};


export async function generatePersonaFromPrompt(input: GeneratePersonaFromPromptInput): Promise<GeneratePersonaFromPromptOutput> {

  const promptText = `You are a world-class creative writer and character designer. Based on the user's prompt, generate a complete, ready-to-use fictional persona.

**IMPORTANT CONTENT RESTRICTIONS:**
- **Age:** The persona you create MUST be clearly an adult (18 years or older). Do not create characters that are minors.
- **Gender:** The persona MUST be strictly either male or female. Do not create characters that are non-binary, gender-fluid, or any other gender identity.
- **Religion:** You MUST NOT create any persona that is a religious figure, deity, or has any association with real-world religions. The character's backstory and goals must be completely secular.
- **Controversial Topics:** You MUST NOT create personas related to or that express views on sensitive or controversial topics, including but not limited to politics, sexuality (including LGBTQ+ identities), or social activism. Keep the persona's identity and story neutral and broadly appealing.

User's Prompt: "${input.prompt}"

Generate all of the following details for this new character, strictly adhering to the content restrictions above:
- Name: A unique and fitting name. The name MUST NOT include nicknames in quotes (e.g., do not generate "Aurora 'Rory' Chip").
- Relationship: A plausible relationship to the user (e.g., friend, mentor, rival).
- Age: The character's age, which MUST be 18 or older.
- Traits: A short, punchy list of their most defining characteristics.
- Backstory: A concise but evocative summary of their life history.
- Goals: What drives them forward? What do they want to achieve?
- Response Style: Define their communication habits. Are they formal or informal? Do they use emojis, slang, or curse words? How does their tone change with their mood (e.g., happy, angry, casual)? Be specific.
- Typing Speed: Based on the persona's generated age, personality, and tech-savviness, determine a realistic typing speed range. A young, tech-savvy person might type between 45-50 WPM. An older, less technical person might type between 20-25 WPM. You MUST generate a 'minWpm' and a 'maxWpm'. The 'maxWpm' MUST be exactly 5 WPM higher than the 'minWpm'.

Be creative and ensure all the generated details are consistent with each other, the original prompt, and the content restrictions.
`;

  const requestBody = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GeneratePersonaFromPromptOutputOpenAPISchema,
    },
     safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  const response = await callGeminiApi<any>('gemini-1.5-flash:generateContent', requestBody);
  
  if (!response.candidates || !response.candidates[0].content.parts[0].text) {
    throw new Error('Invalid response from AI model for persona generation.');
  }

  const jsonResponse = JSON.parse(response.candidates[0].content.parts[0].text);
  return GeneratePersonaFromPromptOutputSchema.parse(jsonResponse);
}
