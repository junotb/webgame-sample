/* =====================================================================
 * defs/abilities.ts — 전투 어빌리티·필드 스킬
 * ===================================================================== */

import { AttrId } from "./attrs";
import { DamageType } from "./damage";
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
  /** 데미지 타입 명시 — 원소 주문의 세부 속성(불/바람/땅/물)에 필수.
   *  생략 시: 물리는 장착 무기 계열, 영혼/빛/어둠은 스킬 계열이 타입이 된다. */
  dtype?: DamageType;
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
  /** 중독 — 매 턴 시작마다 (이 값 × rankMult) 고정 피해 */
  poison?: number;
  /** 수면 — 행동 불가, 피해 시 해제 */
  sleep?: boolean;
  /** 마비 — 행동 불가 (피해로 안 풀림) */
  paralyze?: boolean;
  /** 공포 — 대상의 공격이 불리하게 굴려진다 */
  fear?: boolean;
  /** 제어(수면/마비/공포/중독)의 지속 턴 수 — 생략 시 상태별 기본값 */
  ctrlTurns?: number;
  /** 제어 효과(도발/봉인 등)에 내성 굴림을 허용 — 대상이 저항하면 효과 무효.
   *  값은 방어자가 굴리는 능력치(향후 아군 대상 디버프에도 사용). */
  save?: AttrId;
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
    save: "wit",
    desc: "적중된 적은 시전자만 공격하게 된다 (정신 내성으로 저항 가능)",
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
    save: "vital",
    desc: "적중된 적은 다음 턴 마법을 쓸 수 없다 (기절 내성으로 저항 가능)",
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
    dtype: "fire",
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
    dtype: "wind",
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
    dtype: "earth",
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
  /* ---- 상태이상 부여 (수면·중독·마비·공포) ---- */
  {
    id: "sleephex",
    skill: "spirit",
    min: 2,
    name: "잠재우기",
    mp: 7,
    pow: 0.2,
    hits: 1,
    kind: "mag",
    sleep: true,
    save: "wit",
    ctrlTurns: 3,
    desc: "적을 잠재운다 — 피해를 받으면 깨어남 (정신 내성)",
  },
  {
    id: "venom",
    skill: "dark",
    min: 1,
    name: "맹독",
    mp: 6,
    pow: 0.8,
    hits: 1,
    kind: "mag",
    poison: 6,
    save: "vital",
    ctrlTurns: 3,
    desc: "독을 퍼뜨려 매 턴 고정 피해 (체력 내성)",
  },
  {
    id: "holdperson",
    skill: "light",
    min: 2,
    name: "성스러운 속박",
    mp: 9,
    pow: 0.3,
    hits: 1,
    kind: "mag",
    paralyze: true,
    save: "vital",
    ctrlTurns: 2,
    desc: "빛으로 적을 옭아매 마비시킨다 (체력 내성)",
  },
  {
    id: "terror",
    skill: "dark",
    min: 2,
    name: "공포",
    mp: 8,
    pow: 0.5,
    hits: 1,
    kind: "mag",
    fear: true,
    save: "wit",
    ctrlTurns: 3,
    desc: "적을 공포에 빠뜨려 공격을 불리하게 만든다 (정신 내성)",
  },
  {
    id: "poisonblade",
    skill: "thrown",
    min: 1,
    name: "독날",
    mp: 4,
    pow: 1.0,
    hits: 1,
    kind: "phys",
    poison: 5,
    save: "vital",
    ctrlTurns: 3,
    desc: "독 묻은 칼날 — 적을 중독시킨다 (체력 내성)",
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
