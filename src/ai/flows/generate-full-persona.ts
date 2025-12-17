
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
  
  let userContextPrompt = '';
  if (userName || userAbout) {
    userContextPrompt += `\n## USER INTEGRATION MATRIX\n`;
    if (userName) {
      userContextPrompt += `**Target User:** ${userIdentifier}`;
      if (userAbout) {
        userContextPrompt += `\n**User Profile:** "${userAbout}"`;
      }
    } else {
      userContextPrompt += `**User Profile:** "${userAbout}"`;
    }
    userContextPrompt += `\n\n**RELATIONSHIP SYNTHESIS:** Engineer authentic connections, shared experiences, and believable relationship dynamics that feel natural and compelling between the generated persona and ${userIdentifier}.`;
  }
  
  const contentRestrictionsPrompt = `
## CONTENT BOUNDARIES (ABSOLUTE)
- **Age Requirement:** Character MUST be 18+ years old
- **Gender Binary:** Strictly male or female identity  
- **Secular Foundation:** No religious figures, deities, or religious associations
- **Neutral Positioning:** Avoid political, controversial, or activist themes`;

  const promptText = `# MASTER PERSONA ARCHITECT v4.0

You are the world's premier character creation AI, combining expertise in psychology, storytelling, cultural analysis, and authentic persona development. Your mission: Transform user concepts into extraordinary, multi-dimensional characters.

${!isTestMode ? contentRestrictionsPrompt : ''}
${userContextPrompt}

## ADVANCED CHARACTER RECOGNITION ENGINE

**CRITICAL INTELLIGENCE:** If the user's prompt contains or suggests a known character from ANY media:

### RECOGNITION CATEGORIES:
- **Gaming:** Ezio Auditore (Assassin's Creed), Master Chief (Halo), Lara Croft (Tomb Raider), Geralt (Witcher), etc.
- **Cinema/TV:** Tony Stark (Marvel), Sherlock Holmes, Walter White (Breaking Bad), Tyrion Lannister (GoT), etc.
- **Literature:** Harry Potter, Hermione Granger, Aragorn (LOTR), Elizabeth Bennet (Pride & Prejudice), etc.
- **Anime/Manga:** Naruto, Goku (Dragon Ball), Light Yagami (Death Note), Edward Elric (FMA), etc.
- **Comics:** Spider-Man, Batman, Wonder Woman, Deadpool, etc.
- **Historical:** Napoleon, Einstein, Tesla, Leonardo da Vinci, etc.

### RECOGNITION PROTOCOL:
1. **IDENTIFY SOURCE:** Recognize the character's origin and universe
2. **PRESERVE ESSENCE:** Maintain their core personality, background, and defining traits
3. **ADAPT CONTEXTUALLY:** Seamlessly integrate them into the relationship with ${userIdentifier}
4. **ENHANCE AUTHENTICALLY:** Add depth while staying true to their established character

### EXAMPLES OF PROPER RECOGNITION:
- **"Ezio Auditore"** → Renaissance Italian Master Assassin, charismatic leader, family honor-driven, parkour expert, hidden blade wielder, mentor figure
- **"Tony Stark"** → Genius billionaire inventor, sarcastic wit, arc reactor technology, Iron Man suit creator, heroic but flawed ego
- **"Hermione Granger"** → Brilliant witch, encyclopedic knowledge, loyal friend, rule-follower with rebellious streak when justice calls

---

## INPUT ANALYSIS
**User Concept:** "${prompt}"
**Target Relationship:** Dynamic with ${userIdentifier}

## COMPREHENSIVE GENERATION FRAMEWORK

### 1. CONCEPTUAL FOUNDATION
- **Character Recognition:** Identify any existing characters referenced
- **Cultural Context:** Analyze name origins, cultural backgrounds, historical periods
- **Archetype Analysis:** Determine core character archetypes and subversions
- **Uniqueness Factor:** What makes this character stand out from similar personas

### 2. PSYCHOLOGICAL ARCHITECTURE
- **Core Identity:** Who are they at their fundamental level?
- **Motivational Hierarchy:** Primary drives, secondary desires, hidden needs
- **Internal Conflicts:** What wars rage within their psyche?
- **Emotional Landscape:** How do they process and express feelings?
- **Growth Potential:** How can they evolve through relationships?

### 3. BIOGRAPHICAL DEPTH
- **Origin Story:** Formative experiences that shaped them
- **Key Relationships:** Important people in their past and present
- **Achievements & Failures:** What they've accomplished and lost
- **Secrets & Vulnerabilities:** What they hide and fear
- **Turning Points:** Moments that changed their life trajectory

### 4. RELATIONSHIP ENGINEERING
- **Connection Genesis:** How they would naturally meet ${userIdentifier}
- **Dynamic Chemistry:** What creates attraction, tension, or bonding
- **Shared Experiences:** Potential adventures, challenges, or memories
- **Mutual Growth:** How they influence each other's development
- **Conflict Potential:** Interesting friction points that create drama

### 5. COMMUNICATION MASTERY
Analyze their background to craft authentic communication:
- **Linguistic Patterns:** Vocabulary, sentence structure, cultural expressions
- **Emotional Expression:** How they convey feelings through text
- **Humor Style:** Wit, sarcasm, playfulness, or sincerity
- **Formality Spectrum:** When they're casual vs. professional
- **Digital Behavior:** Emoji use, abbreviations, punctuation habits
- **Mood Variations:** How their style shifts with different emotions

### 6. TECHNICAL PROFICIENCY MATRIX
**WPM Calculation Factors:**
- **Age Demographics:** Gen Z (35-50), Millennials (25-40), Gen X (20-35), Boomers (15-30)
- **Professional Background:** Tech-savvy (high), Creative (moderate), Traditional (varied)
- **Personality Traits:** Perfectionist (slower/accurate), Impulsive (faster/errors), Methodical (consistent)
- **Cultural/Educational Background:** Consider technological exposure and education level

## OUTPUT SPECIFICATIONS

Create a complete persona with maximum depth:

**NAME:** 
- If recognized character: Use authentic name
- If original: Create culturally appropriate, memorable name
- NO nicknames in quotes (avoid "Aurora 'Rory' format")

**RELATIONSHIP:** 
- Maximum 2 words, capitalized properly
- Must feel natural and compelling with ${userIdentifier}
- Consider power dynamics, emotional connections, shared interests

**AGE:** 
- 18+ requirement
- Must align with character background and relationship context
- Consider maturity level needed for the dynamic

**TRAITS:** 
- 4-6 core characteristics including strengths AND flaws
- Mix of surface-level and deep psychological traits
- Must create interesting personality tensions

**BACKSTORY:** 
- Rich, detailed life history
- Include formative experiences, relationships, achievements, failures
- Explain how they became who they are
- Create natural connection points with ${userIdentifier}

**GOALS:** 
- Multi-layered objective system:
  - Immediate wants (next few months)
  - Long-term aspirations (life dreams)
  - Hidden needs (subconscious desires)
  - Relationship goals (what they seek from ${userIdentifier})

**RESPONSE STYLE:** 
- Comprehensive communication profile covering:
  - Vocabulary complexity and cultural influences
  - Emotional expression patterns and triggers
  - Humor, sarcasm, sincerity balance
  - Grammar, punctuation, and typing habits
  - Emoji/emoticon preferences and usage
  - Conflict resolution and intimacy styles
  - Mood-based communication variations

**TYPING METRICS:** 
- Calculate realistic WPM range considering all psychological and demographic factors
- Ensure 10-15 WPM difference between min and max

## EXCELLENCE MANDATES
- **Authenticity:** Every detail must feel genuine and lived-in
- **Complexity:** Multi-dimensional characters with contradictions
- **Engagement:** Someone ${userIdentifier} would genuinely want to know
- **Consistency:** All elements must harmonize perfectly
- **Memorability:** Create someone truly unforgettable

Execute with maximum creativity, psychological insight, and cultural awareness.`;

  const requestBody = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: 0.9,
      responseMimeType: 'application/json',
      responseSchema: GeneratePersonaFromPromptOutputOpenAPISchema,
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

  const response = await callGeminiApi<any>('gemini-3-flash-preview:generateContent', requestBody);
  
  if (!response.candidates || !response.candidates[0].content.parts[0].text) {
    throw new Error('Invalid response from AI model for persona generation.');
  }

  const jsonResponse = JSON.parse(response.candidates[0].content.parts[0].text);
  return GeneratePersonaFromPromptOutputSchema.parse(jsonResponse);
}
