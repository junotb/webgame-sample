import type { Metadata } from "next";
import { notoSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "부서진 왕국의 연대기 — Prototype",
  description: "Chronicle of the Shattered Realm · Next.js 16 + TypeScript + PixiJS prototype",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={notoSans.className}>{children}</body>
    </html>
  );
}
