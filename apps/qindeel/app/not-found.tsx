import Link from "next/link";
import { COPY } from "@/lib/copy";
export default function NotFound() {
  return (
    <main id="main" className="info-page">
      <p className="eyebrow">{COPY.notFound.eyebrow}</p>
      <h1>{COPY.notFound.title}</h1>
      <p>{COPY.notFound.body}</p>
      <Link href="/" className="button">
        {COPY.notFound.home}
      </Link>
    </main>
  );
}
