// npm run review:explanations — prints docs/EXPLANATIONS.md: for every
// (item × age band × gender) the written meaning and the explanation that will
// be shown, side by side, to be read in one pass. Never edits an explanation.
import fs from "node:fs";
import { lessons, meaningFor } from "../packages/core/content";
import { sha256, type WarmEntry } from "../packages/core/explain";
import { checkExplanationText } from "../packages/core/safety";

const cache: WarmEntry[] = JSON.parse(
  fs.readFileSync("packages/core/data/explanations.cache.json", "utf8"),
);
const rejectedPath = "packages/core/data/explanations.rejected.json";
const rejected: { id: string; band: string; gender: string; reasons: string[] }[] =
  fs.existsSync(rejectedPath)
    ? JSON.parse(fs.readFileSync(rejectedPath, "utf8"))
    : [];
const BAND = { young: "صغير 5–8", older: "أكبر 9–12" } as const;
const GENDER = { boy: "ولد", girl: "بنت" } as const;
const findings: string[] = [];
const sections: string[] = [];

for (const lesson of lessons) {
  const rows: string[] = [];
  for (const band of ["young", "older"] as const) {
    const meaning = meaningFor(lesson, band);
    rows.push(`**المعنى (${BAND[band]}):** ${meaning}\n`);
    for (const gender of ["boy", "girl"] as const) {
      const entry = cache.find(
        (e) => e.id === lesson.id && e.band === band && e.gender === gender,
      );
      const label = `${lesson.id} · ${BAND[band]} · ${GENDER[gender]}`;
      if (!entry) {
        rows.push(`- ${GENDER[gender]}: _لم يُولَّد بعد — يُعرض المعنى كما هو._`);
        findings.push(`- ${label}: لا شرح في الكاش.`);
        continue;
      }
      rows.push(`- ${GENDER[gender]}: ${entry.explanation}`);
      if (entry.meaningSha256 !== sha256(meaning))
        findings.push(`- ${label}: المعنى تغيّر بعد التوليد؛ الشرح قديم ولن يُعرض.`);
      const reason = checkExplanationText(entry.explanation, {
        text: lesson.text,
        meaning,
      });
      if (reason) findings.push(`- ${label}: يرسب في الفحص (${reason}).`);
    }
    rows.push("");
  }
  sections.push(`## ${lesson.situation} — \`${lesson.id}\`\n\n${rows.join("\n")}`);
}
for (const r of rejected)
  findings.push(
    `- ${r.id} · ${BAND[r.band as "young"]} · ${GENDER[r.gender as "boy"]}: رُفض عند التوليد (${r.reasons.join("، ")}) ولم يُحفظ.`,
  );

const manualPath = "docs/explanations-review-notes.md";
const manual = fs.existsSync(manualPath)
  ? fs.readFileSync(manualPath, "utf8").trim()
  : "";
fs.writeFileSync(
  "docs/EXPLANATIONS.md",
  `# الشروح المولَّدة — للقراءة دفعة واحدة

يُولَّد هذا الملف بالأمر \`npm run review:explanations\` من \`packages/core/data/explanations.cache.json\` ولا يُحرَّر يدوياً، ولا يعدّل الأمر أي شرح.
النموذج استلم المعنى والفئة العمرية والجنس فقط، ولم يستلم نص الذكر ولا اسم الطفل (\`{name}\` رمز يُستبدل في المتصفح).

العدد في الكاش: ${cache.length} من ${lessons.length * 4}.

${sections.join("\n---\n\n")}
---

## ما يحتاج مراجعة

${findings.join("\n") || "- لا شيء."}
${manual ? `\n${manual}\n` : ""}`,
);
console.log(
  `docs/EXPLANATIONS.md: ${cache.length} cached, ${findings.length} findings`,
);
