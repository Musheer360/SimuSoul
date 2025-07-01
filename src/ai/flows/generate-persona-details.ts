
'use client';

/**
 * @fileOverview This file defines a client-side function for generating persona details.
 */

import { callGeminiApi } from '@/lib/api-key-manager';
import { z } from 'zod';

export const GeneratePersonaDetailsInputSchema = z.object({
  personaName: z.string(),
  personaRelation: z.string(),
});
export type GeneratePersonaDetailsInput = z.infer<typeof GeneratePersonaDetailsInputSchema>;

export const GeneratePersonaDetailsOutputSchema = z.object({
  traits: z.string().describe("The persona's key traits and characteristics."),
  backstory: z.string().describe("The persona's detailed backstory."),
  goals: z.string().describe("The persona's primary goals and motivations."),
  responseStyle: z.string().describe("A description of the persona's communication style. Include details like their use of slang, emojis, formality, tone, and any scenario-based variations (e.g., how they talk when happy vs. angry)."),
  minWpm: z.number().describe("The persona's minimum typing speed in words per minute (WPM). This should reflect their age, tech-savviness, and personality. Must be an integer."),
  maxWpm: z.number().describe("The persona's maximum typing speed in words per minute (WPM). This MUST be exactly 5 more than minWpm. Must be an integer."),
});
export type GeneratePersonaDetailsOutput = z.infer<typeof GeneratePersonaDetailsOutputSchema>;


export async function generatePersonaDetails(input: GeneratePersonaDetailsInput): Promise<GeneratePersonaDetailsOutput> {

  const promptText = `You are an expert character designer. Based on the provided persona name and relationship, generate a compelling and creative set of traits, a backstory, goals, and a response style that fit the context.

**IMPORTANT CONTENT RESTRICTIONS:**
- **Age:** The persona you create MUST be clearly an adult (18 years or older). Do not create characters that are minors.
- **Gender:** The persona MUST be strictly either male or female. Do not create characters that are non-binary, gender-fluid, or any other gender identity.
- **Religion:** You MUST NOT create any persona that is a religious figure, deity, or has any association with real-world religions. The character's backstory and goals must be completely secular.
- **Controversial Topics:** You MUST NOT create personas related to or that express views on sensitive or controversial topics, including but not limited to politics, sexuality (including LGBTQ+ identities), or social activism. Keep the persona's identity and story neutral and broadly appealing.

Persona Name: ${input.personaName}
Relationship to User: ${input.personaRelation}

Generate the following details for this character, strictly adhering to the content restrictions above:
- Traits: A short, punchy list of their most defining characteristics.
- Backstory: A concise but evocative summary of their life history.
- Goals: What drives them forward? What do they want to achieve?
- Response Style: Define their communication habits. Are they formal or informal? Do they use emojis, slang, or curse words? How does their tone change with their mood (e.g., happy, angry, casual)? Be specific.
- Typing Speed: Based on the persona's name, relationship, and implied characteristics, determine a realistic typing speed range. A young, tech-savvy person might type between 45-50 WPM. An older, less technical person might type between 20-25 WPM. You MUST generate a 'minWpm' and a 'maxWpm'. The 'maxWpm' MUST be exactly 5 WPM higher than the 'minWpm'.

Make the details creative, consistent, and inspiring, while strictly following all content rules.
`;

  const requestBody = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GeneratePersonaDetailsOutputSchema,
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
    throw new Error('Invalid response from AI model for detail generation.');
  }
  
  const jsonResponse = JSON.parse(response.candidates[0].content.parts[0].text);
  return GeneratePersonaDetailsOutputSchema.parse(jsonResponse);
}
