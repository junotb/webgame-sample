/* =====================================================================
 * defs/classes.ts — 직업 트리 (기초 2 → 1차 4 → 2차 8)
 * ===================================================================== */

import { ResistTable } from "./damage";
import { Rank, SkillId } from "./skills";

export type ClassId =
  | "fighter"
  | "scholar"
  | "swordman"
  | "spellsword"
  | "mage"
  | "acolyte"
  | "swordmaster"
  | "assassin"
  | "paladin"
  | "ranger"
  | "archmage"
  | "druid"
  | "priest"
  | "monk";

/** 캐릭터 생성 시 선택 가능한 기초 직업 */
export const BASE_CLASSES: ClassId[] = ["fighter", "scholar"];

export interface ClassDef {
  name: string;
  tier: 0 | 1 | 2;
  from?: ClassId;
  desc: string;
  /** 모험가 스프라이트 외투/포인트 색 (전직 시 외형도 바뀐다) */
  color: number;
  accent: number;
  /** 기본 습득 랭크 (1차 이하) */
  ranks?: Partial<Record<SkillId, Rank>>;
  /** 달인(M) — 'LD'는 전직 시 빛or어둠 선택 */
  masters?: (SkillId | "LD")[];
  /** 전문가(E) */
  experts?: (SkillId | "LD")[];
  /** 빛/어둠 선택이 필요한 클래스 */
  ld?: boolean;
  /** 직업 고유의 타입별 피해 배율 (수련·소양이 부여하는 저항) */
  res?: ResistTable;
}

export const CLASSES: Record<ClassId, ClassDef> = {
  /* ---- 기초 (생성 시 선택, 2종) ---- */
  fighter: {
    name: "파이터",
    tier: 0,
    desc: "물리의 기초를 닦은 견습 전사. 날붙이와 갑옷을 다룬다.",
    color: 0x54302e, accent: 0xc0503c,
    ranks: { blade: 1, armor: 1 },
  },
  scholar: {
    name: "스콜라",
    tier: 0,
    desc: "마법의 기초를 닦은 견습 학자. 불과 육체 마법을 다룬다.",
    color: 0x2f3a56, accent: 0x8f7ff0,
    ranks: { fire: 1, body: 1 },
  },
  /* ---- 1차 (4종) ---- */
  swordman: {
    name: "소드맨",
    tier: 1,
    from: "fighter",
    desc: "순수 물리 특화. 모든 무기를 다루는 전열의 기둥.",
    color: 0x5a3a2a, accent: 0xd88a3a,
    ranks: {
      blade: 2,
      spear: 1,
      cudgel: 1,
      thrown: 1,
      armor: 1,
      shield: 1,
      dodge: 1,
    },
  },
  spellsword: {
    name: "스펠소드",
    tier: 1,
    from: "fighter",
    desc: "물리와 마법을 함께 다루는 하이브리드.",
    color: 0x3a2f52, accent: 0xc9a227,
    ranks: {
      cudgel: 1,
      bow: 1,
      blade: 1,
      armor: 1,
      shield: 1,
      dodge: 1,
      wind: 2,
      body: 1,
    },
  },
  mage: {
    name: "메이지",
    tier: 1,
    from: "scholar",
    desc: "원소 마법 특화. 불과 바람을 중심으로 네 원소를 탐구한다.",
    color: 0x342a5e, accent: 0x9a6ff0,
    ranks: { fire: 2, wind: 2, water: 1, earth: 1, mind: 1, perception: 1, cudgel: 1 },
  },
  acolyte: {
    name: "애콜라이트",
    tier: 1,
    from: "scholar",
    desc: "자아 마법 특화. 영혼·정신·육체를 수련하는 수행자.",
    color: 0x2f5240, accent: 0x5e8c5a,
    ranks: {
      body: 2,
      spirit: 1,
      mind: 1,
      martial: 1,
      unarmed: 1,
      dodge: 1,
      shield: 1,
      blade: 1,
    },
  },
  /* ---- 2차 (최종 8종) — 확정 트리 ---- */
  swordmaster: {
    name: "소드마스터",
    tier: 2,
    from: "swordman",
    desc: "왕국의 검. 날붙이와 창의 달인.",
    color: 0x4a3a2a, accent: 0xe8b84a,
    masters: ["blade", "spear"],
    experts: ["armor", "shield"],
    /* 무수한 검격을 흘려낸 몸 — 베기·찌르기 15% 경감 */
    res: { slash: 0.85, pierce: 0.85 },
  },
  assassin: {
    name: "어쌔신",
    tier: 2,
    from: "swordman",
    desc: "그림자의 칼날. 함정과 급소를 꿰뚫는 자.",
    color: 0x241f2e, accent: 0x8a8a99,
    masters: ["blade", "thrown", "trapfinding", "dodge"],
    experts: ["perception", "identify"],
  },
  paladin: {
    name: "성기사",
    tier: 2,
    from: "spellsword",
    ld: true,
    desc: "신념의 방벽. 둔기와 방패, 그리고 선택한 신앙.",
    color: 0x5a4a2a, accent: 0xe8dcc0,
    masters: ["cudgel", "armor", "shield"],
    experts: ["LD", "body"],
    /* 신념의 방벽 — 어둠 피해 30% 경감 */
    res: { dark: 0.7 },
  },
  ranger: {
    name: "레인저",
    tier: 2,
    from: "spellsword",
    ld: true,
    desc: "경계의 사냥꾼. 활과 지식으로 야수를 추적한다.",
    color: 0x2f5240, accent: 0x8fb04a,
    masters: ["bow", "identify", "dodge"],
    experts: ["wind", "earth", "perception", "LD"],
    /* 바람을 읽는 사냥꾼 — 바람 피해 20% 경감 */
    res: { wind: 0.8 },
  },
  archmage: {
    name: "대마법사",
    tier: 2,
    from: "mage",
    ld: true,
    desc: "원소의 정점. 빛 혹은 어둠의 비의를 함께 다룬다.",
    color: 0x2a2450, accent: 0xb46ff0,
    masters: ["fire", "wind", "LD"],
    experts: ["water", "earth", "mind", "perception"],
    /* 원소의 정점 — 불·바람 피해 20% 경감 */
    res: { fire: 0.8, wind: 0.8 },
  },
  druid: {
    name: "드루이드",
    tier: 2,
    from: "mage",
    ld: true,
    desc: "대지의 현자. 원소와 둔기, 숨겨진 것의 발견자.",
    color: 0x3d4a2a, accent: 0x9a8f4a,
    masters: ["earth", "water", "body", "cudgel", "perception"],
    experts: ["spirit", "LD", "identify"],
    /* 대지의 현자 — 땅·물 피해 25% 경감 */
    res: { earth: 0.75, water: 0.75 },
  },
  priest: {
    name: "사제",
    tier: 2,
    from: "acolyte",
    ld: true,
    desc: "영혼의 인도자. 선택한 신앙으로 생명을 다룬다.",
    color: 0x4a4458, accent: 0xd8cba0,
    masters: ["spirit", "body", "LD"],
    experts: ["mind", "shield"],
    /* 영혼의 인도자 — 어둠 피해 20% 경감 */
    res: { dark: 0.8 },
  },
  monk: {
    name: "몽크",
    tier: 2,
    from: "acolyte",
    ld: true,
    desc: "무념의 주먹. 영혼과 육체를 하나로 벼린다.",
    color: 0x54302e, accent: 0xd8a531,
    masters: ["body", "mind", "martial", "unarmed", "dodge"],
    experts: ["spirit", "LD"],
    /* 무념의 정신 — 영혼 피해 30% 경감 */
    res: { spirit: 0.7 },
  },
};
