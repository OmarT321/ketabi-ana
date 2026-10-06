// Prepares the top layers in apps/qindeel/public/book from the owner's source
// file (read only, never modified). Run once: node scripts/prepare-book-assets.mjs "<source folder>"
//  - top-waking.png: the source layer with two areas cleared:
//      the word «الطفل» under «حِصنُ» (the child's name is written there by the app), and
//      the baked text card (the dhikr text must come from the content file, and the
//      card is drawn in CSS).
//  - top-logo.png: the logo «حِصنُ» alone, for pages whose top layer has not arrived.
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
await save(clear(data, (x, y) => name(x, y) || card(x, y)), "top-waking.png");
await save(clear(data, (x, y) => name(x, y) || card(x, y) || title(x, y)), "top-logo.png");
console.log("written top-waking.png and top-logo.png");
