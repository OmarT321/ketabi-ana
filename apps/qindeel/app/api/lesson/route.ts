import { z } from "zod";
import { getLesson } from "@platform/core/server";
import { MAX_REPLY_LENGTH } from "@platform/core/content";
import { body, limit, json, failure } from "@platform/core/http";
export const maxDuration = 60;
// The child's reply is used for this request only: it is not logged, cached or returned.
const reply = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }).strict(),
  z.object({ kind: z.literal("chip"), index: z.number().int().min(0).max(2) }).strict(),
  z
    .object({ kind: z.literal("text"), text: z.string().trim().min(1).max(MAX_REPLY_LENGTH) })
    .strict(),
]);
const schema = z
  .object({
    lessonId: z.string().min(1).max(80),
    age: z.number().int().min(5).max(12),
    gender: z.enum(["boy", "girl"]),
    reply: reply.optional(),
  })
  .strict();
export async function POST(request: Request) {
  try {
    const input = await body(request, schema);
    await limit(request);
    const result = await getLesson(input.lessonId, input.age, input.gender, input.reply);
    return result ? json(result) : json({ error: "هذا الدرس غير متاح." }, 404);
  } catch (error) {
    return failure(error);
  }
}
