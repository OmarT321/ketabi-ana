export type Review = {
  status: "pending" | "approved";
  reviewer: string | null;
  date: string | null;
};
/** Placeholder for any field the content owner has not supplied yet. */
export const TODO_REVIEW = "TODO_REVIEW";
export type AgeBand = "young" | "older";
export type Gender = "boy" | "girl";
export type Pose = "standing" | "sitting" | "walking";
/** generated: the whole scene is generated with the child in it.
 * composite: a sacred place — never generated and never sent to any model; an
 * approved ready background with the child generated alone and composited on it. */
export type SceneMode = "generated" | "composite";
export type SceneName =
  | "sleep"
  | "morning"
  | "food"
  | "travel"
  | "home"
  | "mosque"
  | "pilgrimage";
/** One content item, exactly as authored in data/packs/*.json.
 * text, source, grade and meaning_* are read-only: code displays them, never edits them. */
export type Lesson = {
  readonly id: string;
  readonly pack: "adhkar" | "manasik";
  readonly situation: string;
  readonly text: string;
  readonly source: string;
  readonly grade: string;
  readonly meaning_young: string;
  readonly meaning_older: string;
  /** Asked in the question step, outside the book. */
  readonly question: string;
  /** Three ready replies in the child's words; none is right or wrong. Shown
   * only once hint_chips_ready is true (rules 9 and 10 of MEANING_RULES). */
  readonly hint_chips: readonly string[];
  readonly hint_chips_ready: boolean;
  readonly pose: Pose;
  readonly scene: SceneName;
  readonly scene_mode: SceneMode;
  /** Page header art. image: a file in public/book, or null until it arrives;
   * the title is then drawn as text in the same place. */
  readonly top_layer: { readonly image: string | null; readonly title: string };
  /** Owner's dua layer for the text page (logo, title and the dhikr drawn), a
   * file in public/book, shown as is above everything; or null until a layer
   * whose drawn text matches `text` is confirmed. `text` stays the source of
   * truth for checks, text printing and screen readers. */
  readonly dua_layer: string | null;
  readonly review: Review;
};
export type LessonResponse = {
  lesson: Lesson;
  explanation: string;
  mode: "generated" | "prepared";
  imageUrl: string | null;
  imageMode: "generated" | "illustrated";
  reviewNotice: string;
  /** Set when the child's typed reply failed the crisis check. The reply never
   * left the server; the page shows the crisis message outside the book. */
  replyCrisis?: string;
};
/** The child's reply in the question step. Used for one request, then forgotten. */
export type ChildReply =
  | { kind: "none" }
  | { kind: "chip"; index: number }
  | { kind: "text"; text: string };
export type QuestionResponse = {
  status: "answered" | "refused" | "crisis";
  answer: string;
  source?: string;
};
