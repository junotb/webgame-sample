/* =====================================================================
 * portraits.ts — 캐릭터 초상화 에셋 (nearest 스케일)
 *  파일명: halfling_male_01~23 / halfling_female_01~25 / goblin_01~48.
 *  인덱스는 1-based.
 * ===================================================================== */
import * as PIXI from "pixi.js";

export const HALFLING_MALE_COUNT = 23;
export const HALFLING_FEMALE_COUNT = 25;
export const GOBLIN_COUNT = 48;

/** 1-based 인덱스 순서의 파일명(확장자 제외) 목록 */
export const PORTRAITS: string[] = [
  ...Array.from({ length: HALFLING_MALE_COUNT }, (_, k) => `halfling_male_${String(k + 1).padStart(2, "0")}`),
  ...Array.from({ length: HALFLING_FEMALE_COUNT }, (_, k) => `halfling_female_${String(k + 1).padStart(2, "0")}`),
  ...Array.from({ length: GOBLIN_COUNT }, (_, k) => `goblin_${String(k + 1).padStart(2, "0")}`),
];
export const PORTRAIT_COUNT = PORTRAITS.length;

/** 스토리 이벤트 화자별 초상화 인덱스 (halfling_male 1~23 · female 24~48 · goblin 49~96) */
export const STORY_PORTRAITS = {
  /** 연방 군주 — 관을 쓴 붉은 예복의 노군주 (halfling_male_23) */
  federalLord: 23,
  /** 어린 군주 — 금발의 소년 군주 (halfling_male_05) */
  youngLord: 5,
  /** 산적 두목 — 두건을 두른 험상궂은 사내 (halfling_male_15) */
  banditBoss: 15,
  /** 그름바크 — 로브를 두른 고블린 주술사 (goblin_20) */
  grumbark: 48 + 20,
  /** 되살아난 주교 카르마스 — 검은 후드의 망령 (goblin_33) */
  karmath: 48 + 33,
} as const;

const alias = (i: number) => `portrait-${i}`;

/** boot에서 1회 호출 — 전부 프리로드 */
export async function loadPortraits(): Promise<void> {
  await PIXI.Assets.load(
    PORTRAITS.map((name, k) => ({
      alias: alias(k + 1),
      src: `/assets/portraits/${name}.png`,
      data: { scaleMode: "nearest" as const },
    })),
  );
}

/** 1-based 인덱스. 로드 전이면 undefined */
export function portraitTexture(i: number): PIXI.Texture | undefined {
  return PIXI.Assets.get(alias(i));
}
