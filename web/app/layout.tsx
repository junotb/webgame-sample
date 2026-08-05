import type { Metadata } from "next";
import { notoSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "부서진 왕국의 연대기 — 시설국 기록",
  description: "지시서를 분류하고 쇠락하는 도시의 하루를 기록하는 문서형 RPG",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={notoSans.className}>{children}</body>
    </html>
  );
}
