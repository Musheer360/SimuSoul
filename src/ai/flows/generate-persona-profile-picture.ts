'use client';

/**
 * @fileOverview Generates persona profile pictures.
 * Step 1: Uses Groq to craft an optimized image generation prompt from persona data.
 * Step 2: Sends that prompt to Pollinations.ai FLUX for the actual image.
 */

import { z } from 'zod';
import { sanitizeForPrompt } from '@/lib/utils';
import { callLLM } from '@/lib/llm-router';
import { safeParseJson } from '@/lib/safe-json';

export const GeneratePersonaProfilePictureInputSchema = z.object({
  personaName: z.string(),
  personaTraits: z.string(),
  personaBackstory: z.string(),
});
export type GeneratePersonaProfilePictureInput = z.infer<typeof GeneratePersonaProfilePictureInputSchema>;

export const GeneratePersonaProfilePictureOutputSchema = z.object({
  profilePictureDataUri: z.string(),
});
export type GeneratePersonaProfilePictureOutput = z.infer<typeof GeneratePersonaProfilePictureOutputSchema>;

export class ImageGenerationQuotaError extends Error {
  public readonly prompt: string;
  constructor(message: string, prompt: string) {
    super(message);
    this.name = 'ImageGenerationQuotaError';
    this.prompt = prompt;
  }
}

/**
 * Uses Groq to generate an optimized FLUX image prompt from persona data.
 */
async function generateImagePrompt(input: GeneratePersonaProfilePictureInput): Promise<string> {
  const requestBody = {
    contents: [{ parts: [{ text: `You are an expert at writing prompts for AI image generators (FLUX/Stable Diffusion). Given a character description, write a single detailed image generation prompt for a portrait/headshot profile picture.

Character:
Name: ${sanitizeForPrompt(input.personaName)}
Traits: ${sanitizeForPrompt(input.personaTraits)}
Background: ${sanitizeForPrompt(input.personaBackstory.substring(0, 300))}

Write ONE prompt (no explanation, just the prompt) that describes:
- The person's approximate age, gender, ethnicity (infer from name/backstory)
- Facial features, expression, and mood matching their personality
- Hair style and color
- Clothing/accessories appropriate to their character
- Lighting and color palette that fits their vibe
- Camera angle (close-up portrait, slight angle)

Format: A single paragraph, 50-80 words. Start with the subject description, end with style keywords.
End with: "digital art portrait, high quality, detailed face, sharp focus, studio lighting"` }] }],
    generationConfig: {
      temperature: 0.9,
      responseMimeType: 'application/json',
      responseSchema: { type: 'OBJECT', properties: { prompt: { type: 'STRING' } }, required: ['prompt'] },
    },
  };

  try {
    const response = await callLLM<any>('generateContent', requestBody);
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      const parsed = safeParseJson<{ prompt: string }>(text, 'imagePrompt');
      if (parsed.prompt) return parsed.prompt;
    }
  } catch {
    // Fall through to basic prompt
  }

  // Fallback: basic prompt if Groq fails
  return `Portrait of ${sanitizeForPrompt(input.personaName)}, ${sanitizeForPrompt(input.personaTraits.substring(0, 100))}. digital art portrait, high quality, detailed face, sharp focus, studio lighting`;
}

export function buildProfilePicturePrompt(input: GeneratePersonaProfilePictureInput): string {
  return `Portrait of ${sanitizeForPrompt(input.personaName)}. ${sanitizeForPrompt(input.personaTraits)}. digital art portrait, high quality, detailed face, sharp focus, studio lighting`;
}

export function generatePlaceholderAvatar(name: string): string {
  const initials = name.split(' ').map(w => w.charAt(0).toUpperCase()).slice(0, 2).join('');
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  const sat = 50 + Math.abs((hash >> 8) % 20);
  const lit = 75 + Math.abs((hash >> 16) % 10);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="hsl(${hue}, ${sat}%, ${lit}%)"/>
    <text x="128" y="128" font-family="system-ui, -apple-system, sans-serif" font-size="96" font-weight="600" fill="hsl(${hue}, ${sat}%, 25%)" text-anchor="middle" dominant-baseline="central">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

export async function generatePersonaProfilePicture(input: GeneratePersonaProfilePictureInput): Promise<GeneratePersonaProfilePictureOutput> {
  // Step 1: Use Groq to craft an optimized image prompt
  const prompt = await generateImagePrompt(input);

  // Step 2: Generate image via Pollinations.ai
  const encodedPrompt = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 1000000);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=1024&seed=${seed}&nologo=true&model=flux`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) {
        throw new ImageGenerationQuotaError('Image generation rate limited. Please try again in a moment.', prompt);
      }
      throw new Error(`Image generation failed (${response.status}). Please try again.`);
    }

    const blob = await response.blob();
    if (!blob.size || !blob.type.startsWith('image/')) {
      throw new Error('Invalid image data received.');
    }

    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image data.'));
      reader.readAsDataURL(blob);
    });

    return { profilePictureDataUri: dataUri };
  } catch (error: any) {
    if (error instanceof ImageGenerationQuotaError) throw error;
    throw error;
  }
}
