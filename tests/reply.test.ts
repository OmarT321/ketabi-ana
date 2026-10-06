import test from "node:test";
import assert from "node:assert/strict";
import { lessons, meaningFor, STEP_QUESTION } from "../packages/core/content";
import { checkExplanationText } from "../packages/core/safety";
import { getLesson, resolveReply } from "../packages/core/server";
import { maskName } from "../packages/core/story";
import { warmedExplanation, type ExplainDeps, type JudgeInput, type RewriteInput } from "../packages/core/explain";
import type { ChildReply, Lesson } from "../packages/core/types";

const waking = lessons.find((l) => l.id === "adhkar-waking")!;
const older = meaningFor(waking, "older");
// Without a usable reply the book shows the base explanation: the warmed one
// when packages/core/data/explanations.cache.json has it, else the meaning as written.
const base = warmedExplanation(waking, "older", "boy") ?? older;
const NEAR = "لأن الله أعطانا يوماً جديداً";
const FAR = "لأن السرير مريح";
const AFFIRMED = `صدقت يا {name}، ${older}`;
const COMPLETED = `ليس السبب السرير يا {name}. ${older}`;
const pass = { addsMeaning: false, omitsMeaning: false, quotesOrRules: false };

/** Simulated provider: the base explanation for calls without a reply, and the
 * given text for calls with one. Records everything the model would receive. */
function fake(personal: unknown[] = []) {
  const rewrites: RewriteInput[] = [];
  const judged: JudgeInput[] = [];
  const deps: ExplainDeps = {
    async rewrite(input) {
      rewrites.push(input);
      if (!input.childReply) return { explanation: meaningFor(waking, input.ageBand) };
      return personal.shift();
    },
    async judge(input) {
      judged.push(input);
      return pass;
    },
  };
  return { deps, rewrites, judged };
}
async function withAi<T>(run: () => Promise<T>) {
  const saved = { AI_ENABLED: process.env.AI_ENABLED, AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY };
  process.env.AI_ENABLED = "true";
  process.env.AI_GATEWAY_API_KEY = "test-placeholder";
  const warnings: string[] = [];
  const warn = console.warn;
  console.warn = (line: string) => warnings.push(line);
  try {
    return { result: await run(), warnings };
  } finally {
    console.warn = warn;
    for (const [k, v] of Object.entries(saved))
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
  }
}
const ask = (reply: ChildReply, deps: ExplainDeps, age = 10) =>
  getLesson(waking.id, age, "boy", reply, deps);
const personalCalls = (rewrites: RewriteInput[]) => rewrites.filter((r) => r.childReply);

test("no reply: the base explanation, and nothing personal reaches the model", async () => {
  const { deps, rewrites } = fake();
  const { result } = await withAi(() => ask({ kind: "none" }, deps));
  assert.equal(result?.explanation, base);
  assert.equal(personalCalls(rewrites).length, 0);
});

test("«ما أعرف» or skip: the base explanation, exactly as without a reply", async () => {
  const { deps, rewrites } = fake();
  const { result } = await withAi(() => ask({ kind: "none" }, deps));
  const { result: without } = await withAi(() => getLesson(waking.id, 10, "boy", undefined, deps));
  assert.equal(result?.explanation, without?.explanation);
  assert.equal(personalCalls(rewrites).length, 0);
});

test("a near reply: the model gets the question and the reply, and the explanation builds on it", async () => {
  const { deps, rewrites, judged } = fake([{ explanation: AFFIRMED }]);
  const { result } = await withAi(() => ask({ kind: "text", text: NEAR }, deps));
  assert.equal(result?.explanation, AFFIRMED);
  assert.equal(result?.mode, "generated");
  const [sent] = personalCalls(rewrites);
  assert.equal(sent.question, STEP_QUESTION.older);
  assert.equal(sent.childReply, NEAR);
  assert.equal(sent.meaning, older);
  assert.equal(judged.at(-1)?.childReply, NEAR, "the judge sees the reply too");
});

test("a far reply: handled without a harsh correction, through the same checks", async () => {
  const { deps, rewrites } = fake([{ explanation: COMPLETED }]);
  const { result } = await withAi(() => ask({ kind: "text", text: FAR }, deps));
  assert.equal(result?.explanation, COMPLETED);
  assert.equal(personalCalls(rewrites)[0].childReply, FAR);
});

test("the dhikr text is never sent with a reply", async () => {
  const { deps, rewrites, judged } = fake([{ explanation: AFFIRMED }]);
  await withAi(() => ask({ kind: "text", text: NEAR }, deps));
  const sent = JSON.stringify([rewrites, judged]);
  assert.ok(!sent.includes(waking.text));
  for (const word of ["أحيانا", "أماتنا", "النشور"]) assert.ok(!sent.includes(word), word);
});

test("the reply never appears in what the book receives", async () => {
  const { deps } = fake([{ explanation: AFFIRMED }]);
  const { result } = await withAi(() => ask({ kind: "text", text: NEAR }, deps));
  const response = JSON.stringify(result);
  assert.ok(!response.includes(NEAR), "the reply is not returned");
  assert.ok(!("reply" in (result ?? {})));
});

test("the reply is kept nowhere: not cached, not logged", async () => {
  const { deps } = fake([
    { explanation: "قال النبي إن هذا مهم يا {name}." },
    { explanation: "وهذا واجب عليك يا {name} كل صباح." },
  ]);
  const secret = "لأن جارنا أحمد قال لي ذلك";
  const { result, warnings } = await withAi(() => ask({ kind: "text", text: secret }, deps));
  assert.equal(result?.explanation, base, "rejected twice: the base explanation");
  assert.equal(warnings.length, 2, "both rejections logged");
  for (const line of warnings) assert.ok(!line.includes(secret) && !line.includes("جارنا"), "no reply text logged");
  // A later request without a reply never sees the personalized text.
  const { deps: plain } = fake();
  const { result: later } = await withAi(() => ask({ kind: "none" }, plain));
  assert.equal(later?.explanation, base);
});

test("a broken schema from the model falls back to the base explanation", async () => {
  for (const bad of [{ explanation: AFFIRMED, extra: 1 }, { text: AFFIRMED }, "plain text", null]) {
    const { deps } = fake([bad, bad]);
    const { result } = await withAi(() => ask({ kind: "text", text: NEAR }, deps));
    assert.equal(result?.explanation, base);
  }
});

test("a provider failure with a reply falls back to the base explanation", async () => {
  const { deps } = fake([new Error("503")]);
  const failing: ExplainDeps = {
    ...deps,
    async rewrite(input, signal) {
      if (input.childReply) throw new Error("503");
      return deps.rewrite(input, signal);
    },
  };
  const { result } = await withAi(() => ask({ kind: "text", text: NEAR }, failing));
  assert.equal(result?.explanation, base);
});

test("a crisis reply never leaves the server, and the crisis message is returned", async () => {
  const { deps, rewrites } = fake([{ explanation: AFFIRMED }]);
  const { result } = await withAi(() => ask({ kind: "text", text: "أريد أن أؤذي نفسي" }, deps));
  assert.equal(personalCalls(rewrites).length, 0);
  assert.ok(result?.replyCrisis && result.replyCrisis.length > 20);
  assert.equal(result?.explanation, base);
});

test("a restricted reply is treated as no reply", () => {
  assert.equal(resolveReply(waking, "older", { kind: "text", text: "هل يجوز أن أنام بدون ذكر؟" }), null);
});

test("typed replies are accepted from every age", () => {
  assert.deepEqual(resolveReply(waking, "young", { kind: "text", text: NEAR }), { text: NEAR });
  assert.deepEqual(resolveReply(waking, "older", { kind: "text", text: NEAR }), { text: NEAR });
});

test("chips are used only once the owner's chips are marked ready", () => {
  assert.equal(waking.hint_chips_ready, false);
  assert.equal(resolveReply(waking, "young", { kind: "chip", index: 0 }), null);
  const ready: Lesson = { ...waking, hint_chips_ready: true };
  assert.deepEqual(resolveReply(ready, "young", { kind: "chip", index: 1 }), { text: waking.hint_chips[1] });
  assert.equal(resolveReply(ready, "young", { kind: "chip", index: 5 }), null);
});

test("the length limit rises by exactly the reply's word count, nothing else", () => {
  const meaning = "تشكر الله حين تستيقظ";
  const limit = Math.floor(4 * 1.6 + 8);
  const words = (n: number) => Array.from({ length: n }, () => "كلمة").join(" ");
  const ctx = { text: waking.text, meaning };
  assert.equal(checkExplanationText(words(limit), ctx), null);
  assert.equal(checkExplanationText(words(limit + 1), ctx), "addition");
  assert.equal(checkExplanationText(words(limit + 3), { ...ctx, replyWords: 3 }), null);
  assert.equal(checkExplanationText(words(limit + 4), { ...ctx, replyWords: 3 }), "addition");
});

test("the child's name is masked in a typed reply before it is sent", () => {
  assert.equal(maskName("أنا لارا وأحب الصباح", "لارا"), "أنا {name} وأحب الصباح");
  assert.equal(maskName("أحب الصباح", ""), "أحب الصباح");
});
