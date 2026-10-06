import type { Lesson, LessonResponse } from "./types";
import { COPY } from "../../apps/qindeel/lib/copy";

/** Book structure only: cover, one pair of pages per item, closing page.
 * No authored narrative. The {name} token is replaced in the browser and never
 * sent to the server. */
export type StoryBook = {
  title: string;
  items: LessonResponse[];
  situations: string[];
};

/** Items shown in one session. */
export const SESSION_SIZE = 3;

/** Picks up to SESSION_SIZE items, preferring ones not shown in the previous
 * session (kept in page memory only), so two sessions differ when possible. */
export function pickSession(
  available: readonly Lesson[],
  previous: readonly string[] = [],
  random: () => number = Math.random,
): Lesson[] {
  const shuffle = (list: Lesson[]) =>
    list
      .map((item) => ({ item, key: random() }))
      .sort((a, b) => a.key - b.key)
      .map(({ item }) => item);
  const fresh = shuffle(available.filter((l) => !previous.includes(l.id)));
  const seen = shuffle(available.filter((l) => previous.includes(l.id)));
  const chosen = [...fresh, ...seen].slice(0, SESSION_SIZE);
  // Keep the content file's order inside the session.
  return available.filter((l) => chosen.includes(l));
}

export function buildStoryBook(entries: LessonResponse[]): StoryBook {
  const ids = entries.map((e) => e.lesson.id);
  if (
    entries.length === 0 ||
    entries.length > SESSION_SIZE ||
    new Set(ids).size !== ids.length
  )
    throw new Error("A book needs one to three distinct items.");
  return {
    title: COPY.book.title,
    items: entries,
    situations: [...new Set(entries.map((e) => e.lesson.situation))],
  };
}

/** The child's name never leaves the browser, even inside a typed reply. */
export function maskName(text: string, name: string) {
  const trimmed = name.trim();
  return trimmed.length >= 2 ? text.split(trimmed).join("{name}") : text;
}
