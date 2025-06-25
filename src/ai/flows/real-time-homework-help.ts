'use server';
/**
 * @fileOverview An AI agent to provide real-time homework help using the Gemini Live API.
 *
 * - realTimeHomeworkHelp - A function that handles the real-time homework help process.
 * - RealTimeHomeworkHelpInput - The input type for the realTimeHomeworkHelp function.
 * - RealTimeHomeworkHelpOutput - The return type for the realTimeHomeworkHelp function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RealTimeHomeworkHelpInputSchema = z.object({
  query: z.string().describe('The student’s question about the homework problem.'),
  photoDataUri: z
    .string()
    .describe(
      'A photo of the math problem, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Corrected typo here
    ),
});
export type RealTimeHomeworkHelpInput = z.infer<typeof RealTimeHomeworkHelpInputSchema>;

const RealTimeHomeworkHelpOutputSchema = z.object({
  response: z.string().describe('The AI tutor’s response to the student’s question.'),
});
export type RealTimeHomeworkHelpOutput = z.infer<typeof RealTimeHomeworkHelpOutputSchema>;

export async function realTimeHomeworkHelp(input: RealTimeHomeworkHelpInput): Promise<RealTimeHomeworkHelpOutput> {
  return realTimeHomeworkHelpFlow(input);
}

const prompt = ai.definePrompt({
  name: 'realTimeHomeworkHelpPrompt',
  input: {schema: RealTimeHomeworkHelpInputSchema},
  output: {schema: RealTimeHomeworkHelpOutputSchema},
  prompt: `You are an AI tutor helping a student with their math homework. Use the image and question to give a helpful response.

Question: {{{query}}}
Image: {{media url=photoDataUri}}`,
});

const realTimeHomeworkHelpFlow = ai.defineFlow(
  {
    name: 'realTimeHomeworkHelpFlow',
    inputSchema: RealTimeHomeworkHelpInputSchema,
    outputSchema: RealTimeHomeworkHelpOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
