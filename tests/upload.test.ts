import test from "node:test";
import assert from "node:assert/strict";
import { lessons } from "../packages/core/content";
import { checkPhoto, PHOTO_LINE, PHOTO_MAX_BYTES, type ImageDeps } from "../packages/core/illustrations";
import { getBookImages } from "../packages/core/server";

const png = (extra = 0) =>
  `data:image/png;base64,${Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(extra)]).toString("base64")}`;
const jpeg = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]).toString("base64")}`;

/** Simulated providers that record every input, to see where the photo goes. */
function fake() {
  const seen: unknown[] = [];
  let n = 0;
  const deps: ImageDeps = {
    async createReference(input) {
      seen.push({ op: "reference", ...input });
      return `https://img.test/ref-${++n}.png`;
    },
    async withReference(input) {
      seen.push({ op: "withReference", ...input });
      return `https://img.test/pic-${++n}.png`;
    },
    async removeBackground(url) {
      seen.push({ op: "removeBackground", url });
      return `${url}#cut`;
    },
    async check(url) {
      seen.push({ op: "check", url });
      return true;
    },
    async sameChild(reference, urls) {
      seen.push({ op: "sameChild", reference, urls });
      return urls.map(() => true);
    },
  };
  return { deps, seen };
}
const request = (photo?: string) => ({
  sessionId: "6f1c2a3e-1111-4222-8333-444455556666",
  lessonIds: lessons.slice(0, 3).map((l) => l.id),
  age: 7,
  gender: "girl" as const,
  ...(photo === undefined ? {} : { photo }),
});

test("a photo is accepted only as a real jpeg or png of at most 2 MB", () => {
  assert.equal(checkPhoto(png()), png());
  assert.equal(checkPhoto(jpeg), jpeg);
  assert.equal(checkPhoto(png(PHOTO_MAX_BYTES)), null, "over 2 MB");
  assert.equal(checkPhoto(`data:image/gif;base64,${Buffer.from("GIF89a").toString("base64")}`), null, "gif");
  assert.equal(checkPhoto(png().replace("image/png", "image/jpeg")), null, "declared type does not match the bytes");
  assert.equal(checkPhoto("https://example.com/child.png"), null, "a link, not a file");
  assert.equal(checkPhoto("data:image/png;base64,"), null, "empty");
});

test("uploads off by default: a photo is refused before any model is called", async () => {
  const { deps, seen } = fake();
  await assert.rejects(
    getBookImages(request(png()), deps, () => true, () => false),
    (error: { status?: number }) => error.status === 400,
  );
  assert.equal(seen.length, 0);
});

test("a photo that fails the check is refused even when uploads are on", async () => {
  const { deps, seen } = fake();
  await assert.rejects(getBookImages(request("data:image/gif;base64,R0lG"), deps, () => true, () => true));
  assert.equal(seen.length, 0);
});

test("the photo reaches createAvatar only; every later picture uses the drawn reference", async () => {
  const { deps, seen } = fake();
  const photo = png(64);
  const result = await getBookImages(request(photo), deps, () => true, () => true);
  assert.ok(result?.cover);
  const reference = seen.filter((c) => (c as { op: string }).op === "reference") as { prompt: string; photo?: string }[];
  assert.equal(reference.length, 1);
  assert.equal(reference[0].photo, photo);
  assert.ok(reference[0].prompt.endsWith(PHOTO_LINE));
  const elsewhere = seen.filter((c) => (c as { op: string }).op !== "reference");
  assert.ok(elsewhere.length > 0);
  for (const call of elsewhere) assert.ok(!JSON.stringify(call).includes(photo.slice(30)), "photo sent beyond createAvatar");
  assert.ok(!JSON.stringify(result).includes(photo.slice(30)), "photo returned to the page");
});

test("without a photo, createAvatar is the approved prompt alone", async () => {
  const { deps, seen } = fake();
  await getBookImages(request(), deps, () => true, () => true);
  const reference = seen.find((c) => (c as { op: string }).op === "reference") as { prompt: string; photo?: string };
  assert.equal(reference.photo, undefined);
  assert.ok(!reference.prompt.includes(PHOTO_LINE));
});
