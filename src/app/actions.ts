'use server';

import { z } from 'zod';
import { generatePersonaProfilePicture } from '@/ai/flows/generate-persona-profile-picture';
import { chatWithPersona } from '@/ai/flows/chat-with-persona';
import { generatePersonaDetails } from '@/ai/flows/generate-persona-details';
import { generatePersonaFromPrompt } from '@/ai/flows/generate-full-persona';
import type { Persona, UserDetails, ChatMessage } from '@/lib/types';

const createPersonaSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  relation: z.string().min(1, 'Relationship is required'),
  traits: z.string().min(1, 'Traits are required'),
  backstory: z.string().min(1, 'Backstory is required'),
  goals: z.string().min(1, 'Goals are required'),
});

export interface CreatePersonaState {
  message?: string | null;
  errors?: {
    name?: string[];
    relation?: string[];
    traits?: string[];
    backstory?: string[];
    goals?: string[];
  };
  success?: boolean;
  persona?: Omit<Persona, 'id'> | null;
}

export async function createPersonaAction(
  prevState: CreatePersonaState,
  formData: FormData
): Promise<CreatePersonaState> {
  try {
    const validatedFields = createPersonaSchema.safeParse({
      name: formData.get('name'),
      relation: formData.get('relation'),
      traits: formData.get('traits'),
      backstory: formData.get('backstory'),
      goals: formData.get('goals'),
    });

    if (!validatedFields.success) {
      return {
        success: false,
        message: 'Invalid form data',
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }
    
    const { name, relation, traits, backstory, goals } = validatedFields.data;

    const profilePictureResponse = await generatePersonaProfilePicture({
      personaTraits: `A visual depiction of a character who is: ${traits}. Name: ${name}.`,
    });

    if (!profilePictureResponse.profilePictureDataUri) {
      throw new Error('Failed to generate profile picture.');
    }

    const newPersona: Omit<Persona, 'id'> = {
      name,
      relation,
      traits,
      backstory,
      goals,
      profilePictureUrl: profilePictureResponse.profilePictureDataUri,
    };
    
    return { success: true, persona: newPersona };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Persona creation failed: ${errorMessage}` };
  }
}

export async function generatePersonaDetailsAction(name: string) {
  try {
    if (!name?.trim()) {
      return { success: false, error: 'Name is required to generate details.' };
    }
    const details = await generatePersonaDetails({ personaName: name });
    return { success: true, details };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: `Details generation failed: ${errorMessage}` };
  }
}

export async function generatePersonaFromPromptAction(prompt: string) {
   try {
    if (!prompt?.trim()) {
      return { success: false, error: 'A prompt is required to generate a persona.' };
    }
    const personaData = await generatePersonaFromPrompt({ prompt });
    return { success: true, personaData };
  } catch (error)
  {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: `Persona generation failed: ${errorMessage}` };
  }
}


const chatActionSchema = z.object({
    persona: z.any(),
    userDetails: z.any(),
    message: z.string(),
});

export async function chatAction(
  payload: {
    persona: Persona;
    userDetails: UserDetails;
    message: string;
  }
): Promise<{ response?: string; error?: string }> {
  try {
    const validatedPayload = chatActionSchema.safeParse(payload);
    if (!validatedPayload.success) {
        return { error: 'Invalid input' };
    }

    const { persona, userDetails, message } = validatedPayload.data;
    
    const personaDescription = `Backstory: ${persona.backstory}\nTraits: ${persona.traits}\nGoals: ${persona.goals}`;

    const result = await chatWithPersona({
      personaName: persona.name,
      personaRelation: persona.relation,
      personaDescription: personaDescription,
      userDetails: {
        name: userDetails.name,
        aboutMe: userDetails.about
      },
      message: message
    });

    return { response: result.response };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { error: `Chat failed: ${errorMessage}` };
  }
}
