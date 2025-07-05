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

const GenerateImagePromptInputSchema = z.object({
  imageUrl: z
    .string()
    .describe('The URL of the image to generate a prompt from.'),
});
export type GenerateImagePromptInput = z.infer<typeof GenerateImagePromptInputSchema>;

const GenerateImagePromptOutputSchema = z.object({
  prompt: z.string().describe('The generated AI art prompt.'),
});
export type GenerateImagePromptOutput = z.infer<typeof GenerateImagePromptOutputSchema>;

export async function generateImagePrompt(input: GenerateImagePromptInput): Promise<GenerateImagePromptOutput> {
  return generateImagePromptFlow(input);
}

const generateImagePromptPrompt = ai.definePrompt({
  name: 'generateImagePromptPrompt',
  input: {schema: GenerateImagePromptInputSchema},
  output: {schema: GenerateImagePromptOutputSchema},
  prompt: `You are an AI art prompt generator.  You take an image and create a text prompt that can be used to generate similar images.

Analyze the image at the following URL and generate an AI art prompt that captures the essence of the image:

{{media url=imageUrl}}

Ensure the prompt is detailed and descriptive, suitable for use with AI image generation models like DALL-E, Midjourney, or Stable Diffusion.
`,
});

const generateImagePromptFlow = ai.defineFlow(
  {
    name: 'generateImagePromptFlow',
    inputSchema: GenerateImagePromptInputSchema,
    outputSchema: GenerateImagePromptOutputSchema,
  },
  async input => {
    const {output} = await generateImagePromptPrompt(input);
    return output!;
  }
);
