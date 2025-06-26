'use server';

import 'dotenv/config';
import { z } from 'zod';
import { generatePersonaProfilePicture } from '@/ai/flows/generate-persona-profile-picture';
import { chatWithPersona } from '@/ai/flows/chat-with-persona';
import { generatePersonaDetails } from '@/ai/flows/generate-persona-details';
import { generatePersonaFromPrompt } from '@/ai/flows/generate-full-persona';
import type { Persona, UserDetails, ChatMessage, CreatePersonaState, UpdatePersonaState } from '@/lib/types';

const personaSchemaFields = {
  name: z.string().min(1, 'Name is required'),
  relation: z.string().min(1, 'Relationship is required'),
  traits: z.string().min(1, 'Traits are required'),
  backstory: z.string().min(1, 'Backstory is required'),
  goals: z.string().min(1, 'Goals are required'),
  responseStyle: z.string().min(1, 'Response Style is required'),
};

const createPersonaSchema = z.object(personaSchemaFields);

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
      responseStyle: formData.get('responseStyle'),
    });

    if (!validatedFields.success) {
      return {
        success: false,
        message: 'Invalid form data',
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }
    
    const { name, relation, traits, backstory, goals, responseStyle } = validatedFields.data;

    const profilePictureResponse = await generatePersonaProfilePicture({
      personaTraits: `A visual depiction of a character who is: ${traits}. Name: ${name}.`,
    });

    if (!profilePictureResponse.profilePictureDataUri) {
      throw new Error('Failed to generate profile picture.');
    }

    const newPersona: Omit<Persona, 'id' | 'chats' | 'memories'> = {
      name,
      relation,
      traits,
      backstory,
      goals,
      responseStyle,
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
    chatHistory: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string()
    })),
    message: z.string(),
});

export async function chatAction(
  payload: {
    persona: Persona;
    userDetails: UserDetails;
    chatHistory: ChatMessage[];
    message: string;
  }
): Promise<{ response?: string; newMemories?: string[]; removedMemories?: string[]; error?: string }> {
  try {
    const validatedPayload = chatActionSchema.safeParse(payload);
    if (!validatedPayload.success) {
        return { error: 'Invalid input' };
    }

    const { persona, userDetails, chatHistory, message } = validatedPayload.data;
    
    const personaDescription = `Backstory: ${persona.backstory}\nTraits: ${persona.traits}\nGoals: ${persona.goals}`;

    const result = await chatWithPersona({
      personaName: persona.name,
      personaRelation: persona.relation,
      personaDescription: personaDescription,
      responseStyle: persona.responseStyle,
      userDetails: {
        name: userDetails.name,
        aboutMe: userDetails.about
      },
      existingMemories: persona.memories,
      chatHistory: chatHistory,
      message: message
    });

    return { response: result.response, newMemories: result.newMemories, removedMemories: result.removedMemories };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { error: `Chat failed: ${errorMessage}` };
  }
}

const updatePersonaSchema = z.object({
  id: z.string().min(1),
  ...personaSchemaFields,
  profilePictureUrl: z.string().min(1, 'Profile picture is missing.'),
});

export async function updatePersonaAction(
  prevState: UpdatePersonaState,
  formData: FormData
): Promise<UpdatePersonaState> {
  try {
    const validatedFields = updatePersonaSchema.safeParse({
      id: formData.get('id'),
      name: formData.get('name'),
      relation: formData.get('relation'),
      traits: formData.get('traits'),
      backstory: formData.get('backstory'),
      goals: formData.get('goals'),
      responseStyle: formData.get('responseStyle'),
      profilePictureUrl: formData.get('profilePictureUrl'),
    });

    if (!validatedFields.success) {
      return {
        success: false,
        message: 'Invalid form data.',
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    return { success: true, persona: validatedFields.data };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Persona update failed: ${errorMessage}` };
  }
}
