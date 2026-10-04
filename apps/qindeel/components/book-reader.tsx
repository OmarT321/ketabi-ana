"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
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
  Lesson,
  LessonResponse,
  QuestionResponse,
} from "@platform/core/types";
import { Scene } from "./scene";
import { request } from "./client-api";

export type ReaderProfile = {
  name: string;
  age: number;
  avatar: "boy" | "girl";
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
  onEdit,
}: {
  entries: LessonResponse[];
  profile: ReaderProfile;
  notice: string;
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
            <BookCover story={story} profile={profile} onOpen={next} />
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
        <BookCover story={story} profile={profile} />
        {pages.map((item, index) => (
          <BookPage
            key={`print-${index}`}
            item={item}
            number={index + 1}
            profile={profile}
            story={story}
            notice={notice}
            print
          />
        ))}
      </div>
    </div>
  );
}

function BookCover({
  story,
  profile,
  onOpen,
}: {
  story: ReturnType<typeof buildStoryBook>;
  profile: ReaderProfile;
  onOpen?: () => void;
}) {
  return (
    <article className="book-cover" data-testid="book-cover">
      <div className="cover-border">
        <span className="cover-brand">
          <BookOpen size={20} />
          كتابي أنا
        </span>
        <ReviewBadge lessons={story.items.map((entry) => entry.lesson)} />
        <h4>{named(story.title, profile.name)}</h4>
        <p className="cover-subtitle">{story.situations.join(" · ")}</p>
        <div className="cover-illustration">
          <Scene
            scene={story.items[0]?.lesson.scene ?? "morning"}
            avatar={profile.avatar}
          />
        </div>
        {onOpen && (
          <button type="button" className="cover-open" onClick={onOpen}>
            افتح الكتاب
            <ArrowLeft size={20} />
          </button>
        )}
      </div>
    </article>
  );
}

function Illustration({
  entry,
  avatar,
}: {
  entry: LessonResponse;
  avatar: ReaderProfile["avatar"];
}) {
  const [failed, setFailed] = useState(false);
  return entry.imageUrl && !failed ? (
    <Image
      src={entry.imageUrl}
      width={960}
      height={700}
      sizes="(max-width: 800px) 85vw, 420px"
      alt={`رسم لموقف ${entry.lesson.situation}`}
      unoptimized
      onError={() => setFailed(true)}
    />
  ) : (
    <Scene scene={entry.lesson.scene} avatar={avatar} />
  );
}

function BookPage({
  item,
  number,
  profile,
  story,
  notice,
  print = false,
}: {
  item: Page;
  number: number;
  profile: ReaderProfile;
  story: ReturnType<typeof buildStoryBook>;
  notice: string;
  print?: boolean;
}) {
  const lessons =
    item.kind === "closing"
      ? story.items.map((entry) => entry.lesson)
      : [item.entry.lesson];
  const title =
    item.kind === "text"
      ? `عند ${item.entry.lesson.situation} نقول:`
      : item.kind === "meaning"
        ? "ماذا يعني؟"
        : "ما تعلّمتَه اليوم";
  return (
    <article
      className={`paper-leaf page-${item.kind}`}
      data-testid="book-page"
      aria-label={`الصفحة ${ar(number)}: ${title}`}
    >
      <div className="running-head">
        <span>كتاب {profile.name}</span>
        <ReviewBadge lessons={lessons} />
        <span>كتابي أنا</span>
      </div>
      <div className="leaf-content">
        <h4>{title}</h4>
        {item.kind === "text" && (
          <>
            <blockquote className="sacred-text">
              {item.entry.lesson.text}
            </blockquote>
            <p className="source-link">{sourceLine(item.entry.lesson)}</p>
            <div className="story-illustration">
              <Illustration entry={item.entry} avatar={profile.avatar} />
            </div>
          </>
        )}
        {item.kind === "meaning" && (
          <>
            <div className="meaning-prose">
              <p>{named(item.entry.explanation, profile.name)}</p>
            </div>
            {item.entry.mode === "generated" && (
              <small className="source-note">
                الشرح مصوغ آلياً من المعنى المدوَّن
              </small>
            )}
            <QuizCard lesson={item.entry.lesson} print={print} />
          </>
        )}
        {item.kind === "closing" && (
          <>
            <ul className="closing-list">
              {story.situations.map((situation) => (
                <li key={situation}>{situation}</li>
              ))}
            </ul>
            <div className="book-colophon">
              <p>{PARENT_LINE}</p>
              <p>{notice}</p>
            </div>
          </>
        )}
      </div>
      <footer className="folio">
        <span>{ar(number)}</span>
      </footer>
    </article>
  );
}

function QuizCard({ lesson, print }: { lesson: Lesson; print: boolean }) {
  const [choice, setChoice] = useState<number | null>(null);
  if (print)
    return (
      <div className="quiz-card">
        <p className="quiz-question">{lesson.question}</p>
        <ol className="print-questions">
          {lesson.options.map((option) => (
            <li key={option}>{option}</li>
          ))}
        </ol>
      </div>
    );
  return (
    <div className="quiz-card">
      <p className="quiz-question">{lesson.question}</p>
      <div className="answer-options">
        {lesson.options.map((option, value) => (
          <button
            type="button"
            key={option}
            disabled={choice !== null}
            aria-pressed={choice === value}
            className={`${choice === value ? "selected" : ""} ${choice !== null && value === lesson.answer ? "correct" : ""}`}
            onClick={() => setChoice(value)}
          >
            {option}
            {choice !== null && value === lesson.answer && <Check size={18} />}
          </button>
        ))}
      </div>
      {choice !== null && (
        <p className="quiz-feedback" role="status">
          {choice === lesson.answer
            ? "أحسنت، هذا هو المعنى."
            : `نراجعها معًا: ${lesson.options[lesson.answer]}.`}
          <button
            type="button"
            className="quiet-link"
            onClick={() => setChoice(null)}
          >
            نحاول مرة أخرى
          </button>
        </p>
      )}
    </div>
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
