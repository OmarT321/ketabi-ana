"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import type { Lesson } from "@platform/core/types";
import { REVIEW_BADGE, isApproved, sourceLine } from "@platform/core/content";
import { COPY } from "@/lib/copy";

export function SourcesCatalog() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [retry, setRetry] = useState(0);
  const [pack, setPack] = useState<Lesson["pack"]>("adhkar");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setBusy(true);
      setError("");
      try {
        const response = await fetch("/api/catalog", {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(COPY.sources.failed);
        const data = (await response.json()) as { lessons: Lesson[] };
        setLessons(data.lessons);
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error ? reason.message : COPY.sources.failed,
          );
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [retry]);
  return (
    <>
      <div className="source-toolbar">
        <div className="segmented-control">
          <button
            aria-pressed={pack === "adhkar"}
            className={pack === "adhkar" ? "active" : ""}
            onClick={() => setPack("adhkar")}
          >
            {COPY.sources.adhkar}
          </button>
          <button
            aria-pressed={pack === "manasik"}
            className={pack === "manasik" ? "active" : ""}
            onClick={() => setPack("manasik")}
          >
            {COPY.sources.manasik}
          </button>
        </div>
        <span>{COPY.sources.origin}</span>
      </div>
      {busy ? (
        <p className="inline-loading">
          <LoaderCircle size={17} className="spin" />
          {COPY.sources.loading}
        </p>
      ) : error ? (
        <div className="error-box" role="alert">
          {error}
          <button onClick={() => setRetry((value) => value + 1)}>
            {COPY.sources.retry}
          </button>
        </div>
      ) : (
        <div className="source-list">
          {lessons.filter((lesson) => lesson.pack === pack).length === 0 && (
            <p role="status">{COPY.sources.empty}</p>
          )}
          {lessons
            .filter((lesson) => lesson.pack === pack)
            .map((lesson) => (
              <article key={lesson.id} className="source-item">
                <h3>{lesson.situation}</h3>
                <blockquote>{lesson.text}</blockquote>
                <p>{sourceLine(lesson)}</p>
                <span className="review-status">
                  {isApproved(lesson)
                    ? COPY.sources.reviewer(lesson.review.reviewer)
                    : REVIEW_BADGE}
                </span>
              </article>
            ))}
        </div>
      )}
    </>
  );
}
