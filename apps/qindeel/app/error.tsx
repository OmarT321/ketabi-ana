"use client";
import Link from "next/link";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main id="main" className="info-page">
      <h1>تعذّر فتح هذه الصفحة</h1>
      <p>يمكنك إعادة المحاولة. لم تُحفظ بيانات الطفل في حساب.</p>
      <div className="button-row">
        <button className="button" onClick={reset}>
          إعادة المحاولة
        </button>
        <Link className="text-link" href="/">
          العودة إلى الصفحة الرئيسية
        </Link>
      </div>
    </main>
  );
}
