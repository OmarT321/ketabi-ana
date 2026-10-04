// npm run verify:content — release gate for content and privacy.
// Fails on: sacred text drift, committed secrets, child-data persistence or
// logging in runtime code, failing unit tests. Reports (does not fail) when the
// demo scope differs from the declared one.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { lessons } from "../packages/core/content";
import lessonHashes from "../packages/core/data/lesson-hashes.json" with { type: "json" };
import warmed from "../packages/core/data/explanations.cache.json" with { type: "json" };
import { checkExplanationText } from "../packages/core/safety";

const root = fileURLToPath(new URL("..", import.meta.url));
const failures: string[] = [];
const notes: string[] = [];

// Declared demo scope: 4 texts in 3 situations (adhkar) and 1 manasik item.
const EXPECTED = { adhkar: 4, adhkarSituations: 3, manasik: 1 };

// 1. Sacred text matches the recorded fingerprints exactly.
for (const lesson of lessons) {
  const record = lessonHashes.find((h) => h.id === lesson.id);
  if (!record) failures.push(`no fingerprint for ${lesson.id}`);
  else if (
    createHash("sha256").update(lesson.text).digest("hex") !==
    record.sha256
  )
    failures.push(`sacred text differs from fingerprint: ${lesson.id}`);
}
for (const record of lessonHashes)
  if (!lessons.some((l) => l.id === record.id))
    failures.push(`fingerprint without content: ${record.id}`);

// 2. Scope disclosure: report, never fail the build.
const adhkar = lessons.filter((l) => l.pack === "adhkar");
const actual = {
  adhkar: adhkar.length,
  adhkarSituations: new Set(adhkar.map((l) => l.situation)).size,
  manasik: lessons.filter((l) => l.pack === "manasik").length,
};
for (const key of Object.keys(EXPECTED) as (keyof typeof EXPECTED)[])
  if (actual[key] !== EXPECTED[key])
    notes.push(`scope: ${key} is ${actual[key]}, declared ${EXPECTED[key]}`);

// Walk the repository, skipping generated and ignored local folders.
const skip = new Set([
  "node_modules",
  ".next",
  ".git",
  "test-results",
  "playwright-report",
  "tmp",
  ".understand-anything",
  ".vercel",
]);
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (skip.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
const files = walk(root).map((p) => relative(root, p).split(sep).join("/"));
const textFile = /\.(ts|tsx|js|mjs|cjs|json|md|sql|toml|yml|yaml|ps1|py|css|html|txt|example)$|^NOTICE$|\.gitignore$/;

// 3. No secrets committed. Local .env files are ignored by Git and skipped.
const secretPatterns: [string, RegExp][] = [
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["OpenAI-style key", /\bsk-[A-Za-z0-9_-]{20,}/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Vercel token", /\bvck_[A-Za-z0-9]{20,}/],
  ["fal key", /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{32}\b/],
  ["JWT", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ["assigned secret", /^[ \t]*[A-Z_]*(?:KEY|TOKEN|SECRET|PASSWORD)[ \t]*=[ \t]*[^\s#]+/m],
];
for (const file of files) {
  const base = file.split("/").pop()!;
  if (base.startsWith(".env") && base !== ".env.example") continue;
  if (!textFile.test(base) || file.endsWith("package-lock.json")) continue;
  const text = readFileSync(join(root, file), "utf8");
  for (const [label, pattern] of secretPatterns)
    if (pattern.test(text)) failures.push(`possible ${label} in ${file}`);
}

// 4. The child's name and images never reach logs or persistent storage.
const runtime = files.filter(
  (f) =>
    /^(apps\/qindeel\/(app|components)|packages\/core)\//.test(f) &&
    /\.(ts|tsx)$/.test(f),
);
const forbidden: [string, RegExp][] = [
  ["console logging", /\bconsole\.(log|info|warn|error|debug)\s*\(/],
  ["browser storage", /\b(localStorage|sessionStorage|indexedDB)\b/],
  ["cookies", /document\.cookie|cookies\(\)\.set/],
  ["file writes", /\b(writeFile|writeFileSync|appendFile|createWriteStream)\b/],
];
// packages/core/log.ts is the single sanctioned logger: one call, typed record, no free text.
const LOGGER = "packages/core/log.ts";
for (const file of runtime) {
  const text = readFileSync(join(root, file), "utf8");
  for (const [label, pattern] of forbidden) {
    if (file === LOGGER && label === "console logging") continue;
    if (pattern.test(text)) failures.push(`${label} in runtime code: ${file}`);
  }
}
const logger = readFileSync(join(root, LOGGER), "utf8");
const loggerCode = logger.replace(/import[^;]+;|\/\*[\s\S]*?\*\/|\/\/.*/g, "");
if ((loggerCode.match(/console\./g) || []).length !== 1 || /name/i.test(loggerCode))
  failures.push(`logger must make one call with no name field: ${LOGGER}`);

// 4b. The persistent explanation cache holds only checked text keyed by id, band and gender.
const WARM_KEYS = ["band", "explanation", "gender", "generatedAt", "id", "meaningSha256", "model"];
for (const entry of warmed as Record<string, string>[]) {
  if (Object.keys(entry).sort().join() !== WARM_KEYS.join())
    failures.push(`unexpected fields in explanations cache: ${entry.id}`);
  const lesson = lessons.find((l) => l.id === entry.id);
  if (!lesson) failures.push(`explanation for unknown item: ${entry.id}`);
  else {
    const meaning = entry.band === "young" ? lesson.meaning_young : lesson.meaning_older;
    const reason = checkExplanationText(entry.explanation, { text: lesson.text, meaning });
    if (reason) failures.push(`cached explanation fails check (${reason}): ${entry.id}/${entry.band}/${entry.gender}`);
    if (entry.meaningSha256 !== createHash("sha256").update(meaning).digest("hex"))
      notes.push(`stale cached explanation (meaning changed): ${entry.id}/${entry.band}/${entry.gender}`);
  }
}
notes.push(`explanations cache: ${(warmed as unknown[]).length} of ${lessons.length * 4}`);

// 5. Unit tests are green.
const tests = spawnSync("npm", ["test", "--silent"], {
  cwd: root,
  shell: true,
  encoding: "utf8",
});
const summary = /ℹ pass (\d+)[\s\S]*?ℹ fail (\d+)/.exec(tests.stdout ?? "");
if (tests.status !== 0) failures.push("unit tests failed (run npm test)");

console.log(`content items: ${lessons.length} (adhkar ${actual.adhkar} in ${actual.adhkarSituations} situations, manasik ${actual.manasik})`);
console.log(`files scanned: ${files.length}, runtime files: ${runtime.length}`);
console.log(`unit tests: ${summary ? `${summary[1]} passed, ${summary[2]} failed` : "no summary"}`);
for (const note of notes) console.log(`NOTE ${note}`);
for (const failure of failures) console.log(`FAIL ${failure}`);
console.log(failures.length ? "verify:content FAILED" : "verify:content passed");
process.exit(failures.length ? 1 : 0);
