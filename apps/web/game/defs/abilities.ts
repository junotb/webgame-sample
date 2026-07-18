/* =====================================================================
 * defs/abilities.ts — 전투 어빌리티·필드 스킬
 * ===================================================================== */

import { Rank, SkillId } from "./skills";

export interface AbilityDef {
  id: string;
  skill: SkillId;
  min: Rank;
  name: string;
  mp: number;
  pow: number;
  hits: number;
  kind: "phys" | "mag" | "heal";
  all?: boolean;
  pierce?: boolean;
  crit?: number;
  drain?: number;
  /** 적중된 적이 시전자만 공격하게 된다 (시전자가 쓰러지면 해제) */
  taunt?: boolean;
  /** 적 방어력 감소 기본치 (RANK 배율 적용) */
  defDown?: number;
  /** 적중된 적은 다음 턴 마법을 실행할 수 없다 */
  silence?: boolean;
  /** 남은 MP 전부 소모 — 소모량 × 계수만큼 추가 피해 */
  manaBurn?: number;
  /** 아군 대상 — 다음에 받는 공격을 대신 맞는다 */
  cover?: boolean;
  /** 무조건 치명타로 적중 */
  sureCrit?: boolean;
  desc: string;
}

export const ABILITIES: AbilityDef[] = [
  /* ---- 물리(phys)는 무술(Martial Arts) 스킬 전용 ---- */
  {
    id: "provoke",
    skill: "martial",
    min: 1,
    name: "도발",
    mp: 3,
    pow: 0.5,
    hits: 1,
    kind: "phys",
    taunt: true,
    desc: "적중된 적은 시전자만 공격하게 된다",
  },
  {
    id: "armorbreak",
    skill: "martial",
    min: 1,
    name: "갑옷 부수기",
    mp: 4,
    pow: 0.9,
    hits: 1,
    kind: "phys",
    defDown: 2,
    desc: "적의 방어력 감소 (랭크에 비례)",
  },
  {
    id: "concuss",
    skill: "martial",
    min: 2,
    name: "뇌진탕",
    mp: 6,
    pow: 1.2,
    hits: 1,
    kind: "phys",
    silence: true,
    desc: "적중된 적은 다음 턴 마법을 쓸 수 없다",
  },
  {
    id: "slam",
    skill: "martial",
    min: 2,
    name: "강타",
    mp: 0,
    pow: 1.3,
    hits: 1,
    kind: "phys",
    manaBurn: 1.2,
    desc: "모든 마나를 소모, 소모량에 비례한 추가 피해",
  },
  {
    id: "intervene",
    skill: "martial",
    min: 3,
    name: "가로막기",
    mp: 4,
    pow: 0,
    hits: 1,
    kind: "phys",
    cover: true,
    desc: "파티원이 다음에 받는 공격을 대신 맞는다",
  },
  {
    id: "perfectstrike",
    skill: "martial",
    min: 3,
    name: "완벽한 일격",
    mp: 12,
    pow: 1.6,
    hits: 1,
    kind: "phys",
    sureCrit: true,
    silence: true,
    desc: "반드시 치명타. 적은 다음 턴 마법 봉인",
  },
  {
    id: "fireball",
    skill: "elemental",
    min: 1,
    name: "화염구",
    mp: 5,
    pow: 1.6,
    hits: 1,
    kind: "mag",
    desc: "불꽃의 구체",
  },
  {
    id: "chainlt",
    skill: "elemental",
    min: 2,
    name: "연쇄 번개",
    mp: 9,
    pow: 1.1,
    hits: 1,
    all: true,
    kind: "mag",
    desc: "적 전체에 번개",
  },
  {
    id: "meteor",
    skill: "elemental",
    min: 3,
    name: "메테오",
    mp: 16,
    pow: 1.8,
    hits: 1,
    all: true,
    kind: "mag",
    desc: "하늘이 무너진다 (전체)",
  },
  {
    id: "psyshock",
    skill: "spirit",
    min: 1,
    name: "정신 충격",
    mp: 5,
    pow: 1.45,
    hits: 1,
    kind: "mag",
    desc: "영혼을 뒤흔든다",
  },
  {
    id: "heal",
    skill: "spirit",
    min: 1,
    name: "치유",
    mp: 6,
    pow: 1.2,
    hits: 1,
    kind: "heal",
    desc: "아군 한 명의 생명력 회복",
  },
  {
    id: "holy",
    skill: "light",
    min: 1,
    name: "성스러운 빛",
    mp: 7,
    pow: 1.6,
    hits: 1,
    kind: "mag",
    desc: "정화의 광휘",
  },
  {
    id: "shadow",
    skill: "dark",
    min: 1,
    name: "암흑구",
    mp: 6,
    pow: 1.7,
    hits: 1,
    kind: "mag",
    desc: "응축된 어둠",
  },
  {
    id: "drain",
    skill: "dark",
    min: 2,
    name: "생명 흡수",
    mp: 9,
    pow: 1.3,
    hits: 1,
    kind: "mag",
    drain: 0.5,
    desc: "피해의 절반을 흡수",
  },
];

export interface FieldSkillDef {
  id: "recall" | "bless" | "darkveil" | "seek";
  skill: SkillId;
  min: Rank;
  name: string;
  mp: number;
  desc: string;
}
export const FIELD_SKILLS: FieldSkillDef[] = [
  {
    id: "recall",
    skill: "elemental",
    min: 2,
    name: "귀환",
    mp: 5,
    desc: "파티를 마을로 순간이동시킨다.",
  },
  {
    id: "bless",
    skill: "light",
    min: 1,
    name: "축복",
    mp: 4,
    desc: "다음 전투에서 파티 공격력 +25%.",
  },
  {
    id: "darkveil",
    skill: "dark",
    min: 2,
    name: "어둠의 장막",
    mp: 4,
    desc: "한동안 인카운터율이 크게 감소.",
  },
  {
    id: "seek",
    skill: "perception",
    min: 1,
    name: "탐색",
    mp: 2,
    desc: "주변의 숨겨진 것을 발견한다.",
  },
];
