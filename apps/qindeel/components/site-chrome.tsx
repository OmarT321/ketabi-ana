import Link from "next/link";
import { ArrowUpLeft, BookOpen } from "lucide-react";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="كتابي أنا — الصفحة الرئيسية">
      <span className="brand-icon">
        <BookOpen size={26} strokeWidth={1.6} />
      </span>
      <span className="brand-name">
        كتابي أنا<span>كتاب يحمل اسم طفلك</span>
      </span>
    </Link>
  );
}

export function Header({ onStart }: { onStart?: () => void }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <span className="header-note">كتاب نقرؤه معًا</span>
        {onStart ? (
          <button className="button button-small" onClick={onStart}>
            اصنع كتاب طفلك
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
        <p>نُضيء المعنى. ونترك في القلب أثرًا.</p>
        <span className="little-star">✳</span>
      </div>
      <div className="footer-bottom">
        <span>كتابي أنا · تعلّم ينمو مع طفلك</span>
        <div>
          <Link href="/parents">دليل الأسرة</Link>
          <Link href="/sources">المصادر والمراجعة</Link>
          <Link href="/privacy">الخصوصية</Link>
        </div>
        <span>صُنع للأطفال، برفقة الكبار ♡</span>
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
          نبدأ حكايتنا
          <ArrowUpLeft size={18} />
        </Link>
      </main>
      <Footer />
    </>
  );
}
