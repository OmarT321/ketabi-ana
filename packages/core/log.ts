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

/** The same-child comparison returned no output twice: no verdict for these pictures. */
export function logSameChildNoOutput(pictures: number) {
  emit({ event: "same_child_no_output", pictures });
}

/** The same-child comparison's verdicts, in book order: recorded, never acted on. */
export function logSameChildVerdicts(verdicts: (boolean | null)[]) {
  emit({ event: "same_child_verdicts", verdicts });
}

/** The single write: only the typed records above reach it. */
function emit(
  record:
    | ({ event: "explanation_rejected" } & RejectionRecord)
    | { event: "image_check_failed"; kind: "child-on-white" | "scene"; failed: ImageCheckFlag[] }
    | { event: "same_child_no_output"; pictures: number }
    | { event: "same_child_verdicts"; verdicts: (boolean | null)[] },
) {
  console.warn(JSON.stringify(record));
}
