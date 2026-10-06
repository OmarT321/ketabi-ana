import { z } from "zod";
import { getBookImages } from "@platform/core/server";
import { body, limit, json, failure } from "@platform/core/http";
export const maxDuration = 120;
const schema = z
  .object({
    // Random per book, made in the browser; used only to derive the seed.
    sessionId: z.string().uuid(),
    lessonIds: z.array(z.string().min(1).max(80)).min(1).max(3),
    age: z.number().int().min(5).max(12),
    gender: z.enum(["boy", "girl"]),
  })
  .strict();
export async function POST(request: Request) {
  try {
    const input = await body(request, schema);
    await limit(request);
    const result = await getBookImages(input);
    return result ? json(result) : json({ error: "تعذّر تجهيز صور هذا الكتاب." }, 404);
  } catch (error) {
    return failure(error);
  }
}
