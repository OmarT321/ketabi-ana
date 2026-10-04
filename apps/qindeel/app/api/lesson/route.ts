import { z } from "zod";
import { getLesson } from "@platform/core/server";
import { body, limit, json, failure } from "@platform/core/http";
export const maxDuration = 60;
const schema = z
  .object({
    lessonId: z.string().min(1).max(80),
    age: z.number().int().min(5).max(12),
    avatar: z.enum(["boy", "girl"]),
  })
  .strict();
export async function POST(request: Request) {
  try {
    const input = await body(request, schema);
    await limit(request);
    const result = await getLesson(input.lessonId, input.age, input.avatar);
    return result ? json(result) : json({ error: "هذا الدرس غير متاح." }, 404);
  } catch (error) {
    return failure(error);
  }
}
