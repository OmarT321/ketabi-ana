import test from "node:test";
import assert from "node:assert/strict";
import { lessons, meaningFor } from "../packages/core/content";
import { checkExplanationText } from "../packages/core/safety";
import {
  generateExplanation,
  warmedExplanation,
  sha256,
  type WarmEntry,
  SchemaMismatch,
  type ExplainDeps,
  type JudgeInput,
  type RewriteInput,
} from "../packages/core/explain";

const waking = lessons.find((l) => l.id === "adhkar-waking")!;
const ctx = { text: waking.text, meaning: waking.meaning_young };
const good =
  "حين تستيقظين من النوم يا {name}، تشكرين الله. كنتِ نائمة لا تعرفين شيئاً عن الدنيا، ثم فتحتِ عينيكِ من جديد، وهذه نعمة من الله.";
const pass = { addsMeaning: false, omitsMeaning: false, quotesOrRules: false };

// ── 2.3 / 2.4: one test per rejection case of the text check ────────────────
test("a faithful rephrasing passes, and every written meaning passes as is", () => {
  assert.equal(checkExplanationText(good, ctx), null);
  for (const lesson of lessons)
    for (const band of ["young", "older"] as const)
      assert.equal(
        checkExplanationText(meaningFor(lesson, band), {
          text: lesson.text,
          meaning: meaningFor(lesson, band),
        }),
        null,
        `${lesson.id}/${band}`,
      );
});
test("rejects overlap with any part of the dhikr text", () => {
  assert.equal(
    checkExplanationText("حين تستيقظ تقول الحمد لله الذي أحيانا، وهذه نعمة.", ctx),
    "text_overlap",
  );
  assert.equal(
    checkExplanationText("تشكر الله لأنه أحيانا بعدما أماتنا في النوم.", ctx),
    "text_overlap",
  );
  // Diacritics do not hide an overlap.
  assert.equal(
    checkExplanationText("تقول: وَإِلَيْهِ النُّشُورُ حين تصحو من نومك.", ctx),
    "text_overlap",
  );
});
for (const word of ["يجوز", "لا يجوز", "حرام", "واجب", "سنة", "مكروه", "بدعة"])
  test(`rejects the ruling word «${word}»`, () => {
    assert.equal(
      checkExplanationText(`حين تستيقظ تشكر الله، وهذا ${word} عليك يا {name}.`, ctx),
      "ruling",
    );
  });
test("rejects ruling words with attached prefixes", () => {
  assert.equal(
    checkExplanationText("حين تستيقظ تشكر الله، والواجب أن تفعل ذلك دائماً.", ctx),
    "ruling",
  );
});
test("rejects quotation marks and quoting phrases", () => {
  for (const candidate of [
    "حين تستيقظ تقول «شكراً يا رب» لأنك فتحت عينيك.",
    'حين تستيقظ تقول "شكراً" لأنك فتحت عينيك من جديد.',
    "قال النبي إن الاستيقاظ نعمة، فتشكر الله حين تصحو.",
    "في الحديث أن الشكر عند الاستيقاظ نعمة من الله.",
    "تشكر الله حين تستيقظ كما في القرآن الكريم ﴿ ﴾.",
  ])
    assert.equal(checkExplanationText(candidate, ctx), "quotation", candidate);
});
test("rejects added content that makes the explanation much longer than the meaning", () => {
  const padded = `${good} ${"وتتذكر أن الشكر يجعل يومك أجمل وأهدأ من كل يوم ".repeat(3)}`;
  assert.equal(checkExplanationText(padded, ctx), "addition");
});
test("rejects promise or threat words that are not in the written meaning", () => {
  for (const word of ["الجنة", "النار", "ثواب", "أجر", "عذاب"])
    assert.equal(
      checkExplanationText(`حين تستيقظ تشكر الله فيكون لك ${word} يا {name}.`, ctx),
      "addition",
      word,
    );
});
test("rejects empty or oversized output", () => {
  assert.equal(checkExplanationText("{name}", ctx), "length");
  assert.equal(checkExplanationText("ا".repeat(800), ctx), "length");
});

// ── Generation with simulated providers ─────────────────────────────────────
function fake(outputs: unknown[], verdicts: unknown[] = []) {
  const rewrites: RewriteInput[] = [];
  const judged: JudgeInput[] = [];
  const deps: ExplainDeps = {
    async rewrite(input) {
      rewrites.push(input);
      const next = outputs.shift();
      if (next instanceof Error) throw next;
      return next;
    },
    async judge(input) {
      judged.push(input);
      return verdicts.shift() ?? pass;
    },
  };
  return { deps, rewrites, judged };
}
function captureLogs() {
  const lines: string[] = [];
  const original = console.warn;
  console.warn = (line: string) => lines.push(line);
  return { lines, restore: () => (console.warn = original) };
}

test("the model receives only the meaning, the age band, the gender and the {name} token", async () => {
  const { deps, rewrites, judged } = fake([{ explanation: good }]);
  const result = await generateExplanation(waking, "young", "girl", deps);
  assert.equal(result.mode, "generated");
  assert.equal(result.text, good);
  assert.deepEqual(rewrites, [
    { meaning: waking.meaning_young, ageBand: "young", gender: "girl", nameToken: "{name}" },
  ]);
  const sent = JSON.stringify([rewrites, judged]);
  assert.ok(!sent.includes(waking.text), "dhikr text never sent");
  assert.ok(!sent.includes("أحيانا"), "no part of the dhikr text sent");
});
test("output outside the closed schema {explanation} is rejected", async () => {
  for (const bad of [
    { explanation: good, note: "extra" },
    { text: good },
    { explanation: 42 },
    "plain text",
    null,
  ]) {
    const logs = captureLogs();
    const { deps } = fake([bad, bad]);
    const result = await generateExplanation(waking, "young", "boy", deps);
    logs.restore();
    assert.equal(result.mode, "prepared");
    assert.equal(result.text, waking.meaning_young);
    assert.deepEqual(result.rejections, ["schema", "schema"]);
  }
  const logs = captureLogs();
  const { deps } = fake([new SchemaMismatch(), new SchemaMismatch()]);
  assert.deepEqual(
    (await generateExplanation(waking, "young", "boy", deps)).rejections,
    ["schema", "schema"],
  );
  logs.restore();
});
test("a rejection is retried once and a passing retry is used", async () => {
  const logs = captureLogs();
  const { deps, rewrites } = fake([
    { explanation: "وهذا واجب عليك حين تستيقظ يا {name} كل صباح." },
    { explanation: good },
  ]);
  const result = await generateExplanation(waking, "young", "girl", deps);
  logs.restore();
  assert.equal(rewrites.length, 2);
  assert.equal(result.mode, "generated");
  assert.deepEqual(result.rejections, ["ruling"]);
  assert.equal(logs.lines.length, 1);
});
test("two rejections show the meaning as written and log without the child's name", async () => {
  const logs = captureLogs();
  const { deps, rewrites } = fake([
    { explanation: "قال النبي إن هذا مهم حين تستيقظ يا {name}." },
    { explanation: "تقول الحمد لله الذي أحيانا يا {name} كل يوم." },
    { explanation: good },
  ]);
  const result = await generateExplanation(waking, "older", "boy", deps);
  logs.restore();
  assert.equal(rewrites.length, 2, "only one retry");
  assert.equal(result.mode, "prepared");
  assert.equal(result.text, waking.meaning_older);
  assert.deepEqual(result.rejections, ["quotation", "text_overlap"]);
  assert.equal(logs.lines.length, 2);
  for (const line of logs.lines) {
    const record = JSON.parse(line);
    assert.deepEqual(Object.keys(record).sort(), [
      "attempt",
      "band",
      "event",
      "gender",
      "id",
      "reason",
    ]);
    assert.ok(!line.includes("{name}") && !line.includes("يا "), "no text logged");
  }
});
test("the judge rejects added or omitted meaning", async () => {
  const logs = captureLogs();
  for (const [verdict, reason] of [
    [{ ...pass, addsMeaning: true }, "addition"],
    [{ ...pass, omitsMeaning: true }, "omission"],
    [{ ...pass, quotesOrRules: true }, "quotation"],
    [{ addsMeaning: false }, "schema"],
  ] as const) {
    const { deps } = fake([{ explanation: good }, { explanation: good }], [verdict, verdict]);
    const result = await generateExplanation(waking, "young", "girl", deps);
    assert.equal(result.mode, "prepared");
    assert.deepEqual(result.rejections, [reason, reason]);
  }
  logs.restore();
});
test("provider failure or timeout shows the meaning without retrying", async () => {
  const { deps, rewrites } = fake([new Error("503"), { explanation: good }]);
  const failed = await generateExplanation(waking, "young", "boy", deps);
  assert.equal(failed.mode, "prepared");
  assert.equal(failed.text, waking.meaning_young);
  assert.equal(rewrites.length, 1);
  const slow: ExplainDeps = {
    rewrite: (_input, signal) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason)),
      ),
    judge: async () => pass,
  };
  const started = Date.now();
  const timedOut = await generateExplanation(waking, "young", "boy", slow, 50);
  assert.equal(timedOut.mode, "prepared");
  assert.ok(Date.now() - started < 2000);
});

test("pre-generated explanations are keyed by id, age band and gender, and dropped when the meaning changes", () => {
  const entry = (over: Partial<WarmEntry>): WarmEntry => ({
    id: waking.id,
    band: "young",
    gender: "girl",
    meaningSha256: sha256(waking.meaning_young),
    explanation: good,
    model: "test",
    generatedAt: "2026-10-04T00:00:00Z",
    ...over,
  });
  assert.equal(warmedExplanation(waking, "young", "girl", [entry({})]), good);
  assert.equal(warmedExplanation(waking, "young", "boy", [entry({})]), null);
  assert.equal(warmedExplanation(waking, "older", "girl", [entry({})]), null);
  assert.equal(
    warmedExplanation(waking, "young", "girl", [entry({ meaningSha256: sha256("old meaning") })]),
    null,
  );
  assert.equal(
    warmedExplanation(waking, "young", "girl", [
      entry({ explanation: "تقول الحمد لله الذي أحيانا كل صباح يا {name}." }),
    ]),
    null,
    "a cached entry that fails the check is never shown",
  );
});
