import GameCanvas from "@/components/GameCanvas";
import { notoSans } from "./fonts";

export default function Home() {
  return (
    <main>
      <GameCanvas
        displayFont={notoSans.style.fontFamily}
        bodyFont={notoSans.style.fontFamily}
      />
    </main>
  );
}
