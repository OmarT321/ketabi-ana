/**
 * Record silent demonstrations of the real running applications.
 *
 * Start the production server, then run:
 *   node scripts/record-demo.mjs
 * Optional environment: QINDEEL_URL, PLAYWRIGHT_CHROMIUM.
 * Uses synthetic inputs, real API responses, and no mocks or visual overlays.
 * Writes only into tmp/demos. Independent of Playwright's test-results folder.
 */
import { chromium } from "@playwright/test";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";

const output = resolve("tmp/demos");
const raw = join(output, "raw");
await mkdir(raw, { recursive: true });
const installedChromium = process.env.LOCALAPPDATA
  ? join(
      process.env.LOCALAPPDATA,
      "ms-playwright",
      "chromium-1243",
      "chrome-win64",
      "chrome.exe",
    )
  : undefined;
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM ||
  (installedChromium && existsSync(installedChromium)
    ? installedChromium
    : undefined);
const browser = await chromium.launch({ headless: true, executablePath });
const results = [];
const pause = (page, ms = 1400) => page.waitForTimeout(ms);

async function scrollTo(page, locator, block = "center") {
  await locator.evaluate(
    (element, alignment) =>
      element.scrollIntoView({ behavior: "smooth", block: alignment }),
    block,
  );
  await pause(page, 700);
}

async function click(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (box)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
      steps: 16,
    });
  await pause(page, 220);
  await locator.click();
}

async function record(name, url, journey) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: raw, size: { width: 1440, height: 1000 } },
    locale: "ar-SA",
    colorScheme: "light",
  });
  const page = await context.newPage();
  const video = page.video();
  const errors = [];
  const started = Date.now();
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const response = await page.goto(url, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200, `${name} must be reachable`);
    await page.evaluate(() => document.fonts.ready);
    await journey(page);
    assert.deepEqual(errors, [], `${name} must not have runtime errors`);
  } finally {
    await context.close();
  }
  const path = join(output, `${name}-demo.webm`);
  await video.saveAs(path);
  const { size } = await stat(path);
  results.push({
    platform: name,
    url,
    file: path,
    bytes: size,
    approximateSeconds: Math.round((Date.now() - started) / 1000),
    silent: true,
    realApi: true,
  });
  console.log(`Saved ${name}: ${path} (${Math.round(size / 1024)} KiB)`);
}

async function qindeelDemo(page) {
  assert.equal(await page.locator("[data-section]").count(), 3);
  await page.getByTestId("scope-note").waitFor();
  await pause(page, 2400);
  const sent = [];
  const lessonResponses = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/")) sent.push(request.postData() || "");
  });
  page.on("response", (response) => {
    if (
      new URL(response.url()).pathname === "/api/lesson" &&
      response.request().method() === "POST"
    )
      lessonResponses.push(response);
  });
  await click(
    page,
    page.getByRole("link", { name: "اصنعوا كتابكم", exact: true }),
  );
  await pause(page, 850);
  await page.locator("#child-name").pressSequentially("نور", { delay: 180 });
  await page.locator("#child-age").selectOption("8");
  await click(page, page.getByRole("radio", { name: "بنت" }));
  await pause(page, 1300);
  await click(
    page,
    page.getByRole("button", { name: "اصنع كتاب نور", exact: true }),
  );
  const reader = page.locator(".reader-screen");
  await reader.waitFor({ timeout: 90000 });
  assert.equal(lessonResponses.length, 3, "A session loads three items");
  for (const response of lessonResponses)
    assert.equal(response.status(), 200, "Lesson API must succeed");
  await scrollTo(page, reader.getByTestId("book-cover"), "start");
  await pause(page, 2600);
  await click(
    page,
    reader.getByRole("button", { name: "افتح الكتاب", exact: true }),
  );
  const desk = reader.getByRole("region", { name: "قارئ الكتاب", exact: true });
  const next = reader.getByRole("button", {
    name: "الصفحة التالية",
    exact: true,
  });
  await reader.getByTestId("book-page").first().waitFor();
  let turns = 0;
  while (true) {
    assert.ok(turns < 10, "Book navigation must reach the closing page");
    await scrollTo(page, desk, "start");
    await pause(page, turns === 0 ? 2400 : 3300);
    const quiz = reader.locator(".page-meaning .answer-options > button");
    if (await quiz.count()) {
      await click(page, quiz.first());
      await reader.locator(".quiz-feedback").first().waitFor();
      await pause(page, 1200);
    }
    if (await next.isDisabled()) break;
    await click(page, next);
    turns++;
  }
  assert.equal(turns, lessonResponses.length, "Every pair and the closing page were read");
  await click(page, reader.locator(".question-box summary"));
  await reader.locator("#book-question").fill("ما معنى هذا الذكر؟");
  const pendingAnswer = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/question" &&
      response.request().method() === "POST",
    { timeout: 60000 },
  );
  await click(page, reader.getByRole("button", { name: "اسأل", exact: true }));
  const answer = await pendingAnswer;
  assert.equal(answer.status(), 200);
  assert.equal((await answer.json()).status, "answered");
  await reader.locator(".question-answer").waitFor();
  await scrollTo(page, reader.locator(".question-box"));
  await pause(page, 2300);
  assert.ok(
    !sent.join("").includes("نور"),
    "Synthetic child name must remain in browser",
  );
  assert.equal(
    await page.locator(".print-only").getByTestId("book-page").count(),
    lessonResponses.length * 2 + 1,
    "Print copy contains every page",
  );
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: join(output, "demo-book.pdf"),
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  });
  await page.emulateMedia({ media: "screen" });
  await click(page, reader.locator(".question-box summary"));
  await scrollTo(page, desk, "start");
  assert.equal(new URL(page.url()).pathname, "/", "Journey stays on one page");
  await pause(page, 1700);
}

try {
  await record(
    "qindeel",
    process.env.QINDEEL_URL || "http://localhost:3101",
    qindeelDemo,
  );
  await writeFile(
    join(output, "demo-manifest.json"),
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        note: "Silent recording of the single-page application and the paginated book. Inputs and child name are synthetic; all API responses are real.",
        recordings: results,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
