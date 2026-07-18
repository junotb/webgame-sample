/* =====================================================================
 * defs/attrs.ts — 능력치·캐릭터 생성 상수
 * ===================================================================== */

/* ---- 능력치 (캐릭터 생성 시 분배) ---- */
export type AttrId = "might" | "int" | "wit" | "vital" | "agi" | "fortune";
export type Attrs = Record<AttrId, number>;
export const ATTRS: Record<AttrId, { name: string; abbr: string; desc: string }> = {
  might: { name: "근력", abbr: "Might", desc: "물리 공격력과 소지 무게" },
  int: { name: "지능", abbr: "Int", desc: "법사형 마법 공격, 마력 크기" },
  wit: { name: "지혜", abbr: "Wit", desc: "사제형 마법 공격, 마력량, 저주·공포 저항" },
  vital: { name: "체력", abbr: "Vital", desc: "생명력(HP), 물리 저항, 중독·질병 저항" },
  agi: { name: "민첩", abbr: "Agility", desc: "명중, 회피, 행동 순서" },
  fortune: { name: "운", abbr: "Fortune", desc: "희귀 아이템, 치명타, 랜덤 이벤트" },
};
export const ATTR_IDS = Object.keys(ATTRS) as AttrId[];
export const ATTR_BASE = 10;
export const ATTR_MIN = 8;
export const ATTR_MAX = 18;
export const CREATE_POINTS = 10;
/** 생성 시 추가로 고를 수 있는 기술 수 */
export const CREATE_SKILL_PICKS = 2;
