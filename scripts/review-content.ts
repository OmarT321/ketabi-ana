// npm run review:content — prints docs/CONTENT.md for the content owner and the
// scholarly reviewer. Reads the packs; never edits any field. Mechanical findings
// against docs/MEANING_RULES.md are listed at the end, followed by the manual
// notes in docs/content-review-notes.md (if present), copied as they are.
import fs from "node:fs";
import { lessons, isPlaceholder } from "../packages/core/content";
import { normalize } from "../packages/core/safety";
import type { Lesson } from "../packages/core/types";

const SCENES = ["sleep", "morning", "food", "travel", "home", "mosque", "pilgrimage"];
const POSES = ["standing", "sitting", "walking"];
const SCENE_MODES = ["generated", "composite"];
const DECLARED = { adhkar: 4, situations: 3, manasik: 1 };
const FIQH = ["يجب", "لا يجب", "يجوز", "لا يجوز", "سنه", "مكروه", "واجب", "حرام", "بدعه"];
const PROMISE_OR_THREAT = ["الجنه", "النار", "عذاب", "ثواب", "اجر", "يعاقب", "عقاب"];
const THIRD_PERSON = ["يقول المسلم", "المسلم يقول", "المسلمون", "يقول المؤمن"];

const words = (s: string) => normalize(s).split(" ").filter(Boolean);
const sentences = (s: string) =>
  s.split(/[.؟!]+/).map((x) => x.trim()).filter(Boolean).length;
const status = (l: Lesson) =>
  l.review.status === "approved"
    ? `معتمد — ${l.review.reviewer} — ${l.review.date}`
    : "غير معتمد (قيد المراجعة)";
const show = (v: string) => (isPlaceholder(v) ? "**TODO_REVIEW**" : v);

/** Runs of two or more consecutive words shared with the text. */
function sharedRuns(text: string, meaning: string) {
  const t = words(text), m = words(meaning), runs = new Set<string>();
  for (let i = 0; i < m.length; i++)
    for (let j = 0; j < t.length; j++) {
      let k = 0;
      while (m[i + k] && m[i + k] === t[j + k]) k++;
      if (k >= 2) runs.add(m.slice(i, i + k).join(" "));
    }
  return [...runs];
}

const findings: string[] = [];
const note = (id: string, rule: string, detail: string) =>
  findings.push(`- \`${id}\` — ${rule}: ${detail}`);

for (const l of lessons) {
  for (const field of ["source", "grade"] as const)
    if (isPlaceholder(l[field])) note(l.id, "حقل ناقص", `${field} = TODO_REVIEW`);
  for (const [k, v] of Object.entries(l))
    if (typeof v === "string" && !["source", "grade"].includes(k) && isPlaceholder(v))
      note(l.id, "حقل ناقص", `${k} = TODO_REVIEW`);
  if (l.review.status !== "approved") note(l.id, "المراجعة", "غير معتمد");
  for (const band of ["meaning_young", "meaning_older"] as const) {
    const m = l[band], label = band === "meaning_young" ? "المعنى الصغير" : "المعنى الأكبر";
    for (const run of sharedRuns(l.text, m))
      note(l.id, "القاعدة 1 (اقتباس)", `${label} يشترك مع النص في «${run}»`);
    const nm = ` ${normalize(m)} `;
    for (const w of FIQH) if (nm.includes(` ${w} `)) note(l.id, "القاعدة 2 (حكم)", `${label} فيه «${w}»`);
    for (const w of THIRD_PERSON) if (nm.includes(` ${w} `)) note(l.id, "القاعدة 5 (المخاطَب)", `${label} فيه «${w}»`);
    for (const w of PROMISE_OR_THREAT)
      if (nm.includes(` ${w} `)) note(l.id, "القاعدة 8 (وعد/ترهيب)", `${label} فيه «${w}» — للمراجعة البشرية`);
    const n = sentences(m);
    if (band === "meaning_young" && n !== 2) note(l.id, "القاعدة 6 (الطول)", `${label}: ${n} جملة والمطلوب جملتان`);
    if (band === "meaning_older" && (n < 2 || n > 3)) note(l.id, "القاعدة 7 (الطول)", `${label}: ${n} جملة والمطلوب جملتان أو ثلاث`);
  }
  for (const run of sharedRuns(l.text, l.question))
    note(l.id, "القاعدة 9 (السؤال عن اللفظ)", `السؤال يشترك مع النص في «${run}»`);
  if (l.hint_chips.length !== 3) note(l.id, "القاعدة 10", `عدد الرقاقات ${l.hint_chips.length} والمطلوب 3`);
  if (new Set(l.hint_chips).size !== l.hint_chips.length) note(l.id, "القاعدة 10", "رقاقات مكررة");
  if (!l.hint_chips_ready)
    note(l.id, "القاعدة 10", "الرقاقات منقولة من خيارات السؤال القديم وتنتظر رقاقات المالك؛ لا تُعرض حتى hint_chips_ready = true");
  if (!l.top_layer.image) note(l.id, "الأصول", `الطبقة العلوية لم تصل؛ يُرسم العنوان «${l.top_layer.title}» نصاً`);
  if (!SCENES.includes(l.scene)) note(l.id, "البنية", `المشهد «${l.scene}» غير موجود في scene.tsx`);
  if (!SCENE_MODES.includes(l.scene_mode)) note(l.id, "البنية", `scene_mode «${l.scene_mode}» غير معروف`);
  if (!POSES.includes(l.pose)) note(l.id, "البنية", `الوضعية «${l.pose}» خارج القائمة المقفولة`);
}
const ids = lessons.map((l) => l.id);
for (const id of ids.filter((id, i) => ids.indexOf(id) !== i)) note(id, "البنية", "معرّف مكرر");
const adhkar = lessons.filter((l) => l.pack === "adhkar");
const actual = {
  adhkar: adhkar.length,
  situations: new Set(adhkar.map((l) => l.situation)).size,
  manasik: lessons.filter((l) => l.pack === "manasik").length,
};
const scope = (Object.keys(DECLARED) as (keyof typeof DECLARED)[])
  .filter((k) => actual[k] !== DECLARED[k])
  .map((k) => `- النطاق: ${k} = ${actual[k]}، والمعلَن ${DECLARED[k]}`);

const items = lessons.map((l, i) => `## ${i + 1}. ${l.situation} — \`${l.id}\`

| الحقل | القيمة |
| --- | --- |
| الحزمة | ${l.pack} |
| الموقف | ${l.situation} |
| المصدر | ${show(l.source)} |
| الدرجة | ${show(l.grade)} |
| المشهد · نوعه · الوضعية | ${l.scene} · ${l.scene_mode} · ${l.pose} |
| حالة المراجعة | ${status(l)} |

**النص:**

> ${l.text}

**المعنى للصغير (5–8):** ${l.meaning_young}

**المعنى للأكبر (9–12):** ${l.meaning_older}

**السؤال (في الخطوة خارج الكتاب):** ${l.question}

**الرقاقات${l.hint_chips_ready ? "" : " (لا تُعرض بعد)"}:** ${l.hint_chips.join(" · ")}

**الطبقة العلوية:** ${l.top_layer.image ?? "عنوان مرسوم نصاً"} — «${l.top_layer.title}»
`);

const manualPath = "docs/content-review-notes.md";
const manual = fs.existsSync(manualPath) ? fs.readFileSync(manualPath, "utf8").trim() : "";

fs.writeFileSync(
  "docs/CONTENT.md",
  `# المحتوى — للمراجعة

يُولَّد هذا الملف بالأمر \`npm run review:content\` من \`packages/core/data/packs/*.json\` ولا يُحرَّر يدوياً. لا يعدّل الأمر أي حقل.
النصوص منقولة من منتج «حصن الطفل». قواعد المعنى في [MEANING_RULES.md](MEANING_RULES.md).

العدد: ${actual.adhkar} نصوص أذكار في ${actual.situations} مواقف · ${actual.manasik} منسك.

${items.join("\n---\n\n")}
---

## ما يحتاج مراجعة

### فحص آلي (مطابقة حرفية للقواعد، قد يشمل إنذارات لا تعني مخالفة)

${[...scope, ...findings].join("\n") || "- لا شيء."}
${manual ? `\n${manual}\n` : ""}`,
);
console.log(`docs/CONTENT.md: ${lessons.length} items, ${findings.length + scope.length} findings`);
