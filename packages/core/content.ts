import adhkarPack from "./data/packs/adhkar.json";
import manasikPack from "./data/packs/manasik.json";
import { TODO_REVIEW, type AgeBand, type Lesson } from "./types";
import { COPY } from "../../apps/qindeel/lib/copy";

// Content is data authored outside the code. Freeze it so nothing at runtime can edit it.
const freeze = (item: Lesson): Lesson =>
  Object.freeze({
    ...item,
    hint_chips: Object.freeze([...item.hint_chips]),
    top_layer: Object.freeze({ ...item.top_layer }),
    review: Object.freeze({ ...item.review }),
  });
export const packs = {
  adhkar: (adhkarPack as Lesson[]).map(freeze),
  manasik: (manasikPack as Lesson[]).map(freeze),
};
export const lessons: readonly Lesson[] = Object.freeze([
  ...packs.adhkar,
  ...packs.manasik,
]);

export const MIN_AGE = 5;
export const MAX_AGE = 12;
export const validAge = (age: number) =>
  Number.isInteger(age) && age >= MIN_AGE && age <= MAX_AGE;
/** 5–8 young, 9–12 older. */
export const ageBand = (age: number): AgeBand => (age <= 8 ? "young" : "older");
export const meaningFor = (lesson: Lesson, band: AgeBand) =>
  band === "young" ? lesson.meaning_young : lesson.meaning_older;

/** The question step's wording is fixed per age band (owner's decision). */
export const STEP_QUESTION: Record<AgeBand, string> = COPY.step.question;
/** Ready replies shown in the step: none until the owner's chips arrive. */
export const hintChipsFor = (lesson: Lesson) =>
  lesson.hint_chips_ready ? lesson.hint_chips : [];
/** Typed replies are offered to the older band only. */
export const MAX_REPLY_LENGTH = 200;

export const isPlaceholder = (value: string) => value === TODO_REVIEW;
export const SOURCE_PENDING = COPY.review.sourcePending;
/** Source line as shown to readers; never invents a source. */
export function sourceLine(lesson: Lesson) {
  if (isPlaceholder(lesson.source)) return SOURCE_PENDING;
  return isPlaceholder(lesson.grade)
    ? lesson.source
    : `${lesson.source} · ${lesson.grade}`;
}
export const isApproved = (lesson: Lesson) => lesson.review.status === "approved";

export const reviewNotice = COPY.review.noticePreview;
