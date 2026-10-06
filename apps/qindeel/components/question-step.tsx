"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { AgeBand, ChildReply, Lesson } from "@platform/core/types";
import {
  STEP_QUESTION,
  MAX_REPLY_LENGTH,
  hintChipsFor,
} from "@platform/core/content";
import { maskName } from "@platform/core/story";
import { COPY } from "@/lib/copy";

export const REPLY_WARNING = COPY.step.replyWarning;


/** One question step, outside the book. No reply is right or wrong; the step
 * can be skipped, and the whole path works without typing anything. */
export function QuestionStep({
  lesson,
  index,
  total,
  band,
  name,
  onReply,
  onCancel,
}: {
  lesson: Lesson;
  index: number;
  total: number;
  band: AgeBand;
  name: string;
  onReply: (reply: ChildReply) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const chips = hintChipsFor(lesson);
  useEffect(() => {
    setDraft("");
    heading.current?.focus();
  }, [lesson.id]);

  return (
    <section
      className="question-step"
      aria-labelledby="step-question"
      data-testid="question-step"
    >
      <p className="step-progress" data-testid="step-progress">
        {COPY.step.progress(index + 1, total)}
      </p>
      <p className="step-situation">{lesson.top_layer.title}</p>
      <blockquote className="step-text">{lesson.text}</blockquote>
      <h3 id="step-question" ref={heading} tabIndex={-1}>
        {STEP_QUESTION[band]}
      </h3>
      {chips.length > 0 && (
        <div className="step-chips">
          {chips.map((chip, value) => (
            <button
              type="button"
              key={chip}
              onClick={() => onReply({ kind: "chip", index: value })}
            >
              {chip}
            </button>
          ))}
        </div>
      )}
      {band === "older" && (
        <form
          className="step-reply"
          onSubmit={(event) => {
            event.preventDefault();
            const text = maskName(draft.trim(), name);
            if (text) onReply({ kind: "text", text });
          }}
        >
          <p className="step-warning" id="reply-warning">
            {REPLY_WARNING}
          </p>
          <label htmlFor="step-reply">
            {COPY.step.replyLabel} <span>{COPY.form.optional}</span>
          </label>
          <textarea
            id="step-reply"
            value={draft}
            maxLength={MAX_REPLY_LENGTH}
            rows={3}
            autoComplete="off"
            aria-describedby="reply-warning"
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="button" disabled={!draft.trim()}>
            {COPY.step.submit}
            <ArrowLeft size={18} />
          </button>
        </form>
      )}
      <div className="step-actions">
        <button type="button" onClick={() => onReply({ kind: "none" })}>
          {COPY.step.dontKnow}
        </button>
        <button type="button" onClick={() => onReply({ kind: "none" })}>
          {COPY.step.skip}
        </button>
      </div>
      <button type="button" className="quiet-link step-cancel" onClick={onCancel}>
        {COPY.form.back}
      </button>
    </section>
  );
}
