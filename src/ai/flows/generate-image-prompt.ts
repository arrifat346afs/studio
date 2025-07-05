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
  tags: z.array(z.string()).describe('A list of tags describing the image style and content.'),
});
export type GenerateImagePromptOutput = z.infer<typeof GenerateImagePromptOutputSchema>;

export async function generateImagePrompt(input: GenerateImagePromptInput): Promise<GenerateImagePromptOutput> {
  return generateImagePromptFlow(input);
}

const generateImagePromptPrompt = ai.definePrompt({
  name: 'generateImagePromptPrompt',
  input: {schema: GenerateImagePromptInputSchema},
  output: {schema: GenerateImagePromptOutputSchema},
  prompt: `You are an expert AI image analyst and prompt generator. Your task is to analyze an image and provide a detailed art prompt, along with descriptive tags.

Analyze the image provided at the URL below.

{{media url=imageUrl}}

Based on your analysis, provide the following in the specified JSON format:
1.  **prompt**: A detailed and descriptive text prompt suitable for AI image generation models like DALL-E, Midjourney, or Stable Diffusion. This should capture the visual and stylistic essence of the image.
2.  **tags**: Generate a list of 5-7 relevant keywords or tags that describe the image's style, subject, content, and mood (e.g., "photorealistic", "portrait", "dark lighting", "vibrant colors", "close-up").
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
