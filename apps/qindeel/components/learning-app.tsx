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
import { COPY } from "@/lib/copy";

const DEFAULT_NOTICE: string = COPY.review.noticeDefault;

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
          error instanceof Error ? error.message : COPY.form.loadFailed,
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
        throw new Error(COPY.build.incomplete);
      }
      setProfile({
        name: name.trim() || COPY.form.defaultName[gender],
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
            ? COPY.build.slow
            : error instanceof Error
              ? error.message
              : COPY.build.failed,
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
              <span className="section-label">{COPY.intro.label}</span>
              <h1 id="intro-title">
                {COPY.intro.titleLine1}
                <br />
                <em>{COPY.intro.titleLine2}</em>
              </h1>
              <p>{COPY.intro.body}</p>
              <p className="scope-note" data-testid="scope-note">
                {scopeNotice}
              </p>
              <a className="quiet-link" href="#make-book">
                {COPY.intro.start} <ArrowLeft size={18} />
              </a>
            </div>
            <div className="intro-book" aria-hidden="true">
              <div className="mini-cover">
                <span>{COPY.intro.miniCoverName}</span>
                <strong>
                  {COPY.intro.miniCoverLine1}
                  <br />
                  {COPY.intro.miniCoverLine2}
                </strong>
                <Scene scene="morning" />
                <small>{COPY.intro.miniCoverOpen}</small>
              </div>
            </div>
          </section>

          <section
            className="how-section"
            aria-labelledby="how-title"
            data-section="how"
          >
            <div>
              <span className="section-label">{COPY.intro.howLabel}</span>
              <h2 id="how-title">{COPY.intro.howTitle}</h2>
            </div>
            <p>{COPY.intro.howBody}</p>
          </section>

          <section
            id="make-book"
            ref={workspace}
            className={`workspace ${book.length ? "workspace-reading" : ""}`}
            aria-labelledby="workspace-title"
            data-section="use"
          >
            <div className="workspace-heading">
              <span className="section-label">{COPY.intro.makeLabel}</span>
              <h2 id="workspace-title">
                {book.length ? COPY.intro.readingTitle : COPY.intro.makeTitle}
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
                    {COPY.form.building}
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
                      {COPY.form.back}
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
                  <legend className="sr-only">{COPY.form.legend}</legend>
                  <div className="personal-fields">
                    <div className="form-field">
                      <label htmlFor="child-name">
                        {COPY.form.nameLabel} <span>{COPY.form.optional}</span>
                      </label>
                      <input
                        id="child-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={24}
                        autoComplete="off"
                        placeholder={COPY.form.namePlaceholder}
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="child-age">{COPY.form.ageLabel}</label>
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
                              {COPY.form.years(value)}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>
                  <fieldset className="gender-field">
                    <legend>
                      {COPY.form.childLegend} <span>{COPY.form.required}</span>
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
                          <span>{COPY.form[value]}</span>
                          {gender === value && <Check size={17} />}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {catalogBusy ? (
                    <p role="status" className="inline-state">
                      <LoaderCircle className="spin" size={18} />
                      {COPY.form.loading}
                    </p>
                  ) : catalogError ? (
                    <div role="alert" className="error-box">
                      {catalogError}
                      <button
                        type="button"
                        className="quiet-link"
                        onClick={() => void loadCatalog()}
                      >
                        {COPY.form.retry}
                      </button>
                    </div>
                  ) : catalog.length === 0 ? (
                    <p role="status">{COPY.form.empty}</p>
                  ) : (
                    <p className="selection-note">
                      {COPY.form.selection} <ReviewBadge lessons={catalog} />
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
                          {COPY.form.building}
                        </>
                      ) : (
                        <>
                          {COPY.form.submit(name.trim())}
                          <ArrowLeft size={19} />
                        </>
                      )}
                    </button>
                    <small>{COPY.form.privacyHint}</small>
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
              <summary>{COPY.family.summary}</summary>
              <p>{notice}</p>
              <p>{COPY.family.privacy}</p>
              <p>{COPY.family.sent}</p>
              <p>{COPY.family.replies}</p>
              <p>{COPY.family.hosting}</p>
              <p>{COPY.family.print}</p>
            </details>
          </section>
        </main>
      </div>
    </>
  );
}
