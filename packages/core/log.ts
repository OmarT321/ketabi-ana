import type { ExplanationRejection } from "./safety";
import type { AgeBand, Gender } from "./types";

/** The application's server logs. Their record types have no free-text field,
 * so neither a child's name nor any generated text can be written. */
export type RejectionRecord = {
  id: string;
  band: AgeBand;
  gender: Gender;
  reason: ExplanationRejection;
  attempt: number;
};
export function logExplanationRejection(record: RejectionRecord) {
  const { id, band, gender, reason, attempt } = record;
  emit({ event: "explanation_rejected", id, band, gender, reason, attempt });
}

/** A picture that failed the yes/no check: which of the fixed questions failed. */
export type ImageCheckFlag =
  | "faceFullyVisible"
  | "hairShowing"
  | "writingOrLetters"
  | "clothingCoversArmsAndLegs"
  | "fullBodyVisible"
  | "fiveFingersEachHand"
  | "anotherPerson"
  | "sacredPlace";
export function logImageCheckFailure(kind: "child-on-white" | "scene", failed: ImageCheckFlag[]) {
  emit({ event: "image_check_failed", kind, failed });
}

/** The single write: only the typed records above reach it. */
function emit(
  record:
    | ({ event: "explanation_rejected" } & RejectionRecord)
    | { event: "image_check_failed"; kind: "child-on-white" | "scene"; failed: ImageCheckFlag[] },
) {
  console.warn(JSON.stringify(record));
}
