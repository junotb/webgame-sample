import type { Metadata, Viewport } from "next";
import { notoSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "내일도 난 여기에 — 시설국 기록",
  description: "무너지는 것을 매일 고치는 사람의 이야기 — 공중 도시 정비 일지",
};

/* 기준 화면은 모바일 가로모드 (docs/ui-screen-spec.md §0).
   cover가 아니면 노치 폰 가로에서 좌우 세이프 에어리어가 레터박스로 남는다 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={notoSans.className}>{children}</body>
    </html>
  );
}
