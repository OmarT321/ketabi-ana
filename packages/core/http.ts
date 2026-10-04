import { createHmac } from "node:crypto";
import type { ZodType } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(status === 429 ? { "Retry-After": "60" } : {}),
    },
  });
}
export async function body<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "يلزم إرسال طلب بصيغة JSON.");
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new HttpError(403, "مصدر الطلب غير مسموح.");
  if (Number(request.headers.get("content-length") || 0) > 8192)
    throw new HttpError(413, "الطلب أطول من الحد المسموح.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "الطلب فارغ.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8192) {
      await reader.cancel();
      throw new HttpError(413, "الطلب أطول من الحد المسموح.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, "تعذّر قراءة الطلب.");
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    throw new HttpError(400, "تحقق من المدخلات وحاول مرة أخرى.");
  return parsed.data;
}
const localBuckets = new Map<string, { count: number; until: number }>();
export async function limit(request: Request) {
  const salt = process.env.INTERNAL_API_TOKEN;
  const ip = process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown"
    : "local";
  const clientHash = createHmac("sha256", salt || "local-development")
    .update(`${new Date().toISOString().slice(0, 10)}:${ip}`)
    .digest("hex");
  const url = process.env.SUPABASE_URL;
  if (url && salt) {
    try {
      const response = await fetch(`${url}/functions/v1/platform-quota`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Internal-Key": salt },
        body: JSON.stringify({ clientHash }),
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });
      if (response.status === 429)
        throw new HttpError(
          429,
          "وصلت إلى الحد المؤقت للطلبات. انتظر قليلًا ثم حاول مجددًا.",
        );
      if (!response.ok) throw new Error("quota_unavailable");
      return;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (process.env.NODE_ENV === "production")
        throw new HttpError(503, "الخدمة غير متاحة مؤقتًا. حاول بعد قليل.");
    }
  } else if (process.env.NODE_ENV === "production")
    throw new HttpError(503, "الخدمة قيد الإعداد. حاول لاحقًا.");
  const now = Date.now();
  for (const [key, bucket] of localBuckets)
    if (bucket.until <= now) localBuckets.delete(key);
  const key = clientHash,
    bucket = localBuckets.get(key) || { count: 0, until: now + 60000 };
  bucket.count++;
  localBuckets.set(key, bucket);
  if (bucket.count > 30)
    throw new HttpError(429, "طلبات كثيرة. انتظر دقيقة ثم حاول مجددًا.");
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  return json({ error: "حدث خطأ مؤقت. حاول مرة أخرى." }, 503);
}
