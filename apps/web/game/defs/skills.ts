/* =====================================================================
 * defs/skills.ts — 스킬·숙련 랭크와 마법 3계통/9학파 정의
 * ===================================================================== */

export const RANK_NAME = ["—", "노비스", "전문가", "달인"] as const;
export const RANK_MULT = [0, 1.0, 1.55, 2.3] as const;

export type MagicTraditionId = "elemental" | "self" | "divine";
export type MagicSchoolId =
  | "fire"
  | "water"
  | "earth"
  | "wind"
  | "spirit"
  | "mind"
  | "body"
  | "light"
  | "dark";

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
  | MagicSchoolId
  | "trapfinding"
  | "identify"
  | "perception";

export type LD = "light" | "dark";
export type Rank = 0 | 1 | 2 | 3;

export const MAGIC_TRADITIONS: Record<MagicTraditionId, { name: string; schools: MagicSchoolId[] }> = {
  elemental: { name: "원소", schools: ["fire", "water", "earth", "wind"] },
  self: { name: "자아", schools: ["spirit", "mind", "body"] },
  divine: { name: "신성", schools: ["light", "dark"] },
};

export interface SkillMeta {
  name: string;
  cat: string;
  tradition?: MagicTraditionId;
  /** 주문 위력·내성 DC에 사용하는 능력치 */
  castingAttr?: "int" | "wit";
}

export const SKILLS: Record<SkillId, SkillMeta> = {
  blade: { name: "날붙이", cat: "물리" },
  cudgel: { name: "둔기", cat: "물리" },
  spear: { name: "창", cat: "물리" },
  martial: { name: "무술", cat: "물리" },
  unarmed: { name: "맨손", cat: "물리" },
  bow: { name: "활", cat: "물리" },
  thrown: { name: "투척", cat: "물리" },
  armor: { name: "갑옷", cat: "방어" },
  dodge: { name: "회피", cat: "방어" },
  shield: { name: "방패", cat: "방어" },
  fire: { name: "불", cat: "마법", tradition: "elemental", castingAttr: "int" },
  water: { name: "물", cat: "마법", tradition: "elemental", castingAttr: "int" },
  earth: { name: "땅", cat: "마법", tradition: "elemental", castingAttr: "int" },
  wind: { name: "바람", cat: "마법", tradition: "elemental", castingAttr: "int" },
  spirit: { name: "영혼", cat: "마법", tradition: "self", castingAttr: "wit" },
  mind: { name: "정신", cat: "마법", tradition: "self", castingAttr: "wit" },
  body: { name: "육체", cat: "마법", tradition: "self", castingAttr: "wit" },
  light: { name: "빛", cat: "마법", tradition: "divine", castingAttr: "wit" },
  dark: { name: "어둠", cat: "마법", tradition: "divine", castingAttr: "wit" },
  trapfinding: { name: "함정", cat: "보조" },
  identify: { name: "식별", cat: "보조" },
  perception: { name: "인지", cat: "보조" },
};

export function isMagicSchool(skill: SkillId): skill is MagicSchoolId {
  return SKILLS[skill].tradition !== undefined;
}
