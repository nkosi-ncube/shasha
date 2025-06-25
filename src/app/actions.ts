"use server";

import { conversationalExplanations } from "@/ai/flows/conversational-explanations";
import { z } from "zod";

const explanationSchema = z.object({
  problemImage: z.string(),
  studentQuestion: z.string(),
});

type ExplanationResponse = {
  textExplanation: string;
  audioExplanation: string;
} | { error: string };

export async function getExplanation(
  data: z.infer<typeof explanationSchema>
): Promise<ExplanationResponse> {
  const validatedData = explanationSchema.safeParse(data);

  if (!validatedData.success) {
    return { error: "Invalid input." };
  }

  try {
    const result = await conversationalExplanations(validatedData.data);
    return result;
  } catch (e) {
    console.error(e);
    return { error: "An error occurred while getting the explanation." };
  }
}
