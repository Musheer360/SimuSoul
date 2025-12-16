
'use client';

/**
 * @fileOverview This file defines a client-side function for generating a persona profile picture.
 */

import { callGeminiApi } from '@/lib/api-key-manager';
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
 * This allows the UI to detect when image generation fails due to API limits
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
 * Builds the image generation prompt for a persona profile picture.
 * Exported so it can be displayed to users for manual image generation.
 */
export function buildProfilePicturePrompt(input: GeneratePersonaProfilePictureInput): string {
  return `You are an expert art director specializing in character portraits for social media. Your task is to generate a profile picture that is authentic and believable, but in a semi-realistic, digitally painted art style. It should not look like a photograph.

The style of the portrait should be directly inspired by the character's personality and backstory.
- For a professional or serious persona, create a clean, well-composed, painted headshot.
- For a casual, artistic, or adventurous persona, create a more dynamic painted portrait, perhaps with a more expressive pose or interesting lighting that reflects their hobby or environment.

**Style Instructions (CRITICAL):**
- **Art Style:** Generate a high-quality, semi-realistic, digitally painted portrait. Think modern concept art or a high-end graphic novel. It should have a clear artistic touch.
- **AVOID PHOTOREALISM:** Do not generate a photograph. The image must look like a digital painting.
- **Authenticity over Perfection:** Avoid overly airbrushed or generic "anime" looks. The character should feel unique and real, despite being illustrated.
- **Lighting:** Use natural or dramatic lighting that complements the character's mood and setting.
- **Background:** Keep the background simple, painterly, or contextually relevant to the character.

Use the following details to bring the character to life in their profile picture:

**Character Name:** ${input.personaName}

**Character Vibe & Traits:**
${input.personaTraits}

**Backstory Context:**
${input.personaBackstory}`;
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
  
  // Generate a random pastel color based on the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  // Pastel colors: high lightness (75-85%), moderate saturation (50-70%)
  const saturation = 50 + Math.abs((hash >> 8) % 20); // 50-70%
  const lightness = 75 + Math.abs((hash >> 16) % 10); // 75-85%
  const bgColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  // Darker text color for contrast on pastel backgrounds
  const textColor = `hsl(${hue}, ${saturation}%, 25%)`;
  
  // Use dominant-baseline="central" for proper vertical centering
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="${bgColor}"/>
    <text x="128" y="128" font-family="system-ui, -apple-system, sans-serif" font-size="96" font-weight="600" fill="${textColor}" text-anchor="middle" dominant-baseline="central">${initials}</text>
  </svg>`;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export async function generatePersonaProfilePicture(input: GeneratePersonaProfilePictureInput): Promise<GeneratePersonaProfilePictureOutput> {
  const prompt = buildProfilePicturePrompt(input);

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: '3:4',
      },
    },
  };

  try {
    // Use Nano Banana (Gemini 2.5 Flash Image) for image generation
    const response = await callGeminiApi<any>('gemini-2.5-flash-image:generateContent', requestBody);

    // The model returns image data in an 'inlineData' part.
    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData
    );

    const imageData = imagePart?.inlineData;

    if (imageData?.data && imageData?.mimeType) {
      const dataUri = `data:${imageData.mimeType};base64,${imageData.data}`;
      return { profilePictureDataUri: dataUri };
    }

    // If image generation fails, the API might return a text explanation.
    const textPart = response.candidates?.[0]?.content?.parts?.find((part: any) => part.text)?.text;
    const reason = textPart ? `API Error: ${textPart}` : 'No image data was generated by the API.';
    
    console.error("Image generation failed. Full API response:", response);
    throw new Error(reason);
  } catch (error: any) {
    // Check if this is a quota/rate limit error (429) or billing issue
    const errorMessage = error?.message || '';
    const isQuotaError = 
      errorMessage.includes('429') || 
      errorMessage.includes('quota') || 
      errorMessage.includes('rate limit') ||
      errorMessage.includes('billing') ||
      errorMessage.includes('exceeded');
    
    if (isQuotaError) {
      throw new ImageGenerationQuotaError(errorMessage, prompt);
    }
    
    // Re-throw other errors as-is
    throw error;
  }
}
