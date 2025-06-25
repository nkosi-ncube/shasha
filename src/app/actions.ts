"use server";

import { conversationalExplanations } from "@/ai/flows/conversational-explanations";
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
    const result = await conversationalExplanations({
        problemImage: validatedData.data.photoDataUri,
        studentQuestion: validatedData.data.query,
    });
    return result;
  } catch (e) {
    console.error(e);
    return { error: "An error occurred while getting help." };
  }
}
