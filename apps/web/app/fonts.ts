import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";

export const notoSans = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const notoSerif = Noto_Serif_KR({
  weight: ["600", "900"],
  subsets: ["latin"],
  display: "swap",
});
