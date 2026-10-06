// Prepares top-logo.png in apps/qindeel/public/book from the owner's source file
// (read only, never modified): the logo «حِصنُ» alone, for pages that have no dua
// layer. Run once: node scripts/prepare-book-assets.mjs "<source folder>"
import path from "node:path";
import sharp from "sharp";

const source = path.join(process.argv[2], "الاستيقاظ_top layer.png");
const out = "apps/qindeel/public/book";
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const clear = (buffer, test) => {
  const copy = Buffer.from(buffer);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) if (test(x, y)) copy[(y * width + x) * channels + 3] = 0;
  return copy;
};
// Measured from the source: logo rows 99–320, «الطفل» rows 321–456 (x ≥ 735),
// title rows 529–655, baked card rows 709–1147.
const name = (x, y) => (y >= 326 && y <= 470) || (y >= 321 && y < 326 && x >= 735);
const card = (_x, y) => y >= 690;
const title = (_x, y) => y >= 500 && y < 690;
const save = (buffer, file) =>
  sharp(buffer, { raw: { width, height, channels } }).png({ compressionLevel: 9 }).toFile(path.join(out, file));
await save(clear(data, (x, y) => name(x, y) || card(x, y) || title(x, y)), "top-logo.png");
console.log("written top-logo.png");
