'use server';
/**
 * @fileOverview A real-time conversational homework helper flow.
 *
 * - conversationalExplanations - A function that handles the conversational explanations process.
 * - ConversationalExplanationsInput - The input type for the conversationalExplanations function.
 * - ConversationalExplanationsOutput - The return type for the conversationalExplanations function.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';
import wav from 'wav';

const ConversationalExplanationsInputSchema = z.object({
  problemImage: z
    .string()
    .describe(
      "A photo of a homework problem, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  studentQuestion: z.string().describe("The student's question about the problem."),
});
export type ConversationalExplanationsInput = z.infer<typeof ConversationalExplanationsInputSchema>;

const ConversationalExplanationsOutputSchema = z.object({
  textExplanation: z.string().describe("The AI's text explanation of the problem."),
  audioExplanation: z.string().describe("The AI's audio explanation of the problem in WAV format as a data URI."),
});
export type ConversationalExplanationsOutput = z.infer<typeof ConversationalExplanationsOutputSchema>;

export async function conversationalExplanations(input: ConversationalExplanationsInput): Promise<ConversationalExplanationsOutput> {
  return conversationalExplanationsFlow(input);
}

// Define a schema for just the text output from the first LLM call.
const TextExplanationOutputSchema = z.object({
  textExplanation: z.string().describe("The AI's text explanation of the problem."),
});


const textPrompt = ai.definePrompt({
  name: 'conversationalTextPrompt',
  input: {schema: ConversationalExplanationsInputSchema},
  output: {schema: TextExplanationOutputSchema},
  prompt: `You are an AI tutor helping a student with their homework problem. Provide a clear, step-by-step explanation to answer their question based on the image provided.

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
    // 1. Get the text explanation first.
    const {output: textOutput} = await textPrompt(input);
    const explanationText = textOutput?.textExplanation ?? 'I am sorry, I could not generate an explanation for this problem.';

    // 2. Generate the audio from the text explanation.
    const {media} = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {voiceName: 'Algenib'},
          },
        },
      },
      prompt: explanationText,
    });

    if (!media) {
      throw new Error('TTS media generation failed.');
    }
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    const audioExplanation = 'data:audio/wav;base64,' + (await toWav(audioBuffer));
    
    // 3. Return both text and audio.
    return {
      textExplanation: explanationText,
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
