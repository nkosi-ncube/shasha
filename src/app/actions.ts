"use server";

import { realTimeHomeworkHelp } from "@/ai/flows/real-time-homework-help";
import { z } from "zod";

const helpSchema = z.object({
  photoDataUri: z.string(),
  query: z.string(),
});

type HelpResponse = {
  textExplanation: string;
  audioExplanation: string;
} | { error: string };

export async function getRealTimeHelp(
  data: z.infer<typeof helpSchema>
): Promise<HelpResponse> {
  const validatedData = helpSchema.safeParse(data);

  if (!validatedData.success) {
    return { error: "Invalid input." };
  }

  try {
    const result = await realTimeHomeworkHelp({
      photoDataUri: validatedData.data.photoDataUri,
      query: validatedData.data.query,
    });
    // Adapt the response to fit the client's expected structure.
    // Audio is temporarily disabled to resolve the server error.
    return {
      textExplanation: result.response,
      audioExplanation: "",
    };
  } catch (e) {
    console.error(e);
    return { error: "An error occurred while getting help." };
  }
}
