'use server';

/**
 * @fileOverview A flow to generate an AI art prompt from an image URL.
 *
 * - generateImagePrompt - A function that handles the image prompt generation process.
 * - GenerateImagePromptInput - The input type for the generateImagePrompt function.
 * - GenerateImagePromptOutput - The return type for the generateImagePrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {GenerateImagePromptOutput, generateImagePrompt as generateImagePromptFlow} from './generate-image-prompt-flow';
import type {GenerateImagePromptInput} from './generate-image-prompt-flow';

export {type GenerateImagePromptInput, type GenerateImagePromptOutput};

export async function generateImagePrompt(
  input: GenerateImagePromptInput
): Promise<GenerateImagePromptOutput> {
  // Pass the provided API key (if any) to the underlying flow.
  // The flow will then use this key for its API calls.
  return generateImagePromptFlow(input);
}
