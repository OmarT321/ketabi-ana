import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="info-page">
      <p className="eyebrow">٤٠٤</p>
      <h1>هذه الصفحة ليست في كتابنا</h1>
      <p>لنعد إلى البداية ونفتح كتاباً جديداً.</p>
      <Link href="/" className="button">
        العودة إلى الصفحة الرئيسية
      </Link>
    </main>
  );
}
