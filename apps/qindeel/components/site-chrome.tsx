import Link from "next/link";
import { ArrowUpLeft, BookOpen } from "lucide-react";
import { COPY } from "@/lib/copy";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label={COPY.site.homeLabel}>
      <span className="brand-icon">
        <BookOpen size={26} strokeWidth={1.6} />
      </span>
      <span className="brand-name">
        {COPY.site.name}<span>{COPY.site.tagline}</span>
      </span>
    </Link>
  );
}

export function Header({ onStart }: { onStart?: () => void }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <span className="header-note">{COPY.site.headerNote}</span>
        {onStart ? (
          <button className="button button-small" onClick={onStart}>
            {COPY.site.headerStart}
            <ArrowUpLeft size={16} />
          </button>
        ) : null}
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <Brand />
        <p>{COPY.site.footerLine}</p>
        <span className="little-star">✳</span>
      </div>
      <div className="footer-bottom">
        <span>{COPY.site.footerBrand}</span>
        <div>
          <Link href="/parents">{COPY.site.linkFamily}</Link>
          <Link href="/sources">{COPY.site.linkSources}</Link>
          <Link href="/privacy">{COPY.site.linkPrivacy}</Link>
        </div>
        <span>{COPY.site.footerMade}</span>
      </div>
    </footer>
  );
}

export function InfoLayout({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main id="main" className="info-page">
        <div className="eyebrow">
          <span />
          {eyebrow}
        </div>
        <h1>{title}</h1>
        <div className="info-content">{children}</div>
        <Link href="/#make-book" className="button">
          {COPY.site.infoStart}
          <ArrowUpLeft size={18} />
        </Link>
      </main>
      <Footer />
    </>
  );
}
