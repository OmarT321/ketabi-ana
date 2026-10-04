import { z } from "zod";
import { answerQuestion } from "@platform/core/server";
import { body, limit, json, failure } from "@platform/core/http";
export const maxDuration = 30;
const schema = z
  .object({
    lessonId: z.string().min(1).max(80),
    question: z.string().trim().min(3).max(400),
    age: z.number().int().min(5).max(12),
  })
  .strict();
export async function POST(request: Request) {
  try {
    const input = await body(request, schema);
    await limit(request);
    return json(
      await answerQuestion(input.lessonId, input.question, input.age),
    );
  } catch (error) {
    return failure(error);
  }
}
