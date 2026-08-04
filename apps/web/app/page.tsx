import { notoSans } from "./fonts";

export default function Home() {
  return (
    <main
      style={{ fontFamily: notoSans.style.fontFamily }}
      className="flex min-h-screen items-center justify-center"
    >
      <p>텍스트 RPG — 새로 시작</p>
    </main>
  );
}
