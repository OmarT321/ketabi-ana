import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Aref_Ruqaa } from "next/font/google";
import "./globals.css";
import { COPY } from "@/lib/copy";

const sans = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// Book display face (names and page titles): closest free match to the «حِصنُ»
// lettering. OFL; self-hosted at build time by next/font.
const display = Aref_Ruqaa({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: COPY.site.name, template: `%s | ${COPY.site.name}` },
  description: COPY.site.metaDescription,
  robots: {
    index: process.env.CONTENT_MODE === "reviewed",
    follow: process.env.CONTENT_MODE === "reviewed",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${sans.variable} ${display.variable}`}>
        <a className="skip-link" href="#main">
          {COPY.site.skipLink}
        </a>
        {children}
      </body>
    </html>
  );
}
