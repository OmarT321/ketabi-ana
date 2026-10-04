// npm run content:hashes — records the sha256 of each item's text after a
// deliberate, reviewed change to data/packs/*.json. verify:content then fails on
// any later drift. Run only when the content owner has sent new text.
import fs from "node:fs";
import { createHash } from "node:crypto";
import { lessons } from "../packages/core/content";

const today = new Date().toISOString().slice(0, 10);
const previous: { id: string; sha256: string; recorded: string }[] = JSON.parse(
  fs.readFileSync("packages/core/data/lesson-hashes.json", "utf8"),
);
const records = lessons.map((lesson) => {
  const sha256 = createHash("sha256").update(lesson.text).digest("hex");
  const old = previous.find((p) => p.id === lesson.id && p.sha256 === sha256);
  return {
    id: lesson.id,
    sha256,
    origin: "حصن الطفل",
    recorded: old?.recorded ?? today,
  };
});
fs.writeFileSync(
  "packages/core/data/lesson-hashes.json",
  `${JSON.stringify(records, null, 2)}\n`,
);
console.log(`recorded ${records.length} fingerprints`);
