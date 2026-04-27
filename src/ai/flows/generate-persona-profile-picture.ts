'use client';

/**
 * @fileOverview Generates persona profile pictures using Together AI's FLUX.1 model.
 */

import { getApiKeys } from '@/lib/db';
import { TOGETHER_API_URL, TOGETHER_IMAGE_MODEL } from '@/lib/constants';
import { z } from 'zod';

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

/**
 * Custom error class for image generation quota/rate limit errors.
 * Allows the UI to detect when image generation fails due to API limits
 * and offer fallback options like manual upload.
 */
export class ImageGenerationQuotaError extends Error {
  public readonly prompt: string;

  constructor(message: string, prompt: string) {
    super(message);
    this.name = 'ImageGenerationQuotaError';
    this.prompt = prompt;
  }
}

/**
 * Builds a concise image generation prompt optimized for FLUX.
 */
export function buildProfilePicturePrompt(input: GeneratePersonaProfilePictureInput): string {
  return `Semi-realistic digital portrait painting of ${input.personaName}. ${input.personaTraits}. ${input.personaBackstory.substring(0, 200)}. Style: modern concept art, expressive lighting, painterly background. Aspect: portrait headshot.`;
}

/**
 * Generates an initials-based placeholder avatar as a data URI.
 * Used as a fallback when image generation fails.
 */
export function generatePlaceholderAvatar(name: string): string {
  const initials = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  const saturation = 50 + Math.abs((hash >> 8) % 20);
  const lightness = 75 + Math.abs((hash >> 16) % 10);
  const bgColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const textColor = `hsl(${hue}, ${saturation}%, 25%)`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="${bgColor}"/>
    <text x="128" y="128" font-family="system-ui, -apple-system, sans-serif" font-size="96" font-weight="600" fill="${textColor}" text-anchor="middle" dominant-baseline="central">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export async function generatePersonaProfilePicture(input: GeneratePersonaProfilePictureInput): Promise<GeneratePersonaProfilePictureOutput> {
  const prompt = buildProfilePicturePrompt(input);
  const apiKeys = await getApiKeys();
  const togetherKey = apiKeys.togetherAi?.trim();

  if (!togetherKey) {
    throw new ImageGenerationQuotaError('No Together AI key configured. Add one in Settings for avatar generation.', prompt);
  }

  try {
    const response = await fetch(TOGETHER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${togetherKey}`,
      },
      body: JSON.stringify({
        model: TOGETHER_IMAGE_MODEL,
        prompt,
        width: 512,
        height: 680,
        steps: 4,
        n: 1,
        response_format: 'b64_json',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || `Together AI Error (${response.status})`;
      if (response.status === 429 || response.status === 402) {
        throw new ImageGenerationQuotaError(errorMsg, prompt);
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error('No image data returned by Together AI.');

    return { profilePictureDataUri: `data:image/png;base64,${b64}` };
  } catch (error: any) {
    if (error instanceof ImageGenerationQuotaError) throw error;
    const msg = error?.message || '';
    if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('billing')) {
      throw new ImageGenerationQuotaError(msg, prompt);
    }
    throw error;
  }
}
