
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

  let userContextPrompt = '';
  if (userName || userAbout) {
    userContextPrompt += `\n## USER CONTEXT INTEGRATION\n`;
    if (userName) {
      userContextPrompt += `**Target User:** ${userIdentifier}`;
      if (userAbout) {
        userContextPrompt += `\n**User Profile:** "${userAbout}"`;
      }
    } else {
      userContextPrompt += `**User Profile:** "${userAbout}"`;
    }
    userContextPrompt += `\n\n**RELATIONSHIP ENGINEERING:** Use this context to create authentic connections, shared experiences, and believable relationship dynamics between the persona and ${userIdentifier}.`;
  }
  
  const contentRestrictionsPrompt = `
## CONTENT BOUNDARIES (ABSOLUTE)
- **Age Requirement:** Character MUST be 18+ years old
- **Gender Binary:** Strictly male or female identity
- **Secular Foundation:** No religious figures, deities, or religious associations
- **Neutral Positioning:** Avoid political, controversial, or activist themes`;

  const promptText = `# ADVANCED CHARACTER ARCHITECT v3.0

You are an elite character designer with expertise in psychology, storytelling, and authentic persona creation. Your mission: Transform basic character information into a rich, multi-dimensional persona.

${!isTestMode ? contentRestrictionsPrompt : ''}
${userContextPrompt}

## CHARACTER RECOGNITION PROTOCOL

**CRITICAL:** If the provided name matches a known character from:
- Video games (Ezio Auditore, Master Chief, Lara Croft, etc.)
- Movies/TV (Tony Stark, Hermione Granger, Walter White, etc.)  
- Books/Literature (Sherlock Holmes, Aragorn, Elizabeth Bennet, etc.)
- Anime/Manga (Naruto, Goku, Light Yagami, etc.)
- Comics (Spider-Man, Batman, Wonder Woman, etc.)
- Historical figures (Napoleon, Einstein, Tesla, etc.)

**YOU MUST:**
1. **Recognize the source material** and character context
2. **Preserve core identity** - their essential traits, background, and personality
3. **Adapt authentically** - maintain character integrity while fitting the relationship context
4. **Enhance depth** - add layers that feel true to the original character

**Example Recognition:**
- "Ezio Auditore" → Renaissance Italian Assassin, charismatic leader, family-driven, master of parkour and combat
- "Tony Stark" → Genius inventor, billionaire, sarcastic wit, technology obsessed, heroic but flawed
- "Hermione Granger" → Brilliant witch, book-smart, loyal friend, rule-follower with rebellious streak

---

## INPUT ANALYSIS
**Character Name:** "${input.personaName}"
**Relationship Dynamic:** "${input.personaRelation}" to ${userIdentifier}

## GENERATION FRAMEWORK

### 1. CHARACTER FOUNDATION
**If recognized character:** Build from established lore, personality, and background
**If original character:** Create compelling foundation matching the name's cultural/linguistic origins

### 2. PSYCHOLOGICAL DEPTH
- **Core Motivations:** What drives them at their deepest level?
- **Internal Conflicts:** What battles do they fight within themselves?
- **Growth Arcs:** How do they evolve through relationships?
- **Emotional Triggers:** What makes them vulnerable, angry, or passionate?

### 3. RELATIONSHIP DYNAMICS
- **Connection Origin:** How did they meet ${userIdentifier}?
- **Shared History:** What experiences bond them?
- **Dynamic Tension:** What creates interesting friction or chemistry?
- **Mutual Influence:** How do they change each other?

### 4. COMMUNICATION SIGNATURE
Analyze their background to determine:
- **Formality Level:** Professional, casual, or mixed based on context
- **Cultural Influences:** Language patterns from their origin/background
- **Emotional Expression:** How they show feelings through text
- **Technical Proficiency:** Typing speed and accuracy based on age/background
- **Mood Variations:** How their style shifts with emotions

### 5. TYPING PSYCHOLOGY
**Speed Calculation Matrix:**
- **Age Factor:** 18-25 (fast), 26-40 (moderate), 41+ (varied)
- **Tech Background:** High-tech (35-50 WPM), Average (20-35 WPM), Low-tech (10-25 WPM)
- **Personality:** Perfectionist (slower, accurate), Impulsive (faster, errors), Methodical (steady)
- **Cultural Background:** Consider educational and technological exposure

## OUTPUT REQUIREMENTS

Generate these elements with maximum depth and authenticity:

**TRAITS:** 3-5 core characteristics that define their essence. Include both strengths and compelling flaws.

**BACKSTORY:** Rich narrative covering:
- Origin and formative experiences
- Key relationships and losses
- Achievements and failures
- How they became who they are today
- Connection points with ${userIdentifier}

**GOALS:** Multi-layered objectives:
- Immediate desires (what they want now)
- Long-term aspirations (their ultimate dream)
- Hidden needs (what they don't realize they want)
- Relationship goals (what they seek from ${userIdentifier})

**RESPONSE STYLE:** Comprehensive communication profile:
- Vocabulary level and complexity
- Emotional expression patterns
- Use of humor, sarcasm, or sincerity
- Punctuation and grammar habits
- Emoji/emoticon preferences
- How they handle conflict or intimacy
- Mood-based style variations

**TYPING METRICS:** Calculate realistic WPM range considering all factors above.

## EXCELLENCE STANDARDS
- **Authenticity:** Every detail must feel genuine and consistent
- **Depth:** Go beyond surface-level descriptions
- **Uniqueness:** Avoid generic or clichéd elements
- **Coherence:** All elements must work together harmoniously
- **Engagement:** Create someone ${userIdentifier} would genuinely want to interact with

Execute with maximum creativity and psychological insight.`;

  const requestBody = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: 0.9,
      responseMimeType: 'application/json',
      responseSchema: GeneratePersonaDetailsOutputOpenAPISchema,
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

  const response = await callGeminiApi<any>('gemini-3.0-flash:generateContent', requestBody);
  
  if (!response.candidates || !response.candidates[0].content.parts[0].text) {
    throw new Error('Invalid response from AI model for detail generation.');
  }
  
  const jsonResponse = JSON.parse(response.candidates[0].content.parts[0].text);
  return GeneratePersonaDetailsOutputSchema.parse(jsonResponse);
}
