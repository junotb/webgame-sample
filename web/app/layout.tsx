import type { Metadata } from "next";
import { notoSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "내일도 난 여기에 — 시설국 기록",
  description: "무너지는 것을 매일 고치는 사람의 이야기 — 공중 도시 정비 일지",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={notoSans.className}>{children}</body>
    </html>
  );
}
