"use server";

import { realTimeHomeworkHelp } from "@/ai/flows/real-time-homework-help";
import { z } from "zod";

const helpSchema = z.object({
  photoDataUri: z.string(),
  query: z.string(),
});

type HelpResponse = {
  response: string;
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
    return result;
  } catch (e) {
    console.error(e);
    return { error: "An error occurred while getting help." };
  }
}
