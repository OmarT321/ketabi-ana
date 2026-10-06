import test from "node:test";
import assert from "node:assert/strict";
import { lessons } from "../packages/core/content";
import {
  illustrateBook,
  mayGenerateScene,
  outfitPreset,
  ONE_PERSON,
  POSE_PRESET,
  critical,
  SCENE_NEGATIVE,
  SCENE_POSE,
  STYLE,
  type ImageDeps,
} from "../packages/core/illustrations";
import { getBookImages } from "../packages/core/server";
import type { Lesson } from "../packages/core/types";

type Call = { op: string; prompt?: string; referenceUrl?: string; url?: string };
/** Simulated fal + vision providers. Nothing here touches the network. */
function fakeDeps(
  opts: { failCheck?: (url: string) => boolean; sameChild?: (url: string) => boolean | null } = {},
) {
  const calls: Call[] = [];
  let n = 0;
  const deps: ImageDeps = {
    async createReference({ prompt }) {
      calls.push({ op: "reference", prompt });
      return `https://img.test/ref-${++n}.png`;
    },
    async withReference({ prompt, referenceUrl }) {
      calls.push({ op: "withReference", prompt, referenceUrl });
      return `https://img.test/pic-${++n}.png`;
    },
    async removeBackground(url) {
      calls.push({ op: "removeBackground", url });
      return `${url}#cut`;
    },
    async check(url) {
      calls.push({ op: "check", url });
      return !opts.failCheck?.(url);
    },
    async sameChild(_ref, urls) {
      calls.push({ op: "sameChild" });
      return urls.map((u) => opts.sameChild?.(u) ?? true);
    },
  };
  return { deps, calls };
}
const book = lessons.slice(0, 3);
const input = { sessionId: "6f1c2a3e-1111-4222-8333-444455556666", gender: "girl" as const, band: "young" as const };

test("every item declares a valid scene_mode", () => {
  for (const lesson of lessons)
    assert.ok(["generated", "composite"].includes(lesson.scene_mode), lesson.id);
});

test("one reference child first, then every picture from it with the same outfit and prohibitions", async () => {
  const { deps, calls } = fakeDeps();
  const result = await illustrateBook({ ...input, lessons: book }, deps);
  assert.equal(calls[0].op, "reference");
  const reference = "https://img.test/ref-1.png";
  const scenes = calls.filter((c) => c.op === "withReference");
  assert.equal(scenes.length, 3);
  for (const c of [calls[0], ...scenes]) {
    assert.ok(c.prompt!.includes(outfitPreset("girl")), "outfit text, letter for letter");
    assert.ok(c.prompt!.includes(ONE_PERSON), "the same prohibitions");
  }
  for (const c of scenes) {
    assert.equal(c.referenceUrl, reference, "the reference as it came out, never the cut-out");
    assert.ok(c.prompt!.startsWith("IDENTITY LOCK: The child in this picture is the same child"));
    assert.ok(!c.prompt!.includes("pure white background"), "a whole scene keeps its background");
  }
  assert.ok(calls[0].prompt!.includes("pure white background"), "the reference is on white");
  assert.equal(result.cover, `${reference}#cut`, "cover: the reference with its background removed");
  for (const l of book) assert.equal(result.scenes[l.id]?.mode, "generated");
});

test("only the scene and the pose change between pictures", async () => {
  const { deps, calls } = fakeDeps();
  await illustrateBook({ ...input, lessons: book }, deps);
  const prompts = calls.filter((c) => c.op === "withReference").map((c) => c.prompt!);
  const wardrobe = (p: string) => p.slice(0, p.indexOf(" POSE:"));
  assert.equal(new Set(prompts.map(wardrobe)).size, 1);
});

test("a scene_mode=composite item never reaches the scene generation model", async () => {
  const composite: Lesson = { ...lessons[0], id: "test-composite", scene: "mosque", scene_mode: "composite" };
  assert.equal(mayGenerateScene(composite), false);
  const { deps, calls } = fakeDeps();
  const result = await illustrateBook({ ...input, lessons: [composite] }, deps);
  const pictures = calls.filter((c) => c.op === "withReference");
  assert.equal(pictures.length, 1, "only the child alone is generated");
  assert.ok(pictures[0].prompt!.includes("pure white background"));
  for (const c of calls) assert.ok(!/mosque|prayer hall|Kaaba/i.test((c.prompt ?? "").split(" ONLY ONE PERSON:")[0]));
  const image = result.scenes["test-composite"];
  assert.equal(image?.mode, "composite");
  if (image?.mode === "composite") {
    assert.equal(image.background, "mosque", "the approved drawn background, composited by the page");
    assert.ok(image.childUrl.endsWith("#cut"), "background removed by the dedicated model");
  }
});

test("a sacred-place scene is never generated even if marked generated", async () => {
  const sacred: Lesson = { ...lessons[0], id: "test-sacred", scene: "pilgrimage", scene_mode: "generated" };
  assert.equal(mayGenerateScene(sacred), false);
  const { deps, calls } = fakeDeps();
  const result = await illustrateBook({ ...input, lessons: [sacred] }, deps);
  assert.equal(calls.filter((c) => c.op === "withReference").length, 0);
  assert.equal(result.scenes["test-sacred"], null);
});

test("every picture is checked; a failure is retried once, then falls back", async () => {
  const { deps, calls } = fakeDeps({ failCheck: (url) => url !== "https://img.test/ref-1.png" && !url.endsWith("-2.png") });
  const result = await illustrateBook({ ...input, lessons: book }, deps);
  const produced = calls.filter((c) => c.op === "reference" || c.op === "withReference").length;
  assert.equal(calls.filter((c) => c.op === "check").length, produced, "every picture is checked");
  // ref-1 passes; pic-2 passes for the first item; the other two fail twice.
  assert.equal(result.scenes[book[0].id]?.mode, "generated");
  assert.equal(result.scenes[book[1].id], null);
  assert.equal(result.scenes[book[2].id], null);
});

test("a picture of a different child is redone once from the same reference, then falls back", async () => {
  const different = new Set(["https://img.test/pic-3.png", "https://img.test/pic-5.png"]);
  const { deps, calls } = fakeDeps({ sameChild: (url) => !different.has(url) });
  const result = await illustrateBook({ ...input, lessons: book }, deps);
  const redo = calls.filter((c) => c.op === "withReference").slice(3);
  assert.equal(redo.length, 1, "one redo for the one inconsistent picture");
  assert.equal(redo[0].referenceUrl, "https://img.test/ref-1.png");
  const ids = book.map((l) => l.id);
  const failed = ids.filter((id) => result.scenes[id] === null);
  assert.equal(failed.length, 1, "still different after the redo: drawn fallback");
});

test("scenes repeat the outfit with the same colours and keep the hands closed or out of sight", async () => {
  const { deps, calls } = fakeDeps();
  await illustrateBook({ ...input, lessons: book }, deps);
  assert.ok(calls[0].prompt!.includes(`POSE: ${POSE_PRESET.standing}`), "the reference keeps its approved pose");
  const scenes = calls.filter((c) => c.op === "withReference");
  scenes.forEach((c, i) => {
    assert.ok(c.prompt!.includes(outfitPreset("girl")));
    assert.ok(c.prompt!.includes("the same clothing and clothing colours"));
    assert.ok(c.prompt!.includes(`POSE: ${SCENE_POSE[book[i].pose]}`));
  });
});

test("every picture uses the style text; the dressing scene alone adds its negatives", async () => {
  const dressing = lessons.find((l) => l.scene === "home")!;
  const { deps, calls } = fakeDeps();
  await illustrateBook({ ...input, lessons: [...book.filter((l) => l !== dressing), dressing] }, deps);
  for (const c of calls.filter((c) => c.prompt)) {
    assert.ok(c.prompt!.includes(`STYLE: ${STYLE}`));
    assert.ok(!/flat cartoon|clean simple shapes|soft cel shading/i.test(c.prompt!.split(" STYLE — NOT ALLOWED:")[0].replace(STYLE, "")));
    assert.equal(c.prompt!.includes(SCENE_NEGATIVE.home!), c.op === "withReference" && c.prompt!.includes("wardrobe and a small plant"));
  }
  assert.ok(calls.some((c) => c.prompt?.includes(SCENE_NEGATIVE.home!)));
  assert.ok(outfitPreset("girl").includes("khimar in dusty pink that fully covers the head"));
  for (const c of calls.filter((c) => c.prompt)) assert.ok(c.prompt!.endsWith(critical("girl")), "the critical line closes every prompt");
});

test("no verdict from the same-child comparison keeps the picture and redoes nothing", async () => {
  const { deps, calls } = fakeDeps({ sameChild: () => null });
  const result = await illustrateBook({ ...input, lessons: book }, deps);
  assert.equal(calls.filter((c) => c.op === "withReference").length, 3);
  for (const l of book) assert.equal(result.scenes[l.id]?.mode, "generated");
});

test("a failed reference means no generated picture at all", async () => {
  const { deps, calls } = fakeDeps({ failCheck: () => true });
  const result = await illustrateBook({ ...input, lessons: book }, deps);
  assert.equal(calls.filter((c) => c.op === "withReference").length, 0);
  assert.equal(result.cover, null);
  for (const l of book) assert.equal(result.scenes[l.id], null);
});

test("nothing reaches any image model while images are disabled", async () => {
  const { deps, calls } = fakeDeps();
  const result = await getBookImages(
    { sessionId: input.sessionId, lessonIds: book.map((l) => l.id), age: 6, gender: "boy" },
    deps,
    () => false,
  );
  assert.equal(calls.length, 0);
  assert.equal(result?.cover, null);
});
