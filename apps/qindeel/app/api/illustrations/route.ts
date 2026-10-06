import { COPY } from "@/lib/copy";
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
    // Upload path only (ALLOW_UPLOAD=true): a jpeg or png data URL, checked again in core.
    photo: z.string().max(2_900_000).optional(),
  })
  .strict();
export async function POST(request: Request) {
  try {
    // 2 MB of photo is about 2.8 MB once base64-encoded.
    const input = await body(request, schema, 3_000_000);
    await limit(request);
    const result = await getBookImages(input);
    return result ? json(result) : json({ error: COPY.service.picturesMissing }, 404);
  } catch (error) {
    return failure(error);
  }
}
