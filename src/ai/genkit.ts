import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This AI instance is primarily for defining flows and prompts.
// It is initialized with a placeholder key to satisfy Genkit's precondition
// checks on server startup in environments like Vercel.
// The actual, user-provided API key is provided dynamically at call time
// within each flow, ensuring the user's key from settings is used for all AI requests.
export const ai = genkit({
  plugins: [googleAI({ apiKey: 'placeholder_must_be_overridden' })],
  model: 'googleai/gemini-2.5-flash',
});
