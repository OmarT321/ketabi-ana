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
import { COPY } from "@/lib/copy";
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
export const PARENT_LINE = COPY.book.parentLine;

export function ReviewBadge({ lessons }: { lessons: readonly Lesson[] }) {
  return lessons.some((lesson) => !isApproved(lesson)) ? (
    <span className="review-badge">{REVIEW_BADGE}</span>
  ) : null;
}

export function BookReader({
  entries,
  profile,
  images,
  onEdit,
}: {
  entries: LessonResponse[];
  profile: ReaderProfile;
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
      ? COPY.reader.situation(current.item + 1, story.items.length)
      : null;
  const pageLabel =
    page === 0
      ? COPY.reader.cover
      : wide && visiblePages.length > 1
        ? COPY.reader.spread(page, pages.length)
        : COPY.reader.page(page, pages.length);
  const nextLabel =
    current && current.kind !== "closing" && wide
      ? current.item + 1 < story.items.length
        ? COPY.reader.nextSituation
        : COPY.reader.toClosing
      : COPY.reader.next;

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
              {COPY.reader.increaseText}
            </button>
            <button
              type="button"
              className="tool-button"
              onClick={() => window.print()}
            >
              <Download size={17} />
              <span>{COPY.reader.print}</span>
            </button>
            <button type="button" className="tool-button" onClick={onEdit}>
              <RotateCcw size={16} />
              <span>{COPY.reader.newBook}</span>
            </button>
            <small className="print-note">{COPY.reader.printNote}</small>
          </div>
        </div>
        <div
          ref={reader}
          className={`reading-desk ${largeText ? "large-text" : ""}`}
          role="region"
          aria-label={COPY.reader.region}
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
                  images={images}
                />
              ))}
            </div>
          )}
        </div>
        <nav className="page-controls" aria-label={COPY.reader.nav}>
          <button
            type="button"
            aria-label={COPY.reader.previousLabel}
            onClick={previous}
            disabled={page === 0}
          >
            <ArrowRight size={20} />
            <span>{COPY.reader.previous}</span>
          </button>
          <div>
            <span role="status" aria-live="polite" aria-atomic="true">
              {pageLabel}
            </span>
            {progress && <small data-testid="progress">{progress}</small>}
          </div>
          <button
            type="button"
            aria-label={COPY.reader.nextLabel}
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
            images={images}
            print
          />
        ))}
      </div>
    </div>
  );
}

const BOOK_ART = "/book";
export const COVER_LINE = COPY.book.coverLine;

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
      {/* Owner's gradient: above the child (fades its feet), under the name (z-index in CSS). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="leaf-layer cover-top" src={`${BOOK_ART}/cover-top.png`} alt="" />
      <h4 className="sr-only">{named(story.title, profile.name)}</h4>
      <p className="cover-name" data-testid="child-name">
        {profile.name}
      </p>
      <p className="cover-line">{COVER_LINE}</p>
      <div className="cover-child">
        {coverChild ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverChild} alt={COPY.book.coverChild(profile.name)} />
        ) : (
          <ChildFigure gender={profile.gender} label={COPY.book.coverChild(profile.name)} />
        )}
      </div>
      <span className="cover-mark" aria-label={COPY.book.coverMark}>
        {COPY.book.coverMark}
      </span>
      <div className="cover-badge">
        <ReviewBadge lessons={story.items.map((entry) => entry.lesson)} />
      </div>
      {onOpen && (
        <button type="button" className="cover-open" onClick={onOpen}>
          {COPY.book.open}
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
  const label = COPY.book.sceneLabel(entry.lesson.situation);
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
  images,
}: {
  item: Page;
  number: number;
  profile: ReaderProfile;
  story: ReturnType<typeof buildStoryBook>;
  images: BookImages | null;
  print?: boolean;
}) {
  const lessons =
    item.kind === "closing"
      ? story.items.map((entry) => entry.lesson)
      : [item.entry.lesson];
  const dua = item.kind === "text" ? item.entry.lesson.dua_layer : null;
  const top =
    item.kind === "text"
      ? item.entry.lesson.top_layer
      : {
          image: null,
          title: item.kind === "meaning" ? COPY.book.meaningTitle : COPY.book.closingTitle,
        };
  return (
    <article
      className={`paper-leaf page-${item.kind}${dua ? " has-dua" : ""}`}
      data-testid="book-page"
      aria-label={COPY.reader.pageLabel(number, top.title)}
    >
      {/* Layer 1: background. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="leaf-layer" src={`${BOOK_ART}/page-bg.jpg`} alt="" />
      {dua ? (
        <h4 className="sr-only">{top.title}</h4>
      ) : (
        <TopLayer image={top.image} title={top.title} />
      )}
      {/* Inner pages carry «حِصنُ الطفل» as drawn. The name is on the cover and in the
          explanation, never on the text page or in a drawn layer. */}
      <div className="leaf-body">
        {item.kind === "text" &&
          (dua ? (
            <>
              {/* The pack's text stays the source of truth for checks, text
                  printing and screen readers; the layer shows the drawn copy. */}
              <blockquote className="sacred-text sr-only" aria-hidden="true">
                {item.entry.lesson.text}
              </blockquote>
              <p className="source-link dua-source">{sourceLine(item.entry.lesson)}</p>
            </>
          ) : (
            <>
              <blockquote className="book-card sacred-text">
                {item.entry.lesson.text}
              </blockquote>
              <p className="source-link">{sourceLine(item.entry.lesson)}</p>
            </>
          ))}
        {item.kind === "meaning" && (
          <>
            <div className="book-card meaning-prose">
              <p>{named(item.entry.explanation, profile.name)}</p>
            </div>
            {/* A meaning shown as written says so under it; the note on generated
                explanations is on the closing page, once. */}
            {item.entry.mode !== "generated" && (
              <small className="source-note">{COPY.book.explanationAsWritten}</small>
            )}
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
              {story.items.some((entry) => entry.mode === "generated") && (
                <p className="source-note">{COPY.book.explanationGenerated}</p>
              )}
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
      {dua && (
        // Top layer: the owner's dua layer, as is, above everything.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="leaf-layer leaf-dua"
          src={`${BOOK_ART}/${dua}`}
          alt={item.kind === "text" ? item.entry.lesson.text : ""}
        />
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
          ? COPY.ask.slow
          : cause instanceof Error
            ? cause.message
            : COPY.ask.failed,
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
      <summary>{COPY.ask.summary}</summary>
      <form onSubmit={ask}>
        <div className="form-field">
          <label htmlFor="question-lesson">{COPY.ask.lessonLabel}</label>
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
        <label htmlFor="book-question">{COPY.ask.questionLabel}</label>
        <textarea
          id="book-question"
          placeholder={COPY.ask.placeholder}
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
          <small>{COPY.ask.hint}</small>
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
            {busy ? COPY.ask.busy : COPY.ask.submit}
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
