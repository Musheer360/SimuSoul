import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This AI instance is primarily for defining flows and prompts.
// The actual API key is provided dynamically at call time within each flow,
// ensuring that the user's key from settings is used.
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
