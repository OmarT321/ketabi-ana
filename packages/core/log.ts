import type { ExplanationRejection } from "./safety";
import type { AgeBand, Gender } from "./types";

/** The only server log in the application. Its record type has no free-text
 * field, so neither a child's name nor any generated text can be written. */
export type RejectionRecord = {
  id: string;
  band: AgeBand;
  gender: Gender;
  reason: ExplanationRejection;
  attempt: number;
};
export function logExplanationRejection(record: RejectionRecord) {
  const { id, band, gender, reason, attempt } = record;
  console.warn(
    JSON.stringify({
      event: "explanation_rejected",
      id,
      band,
      gender,
      reason,
      attempt,
    }),
  );
}
