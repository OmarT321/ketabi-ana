"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, LoaderCircle } from "lucide-react";
import type { ChildReply, Gender, Lesson, LessonResponse } from "@platform/core/types";
import type { BookImages } from "@platform/core/illustrations";
import { buildStoryBook, pickSession } from "@platform/core/story";
import { MAX_AGE, MIN_AGE, ageBand, scopeNotice } from "@platform/core/content";
import { QuestionStep } from "./question-step";
import { Header } from "./site-chrome";
import { Scene } from "./scene";
import { BookReader, ReviewBadge, type ReaderProfile } from "./book-reader";
import { request } from "./client-api";

const ar = (value: number) => value.toLocaleString("ar-SA");
const DEFAULT_NOTICE =
  "المحتوى التعليمي بانتظار مراجعة شرعية متخصصة. اقرأوه برفقة ولي الأمر.";

export default function LearningApp() {
  const [catalog, setCatalog] = useState<Lesson[]>([]);
  const [catalogBusy, setCatalogBusy] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [notice, setNotice] = useState(DEFAULT_NOTICE);
  const [name, setName] = useState("");
  const [age, setAge] = useState(6);
  // Declared by the parent; never inferred from the name or a photo.
  const [gender, setGender] = useState<Gender | null>(null);
  const [book, setBook] = useState<LessonResponse[]>([]);
  const [images, setImages] = useState<BookImages | null>(null);
  const [crisis, setCrisis] = useState("");
  // The question steps of this session. Replies live in a ref for the length of
  // one book request and are cleared right after it: never stored or shown.
  const [steps, setSteps] = useState<Lesson[] | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const replies = useRef<ChildReply[]>([]);
  const [profile, setProfile] = useState<ReaderProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [buildError, setBuildError] = useState("");
  const generation = useRef<AbortController | null>(null);
  const workspace = useRef<HTMLElement>(null);
  // Ids shown in the previous session, in page memory only, so the next session differs.
  const previousSession = useRef<string[]>([]);

  const loadCatalog = useCallback(async (signal?: AbortSignal) => {
    setCatalogBusy(true);
    setCatalogError("");
    try {
      const data = await request<{ lessons: Lesson[]; reviewNotice: string }>(
        "/api/catalog",
        undefined,
        signal,
      );
      setCatalog(data.lessons);
      setNotice(data.reviewNotice || DEFAULT_NOTICE);
    } catch (error) {
      if (!signal?.aborted)
        setCatalogError(
          error instanceof Error ? error.message : "تعذّر تحميل المكتبة.",
        );
    } finally {
      if (!signal?.aborted) setCatalogBusy(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadCatalog(controller.signal);
    return () => controller.abort();
  }, [loadCatalog]);
  useEffect(() => () => generation.current?.abort(), []);

  function startSteps(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (generation.current || catalog.length === 0 || !gender) return;
    replies.current = [];
    setBuildError("");
    setStepIndex(0);
    setSteps(pickSession(catalog, previousSession.current));
  }

  function reply(answer: ChildReply) {
    if (!steps) return;
    replies.current[stepIndex] = answer;
    if (stepIndex + 1 < steps.length) setStepIndex(stepIndex + 1);
    else void createBook(steps);
  }

  async function createBook(selected: Lesson[]) {
    if (generation.current || !gender) return;
    const sent = replies.current;
    replies.current = [];
    const controller = new AbortController();
    generation.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 90000);
    setBusy(true);
    setBuildError("");
    try {
      // Pictures are optional: if they fail, the page draws its own.
      const pictures = request<BookImages>(
        "/api/illustrations",
        {
          sessionId: crypto.randomUUID(),
          lessonIds: selected.map((lesson) => lesson.id),
          age,
          gender,
        },
        controller.signal,
      ).catch(() => null);
      const entries = await Promise.all(
        selected.map((lesson, index) =>
          request<LessonResponse>(
            "/api/lesson",
            {
              lessonId: lesson.id,
              age,
              gender,
              reply: sent[index] ?? { kind: "none" },
            },
            controller.signal,
          ),
        ),
      );
      const bookImages = await pictures;
      if (generation.current !== controller) return;
      try {
        buildStoryBook(entries);
      } catch {
        throw new Error(
          "لم تكتمل صفحات هذا الكتاب. جرّبوا إعداد الكتاب مرة أخرى.",
        );
      }
      setProfile({
        name: name.trim() || (gender === "girl" ? "صديقتنا" : "صديقنا"),
        age,
        gender,
      });
      setCrisis(entries.find((entry) => entry.replyCrisis)?.replyCrisis ?? "");
      setImages(bookImages);
      setBook(entries.map(({ replyCrisis: _crisis, ...entry }) => entry));
      setSteps(null);
      previousSession.current = selected.map((lesson) => lesson.id);
      window.requestAnimationFrame(() => {
        workspace.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        document.getElementById("book-title")?.focus({ preventScroll: true });
      });
    } catch (error) {
      if (generation.current === controller)
        setBuildError(
          controller.signal.aborted
            ? "طال إعداد الكتاب. حاول مرة أخرى بعد قليل."
            : error instanceof Error
              ? error.message
              : "تعذّر إعداد الكتاب.",
        );
    } finally {
      sent.length = 0;
      window.clearTimeout(timeout);
      if (generation.current === controller) {
        generation.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <>
      <div className="screen-app">
        <Header />
        <main id="main" className="single-page">
          <section
            className="intro-section"
            aria-labelledby="intro-title"
            data-section="about"
          >
            <div className="intro-copy">
              <span className="section-label">١ · ما «كتابي أنا»؟</span>
              <h1 id="intro-title">
                كتاب يقرؤه طفلك.
                <br />
                <em>ومعنى يرافق يومه.</em>
              </h1>
              <p>
                كتاب مصوّر يحمل اسم طفلك، فيه أذكار مواقف يومه بنصّها كما ورد،
                ومعناها بلغة تناسب عمره. من ٥ إلى ١٢ سنة، برفقتك.
              </p>
              <p className="scope-note" data-testid="scope-note">
                {scopeNotice}
              </p>
              <a className="quiet-link" href="#make-book">
                اصنعوا كتابكم <ArrowLeft size={18} />
              </a>
            </div>
            <div className="intro-book" aria-hidden="true">
              <div className="mini-cover">
                <span>كتابي أنا</span>
                <strong>
                  كل كتاب
                  <br />
                  تبدأ بصفحة
                </strong>
                <Scene scene="morning" />
                <small>افتحوا الكتاب</small>
              </div>
            </div>
          </section>

          <section
            className="how-section"
            aria-labelledby="how-title"
            data-section="how"
          >
            <div>
              <span className="section-label">٢ · كيف نستخدمه؟</span>
              <h2 id="how-title">اختاروا، افتحوا، واقرؤوا معًا.</h2>
            </div>
            <p>
              اختاروا العمر والشخصية، وأجيبوا عن سؤال قصير لكل موقف أو تخطّوه.
              ثم افتحوا الكتاب وقلّبوا صفحاته: لكل موقف صفحة للنص وصفحة لمعناه،
              ويمكنكم طباعته.
            </p>
          </section>

          <section
            id="make-book"
            ref={workspace}
            className={`workspace ${book.length ? "workspace-reading" : ""}`}
            aria-labelledby="workspace-title"
            data-section="use"
          >
            <div className="workspace-heading">
              <span className="section-label">٣ · لنبدأ</span>
              <h2 id="workspace-title">
                {book.length ? "هذا كتابكم." : "كتاب صغير، على ذوقه."}
              </h2>
            </div>
            {crisis && (
              <p role="alert" className="error-box crisis-box">
                {crisis}
              </p>
            )}
            {book.length > 0 && profile ? (
              <BookReader
                entries={book}
                profile={profile}
                notice={notice}
                images={images}
                onEdit={() => {
                  setBook([]);
                  setImages(null);
                  setCrisis("");
                  setProfile(null);
                  window.requestAnimationFrame(() =>
                    document.getElementById("child-name")?.focus(),
                  );
                }}
              />
            ) : steps && gender ? (
              <div className="maker-card" aria-busy={busy}>
                {busy ? (
                  <p role="status" className="inline-state">
                    <LoaderCircle className="spin" size={18} />
                    نرتّب صفحات كتابك…
                  </p>
                ) : (
                  <QuestionStep
                    lesson={steps[stepIndex]}
                    index={stepIndex}
                    total={steps.length}
                    band={ageBand(age)}
                    name={name}
                    onReply={reply}
                    onCancel={() => {
                      replies.current = [];
                      setSteps(null);
                    }}
                  />
                )}
                {buildError && (
                  <div role="alert" className="error-box">
                    {buildError}
                    <button
                      type="button"
                      className="quiet-link"
                      onClick={() => {
                        setBuildError("");
                        setSteps(null);
                      }}
                    >
                      العودة إلى الاختيارات
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form
                className="maker-card"
                onSubmit={startSteps}
                aria-busy={busy}
              >
                <fieldset className="maker-fields" disabled={busy}>
                  <legend className="sr-only">اختيارات كتاب طفلك</legend>
                  <div className="personal-fields">
                    <div className="form-field">
                      <label htmlFor="child-name">
                        اسم الطفل <span>اختياري</span>
                      </label>
                      <input
                        id="child-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={24}
                        autoComplete="off"
                        placeholder="الاسم الأول فقط"
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="child-age">العمر</label>
                      <select
                        id="child-age"
                        value={age}
                        onChange={(event) => setAge(Number(event.target.value))}
                      >
                        {Array.from(
                          { length: MAX_AGE - MIN_AGE + 1 },
                          (_, index) => index + MIN_AGE,
                        ).map(
                          (value) => (
                            <option key={value} value={value}>
                              {ar(value)} {value < 11 ? "سنوات" : "سنة"}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>
                  <fieldset className="gender-field">
                    <legend>
                      الطفل <span>مطلوب</span>
                    </legend>
                    <div className="avatar-options">
                      {(["boy", "girl"] as const).map((value) => (
                        <label
                          key={value}
                          className={gender === value ? "selected" : ""}
                        >
                          <input
                            type="radio"
                            name="child-gender"
                            value={value}
                            required
                            checked={gender === value}
                            onChange={() => setGender(value)}
                          />
                          <span className="avatar-art">
                            <Scene scene="morning" avatar={value} />
                          </span>
                          <span>{value === "boy" ? "ولد" : "بنت"}</span>
                          {gender === value && <Check size={17} />}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {catalogBusy ? (
                    <p role="status" className="inline-state">
                      <LoaderCircle className="spin" size={18} />
                      نفتح المكتبة…
                    </p>
                  ) : catalogError ? (
                    <div role="alert" className="error-box">
                      {catalogError}
                      <button
                        type="button"
                        className="quiet-link"
                        onClick={() => void loadCatalog()}
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : catalog.length === 0 ? (
                    <p role="status">لا توجد كتب متاحة حاليًا. عودوا قريبًا.</p>
                  ) : (
                    <p className="selection-note">
                      في كل كتاب ثلاثة مواقف تُختار من المكتبة، ويختلف الكتاب
                      التالي عن هذا. <ReviewBadge lessons={catalog} />
                    </p>
                  )}
                  <div className="maker-bottom">
                    <button
                      className="button"
                      type="submit"
                      disabled={catalogBusy || catalog.length === 0 || busy || !gender}
                    >
                      {busy ? (
                        <>
                          <LoaderCircle className="spin" size={18} />
                          نرتّب صفحات كتابك…
                        </>
                      ) : (
                        <>
                          اصنع كتاب {name.trim() || "طفلي"}
                          <ArrowLeft size={19} />
                        </>
                      )}
                    </button>
                    <small>بلا حساب. الاسم يبقى على هذا الجهاز.</small>
                  </div>
                </fieldset>
                {buildError && (
                  <p role="alert" className="error-box">
                    {buildError}
                  </p>
                )}
              </form>
            )}
            <details id="family-note" className="family-note">
              <summary>للأسرة: المصادر والخصوصية</summary>
              <p>{notice}</p>
              <p>
                الاسم لا يُرسل إلى الخادم، ولا نطلب صورًا أو حسابًا. الكتاب
                والإجابات يبقيان في ذاكرة هذه الصفحة؛ احفظوا نسخة بالطباعة قبل
                إغلاقها. تجنّبوا كتابة معلومات شخصية في الأسئلة.
              </p>
              <p>
                لإعداد الكتاب نرسل العمر ورمز النص وجنس الطفل (ولد أو بنت) لصياغة الشرح بالمذكر أو المؤنث. تُرسل
                الأسئلة المكتوبة لمعالجتها. وما يكتبه الطفل في خطوة السؤال يُستعمل في
                طلب الشرح ويُنسى: لا يُحفظ ولا يُطبع ولا يظهر في الكتاب؛ وقد تتلقى خدمة الاستضافة بيانات
                الاتصال اللازمة للتشغيل والحماية. النسخة المطبوعة تتضمن الاسم إن
                أُدخل؛ راجعوها قبل مشاركتها.
              </p>
            </details>
          </section>
        </main>
      </div>
    </>
  );
}
