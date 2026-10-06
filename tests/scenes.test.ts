import test from "node:test";
import assert from "node:assert/strict";
import { lessons } from "../packages/core/content";
import {
  illustration,
  mayGenerateScene,
  type SceneGenerator,
} from "../packages/core/illustrations";
import type { Lesson } from "../packages/core/types";

function withImagesEnabled<T>(run: () => Promise<T>) {
  const saved = {
    AI_ENABLED: process.env.AI_ENABLED,
    AI_IMAGES_ENABLED: process.env.AI_IMAGES_ENABLED,
  };
  process.env.AI_ENABLED = "true";
  process.env.AI_IMAGES_ENABLED = "true";
  return run().finally(() => {
    for (const [k, v] of Object.entries(saved))
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
  });
}
function spy() {
  const seen: Lesson[] = [];
  const generate: SceneGenerator = async (lesson) => {
    seen.push(lesson);
    return null;
  };
  return { seen, generate };
}

test("every item declares a valid scene_mode", () => {
  for (const lesson of lessons)
    assert.ok(["generated", "composite"].includes(lesson.scene_mode), lesson.id);
});

test("a scene_mode=composite item never reaches the scene generation model", async () => {
  const composite: Lesson = {
    ...lessons[0],
    id: "test-composite",
    scene_mode: "composite",
  };
  assert.equal(mayGenerateScene(composite), false);
  const { seen, generate } = spy();
  await withImagesEnabled(async () => {
    assert.equal(await illustration(composite, "boy", generate), null);
    assert.equal(await illustration(composite, "girl", generate), null);
  });
  assert.equal(seen.length, 0, "composite item was passed to the scene model");
});

test("a sacred-place scene never reaches the model even if marked generated", async () => {
  const sacred: Lesson = { ...lessons[0], id: "test-sacred", scene: "pilgrimage" };
  const { seen, generate } = spy();
  await withImagesEnabled(() => illustration(sacred, "girl", generate));
  assert.equal(seen.length, 0);
});

test("a scene_mode=generated item does reach the scene model (the spy works)", async () => {
  const ordinary: Lesson = { ...lessons[0], id: "test-generated" };
  const { seen, generate } = spy();
  await withImagesEnabled(() => illustration(ordinary, "boy", generate));
  assert.equal(seen.length, 1);
  assert.equal(seen[0].scene_mode, "generated");
});

test("nothing reaches the scene model while images are disabled", async () => {
  const { seen, generate } = spy();
  for (const lesson of lessons) await illustration(lesson, "boy", generate);
  assert.equal(seen.length, 0);
});
