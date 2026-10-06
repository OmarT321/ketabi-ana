import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import adhkar from "../../packages/core/data/packs/adhkar.json" with { type: "json" };
import warmed from "../../packages/core/data/explanations.cache.json" with { type: "json" };
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
  expect(
    (
      await request.post(`${qindeel}/api/lesson`, {
        data: {
          lessonId: "adhkar-waking",
          age: 10,
          gender: "boy",
          reply: { kind: "text", text: "ا".repeat(201) },
        },
      })
    ).status(),
  ).toBe(400);
});

/** Answers the three question steps: the young band sees only «ما أعرف» and «تخطّي». */
async function answerSteps(page: import("@playwright/test").Page, young: boolean) {
  for (let i = 0; i < 3; i++) {
    const step = page.getByTestId("question-step");
    await expect(step.getByTestId("step-progress")).toHaveText(
      `سؤال ${(i + 1).toLocaleString("ar-SA")} من ٣`,
    );
    if (young) await expect(step.locator("textarea")).toHaveCount(0);
    await step.getByRole("button", { name: i % 2 ? "ما أعرف" : "تخطّي" }).click();
  }
}

const texts = adhkar.map((item) => item.text);

/** Every card and text block lies inside its page, and nothing that clips has
 * hidden overflow: a page grows with its text and never cuts a line. */
async function expectTextInsidePages(page: import("@playwright/test").Page, pages: string) {
  const outside = await page.evaluate((selector) => {
    const bad: string[] = [];
    for (const [n, leaf] of [...document.querySelectorAll(selector)].entries()) {
      const L = leaf.getBoundingClientRect();
      if (!L.width) continue;
      for (const el of leaf.querySelectorAll<HTMLElement>(".book-card, .leaf-body > *, .leaf-title")) {
        if (el.closest(".sr-only")) continue;
        const r = el.getBoundingClientRect();
        if (r.left < L.left - 1 || r.right > L.right + 1 || r.top < L.top - 1 || r.bottom > L.bottom + 1)
          bad.push(`page ${n + 1} ${el.className}: outside the page`);
        if (getComputedStyle(el).overflow !== "visible" && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1))
          bad.push(`page ${n + 1} ${el.className}: hidden overflow`);
      }
    }
    return bad;
  }, pages);
  expect(outside, "no text leaves its card or page").toEqual([]);
}

test("Kitabi Ana: question steps outside the book, three-item book, print and privacy", async ({
  page,
}, testInfo) => {
  const sent: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/")) sent.push(r.postData() || "");
  });
  await page.goto(qindeel);
  await expect(page.locator("[data-section]")).toHaveCount(3);
  await page.locator("#child-age").pressSequentially("1a3");
  await expect(page.locator("#child-age")).toHaveValue("61");
  await expect(page.getByRole("alert")).toHaveText("العمر من ٥ إلى ١٢ سنة");
  await page.locator("#child-age").fill("");
  await page.locator("#child-name").fill("ليان");
  await page.locator("#child-age").fill("11");
  await expect(page.getByRole("button", { name: "اصنع كتاب ليان" })).toBeDisabled();
  await page.getByRole("radio", { name: "بنت" }).check();
  await page.getByRole("button", { name: "اصنع كتاب ليان" }).click();
  // Question steps, outside the book. Older band: fixed question, warning, optional typing.
  const step = page.getByTestId("question-step");
  await expect(step.getByTestId("step-progress")).toHaveText("سؤال ١ من ٣");
  await expect(step.locator("h3")).toHaveText(
    "في رأيك، ما معنى هذا الذكر، ولماذا نقوله في هذا الموقف؟",
  );
  await expect(step.locator(".step-warning")).toHaveText(
    "اكتب بكلماتك، ولا تكتب اسمك ولا أي معلومة عنك.",
  );
  await step.locator("textarea").fill("لأن ليان تحب الصباح الجديد");
  await step.getByRole("button", { name: "هذه إجابتي" }).click();
  await expect(step.getByTestId("step-progress")).toHaveText("سؤال ٢ من ٣");
  await step.getByRole("button", { name: "ما أعرف" }).click();
  await expect(step.getByTestId("step-progress")).toHaveText("سؤال ٣ من ٣");
  await step.getByRole("button", { name: "تخطّي" }).click();
  const reader = page.locator(".reader-screen");
  const cover = reader.getByTestId("book-cover");
  await expect(cover).toBeVisible({ timeout: 40_000 });
  await expect(cover).toContainText("كتاب ليان");
  await expect(cover.getByTestId("child-name")).toHaveText("ليان");
  await expect(cover).toContainText("أذكاري اليومية رفيقي كل يوم");
  await page.getByRole("button", { name: "افتح الكتاب", exact: true }).click();
  await expect(reader.getByTestId("book-page")).toHaveCount(2);
  await expect(reader.getByTestId("progress")).toHaveText("الموقف ١ من ٣");
  const textPage = reader.locator(".page-text");
  const meaningPage = reader.locator(".page-meaning");
  await expect(textPage.locator(".source-link")).toHaveText("");
  const shown = (await textPage.locator(".sacred-text").innerText()).trim();
  const item = adhkar.find((x) => x.text === shown);
  expect(item, "text matches the content file exactly").toBeTruthy();
  await expect(textPage.locator("h4")).toHaveText(item!.top_layer.title);
  if (item!.dua_layer) {
    // The owner's layer is on top, its alt is the pack's text, and the CSS card is off.
    await expect(textPage.locator(".leaf-dua")).toHaveAttribute("alt", item!.text);
    await expect(textPage.locator(".book-card")).toHaveCount(0);
  } else await expect(textPage.locator(".book-card.sacred-text")).toHaveCount(1);
  // The name is on the cover and in the explanation, never on the text page
  // and never in a drawn layer (no text over it, no alt or file name carrying it).
  await expect(textPage).not.toContainText("ليان");
  for (const img of await reader.locator(".paper-leaf img").all()) {
    expect(await img.getAttribute("alt")).not.toContain("ليان");
    expect(await img.getAttribute("src")).not.toContain(encodeURIComponent("ليان"));
  }
  await expect(reader.locator(".leaf-name")).toHaveCount(0);
  await expect(reader.locator(".quiz-card, .answer-options")).toHaveCount(0);
  await expect(meaningPage.locator("h4")).toHaveText("ماذا يعني؟");
  // The base explanation: the warmed one (addressing the child by name) when
  // cached, else the meaning as written.
  const warm = warmed.find((e) => e.id === item!.id && e.band === "older" && e.gender === "girl")
    ?.explanation;
  await expect(meaningPage.locator(".meaning-prose")).toHaveText(
    (warm ?? item!.meaning_older).replaceAll("{name}", "ليان"),
  );
  // A generated explanation carries no line on its page (the note is on the
  // closing page, once); a meaning shown as written says so under it.
  if (warm) await expect(meaningPage.locator(".source-note")).toHaveCount(0);
  else await expect(meaningPage.locator(".source-note")).toHaveText("المعنى كما كُتب في المصدر");
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
    "ليس عن كتابنا",
  );
  await page.getByRole("region", { name: "قارئ الكتاب" }).focus();
  await page.keyboard.press("End");
  await expect(reader.getByTestId("book-page")).toHaveCount(1);
  await expect(reader.locator(".page-closing h4")).toHaveText("ما تعلّمتَه اليوم");
  await expect(reader.locator(".page-closing")).toContainText(
    "النصوص من منتج «حصن الطفل»، والمعاني من إعداد فريق المشروع وتخضع للمراجعة الشرعية.",
  );
  // The closing page: the title, the situations, the parent line once, the content
  // line once, and the note on generated explanations once.
  await expect(reader.locator(".page-closing .book-colophon > p")).toHaveCount(warm ? 3 : 2);
  if (warm)
    await expect(reader.locator(".page-closing .source-note").last()).toHaveText(
      "شروح هذا الكتاب صاغها الحاسوب من المعاني المكتوبة.",
    );
  expect(sent.join("")).not.toContain("ليان");
  expect(sent.join(""), "the typed reply is sent once, with the name masked").toContain(
    "لأن {name} تحب الصباح الجديد",
  );
  await expect(page.locator(".book-reader")).not.toContainText("تحب الصباح");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-only")).toBeVisible();
  await expect(page.locator(".print-only .book-cover")).toBeVisible();
  await expect(page.locator(".print-only .paper-leaf")).toHaveCount(7);
  const printed = await page.locator(".print-only .sacred-text").allInnerTexts();
  expect(printed).toHaveLength(3);
  for (const text of printed) expect(texts).toContain(text.trim());
  expect(await page.locator(".print-only").innerText()).not.toContain("تحب الصباح");
  await page.pdf({
    path: testInfo.outputPath("book.pdf"),
    preferCSSPageSize: true,
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
  await answerSteps(page, true);
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
  await answerSteps(page, true);
  await page.getByRole("button", { name: "افتح الكتاب", exact: true }).click();
  const secondBook: string[] = [];
  for (let i = 0; i < 3; i++) {
    secondBook.push((await reader.locator(".sacred-text").innerText()).trim());
    await page.getByRole("button", { name: "الصفحة التالية", exact: true }).click();
    await page.getByRole("button", { name: "الصفحة التالية", exact: true }).click();
  }
  expect(secondBook.some((text) => !firstBook.includes(text))).toBeTruthy();
});
test("Long explanations (older band) stay inside their cards on a phone and in print", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(qindeel);
  // Two books cover all four items: the next book always differs.
  for (let book = 0; book < 2; book++) {
    await page.locator("#child-age").fill("12");
    await page.getByRole("radio", { name: "بنت" }).check();
    await page.getByRole("button", { name: "اصنع كتاب طفلي" }).click();
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "تخطّي" }).click();
    await page.getByRole("button", { name: "افتح الكتاب", exact: true }).click();
    const next = page.getByRole("button", { name: "الصفحة التالية", exact: true });
    for (let i = 0; i < 7; i++) {
      await expectTextInsidePages(page, ".reader-screen .paper-leaf");
      if (i < 6) await next.click();
    }
    await page.emulateMedia({ media: "print" });
    await expectTextInsidePages(page, ".print-only .paper-leaf");
    await page.emulateMedia({ media: "screen" });
    await page.getByRole("button", { name: "كتاب جديد" }).click();
  }
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

