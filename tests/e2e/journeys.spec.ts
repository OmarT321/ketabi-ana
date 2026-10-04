import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import adhkar from "../../packages/core/data/packs/adhkar.json" with { type: "json" };
const qindeel = process.env.QINDEEL_URL || "http://localhost:3001";

test("API validates input and rejects cross-origin mutations", async ({
  request,
}) => {
  expect(
    (
      await request.post(`${qindeel}/api/lesson`, {
        data: { lessonId: "adhkar-waking", age: 6, gender: "boy", admin: true },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post(`${qindeel}/api/lesson`, {
        headers: { Origin: "https://invalid.example" },
        data: { lessonId: "adhkar-waking", age: 6, gender: "boy" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post(`${qindeel}/api/lesson`, {
        data: { lessonId: "adhkar-waking", age: 99, gender: "boy" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post(`${qindeel}/api/lesson`, {
        data: { lessonId: "adhkar-waking", age: 4, gender: "boy" },
      })
    ).status(),
  ).toBe(400);
});

const texts = adhkar.map((item) => item.text);

test("Kitabi Ana: three-item book, text and meaning pages, per-item question, print and name privacy", async ({
  page,
}, testInfo) => {
  const sent: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/")) sent.push(r.postData() || "");
  });
  await page.goto(qindeel);
  await expect(page.locator("[data-section]")).toHaveCount(3);
  await expect(page.getByTestId("scope-note")).toHaveText(
    "هذه نسخة تجريبية تعرض 4 نصوص، والبنية تتسع لحزم أخرى.",
  );
  await expect(page.locator("#child-age option")).toHaveCount(8);
  await expect(page.locator("#child-age option").first()).toHaveAttribute("value", "5");
  await page.locator("#child-name").fill("ليان");
  await page.locator("#child-age").selectOption("11");
  await expect(page.getByRole("button", { name: "اصنع كتاب ليان" })).toBeDisabled();
  await page.getByRole("radio", { name: "بنت" }).check();
  await page.getByRole("button", { name: "اصنع كتاب ليان" }).click();
  const reader = page.locator(".reader-screen");
  const cover = reader.getByTestId("book-cover");
  await expect(cover).toBeVisible({ timeout: 40_000 });
  await expect(cover).toContainText("كتاب ليان");
  await expect(cover.locator(".review-badge")).toHaveText("قيد المراجعة");
  await page.getByRole("button", { name: "افتح الكتاب", exact: true }).click();
  await expect(reader.getByTestId("book-page")).toHaveCount(2);
  await expect(reader.getByTestId("progress")).toHaveText("الموقف ١ من ٣");
  const textPage = reader.locator(".page-text");
  const meaningPage = reader.locator(".page-meaning");
  await expect(textPage.locator(".review-badge")).toHaveText("قيد المراجعة");
  await expect(textPage.locator(".source-link")).toHaveText("المصدر قيد التوثيق");
  const shown = (await textPage.locator(".sacred-text").innerText()).trim();
  const item = adhkar.find((x) => x.text === shown);
  expect(item, "text matches the content file exactly").toBeTruthy();
  await expect(textPage.locator("h4")).toHaveText(`عند ${item!.situation} نقول:`);
  await expect(textPage.locator(".quiz-card")).toHaveCount(0);
  await expect(meaningPage.locator("h4")).toHaveText("ماذا يعني؟");
  await expect(meaningPage.locator(".meaning-prose")).toHaveText(item!.meaning_older);
  await expect(meaningPage.locator(".source-note")).toHaveText("المعنى كما كُتب في المصدر");
  await expect(meaningPage.locator(".quiz-question")).toHaveText(item!.question);
  await meaningPage.locator(".answer-options button").nth(1).click();
  await expect(meaningPage.locator(".quiz-feedback")).toContainText(
    `نراجعها معًا: ${item!.options[item!.answer]}`,
  );
  await page.screenshot({
    path: testInfo.outputPath("book-spread.png"),
    fullPage: true,
  });
  const bookAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    bookAxe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.getByRole("button", { name: "الصفحة التالية", exact: true }).click();
  await expect(reader.getByTestId("progress")).toHaveText("الموقف ٢ من ٣");
  await page.locator(".question-box summary").click();
  await page.locator("#book-question").fill("ما معنى هذا الذكر؟");
  await page.getByRole("button", { name: "اسأل", exact: true }).click();
  await expect(page.locator(".question-answer")).toContainText(item!.meaning_older);
  await page.locator("#book-question").fill("هل يجوز أن أفطر؟");
  await page.getByRole("button", { name: "اسأل", exact: true }).click();
  await expect(page.locator(".question-answer")).toContainText(
    "خارج محتوى كتابنا",
  );
  await page.getByRole("region", { name: "قارئ الكتاب" }).focus();
  await page.keyboard.press("End");
  await expect(reader.getByTestId("book-page")).toHaveCount(1);
  await expect(reader.locator(".page-closing h4")).toHaveText("ما تعلّمتَه اليوم");
  await expect(reader.locator(".page-closing")).toContainText(
    "النصوص منقولة من مصادرها من منتج «حصن الطفل»",
  );
  expect(sent.join("")).not.toContain("ليان");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-only")).toBeVisible();
  await expect(page.locator(".print-only .book-cover")).toBeVisible();
  await expect(page.locator(".print-only .paper-leaf")).toHaveCount(7);
  const printed = await page.locator(".print-only .sacred-text").allInnerTexts();
  expect(printed).toHaveLength(3);
  for (const text of printed) expect(texts).toContain(text.trim());
  await page.pdf({
    path: testInfo.outputPath("book.pdf"),
    format: "A4",
    printBackground: true,
  });
});

test("Kitabi Ana mobile: every page turns without overflow and the next book differs", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(qindeel);
  await page.getByRole("radio", { name: "ولد" }).check();
  await page.getByRole("button", { name: "اصنع كتاب طفلي" }).click();
  await page.getByRole("button", { name: "افتح الكتاب", exact: true }).click();
  const reader = page.locator(".reader-screen");
  const firstBook: string[] = [];
  for (let i = 0; i < 7; i++) {
    await expect(reader.getByTestId("book-page")).toHaveCount(1);
    if (i % 2 === 0 && i < 6)
      firstBook.push((await reader.locator(".sacred-text").innerText()).trim());
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    if (i < 6)
      await page
        .getByRole("button", { name: "الصفحة التالية", exact: true })
        .click();
  }
  await expect(
    page.getByRole("button", { name: "الصفحة التالية", exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: testInfo.outputPath("book-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "كتاب جديد" }).click();
  await page.getByRole("radio", { name: "ولد" }).check();
  await page.getByRole("button", { name: "اصنع كتاب طفلي" }).click();
  await page.getByRole("button", { name: "افتح الكتاب", exact: true }).click();
  const secondBook: string[] = [];
  for (let i = 0; i < 3; i++) {
    secondBook.push((await reader.locator(".sacred-text").innerText()).trim());
    await page.getByRole("button", { name: "الصفحة التالية", exact: true }).click();
    await page.getByRole("button", { name: "الصفحة التالية", exact: true }).click();
  }
  expect(secondBook.some((text) => !firstBook.includes(text))).toBeTruthy();
});
test("Mobile homepage fits viewport and have no runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  for (const url of [qindeel]) {
    await page.goto(url);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await page.keyboard.press("Tab");
  }
  expect(errors).toEqual([]);
});

test("Homepage meets automated WCAG A/AA checks", async ({ page }) => {
  for (const url of [qindeel]) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});

