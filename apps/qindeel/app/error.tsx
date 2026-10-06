"use client";
import Link from "next/link";
import { COPY } from "@/lib/copy";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main id="main" className="info-page">
      <h1>{COPY.errorPage.title}</h1>
      <p>{COPY.errorPage.body}</p>
      <div className="button-row">
        <button className="button" onClick={reset}>
          {COPY.errorPage.retry}
        </button>
        <Link className="text-link" href="/">
          {COPY.errorPage.home}
        </Link>
      </div>
    </main>
  );
}
