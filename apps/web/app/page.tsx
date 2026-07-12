import GameCanvas from "@/components/GameCanvas";
import { notoSans, notoSerif } from "./fonts";

export default function Home() {
  return (
    <main>
      <GameCanvas
        displayFont={notoSerif.style.fontFamily}
        bodyFont={notoSans.style.fontFamily}
      />
    </main>
  );
}
