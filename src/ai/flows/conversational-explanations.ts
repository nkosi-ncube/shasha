'use server';
/**
 * @fileOverview A real-time conversational homework helper flow.
 *
 * - conversationalExplanations - A function that handles the conversational explanations process.
 * - ConversationalExplanationsInput - The input type for the conversationalExplanations function.
 * - ConversationalExplanationsOutput - The return type for the conversationalExplanations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

const ConversationalExplanationsInputSchema = z.object({
  problemImage: z
    .string()
    .describe(
      "A photo of a homework problem, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  studentQuestion: z.string().describe('The student\'s question about the problem.'),
});
export type ConversationalExplanationsInput = z.infer<typeof ConversationalExplanationsInputSchema>;

const ConversationalExplanationsOutputSchema = z.object({
  textExplanation: z.string().describe('The AI\'s text explanation of the problem.'),
  audioExplanation: z.string().describe('The AI\'s audio explanation of the problem in WAV format as a data URI.'),
});
export type ConversationalExplanationsOutput = z.infer<typeof ConversationalExplanationsOutputSchema>;

export async function conversationalExplanations(input: ConversationalExplanationsInput): Promise<ConversationalExplanationsOutput> {
  return conversationalExplanationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'conversationalExplanationsPrompt',
  input: {schema: ConversationalExplanationsInputSchema},
  output: {schema: ConversationalExplanationsOutputSchema},
  prompt: `You are an AI tutor helping a student with their homework problem. Use both text and audio to explain the solution. The student will send a photo of the problem as well as their question. Give detailed explanations depending on user inputs.

Problem: {{media url=problemImage}}

Question: {{{studentQuestion}}}`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const conversationalExplanationsFlow = ai.defineFlow(
  {
    name: 'conversationalExplanationsFlow',
    inputSchema: ConversationalExplanationsInputSchema,
    outputSchema: ConversationalExplanationsOutputSchema,
  },
  async input => {
    const {output: textOutput} = await prompt(input);

    const {media} = await ai.generate({
      model: ai.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {voiceName: 'Algenib'},
          },
        },
      },
      prompt: textOutput?.textExplanation ?? 'Could not generate text explanation.',
    });

    if (!media) {
      throw new Error('no media returned');
    }
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    const audioExplanation = 'data:audio/wav;base64,' + (await toWav(audioBuffer));

    return {
      textExplanation: textOutput!.textExplanation,
      audioExplanation: audioExplanation,
    };
  }
);

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
