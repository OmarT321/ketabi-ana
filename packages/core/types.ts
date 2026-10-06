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
  readonly question: string;
  readonly options: readonly string[];
  readonly answer: number;
  readonly pose: Pose;
  readonly scene: SceneName;
  readonly scene_mode: SceneMode;
  readonly review: Review;
};
export type LessonResponse = {
  lesson: Lesson;
  explanation: string;
  mode: "generated" | "prepared";
  imageUrl: string | null;
  imageMode: "generated" | "illustrated";
  reviewNotice: string;
};
export type QuestionResponse = {
  status: "answered" | "refused" | "crisis";
  answer: string;
  source?: string;
};
