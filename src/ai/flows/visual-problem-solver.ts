'use server';

/**
 * @fileOverview Recognizes math equations and physics diagrams from an image.
 *
 * - visualProblemSolver - A function that recognizes math equations and physics diagrams from an image.
 * - VisualProblemSolverInput - The input type for the visualProblemSolver function.
 * - VisualProblemSolverOutput - The return type for the visualProblemSolver function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VisualProblemSolverInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a math equation or physics diagram, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type VisualProblemSolverInput = z.infer<typeof VisualProblemSolverInputSchema>;

const VisualProblemSolverOutputSchema = z.object({
  problemDescription: z
    .string()
    .describe('A textual description of the math equation or physics diagram.'),
});
export type VisualProblemSolverOutput = z.infer<typeof VisualProblemSolverOutputSchema>;

export async function visualProblemSolver(
  input: VisualProblemSolverInput
): Promise<VisualProblemSolverOutput> {
  return visualProblemSolverFlow(input);
}

const prompt = ai.definePrompt({
  name: 'visualProblemSolverPrompt',
  input: {schema: VisualProblemSolverInputSchema},
  output: {schema: VisualProblemSolverOutputSchema},
  prompt: `You are an expert in recognizing math equations and physics diagrams.

  Describe the math equation or physics diagram in the image.  Be as detailed as possible.

  Image: {{media url=photoDataUri}}`,
});

const visualProblemSolverFlow = ai.defineFlow(
  {
    name: 'visualProblemSolverFlow',
    inputSchema: VisualProblemSolverInputSchema,
    outputSchema: VisualProblemSolverOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
