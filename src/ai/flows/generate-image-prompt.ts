'use server';

/**
 * @fileOverview A flow to generate an AI art prompt from an image URL.
 *
 * - generateImagePrompt - A function that handles the image prompt generation process.
 * - GenerateImagePromptInput - The input type for the generateImagePrompt function.
 * - GenerateImagePromptOutput - The return type for the generateImagePrompt function.
 */

import {ai} from '@/ai/genkit';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';

const GenerateImagePromptInputSchema = z.object({
  imageUrl: z
    .string()
    .describe('The URL of the image to generate a prompt from.'),
  apiKey: z.string().optional().describe('An optional Google AI API key.'),
});
export type GenerateImagePromptInput = z.infer<typeof GenerateImagePromptInputSchema>;

const GenerateImagePromptOutputSchema = z.object({
  prompt: z.string().describe('The generated AI art prompt.'),
  tags: z.array(z.string()).describe('A list of tags describing the image style and content.'),
});
export type GenerateImagePromptOutput = z.infer<typeof GenerateImagePromptOutputSchema>;

const PROMPT_TEMPLATE = `You are an expert AI image analyst and prompt generator. Your task is to analyze an image and provide a detailed art prompt, along with descriptive tags.

Analyze the image provided at the URL below.

{{media url=imageUrl}}

Based on your analysis, provide the following in the specified JSON format:
1.  **prompt**: A detailed and descriptive text prompt suitable for AI image generation models like DALL-E, Midjourney, or Stable Diffusion. This should capture the visual and stylistic essence of the image.
2.  **tags**: Generate a list of 5-7 relevant keywords or tags that describe the image's style, subject, content, and mood (e.g., "photorealistic", "portrait", "dark lighting", "vibrant colors", "close-up").
`;
//i hope it worked
export async function generateImagePrompt(input: GenerateImagePromptInput): Promise<GenerateImagePromptOutput> {
  // If an API key is provided, create a temporary Genkit instance with it.
  // Otherwise, use the default flow (which may use a server-side key).
  if (input.apiKey) {
    const tempAi = genkit({
      plugins: [googleAI({apiKey: input.apiKey})],
      model: 'googleai/gemini-2.0-flash',
    });

    const tempPrompt = tempAi.definePrompt({
      name: 'generateImagePromptWithApiKey',
      input: {schema: GenerateImagePromptInputSchema},
      output: {schema: GenerateImagePromptOutputSchema},
      prompt: PROMPT_TEMPLATE,
    });

    const {output} = await tempPrompt(input);
    if (!output) {
      throw new Error('Failed to generate prompt with the provided API key.');
    }
    return output;
  }
  
  return generateImagePromptFlow(input);
}

const generateImagePromptPrompt = ai.definePrompt({
  name: 'generateImagePromptPrompt',
  input: {schema: GenerateImagePromptInputSchema},
  output: {schema: GenerateImagePromptOutputSchema},
  prompt: PROMPT_TEMPLATE,
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
