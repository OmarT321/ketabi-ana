import test from "node:test";
import assert from "node:assert/strict";
import { lessons, meaningFor, ageBand } from "../packages/core/content";
import { getLesson, answerQuestion } from "../packages/core/server";
import {
  buildStoryBook,
  pickSession,
  SESSION_SIZE,
} from "../packages/core/story";
import type { LessonResponse } from "../packages/core/types";

const entriesFor = async (ids: string[], age = 6) =>
  (await Promise.all(ids.map((id) => getLesson(id, age, "girl")))) as LessonResponse[];

test("a session shows three items and the next session differs", () => {
  let seed = 1;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const first = pickSession(lessons, [], random);
  assert.equal(first.length, SESSION_SIZE);
  assert.equal(new Set(first.map((l) => l.id)).size, SESSION_SIZE);
  for (let run = 0; run < 20; run++) {
    const second = pickSession(lessons, first.map((l) => l.id), random);
    assert.equal(second.length, SESSION_SIZE);
    // With four items, at least the one not shown before must appear.
    assert.ok(second.some((l) => !first.includes(l)));
  }
});

test("book has no authored narrative: items, situations and a {name} title only", async () => {
  const entries = await entriesFor(lessons.slice(0, 3).map((l) => l.id));
  const before = JSON.stringify(entries);
  const book = buildStoryBook(entries);
  assert.deepEqual(Object.keys(book).sort(), ["items", "situations", "title"]);
  assert.ok(book.title.includes("{name}"), "name stays a local placeholder");
  assert.equal(book.items.length, 3);
  assert.equal(JSON.stringify(entries), before, "never mutates records");
  for (const entry of book.items)
    assert.equal(entry.lesson.text, lessons.find((l) => l.id === entry.lesson.id)!.text);
});

test("empty, oversized and duplicate books fail closed", async () => {
  const all = await entriesFor(lessons.map((l) => l.id));
  for (const entries of [[], all, [all[0], all[0]]])
    assert.throws(() => buildStoryBook(entries));
});

test("questions are answered only from the content file, refused otherwise", async () => {
  for (const lesson of lessons) {
    for (const age of [6, 11]) {
      const meaning = await answerQuestion(lesson.id, "ما معنى هذا الذكر؟", age);
      assert.equal(meaning.status, "answered");
      assert.equal(meaning.answer, meaningFor(lesson, ageBand(age)));
      const when = await answerQuestion(lesson.id, "متى أقول هذا الذكر؟", age);
      assert.equal(when.answer, `نقول هذا الذكر في موقف: ${lesson.situation}.`);
    }
    for (const q of [
      "كيف أقول هذا الذكر بالإنجليزية؟",
      "ما عاصمة فرنسا؟",
      "هل يجوز أن آكل بيدي اليسرى؟",
      "ما ثواب هذا الذكر؟",
    ])
      assert.equal((await answerQuestion(lesson.id, q, 6)).status, "refused", q);
  }
});

test("asking about words of the text is not mistaken for a crisis", async () => {
  const waking = lessons.find((l) => l.id === "adhkar-waking")!;
  assert.equal(
    (await answerQuestion(waking.id, "ما معنى أحيانا بعدما أماتنا؟", 6)).status,
    "answered",
  );
  assert.equal(
    (await answerQuestion(waking.id, "ما معنى أماتنا وأنا ودي أموت؟", 6)).status,
    "crisis",
  );
});
