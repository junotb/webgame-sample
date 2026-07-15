/* =====================================================================
 * portraits.ts — 캐릭터 초상화 에셋 (64×64 픽셀아트, nearest 스케일)
 *  파일명: male01~23 / female01~25. 인덱스는 1-based (남성 → 여성 순).
 * ===================================================================== */
import * as PIXI from "pixi.js";

export const MALE_COUNT = 23;
export const FEMALE_COUNT = 25;

/** 1-based 인덱스 순서의 파일명(확장자 제외) 목록 */
export const PORTRAITS: string[] = [
  ...Array.from({ length: MALE_COUNT }, (_, k) => `male${String(k + 1).padStart(2, "0")}`),
  ...Array.from({ length: FEMALE_COUNT }, (_, k) => `female${String(k + 1).padStart(2, "0")}`),
];
export const PORTRAIT_COUNT = PORTRAITS.length;

const alias = (i: number) => `portrait-${i}`;

/** boot에서 1회 호출 — 전부 프리로드 (총 ~270KB) */
export async function loadPortraits(): Promise<void> {
  await PIXI.Assets.load(
    PORTRAITS.map((name, k) => ({
      alias: alias(k + 1),
      src: `/assets/characters/${name}.png`,
      data: { scaleMode: "nearest" as const },
    })),
  );
}

/** 1-based 인덱스. 로드 전이면 undefined */
export function portraitTexture(i: number): PIXI.Texture | undefined {
  return PIXI.Assets.get(alias(i));
}
