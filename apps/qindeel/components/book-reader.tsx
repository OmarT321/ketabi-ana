"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  LoaderCircle,
  RotateCcw,
  Send,
} from "lucide-react";
import { buildStoryBook } from "@platform/core/story";
import {
  REVIEW_BADGE,
  isApproved,
  sourceLine,
} from "@platform/core/content";
import type {
  Gender,
  Lesson,
  LessonResponse,
  QuestionResponse,
} from "@platform/core/types";
import type { BookImages, SceneImage } from "@platform/core/illustrations";
import { ChildFigure, Scene } from "./scene";
import { request } from "./client-api";

export type ReaderProfile = {
  name: string;
  age: number;
  gender: Gender;
};
type Page =
  | { kind: "text"; entry: LessonResponse; item: number }
  | { kind: "meaning"; entry: LessonResponse; item: number }
  | { kind: "closing" };
const ar = (value: number) => value.toLocaleString("ar-SA");
const named = (value: string, name: string) => value.replaceAll("{name}", name);
export const PARENT_LINE =
  "النصوص منقولة من مصادرها من منتج «حصن الطفل»، والمعاني من إعداد فريق المشروع وقيد المراجعة الشرعية، والشرح المعروض يُصاغ آلياً من هذه المعاني بلغة تناسب عمر الطفل. ولأي سؤال اسأل والديك أو أحد أهل العلم.";

export function ReviewBadge({ lessons }: { lessons: readonly Lesson[] }) {
  return lessons.some((lesson) => !isApproved(lesson)) ? (
    <span className="review-badge">{REVIEW_BADGE}</span>
  ) : null;
}

export function BookReader({
  entries,
  profile,
  notice,
  images,
  onEdit,
}: {
  entries: LessonResponse[];
  profile: ReaderProfile;
  notice: string;
  /** Pictures for this book, or null: the page then draws its own. */
  images: BookImages | null;
  onEdit: () => void;
}) {
  const story = useMemo(() => buildStoryBook(entries), [entries]);
  const pages = useMemo<Page[]>(
    () => [
      ...story.items.flatMap((entry, item): Page[] => [
        { kind: "text", entry, item },
        { kind: "meaning", entry, item },
      ]),
      { kind: "closing" },
    ],
    [story],
  );
  const lessons = story.items.map((entry) => entry.lesson);
  const [page, setPage] = useState(0);
  const [wide, setWide] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const reader = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 800px)");
    function resize() {
      setWide(media.matches);
      if (media.matches)
        setPage((value) => (value > 0 && value % 2 === 0 ? value - 1 : value));
    }
    resize();
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, []);

  // Odd page count (pairs + closing): the last spread is the closing page alone.
  const lastPage = pages.length;
  function focusPage() {
    window.requestAnimationFrame(() => {
      reader.current?.focus({ preventScroll: true });
      reader.current?.scrollIntoView({ behavior: "instant", block: "start" });
    });
  }
  function next() {
    setPage((value) =>
      value === 0 ? 1 : Math.min(lastPage, value + (wide ? 2 : 1)),
    );
    focusPage();
  }
  function previous() {
    setPage((value) => (value <= (wide ? 2 : 1) ? 0 : value - (wide ? 2 : 1)));
    focusPage();
  }
  const visiblePages =
    page === 0 ? [] : pages.slice(page - 1, page - 1 + (wide ? 2 : 1));
  const current = visiblePages[0];
  const progress =
    current && current.kind !== "closing"
      ? `الموقف ${ar(current.item + 1)} من ${ar(story.items.length)}`
      : null;
  const pageLabel =
    page === 0
      ? "غلاف الكتاب"
      : wide && visiblePages.length > 1
        ? `الصفحتان ${ar(page)} و${ar(page + 1)} من ${ar(pages.length)}`
        : `الصفحة ${ar(page)} من ${ar(pages.length)}`;
  const nextLabel =
    current && current.kind !== "closing" && wide
      ? current.item + 1 < story.items.length
        ? "الموقف التالي"
        : "الختام"
      : "التالية";

  return (
    <div className="book-reader" data-testid="book-reader">
      <div className="reader-screen">
        <div className="reader-toolbar">
          <div>
            <h3 id="book-title" tabIndex={-1}>
              {named(story.title, profile.name)}
            </h3>
            <ReviewBadge lessons={lessons} />
          </div>
          <div className="reader-actions">
            <button
              type="button"
              className="tool-button"
              aria-pressed={largeText}
              onClick={() => setLargeText((value) => !value)}
            >
              تكبير الخط
            </button>
            <button
              type="button"
              className="tool-button"
              onClick={() => window.print()}
            >
              <Download size={17} />
              <span>طباعة الكتاب</span>
            </button>
            <button type="button" className="tool-button" onClick={onEdit}>
              <RotateCcw size={16} />
              <span>كتاب جديد</span>
            </button>
          </div>
        </div>
        <div
          ref={reader}
          className={`reading-desk ${largeText ? "large-text" : ""}`}
          role="region"
          aria-label="قارئ الكتاب"
          tabIndex={0}
          onKeyDown={(event) => {
            if (
              (event.target as HTMLElement).closest(
                "input, textarea, select, button",
              ) ||
              event.altKey ||
              event.ctrlKey ||
              event.metaKey
            )
              return;
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              next();
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              previous();
            }
            if (event.key === "Home") {
              event.preventDefault();
              setPage(0);
            }
            if (event.key === "End") {
              event.preventDefault();
              setPage(lastPage);
            }
          }}
        >
          {page === 0 ? (
            <BookCover
              story={story}
              profile={profile}
              coverChild={images?.cover ?? null}
              onOpen={next}
            />
          ) : (
            <div
              className={`paper-spread ${wide ? "two-pages" : "one-page"}`}
              key={`${page}-${wide}`}
            >
              {visiblePages.map((item, index) => (
                <BookPage
                  key={`${page + index}-${item.kind}`}
                  item={item}
                  number={page + index}
                  profile={profile}
                  story={story}
                  notice={notice}
                  images={images}
                />
              ))}
            </div>
          )}
        </div>
        <nav className="page-controls" aria-label="تقليب صفحات الكتاب">
          <button
            type="button"
            aria-label="الصفحة السابقة"
            onClick={previous}
            disabled={page === 0}
          >
            <ArrowRight size={20} />
            <span>السابقة</span>
          </button>
          <div>
            <span role="status" aria-live="polite" aria-atomic="true">
              {pageLabel}
            </span>
            {progress && <small data-testid="progress">{progress}</small>}
          </div>
          <button
            type="button"
            aria-label="الصفحة التالية"
            onClick={next}
            disabled={page >= lastPage}
          >
            <span>{nextLabel}</span>
            <ArrowLeft size={20} />
          </button>
        </nav>
        <QuestionBox entries={story.items} age={profile.age} />
      </div>
      <div className="print-only" aria-hidden="true">
        <BookCover story={story} profile={profile} coverChild={images?.cover ?? null} />
        {pages.map((item, index) => (
          <BookPage
            key={`print-${index}`}
            item={item}
            number={index + 1}
            profile={profile}
            story={story}
            notice={notice}
            images={images}
            print
          />
        ))}
      </div>
    </div>
  );
}

const BOOK_ART = "/book";
export const COVER_LINE = "أذكاري اليومية رفيقي كل يوم";

/** Layer 2: the header art. The situation's own image when it has arrived;
 * otherwise the logo alone and the title drawn as text in the same place. */
function TopLayer({ image, title }: { image: string | null; title: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="leaf-layer leaf-top"
        src={`${BOOK_ART}/${image ?? "top-logo.png"}`}
        alt=""
      />
      <h4 className={image ? "sr-only" : "leaf-title"}>{title}</h4>
    </>
  );
}

function BookCover({
  story,
  profile,
  coverChild,
  onOpen,
}: {
  story: ReturnType<typeof buildStoryBook>;
  profile: ReaderProfile;
  coverChild: string | null;
  onOpen?: () => void;
}) {
  return (
    <article className="book-cover" data-testid="book-cover">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="leaf-layer" src={`${BOOK_ART}/cover-bg.jpg`} alt="" />
      <h4 className="sr-only">{named(story.title, profile.name)}</h4>
      <p className="cover-name" data-testid="child-name">
        {profile.name}
      </p>
      <p className="cover-line">{COVER_LINE}</p>
      <div className="cover-child">
        {coverChild ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverChild} alt={`شخصية ${profile.name}`} />
        ) : (
          <ChildFigure gender={profile.gender} label={`شخصية ${profile.name}`} />
        )}
      </div>
      <span className="cover-mark" aria-label="قصتي">
        قصتي
      </span>
      <div className="cover-badge">
        <ReviewBadge lessons={story.items.map((entry) => entry.lesson)} />
      </div>
      {onOpen && (
        <button type="button" className="cover-open" onClick={onOpen}>
          افتح الكتاب
          <ArrowLeft size={20} />
        </button>
      )}
    </article>
  );
}

function Illustration({
  entry,
  avatar,
  image,
}: {
  entry: LessonResponse;
  avatar: Gender;
  image: SceneImage | undefined;
}) {
  const [failed, setFailed] = useState(false);
  const label = `رسم لموقف ${entry.lesson.situation}`;
  if (image?.mode === "generated" && !failed)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="scene-art" src={image.url} alt={label} onError={() => setFailed(true)} />
    );
  if (image?.mode === "composite" && !failed)
    // Approved drawn background with the generated child laid over it.
    return (
      <div className="scene-composite" role="img" aria-label={label}>
        <Scene scene={image.background} avatar={avatar} hideChild />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.childUrl} alt="" onError={() => setFailed(true)} />
      </div>
    );
  return <Scene scene={entry.lesson.scene} avatar={avatar} />;
}

function BookPage({
  item,
  number,
  profile,
  story,
  notice,
  images,
}: {
  item: Page;
  number: number;
  profile: ReaderProfile;
  story: ReturnType<typeof buildStoryBook>;
  notice: string;
  images: BookImages | null;
  print?: boolean;
}) {
  const lessons =
    item.kind === "closing"
      ? story.items.map((entry) => entry.lesson)
      : [item.entry.lesson];
  const top =
    item.kind === "text"
      ? item.entry.lesson.top_layer
      : { image: null, title: item.kind === "meaning" ? "ماذا يعني؟" : "ما تعلّمتَه اليوم" };
  return (
    <article
      className={`paper-leaf page-${item.kind}`}
      data-testid="book-page"
      aria-label={`الصفحة ${ar(number)}: ${top.title}`}
    >
      {/* Layer 1: background. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="leaf-layer" src={`${BOOK_ART}/page-bg.jpg`} alt="" />
      <TopLayer image={top.image} title={top.title} />
      {/* The name is written by the page under «حِصنُ», never burnt into an image. */}
      <p className="leaf-name">{profile.name}</p>
      {/* Layer 3: content. */}
      <div className="leaf-body">
        {item.kind === "text" && (
          <>
            <blockquote className="book-card sacred-text">
              {item.entry.lesson.text}
            </blockquote>
            <p className="source-link">{sourceLine(item.entry.lesson)}</p>
          </>
        )}
        {item.kind === "meaning" && (
          <>
            <div className="book-card meaning-prose">
              <p>{named(item.entry.explanation, profile.name)}</p>
            </div>
            <small className="source-note">
              {item.entry.mode === "generated"
                ? "الشرح مصوغ آلياً من المعنى المدوَّن"
                : "المعنى كما كُتب في المصدر"}
            </small>
          </>
        )}
        {item.kind === "closing" && (
          <div className="book-card closing-card">
            <ul className="closing-list">
              {story.situations.map((situation) => (
                <li key={situation}>{situation}</li>
              ))}
            </ul>
            <div className="book-colophon">
              <p>{PARENT_LINE}</p>
              <p>{notice}</p>
            </div>
          </div>
        )}
      </div>
      {item.kind === "text" && (
        <div className="story-illustration">
          <Illustration
            entry={item.entry}
            avatar={profile.gender}
            image={images?.scenes[item.entry.lesson.id]}
          />
        </div>
      )}
      <footer className="folio">
        <ReviewBadge lessons={lessons} />
        <span>{ar(number)}</span>
      </footer>
    </article>
  );
}

function QuestionBox({
  entries,
  age,
}: {
  entries: LessonResponse[];
  age: number;
}) {
  const [lessonId, setLessonId] = useState(entries[0]?.lesson.id || "");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<QuestionResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);
  async function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (question.trim().length < 3 || controllerRef.current) return;
    setBusy(true);
    setAnswer(null);
    setError("");
    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 60000);
    try {
      const data = await request<QuestionResponse>(
        "/api/question",
        { lessonId, age, question: question.trim() },
        controller.signal,
      );
      if (!controller.signal.aborted) setAnswer(data);
    } catch (cause) {
      setError(
        controller.signal.aborted
          ? "طال الانتظار. حاول مرة أخرى بسؤال أقصر."
          : cause instanceof Error
            ? cause.message
            : "تعذّر إرسال السؤال.",
      );
    } finally {
      window.clearTimeout(timeout);
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <details className="question-box">
      <summary>لديّ سؤال عن معنى في الكتاب</summary>
      <form onSubmit={ask}>
        <div className="form-field">
          <label htmlFor="question-lesson">عن أيّ نص؟</label>
          <select
            id="question-lesson"
            value={lessonId}
            disabled={busy}
            onChange={(event) => {
              setLessonId(event.target.value);
              setAnswer(null);
              setError("");
            }}
          >
            {entries.map((entry, index) => (
              <option value={entry.lesson.id} key={entry.lesson.id}>
                {ar(index + 1)} · {entry.lesson.situation}
              </option>
            ))}
          </select>
        </div>
        <label htmlFor="book-question">نكتب سؤالنا برفقة أحد الكبار</label>
        <textarea
          id="book-question"
          placeholder="ما معنى هذا الذكر؟"
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value);
            setAnswer(null);
          }}
          minLength={3}
          maxLength={400}
          disabled={busy}
        />
        <div className="question-bottom">
          <small>عن النص ومعناه فقط، دون معلومات شخصية.</small>
          <button
            className="button"
            type="submit"
            disabled={busy || question.trim().length < 3}
          >
            {busy ? (
              <LoaderCircle size={17} className="spin" />
            ) : (
              <Send size={17} />
            )}
            {busy ? "نبحث في المعنى…" : "اسأل"}
          </button>
        </div>
      </form>
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      {answer && (
        <div className="question-answer" role="status">
          <p>{answer.answer}</p>
          {answer.source && <small>{answer.source}</small>}
        </div>
      )}
    </details>
  );
}
