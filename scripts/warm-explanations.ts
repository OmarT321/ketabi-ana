// npm run warm:explanations — generates every (item × age band × gender)
// explanation once through the Vercel AI Gateway, runs the stage-2 checks, and
// saves only those that pass to packages/core/data/explanations.cache.json.
// Entries whose meaning is unchanged are kept and not regenerated, so the spend
// happens once. Rejections are recorded (without any child data) in
// packages/core/data/explanations.rejected.json for review:explanations.
import fs from "node:fs";
import { lessons, meaningFor } from "../packages/core/content";
import {
  generateExplanation,
  gatewayDeps,
  sha256,
  type ExplainDeps,
  type WarmEntry,
} from "../packages/core/explain";
import type { AgeBand, Gender } from "../packages/core/types";

const envFile = "apps/qindeel/.env.local";
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
  console.error(
    `No AI_GATEWAY_API_KEY in the environment or ${envFile}. Nothing generated.`,
  );
  process.exit(1);
}

const cachePath = "packages/core/data/explanations.cache.json";
const rejectedPath = "packages/core/data/explanations.rejected.json";
const cache: WarmEntry[] = JSON.parse(fs.readFileSync(cachePath, "utf8"));
const rejected: {
  id: string;
  band: AgeBand;
  gender: Gender;
  reasons: string[];
  at: string;
}[] = [];
const model = process.env.AI_TEXT_MODEL || "anthropic/claude-sonnet-5.5";

// Run limits set by the content owner:
//  - at most two attempts per combination (generateExplanation retries once);
//    a combination rejected twice stops the run;
//  - if combinations with any rejection exceed a third of all combinations, stop;
//  - hard cap on provider calls: two rewrites and two judge calls per combination.
// No check threshold is ever changed here to let an explanation through.
const total = lessons.length * 4;
const maxRejectedCombos = Math.floor(total / 3);
const calls = { rewrite: 0, judge: 0 };
const counted: ExplainDeps = {
  rewrite: (input, signal) => {
    if (++calls.rewrite > total * 2) throw new Error("rewrite call cap reached");
    return gatewayDeps.rewrite(input, signal);
  },
  judge: (input, signal) => {
    if (++calls.judge > total * 2) throw new Error("judge call cap reached");
    return gatewayDeps.judge(input, signal);
  },
};
let combosWithRejection = 0;
let stopReason = "";
const attempts: { label: string; reasons: string[]; ms: number }[] = [];
let generated = 0,
  kept = 0;
const started = Date.now();

run: for (const lesson of lessons)
  for (const band of ["young", "older"] as const)
    for (const gender of ["boy", "girl"] as const) {
      const meaningSha256 = sha256(meaningFor(lesson, band));
      const existing = cache.find(
        (e) => e.id === lesson.id && e.band === band && e.gender === gender,
      );
      if (existing?.meaningSha256 === meaningSha256) {
        kept++;
        continue;
      }
      const label = `${lesson.id}/${band}/${gender}`;
      const t0 = Date.now();
      const result = await generateExplanation(lesson, band, gender, counted, 30000);
      attempts.push({ label, reasons: result.rejections, ms: Date.now() - t0 });
      if (result.rejections.length) combosWithRejection++;
      const index = cache.indexOf(existing!);
      if (index >= 0) cache.splice(index, 1); // stale: meaning changed
      if (result.mode === "generated") {
        cache.push({
          id: lesson.id,
          band,
          gender,
          meaningSha256,
          explanation: result.text,
          model,
          generatedAt: new Date().toISOString(),
        });
        generated++;
        console.log(`ok       ${label}${result.rejections.length ? ` (after ${result.rejections.join(",")})` : ""}`);
      } else {
        rejected.push({
          id: lesson.id,
          band,
          gender,
          reasons: result.rejections.length ? result.rejections : ["provider"],
          at: new Date().toISOString(),
        });
        console.log(`rejected ${label}: ${result.rejections.join(",") || `provider error or timeout (${result.providerError})`}`);
        if (process.env.WARM_DEBUG) console.log(result);
        stopReason = result.rejections.length
          ? `${label} rejected on both attempts`
          : `${label}: provider error or timeout (${result.providerError})`;
        break run;
      }
      if (combosWithRejection > maxRejectedCombos) {
        stopReason = `rejections in ${combosWithRejection} combinations exceed a third (${maxRejectedCombos} of ${total})`;
        break run;
      }
    }

const order = (e: WarmEntry) =>
  `${lessons.findIndex((l) => l.id === e.id)}:${e.band}:${e.gender}`;
cache.sort((a, b) => order(a).localeCompare(order(b)));
fs.writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
fs.writeFileSync(rejectedPath, `${JSON.stringify(rejected, null, 2)}\n`);
fs.writeFileSync(
  "packages/core/data/explanations.run.json",
  `${JSON.stringify({ at: new Date().toISOString(), model, calls, stopReason: stopReason || null, attempts }, null, 2)}\n`,
);
console.log(
  `generated ${generated}, kept ${kept}, rejected ${rejected.length}, total cached ${cache.length} of ${total}, calls rewrite=${calls.rewrite} judge=${calls.judge}, ${Math.round((Date.now() - started) / 1000)}s`,
);
if (stopReason) {
  console.log(`STOPPED: ${stopReason}`);
  process.exitCode = 2;
}
