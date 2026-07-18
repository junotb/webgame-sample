/* =====================================================================
 * defs/skills.ts — 스킬·숙련 랭크 정의
 * ===================================================================== */

export const RANK_NAME = ["—", "노비스", "전문가", "달인"] as const;
export const RANK_MULT = [0, 1.0, 1.55, 2.3] as const;

export type SkillId =
  | "blade"
  | "cudgel"
  | "spear"
  | "martial"
  | "unarmed"
  | "bow"
  | "thrown"
  | "armor"
  | "dodge"
  | "shield"
  | "elemental"
  | "spirit"
  | "light"
  | "dark"
  | "trapfinding"
  | "identify"
  | "perception";

export type LD = "light" | "dark";
export type Rank = 0 | 1 | 2 | 3;

export const SKILLS: Record<SkillId, { name: string; cat: string }> = {
  blade: { name: "날붙이", cat: "물리" },
  cudgel: { name: "둔기", cat: "물리" },
  spear: { name: "창", cat: "물리" },
  martial: { name: "무술", cat: "물리" },
  /* 맨손 — 무기를 들고 있지 않을 때 랭크당 공격력 보너스 (memberStats 참조) */
  unarmed: { name: "맨손", cat: "물리" },
  bow: { name: "활", cat: "물리" },
  thrown: { name: "투척", cat: "물리" },
  armor: { name: "갑옷", cat: "방어" },
  dodge: { name: "회피", cat: "방어" },
  shield: { name: "방패", cat: "방어" },
  elemental: { name: "원소", cat: "마법" },
  spirit: { name: "영혼", cat: "마법" },
  light: { name: "빛", cat: "마법" },
  dark: { name: "어둠", cat: "마법" },
  trapfinding: { name: "함정", cat: "보조" },
  identify: { name: "식별", cat: "보조" },
  perception: { name: "인지", cat: "보조" },
};
