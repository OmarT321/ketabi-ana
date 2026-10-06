import test from "node:test";
import { warmedExplanation } from "../packages/core/explain";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lessons, isApproved } from "../packages/core/content";
process.env.CONTENT_MODE = "reviewed";
process.env.AI_ENABLED = "false";
const { getLessons, getLesson, answerQuestion, canonicalJson, readiness } =
  await import("../packages/core/server");
test("reviewed release fails closed when no reviewed database is configured", async () => {
  assert.deepEqual(await getLessons(), []);
  assert.equal(await getLesson(lessons[0].id, 6, "boy"), null);
});
test("crisis support remains available in a closed release", async () =>
  assert.equal(
    (await answerQuestion(lessons[0].id, "نفسي أموت", 8)).status,
    "crisis",
  ));
test("reviewed loader checks hashes and accepts reordered JSONB keys", async () => {
  const originalFetch = globalThis.fetch;
  process.env.SUPABASE_URL = "https://test.invalid";
  process.env.SUPABASE_PUBLISHABLE_KEY = "test-key";
  const payload = Object.fromEntries(Object.entries(lessons[0]).reverse());
  const row = {
    payload,
    content_hash: createHash("sha256")
      .update(canonicalJson(payload))
      .digest("hex"),
    reviewer_name: "Fixture only",
    reviewed_at: "2026-10-01T00:00:00Z",
  };
  try {
    globalThis.fetch = async () => Response.json([row]);
    const result = await getLessons();
    assert.equal(result.length, 1);
    assert.equal(result[0].text, lessons[0].text);
    assert.equal(result[0].review.status, "approved");
    globalThis.fetch = async () =>
      Response.json([{ ...row, content_hash: "altered" }]);
    assert.deepEqual(await getLessons(), []);
    globalThis.fetch = async () =>
      Response.json([
        { ...row, payload: { ...payload, text: "altered" } },
      ]);
    assert.deepEqual(await getLessons(), []);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
  }
});
test("health readiness agrees with reviewed runtime", () => {
  assert.equal(readiness().contentMode, "reviewed");
  assert.equal(readiness().aiConfigured, false);
  assert.equal(readiness().databaseConfigured, false);
});

test("an approved item drops the review badge and shows its approved meaning", async () => {
  const originalFetch = globalThis.fetch;
  process.env.SUPABASE_URL = "https://test.invalid";
  process.env.SUPABASE_PUBLISHABLE_KEY = "test-key";
  const payload = lessons[0];
  try {
    globalThis.fetch = async () =>
      Response.json([
        {
          payload,
          content_hash: createHash("sha256")
            .update(canonicalJson(payload))
            .digest("hex"),
          reviewer_name: "Fixture only",
          reviewed_at: "2026-10-02T00:00:00Z",
        },
      ]);
    const result = await getLesson(payload.id, 6, "boy");
    assert.equal(result?.lesson.review.status, "approved");
    assert.ok(result && isApproved(result.lesson));
    assert.equal(
      result?.explanation,
      warmedExplanation(result!.lesson, "young", "boy") ?? payload.meaning_young,
    );
    assert.equal(isApproved(lessons[0]), false, "the packaged file stays pending");
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
  }
});
