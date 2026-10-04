import { createHash } from "node:crypto";
import {
  lessons,
  reviewNotice,
  validAge,
  ageBand,
  meaningFor,
  sourceLine,
} from "./content";
import {
  normalize,
  isCrisis,
  isRestricted,
  childRefusal,
} from "./safety";
import { generateExplanation, warmedExplanation, type Explanation } from "./explain";
import type {
  AgeBand,
  Gender,
  Lesson,
  LessonResponse,
  QuestionResponse,
} from "./types";
import { illustration } from "./illustrations";

export const preview =
  process.env.CONTENT_MODE === "preview" ||
  (!process.env.CONTENT_MODE && process.env.NODE_ENV !== "production");
const aiEnabled = () =>
  process.env.AI_ENABLED === "true" &&
  !!(
    process.env.AI_GATEWAY_API_KEY ||
    process.env.VERCEL_OIDC_TOKEN ||
    process.env.VERCEL
  );
export function readiness() {
  return {
    contentMode: preview ? "preview" : "reviewed",
    aiEnabled: process.env.AI_ENABLED === "true",
    aiConfigured: aiEnabled(),
    databaseConfigured: !!(
      process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY
    ),
    quotaConfigured: !!(
      process.env.SUPABASE_URL && process.env.INTERNAL_API_TOKEN
    ),
  };
}
export const notice = preview
  ? reviewNotice
  : "النصوص والمصادر من محتوى معتمد. أي تقديم أو شرح مولّد آليًا مميّز بوسم مستقل، ولا يعني الوسم اعتماد صياغته من مراجع بشري.";

async function loadContent(
  fallback: readonly Lesson[],
): Promise<Lesson[]> {
  if (preview) return [...fallback];
  const base = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return [];
  try {
    const response = await fetch(
      `${base}/rest/v1/content_items?kind=eq.lesson&status=eq.approved&select=payload,content_hash,reviewer_name,reviewed_at`,
      {
        headers: { apikey: key },
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      },
    );
    if (!response.ok) return [];
    const data = (await response.json()) as {
      payload: Lesson;
      content_hash: string;
      reviewer_name: string;
      reviewed_at: string;
    }[];
    // Only IDs and exact payloads from the versioned, tested release can be published.
    return data.flatMap((row) => {
      if (
        !row?.payload ||
        typeof row.payload !== "object" ||
        !row.payload.review
      )
        return [];
      const original = fallback.find((item) => item.id === row.payload.id);
      if (
        !original ||
        !row.reviewer_name?.trim() ||
        !Number.isFinite(Date.parse(row.reviewed_at))
      )
        return [];
      const { review: _a, ...a } = original,
        { review: _b, ...b } = row.payload;
      if (canonicalJson(a) !== canonicalJson(b)) return [];
      if (
        createHash("sha256")
          .update(canonicalJson(row.payload))
          .digest("hex") !== row.content_hash
      )
        return [];
      return [
        {
          ...original,
          review: {
            status: "approved",
            reviewer: row.reviewer_name,
            date: row.reviewed_at,
          },
        } as Lesson,
      ];
    });
  } catch {
    return [];
  }
}
export async function getLessons() {
  return loadContent(lessons);
}
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
// Keyed by content id, age band and gender only; the child's name never reaches the server.
const explanationCache = new Map<string, Promise<Explanation>>();
async function explanationFor(
  lesson: Lesson,
  band: AgeBand,
  gender: Gender,
): Promise<Explanation> {
  const warm = warmedExplanation(lesson, band, gender);
  if (warm) return { text: warm, mode: "generated", rejections: [] };
  if (!aiEnabled())
    return { text: meaningFor(lesson, band), mode: "prepared", rejections: [] };
  const key = `${lesson.id}:${band}:${gender}`;
  let pending = explanationCache.get(key);
  if (!pending) {
    pending = generateExplanation(lesson, band, gender);
    explanationCache.set(key, pending);
    // A fallback is not cached, so a later request can try the provider again.
    void pending.then((r) => {
      if (r.mode === "prepared") explanationCache.delete(key);
    });
  }
  return pending;
}
export async function getLesson(
  id: string,
  age: number,
  gender: Gender,
): Promise<LessonResponse | null> {
  if (!validAge(age) || !["boy", "girl"].includes(gender)) return null;
  const lesson = (await getLessons()).find((item) => item.id === id);
  if (!lesson) return null;
  const result = await explanationFor(lesson, ageBand(age), gender);
  const imageUrl = preview ? await illustration(lesson, gender) : null;
  return {
    lesson,
    explanation: result.text,
    mode: result.mode,
    imageUrl,
    imageMode: imageUrl ? "generated" : "illustrated",
    reviewNotice: notice,
  };
}
export async function answerQuestion(
  id: string,
  question: string,
  age: number,
): Promise<QuestionResponse> {
  if (isCrisis(question))
    return {
      status: "crisis",
      answer:
        "تحدث الآن مع والدك أو والدتك أو شخص بالغ تثق به ليبقى معك ويساعدك. إذا كنت في خطر فاطلب منه الاتصال بالطوارئ المحلية فورًا. هذه الخدمة لا تستطيع إرسال مساعدة.",
    };
  const lesson = (await getLessons()).find((x) => x.id === id);
  if (!lesson || !validAge(age) || isRestricted(question))
    return { status: "refused", answer: childRefusal };
  const stop = new Set(["الله", "اللهم", "الذي", "التي", "عندما", "يكون"]);
  const q = normalize(question),
    asked = q.split(" "),
    words = normalize(`${lesson.situation} ${lesson.text}`)
      .split(" ")
      .filter((x) => x.length >= 4 && !stop.has(x));
  const asksMeaning = /معني|يعني|تعني|اشرح|افهم|نفهم/.test(q);
  const asksWhen = /متي (اقول|نقول|نقرا|اقرا)|وقت (هذا الذكر|هذا الدعاء)/.test(
    q,
  );
  const relevant =
    words.some((w) => asked.includes(w)) ||
    /هذا الذكر|هذا الدعاء|هذا الدرس|هذه الكلمات|هذا النص/.test(q);
  // Only two answers exist, both read from the content file: the situation and the written meaning.
  if (!relevant || (!asksMeaning && !asksWhen))
    return { status: "refused", answer: childRefusal };
  return {
    status: "answered",
    answer: asksWhen
      ? `نقول هذا الذكر في موقف: ${lesson.situation}.`
      : meaningFor(lesson, ageBand(age)),
    source: sourceLine(lesson),
  };
}
