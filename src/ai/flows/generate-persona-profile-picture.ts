
'use client';

/**
 * @fileOverview This file defines a client-side function for generating a persona profile picture.
 */

import { callGeminiApi } from '@/lib/api-key-manager';
import { z } from 'zod';

export const GeneratePersonaProfilePictureInputSchema = z.object({
  personaTraits: z.string(),
});
export type GeneratePersonaProfilePictureInput = z.infer<typeof GeneratePersonaProfilePictureInputSchema>;

export const GeneratePersonaProfilePictureOutputSchema = z.object({
  profilePictureDataUri: z.string(),
});
export type GeneratePersonaProfilePictureOutput = z.infer<typeof GeneratePersonaProfilePictureOutputSchema>;

export async function generatePersonaProfilePicture(input: GeneratePersonaProfilePictureInput): Promise<GeneratePersonaProfilePictureOutput> {
  const prompt = `Create a photorealistic, cinematic portrait of a character up to their mid-body. The character should be facing the camera. The character is described as: ${input.personaTraits}`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generation_config: {
        response_mime_type: "image/png"
    }
  };

  // Note: Image generation uses a different model and endpoint structure.
  const response = await callGeminiApi<any>('gemini-1.5-flash:generateContent', {
    ...requestBody,
    generationConfig: {
      responseMimeType: 'application/json'
    },
    tools: [{
        "function_declarations": [
            {
                "name": "image",
                "description": "Generates an image from a text prompt.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "prompt": {
                            "type": "STRING",
                            "description": "The text prompt to generate an image from."
                        }
                    },
                    "required": ["prompt"]
                }
            }
        ]
    }]
  });

  const toolCall = response.candidates[0].content.parts.find((part: any) => part.functionCall?.name === 'image');

  if (!toolCall) {
    throw new Error('Image generation tool was not called.');
  }

  const imageGenRequestBody = {
    "tool_config": {
        "function_calling_config": {
            "mode": "ANY",
            "allowed_function_names": ["image"]
        }
    },
    "contents": [
        ...requestBody.contents,
        {
            "role": "assistant",
            "parts": [{ "functionCall": toolCall.functionCall }]
        }
    ],
  };

  const imageResponse = await callGeminiApi<any>('gemini-1.5-flash:generateContent', imageGenRequestBody);
  const imagePart = imageResponse.candidates[0].content.parts.find((part: any) => part.fileData);

  if (!imagePart || !imagePart.fileData) {
      throw new Error('No image data was generated.');
  }

  const { mimeType, fileUri } = imagePart.fileData;
  // The fileUri from the API is already a complete data URI string (e.g., "data:image/png;base64,...").
  // However, sometimes it is not. Awaiting confirmation.
  // For now, let's assume it might just be the base64 part.
  
  if (fileUri.startsWith('data:')) {
    return { profilePictureDataUri: fileUri };
  } else {
    // This case might not be needed if the API always returns a full data URI.
    return { profilePictureDataUri: `data:${mimeType};base64,${fileUri}` };
  }
}
