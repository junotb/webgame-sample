/* =====================================================================
 * defs/abilities.ts — 전투 어빌리티·필드 스킬
 * 계통(tradition)은 skills 메타데이터, 실제 숙련은 9개 학파가 담당한다.
 * ===================================================================== */

import { AttrId } from "./attrs";
import { CreatureTag } from "./enemies";
import { DamageComponent, DamageType, ResistTable } from "./damage";
import { Rank, SKILLS, SkillId } from "./skills";

export type AbilityTarget = "enemy" | "ally" | "self";

export interface AbilityDef {
  id: string;
  skill: SkillId;
  min: Rank;
  name: string;
  mp: number;
  pow: number;
  hits: number;
  kind: "phys" | "mag" | "heal";
  target?: AbilityTarget;
  /** 단일 피해 타입. 복합 피해가 있으면 damage가 우선한다. */
  dtype?: DamageType;
  damage?: DamageComponent[];
  /** 적 전체 / 아군 전체 */
  all?: boolean;
  allAllies?: boolean;
  pierce?: boolean;
  crit?: number;
  drain?: number;
  taunt?: boolean;
  defDown?: number;
  silence?: boolean;
  poison?: number;
  bleed?: number;
  burn?: number;
  sleep?: boolean;
  paralyze?: boolean;
  fear?: boolean;
  slow?: number;
  bind?: boolean;
  ctrlTurns?: number;
  save?: AttrId;
  manaBurn?: number;
  cover?: boolean;
  sureCrit?: boolean;
  /** 일반/정예 적이 이 HP 비율 이하이면 즉시 처형. 보스·에픽은 추가 피해만 받는다. */
  execute?: number;
  /** 대상 현재 HP의 일부를 추가 피해로 전환한다. */
  currentHpPct?: number;
  /** 종족 태그별 최종 피해 배율 */
  tagBonus?: Partial<Record<CreatureTag, number>>;
  /** 아군 지원 효과: 공격/속도는 %, 방어/보호막은 고정 수치 */
  buffAttack?: number;
  buffDefense?: number;
  buffSpeed?: number;
  barrier?: number;
  resistBuff?: ResistTable;
  cleanse?: boolean;
  revive?: boolean;
  /** 기본 주문 — 랭크만 충족하면 무료로 안다. 그 외 마법은 길드에서 골드로 습득 */
  starter?: boolean;
  desc: string;
}

/** 티어(요구 랭크) 위첨자 — 학파 기호와 조합해 주문 아이콘을 만든다 */
export const SPELL_TIER_MARK = ["", "¹", "²", "³"] as const;

/** 주문 아이콘 = 학파 기호 + 티어 표기. 비마법 기술은 undefined */
export function abilityIcon(a: Pick<AbilityDef, "skill" | "min">): string | undefined {
  const icon = SKILLS[a.skill].icon;
  return icon ? `${icon}${SPELL_TIER_MARK[a.min]}` : undefined;
}

export const ABILITIES: AbilityDef[] = [
  /* ===== 공용 무술 ===== */
  { id: "provoke", skill: "martial", min: 1, name: "도발", mp: 3, pow: 0.45, hits: 1, kind: "phys", taunt: true, save: "wit", desc: "적을 도발해 시전자만 공격하게 한다" },
  { id: "armorbreak", skill: "martial", min: 1, name: "갑옷 부수기", mp: 4, pow: 0.8, hits: 1, kind: "phys", defDown: 2, desc: "피해를 주고 방어력을 낮춘다" },
  { id: "concuss", skill: "martial", min: 2, name: "뇌진탕", mp: 6, pow: 1.0, hits: 1, kind: "phys", silence: true, save: "vital", desc: "다음 마법 행동을 봉인한다" },
  { id: "slam", skill: "martial", min: 2, name: "혼신의 강타", mp: 0, pow: 1.1, hits: 1, kind: "phys", manaBurn: 0.9, desc: "남은 MP를 모두 소모해 추가 피해를 준다" },
  { id: "intervene", skill: "martial", min: 3, name: "가로막기", mp: 4, pow: 0, hits: 1, kind: "phys", target: "ally", cover: true, desc: "아군이 다음에 받을 공격을 대신 맞는다" },
  { id: "perfectstrike", skill: "martial", min: 3, name: "완벽한 일격", mp: 12, pow: 1.4, hits: 1, kind: "phys", sureCrit: true, silence: true, desc: "반드시 치명타로 적중하고 마법을 봉인한다" },

  /* ===== 무기 기술 ===== */
  { id: "doublecut", skill: "blade", min: 1, name: "연속 베기", mp: 3, pow: 0.62, hits: 2, kind: "phys", bleed: 2, save: "vital", desc: "두 번 베고 출혈을 일으킨다" },
  { id: "whirlwind", skill: "blade", min: 2, name: "회전 베기", mp: 7, pow: 0.72, hits: 1, kind: "phys", all: true, desc: "주변의 모든 적을 벤다" },
  { id: "execution", skill: "blade", min: 3, name: "처형", mp: 11, pow: 1.2, hits: 1, kind: "phys", crit: 0.2, execute: 0.2, desc: "빈사 상태의 일반 적을 즉시 처형한다" },
  { id: "impale", skill: "spear", min: 1, name: "꿰뚫기", mp: 3, pow: 1.1, hits: 1, kind: "phys", pierce: true, desc: "방어력의 절반을 무시한다" },
  { id: "skewer", skill: "spear", min: 2, name: "관통 돌진", mp: 7, pow: 1.3, hits: 1, kind: "phys", pierce: true, bleed: 4, save: "vital", desc: "갑옷을 관통하고 큰 출혈을 남긴다" },
  { id: "heartpierce", skill: "spear", min: 3, name: "심장 꿰기", mp: 11, pow: 1.15, hits: 1, kind: "phys", pierce: true, currentHpPct: 0.08, execute: 0.15, desc: "현재 HP에 비례한 피해를 주고 빈사 적을 처형한다" },
  { id: "powershot", skill: "bow", min: 1, name: "강궁", mp: 3, pow: 1.1, hits: 1, kind: "phys", pierce: true, desc: "원거리에서 방어를 관통한다" },
  { id: "volley", skill: "bow", min: 2, name: "화살비", mp: 8, pow: 0.55, hits: 2, kind: "phys", all: true, desc: "모든 적에게 두 차례 화살을 퍼붓는다" },
  { id: "pinshot", skill: "bow", min: 3, name: "속박 사격", mp: 10, pow: 1.05, hits: 1, kind: "phys", slow: 45, bind: true, save: "agi", ctrlTurns: 2, desc: "대상의 발을 묶고 크게 감속시킨다" },
  { id: "crush", skill: "cudgel", min: 1, name: "분쇄", mp: 3, pow: 1.05, hits: 1, kind: "phys", defDown: 1, desc: "충격으로 적의 방어력을 낮춘다" },
  { id: "skullcrack", skill: "cudgel", min: 2, name: "두개골 강타", mp: 7, pow: 1.2, hits: 1, kind: "phys", silence: true, save: "vital", desc: "강한 충격으로 마법 행동을 봉인한다" },
  { id: "groundbreaker", skill: "cudgel", min: 3, name: "대지 분쇄", mp: 12, pow: 0.95, hits: 1, kind: "phys", all: true, paralyze: true, save: "vital", ctrlTurns: 1, desc: "모든 적을 넘어뜨려 한 턴 마비시킨다" },
  { id: "flurry", skill: "unarmed", min: 1, name: "연환격", mp: 3, pow: 0.42, hits: 3, kind: "phys", desc: "빠르게 세 번 공격한다" },
  { id: "pressurepoint", skill: "unarmed", min: 2, name: "점혈", mp: 7, pow: 0.75, hits: 1, kind: "phys", paralyze: true, save: "vital", ctrlTurns: 1, desc: "급소를 눌러 한 턴 마비시킨다" },
  { id: "innerfocus", skill: "unarmed", min: 3, name: "내공 개방", mp: 10, pow: 0, hits: 1, kind: "phys", target: "self", buffAttack: 30, buffSpeed: 30, ctrlTurns: 3, desc: "자신의 공격과 속도를 강화한다" },
  { id: "poisonblade", skill: "thrown", min: 1, name: "독날", mp: 4, pow: 0.9, hits: 1, kind: "phys", poison: 5, save: "vital", ctrlTurns: 3, desc: "독 묻은 칼날로 중독시킨다" },
  { id: "knifefan", skill: "thrown", min: 2, name: "칼날 부채", mp: 7, pow: 0.5, hits: 2, kind: "phys", all: true, bleed: 3, save: "vital", desc: "모든 적에게 칼날을 두 번 던진다" },
  { id: "bloodseeker", skill: "thrown", min: 3, name: "피추적자", mp: 10, pow: 1.0, hits: 1, kind: "phys", currentHpPct: 0.1, crit: 0.15, desc: "생명력의 흐름을 노려 현재 HP 비례 피해를 준다" },

  /* =====================================================================
   * 마법 — 전투·필드 주문을 합쳐 학파당 노비스 6 / 전문가 3 / 달인 3.
   * 노비스에는 반드시 단일 대상 '화살'과 저항 '수호' 주문이,
   * 전문가에는 반드시 전체 대상 '구' 주문이 포함된다.
   * starter 주문(화살+기본 지원)만 랭크로 무료 습득, 나머지는 길드 구매.
   * ===================================================================== */

  /* ===== 원소: 불 ===== */
  { id: "firebolt", skill: "fire", min: 1, name: "불화살", mp: 4, pow: 1.15, hits: 1, kind: "mag", dtype: "fire", starter: true, desc: "효율 좋은 단일 화염 공격" },
  { id: "ember", skill: "fire", min: 1, name: "불씨 던지기", mp: 2, pow: 0.7, hits: 1, kind: "mag", dtype: "fire", desc: "적은 MP로 불씨를 튕겨 보낸다" },
  { id: "flamewhip", skill: "fire", min: 1, name: "화염 채찍", mp: 5, pow: 0.52, hits: 2, kind: "mag", dtype: "fire", desc: "불꽃 채찍으로 두 번 후려친다" },
  { id: "heatedge", skill: "fire", min: 1, name: "달군 무기", mp: 5, pow: 0, hits: 1, kind: "mag", target: "ally", buffAttack: 20, ctrlTurns: 3, desc: "아군의 무기를 달궈 공격력을 높인다" },
  { id: "fireward", skill: "fire", min: 1, name: "불꽃 수호", mp: 5, pow: 0, hits: 1, kind: "mag", target: "ally", resistBuff: { fire: 0.55 }, ctrlTurns: 3, starter: true, desc: "아군에게 화염 저항을 부여한다" },
  { id: "ashveil", skill: "fire", min: 1, name: "잿빛 장막", mp: 5, pow: 0.4, hits: 1, kind: "mag", dtype: "fire", slow: 25, save: "agi", ctrlTurns: 2, desc: "재를 흩뿌려 적의 시야와 속도를 줄인다" },
  { id: "fireball", skill: "fire", min: 2, name: "화염구", mp: 8, pow: 0.95, hits: 1, kind: "mag", dtype: "fire", all: true, burn: 3, save: "agi", ctrlTurns: 2, desc: "모든 적을 폭발에 휘말리게 한다" },
  { id: "brand", skill: "fire", min: 2, name: "작열 낙인", mp: 9, pow: 1.2, hits: 1, kind: "mag", dtype: "fire", burn: 4, defDown: 1, save: "vital", ctrlTurns: 2, desc: "낙인을 찍어 화상과 방어 저하를 남긴다" },
  { id: "flamearmor", skill: "fire", min: 2, name: "화염 갑주", mp: 10, pow: 0, hits: 1, kind: "mag", target: "ally", barrier: 14, resistBuff: { fire: 0.6 }, ctrlTurns: 3, desc: "불꽃 보호막과 화염 저항을 두른다" },
  { id: "inferno", skill: "fire", min: 3, name: "지옥불", mp: 16, pow: 1.15, hits: 1, kind: "mag", dtype: "fire", all: true, burn: 7, save: "vital", ctrlTurns: 3, desc: "모든 적에게 큰 피해와 화상을 준다" },
  { id: "lavaspear", skill: "fire", min: 3, name: "용암 창", mp: 15, pow: 1.5, hits: 1, kind: "mag", dtype: "fire", pierce: true, burn: 5, save: "vital", ctrlTurns: 2, desc: "용암 창이 방어를 관통하고 화상을 남긴다" },
  { id: "fireheart", skill: "fire", min: 3, name: "불의 심장", mp: 14, pow: 0, hits: 1, kind: "mag", target: "self", buffAttack: 35, barrier: 16, ctrlTurns: 3, desc: "심장에 불을 품어 공격과 보호막을 얻는다" },

  /* ===== 원소: 물 ===== */
  { id: "iceshard", skill: "water", min: 1, name: "얼음 파편", mp: 4, pow: 1.05, hits: 1, kind: "mag", dtype: "water", slow: 20, save: "agi", ctrlTurns: 2, starter: true, desc: "냉기로 적을 둔화시킨다" },
  { id: "splash", skill: "water", min: 1, name: "물보라", mp: 2, pow: 0.7, hits: 1, kind: "mag", dtype: "water", desc: "적은 MP로 물살을 쏘아 보낸다" },
  { id: "frostneedle", skill: "water", min: 1, name: "서리 바늘", mp: 5, pow: 0.52, hits: 2, kind: "mag", dtype: "water", desc: "얼음 바늘을 두 발 날린다" },
  { id: "aquaward", skill: "water", min: 1, name: "물의 수호", mp: 5, pow: 0, hits: 1, kind: "mag", target: "ally", resistBuff: { water: 0.55, fire: 0.75 }, ctrlTurns: 3, starter: true, desc: "물·화염 저항을 부여한다" },
  { id: "chillmist", skill: "water", min: 1, name: "차가운 안개", mp: 5, pow: 0.4, hits: 1, kind: "mag", dtype: "water", slow: 25, save: "agi", ctrlTurns: 2, desc: "안개로 적의 움직임을 무디게 한다" },
  { id: "pressjet", skill: "water", min: 1, name: "수압 절단", mp: 5, pow: 0.95, hits: 1, kind: "mag", dtype: "water", defDown: 1, desc: "가는 물줄기로 갑옷 이음새를 벌린다" },
  { id: "frostbind", skill: "water", min: 2, name: "서리 속박", mp: 8, pow: 0.65, hits: 1, kind: "mag", dtype: "water", bind: true, paralyze: true, save: "vital", ctrlTurns: 1, desc: "적을 얼려 이동과 행동을 봉쇄한다" },
  { id: "tidalwave", skill: "water", min: 2, name: "해일", mp: 10, pow: 0.8, hits: 1, kind: "mag", dtype: "water", all: true, slow: 20, save: "agi", ctrlTurns: 2, desc: "모든 적을 물살로 휩쓸어 감속시킨다" },
  { id: "iceedge", skill: "water", min: 2, name: "서리 칼날", mp: 9, pow: 0, hits: 1, kind: "mag", target: "ally", buffAttack: 18, ctrlTurns: 3, desc: "아군의 무기에 서리 날을 세운다" },
  { id: "blizzard", skill: "water", min: 3, name: "눈보라", mp: 15, pow: 1.0, hits: 1, kind: "mag", dtype: "water", all: true, slow: 40, save: "vital", ctrlTurns: 3, desc: "모든 적에게 냉기 피해와 감속을 준다" },
  { id: "glacialspike", skill: "water", min: 3, name: "빙하 창", mp: 16, pow: 1.5, hits: 1, kind: "mag", dtype: "water", pierce: true, paralyze: true, save: "vital", ctrlTurns: 1, desc: "거대한 얼음 창이 방어를 관통하고 얼린다" },
  { id: "icefortress", skill: "water", min: 3, name: "얼음 성채", mp: 14, pow: 0, hits: 1, kind: "mag", target: "ally", allAllies: true, barrier: 12, resistBuff: { water: 0.7 }, ctrlTurns: 3, desc: "파티 전체에 얼음 보호막을 두른다" },

  /* ===== 원소: 땅 ===== */
  { id: "stonespike", skill: "earth", min: 1, name: "돌가시", mp: 4, pow: 1.1, hits: 1, kind: "mag", dtype: "earth", pierce: true, starter: true, desc: "지면에서 솟아 방어를 관통한다" },
  { id: "stoneskin", skill: "earth", min: 1, name: "돌가죽", mp: 5, pow: 0, hits: 1, kind: "mag", target: "ally", buffDefense: 4, ctrlTurns: 3, starter: true, desc: "아군 한 명의 방어력을 높인다" },
  { id: "pebbleshot", skill: "earth", min: 1, name: "돌팔매", mp: 2, pow: 0.7, hits: 1, kind: "mag", dtype: "earth", desc: "적은 MP로 돌덩이를 날린다" },
  { id: "mudgrip", skill: "earth", min: 1, name: "진흙 손아귀", mp: 5, pow: 0.4, hits: 1, kind: "mag", dtype: "earth", slow: 30, save: "agi", ctrlTurns: 2, desc: "진흙이 발을 붙잡아 감속시킨다" },
  { id: "earthward", skill: "earth", min: 1, name: "대지의 수호", mp: 5, pow: 0, hits: 1, kind: "mag", target: "ally", resistBuff: { earth: 0.55, wind: 0.8 }, ctrlTurns: 3, desc: "땅·바람 저항을 부여한다" },
  { id: "sandblast", skill: "earth", min: 1, name: "모래바람", mp: 5, pow: 0.8, hits: 1, kind: "mag", dtype: "earth", defDown: 1, desc: "모래를 퍼부어 방어 자세를 무너뜨린다" },
  { id: "earthquake", skill: "earth", min: 2, name: "지진", mp: 10, pow: 0.8, hits: 1, kind: "mag", dtype: "earth", all: true, defDown: 2, bind: true, save: "agi", ctrlTurns: 2, desc: "모든 적의 자세와 방어를 무너뜨린다" },
  { id: "boulder", skill: "earth", min: 2, name: "바위 투척", mp: 9, pow: 1.25, hits: 1, kind: "mag", dtype: "earth", crit: 0.1, desc: "거대한 바위를 내리찍는다" },
  { id: "stonewall", skill: "earth", min: 2, name: "돌벽", mp: 10, pow: 0, hits: 1, kind: "mag", target: "ally", allAllies: true, buffDefense: 3, ctrlTurns: 3, desc: "파티 전체의 방어력을 높인다" },
  { id: "meteor", skill: "earth", min: 3, name: "메테오", mp: 18, pow: 1.25, hits: 1, kind: "mag", all: true, damage: [{ type: "earth", ratio: 0.6 }, { type: "fire", ratio: 0.4 }], burn: 4, save: "vital", ctrlTurns: 2, desc: "땅과 불의 복합 피해를 주는 대형 주문" },
  { id: "fossilize", skill: "earth", min: 3, name: "석화 붕괴", mp: 16, pow: 1.3, hits: 1, kind: "mag", dtype: "earth", paralyze: true, save: "vital", ctrlTurns: 2, desc: "적을 돌처럼 굳히고 큰 피해를 준다" },
  { id: "gaiabless", skill: "earth", min: 3, name: "대지의 축복", mp: 15, pow: 0, hits: 1, kind: "mag", target: "ally", allAllies: true, barrier: 14, resistBuff: { earth: 0.7 }, ctrlTurns: 3, desc: "파티 전체에 대지의 보호막을 씌운다" },

  /* ===== 원소: 바람 ===== */
  { id: "spark", skill: "wind", min: 1, name: "전격", mp: 4, pow: 1.05, hits: 1, kind: "mag", dtype: "wind", starter: true, desc: "단일 대상에게 전격을 방출한다" },
  { id: "haste", skill: "wind", min: 1, name: "가속", mp: 5, pow: 0, hits: 1, kind: "mag", target: "ally", buffSpeed: 35, ctrlTurns: 3, starter: true, desc: "아군 한 명의 속도를 높인다" },
  { id: "gust", skill: "wind", min: 1, name: "돌풍", mp: 2, pow: 0.7, hits: 1, kind: "mag", dtype: "wind", desc: "적은 MP로 바람 칼날을 날린다" },
  { id: "staticjolt", skill: "wind", min: 1, name: "정전기", mp: 5, pow: 0.52, hits: 2, kind: "mag", dtype: "wind", desc: "짧은 전격을 두 번 흘려 보낸다" },
  { id: "windward", skill: "wind", min: 1, name: "바람의 수호", mp: 5, pow: 0, hits: 1, kind: "mag", target: "ally", resistBuff: { wind: 0.55, earth: 0.8 }, ctrlTurns: 3, desc: "바람·땅 저항을 부여한다" },
  { id: "shockgrasp", skill: "wind", min: 1, name: "감전 손아귀", mp: 5, pow: 0.95, hits: 1, kind: "mag", dtype: "wind", slow: 20, save: "agi", ctrlTurns: 2, desc: "감전시켜 움직임을 굳게 만든다" },
  { id: "chainlt", skill: "wind", min: 2, name: "연쇄 번개", mp: 9, pow: 0.85, hits: 1, all: true, kind: "mag", dtype: "wind", desc: "모든 적을 잇달아 감전시킨다" },
  { id: "zephyrblade", skill: "wind", min: 2, name: "질풍 칼날", mp: 9, pow: 0, hits: 1, kind: "mag", target: "ally", buffAttack: 15, buffSpeed: 15, ctrlTurns: 3, desc: "아군의 공격과 속도를 함께 높인다" },
  { id: "tempest", skill: "wind", min: 3, name: "천둥폭풍", mp: 16, pow: 1.05, hits: 1, all: true, kind: "mag", dtype: "wind", silence: true, save: "vital", desc: "모든 적에게 피해를 주고 마법을 봉인한다" },
  { id: "skypiercer", skill: "wind", min: 3, name: "하늘 꿰기", mp: 16, pow: 1.5, hits: 1, kind: "mag", dtype: "wind", pierce: true, desc: "낙뢰가 방어를 무시하고 내리꽂힌다" },
  { id: "stormlord", skill: "wind", min: 3, name: "폭풍군주", mp: 14, pow: 0, hits: 1, kind: "mag", target: "self", buffAttack: 25, buffSpeed: 35, ctrlTurns: 3, desc: "폭풍을 둘러 공격과 속도를 크게 높인다" },

  /* ===== 자아: 영혼 ===== */
  { id: "spiritarrow", skill: "spirit", min: 1, name: "영혼 화살", mp: 5, pow: 1.05, hits: 1, kind: "mag", dtype: "spirit", tagBonus: { spirit: 1.4, summoned: 1.4 }, starter: true, desc: "영체와 소환수의 본질을 흔든다" },
  { id: "soulward", skill: "spirit", min: 1, name: "영혼 수호", mp: 6, pow: 0, hits: 1, kind: "mag", target: "ally", barrier: 18, resistBuff: { spirit: 0.65, dark: 0.8 }, ctrlTurns: 3, starter: true, desc: "보호막과 영혼·어둠 저항을 부여한다" },
  { id: "soulflicker", skill: "spirit", min: 1, name: "혼불", mp: 2, pow: 0.7, hits: 1, kind: "mag", dtype: "spirit", desc: "적은 MP로 혼불을 날린다" },
  { id: "spiritlash", skill: "spirit", min: 1, name: "영혼 채찍", mp: 6, pow: 0.52, hits: 2, kind: "mag", dtype: "spirit", desc: "영혼을 두 번 후려친다" },
  { id: "calmspirit", skill: "spirit", min: 1, name: "진혼", mp: 5, pow: 0.15, hits: 1, kind: "heal", target: "ally", cleanse: true, desc: "혼을 달래 해로운 상태를 걷어낸다" },
  { id: "soulgaze", skill: "spirit", min: 1, name: "혼의 응시", mp: 5, pow: 0.9, hits: 1, kind: "mag", dtype: "spirit", defDown: 1, desc: "본질을 꿰뚫어 방어를 무너뜨린다" },
  { id: "soulrend", skill: "spirit", min: 2, name: "영혼 절단", mp: 10, pow: 0.9, hits: 1, kind: "mag", dtype: "spirit", currentHpPct: 0.08, tagBonus: { spirit: 1.5, summoned: 1.5 }, desc: "현재 HP 일부를 영혼 피해로 전환한다" },
  { id: "soulstorm", skill: "spirit", min: 2, name: "영혼 폭풍", mp: 10, pow: 0.8, hits: 1, kind: "mag", dtype: "spirit", all: true, tagBonus: { spirit: 1.3, summoned: 1.3 }, desc: "모든 적의 혼을 뒤흔드는 폭풍" },
  { id: "spiritlink", skill: "spirit", min: 2, name: "영혼 결속", mp: 10, pow: 0, hits: 1, kind: "mag", target: "ally", allAllies: true, barrier: 10, ctrlTurns: 3, desc: "파티 전체에 영혼 보호막을 잇는다" },
  { id: "resurrection", skill: "spirit", min: 3, name: "부활", mp: 20, pow: 0.75, hits: 1, kind: "heal", target: "ally", revive: true, desc: "쓰러진 아군을 되살리고 HP를 회복한다" },
  { id: "soulreaper", skill: "spirit", min: 3, name: "영혼 수확", mp: 16, pow: 1.3, hits: 1, kind: "mag", dtype: "spirit", drain: 0.4, tagBonus: { spirit: 1.5 }, desc: "혼을 거두어 생명력으로 흡수한다" },
  { id: "transcend", skill: "spirit", min: 3, name: "초혼", mp: 15, pow: 0, hits: 1, kind: "mag", target: "ally", buffAttack: 25, buffDefense: 3, buffSpeed: 20, ctrlTurns: 3, desc: "혼을 끌어올려 전투 능력 전반을 강화한다" },

  /* ===== 자아: 정신 ===== */
  { id: "psyshock", skill: "mind", min: 1, name: "정신 충격", mp: 5, pow: 1.05, hits: 1, kind: "mag", dtype: "spirit", starter: true, desc: "정신에 직접 충격을 가한다" },
  { id: "sleephex", skill: "mind", min: 1, name: "잠재우기", mp: 6, pow: 0.1, hits: 1, kind: "mag", dtype: "spirit", sleep: true, save: "wit", ctrlTurns: 3, desc: "적을 잠재운다. 피해를 받으면 깨어난다" },
  { id: "mindward", skill: "mind", min: 1, name: "정신 수호", mp: 5, pow: 0, hits: 1, kind: "mag", target: "ally", resistBuff: { spirit: 0.6 }, ctrlTurns: 3, starter: true, desc: "정신을 다잡아 영혼 저항을 부여한다" },
  { id: "thoughtprick", skill: "mind", min: 1, name: "사념 바늘", mp: 2, pow: 0.7, hits: 1, kind: "mag", dtype: "spirit", desc: "적은 MP로 사념을 찔러 넣는다" },
  { id: "dazegaze", skill: "mind", min: 1, name: "현혹의 시선", mp: 5, pow: 0.4, hits: 1, kind: "mag", dtype: "spirit", slow: 25, save: "wit", ctrlTurns: 2, desc: "시선을 흐려 반응을 늦춘다" },
  { id: "confound", skill: "mind", min: 1, name: "착란", mp: 5, pow: 0.9, hits: 1, kind: "mag", dtype: "spirit", defDown: 1, save: "wit", desc: "판단을 흩뜨려 방어를 무너뜨린다" },
  { id: "mindbreak", skill: "mind", min: 2, name: "사고 붕괴", mp: 9, pow: 0.75, hits: 1, kind: "mag", dtype: "spirit", slow: 45, defDown: 1, save: "wit", ctrlTurns: 3, desc: "판단과 반응을 무너뜨린다" },
  { id: "hallucinate", skill: "mind", min: 2, name: "집단 환각", mp: 10, pow: 0.7, hits: 1, kind: "mag", dtype: "spirit", all: true, slow: 25, save: "wit", ctrlTurns: 2, desc: "모든 적에게 환각을 심어 늦춘다" },
  { id: "clearmind", skill: "mind", min: 2, name: "명경지수", mp: 9, pow: 0, hits: 1, kind: "mag", target: "ally", buffSpeed: 20, barrier: 8, ctrlTurns: 3, desc: "마음을 비워 속도와 보호막을 얻게 한다" },
  { id: "nightmare", skill: "mind", min: 3, name: "악몽", mp: 15, pow: 0.7, hits: 1, kind: "mag", dtype: "spirit", all: true, fear: true, save: "wit", ctrlTurns: 3, desc: "모든 적의 정신을 공포에 빠뜨린다" },
  { id: "dominate", skill: "mind", min: 3, name: "지배", mp: 16, pow: 1.2, hits: 1, kind: "mag", dtype: "spirit", paralyze: true, save: "wit", ctrlTurns: 2, desc: "정신을 짓눌러 행동을 빼앗는다" },
  { id: "mindfortress", skill: "mind", min: 3, name: "정신 요새", mp: 14, pow: 0, hits: 1, kind: "mag", target: "ally", allAllies: true, resistBuff: { spirit: 0.6, dark: 0.75 }, ctrlTurns: 3, desc: "파티 전체의 정신 방벽을 세운다" },

  /* ===== 자아: 육체 ===== */
  { id: "vitalstrike", skill: "body", min: 1, name: "기력 타격", mp: 4, pow: 1.0, hits: 1, kind: "mag", dtype: "spirit", starter: true, desc: "기를 쏘아 몸속을 직접 두드린다" },
  { id: "heal", skill: "body", min: 1, name: "치유", mp: 5, pow: 0.8, hits: 1, kind: "heal", target: "ally", starter: true, desc: "아군 한 명의 생명력을 회복한다" },
  { id: "purify", skill: "body", min: 1, name: "정화", mp: 5, pow: 0.15, hits: 1, kind: "heal", target: "ally", cleanse: true, desc: "아군의 해로운 상태를 제거하고 조금 회복한다" },
  { id: "bodyward", skill: "body", min: 1, name: "육체 수호", mp: 5, pow: 0, hits: 1, kind: "mag", target: "ally", buffDefense: 2, resistBuff: { spirit: 0.75 }, ctrlTurns: 3, desc: "몸을 단단히 해 방어와 영혼 저항을 얻는다" },
  { id: "numbtouch", skill: "body", min: 1, name: "마비의 손길", mp: 5, pow: 0.5, hits: 1, kind: "mag", dtype: "spirit", slow: 20, save: "vital", ctrlTurns: 2, desc: "근육을 굳혀 움직임을 늦춘다" },
  { id: "invigorate", skill: "body", min: 1, name: "기력 회복", mp: 3, pow: 0.5, hits: 1, kind: "heal", target: "ally", desc: "적은 MP로 가볍게 회복한다" },
  { id: "vigor", skill: "body", min: 2, name: "활력", mp: 9, pow: 0, hits: 1, kind: "heal", target: "ally", buffAttack: 20, buffDefense: 3, ctrlTurns: 3, desc: "아군의 공격력과 방어력을 강화한다" },
  { id: "kipulse", skill: "body", min: 2, name: "기공 폭발", mp: 10, pow: 0.7, hits: 1, kind: "mag", dtype: "spirit", all: true, desc: "기를 사방으로 터뜨려 모든 적을 때린다" },
  { id: "lifewave", skill: "body", min: 2, name: "생명 파동", mp: 10, pow: 0.45, hits: 1, kind: "heal", target: "ally", allAllies: true, desc: "파동으로 아군 전체를 회복한다" },
  { id: "restoration", skill: "body", min: 3, name: "대회복", mp: 18, pow: 0.65, hits: 1, kind: "heal", target: "ally", allAllies: true, cleanse: true, desc: "생존한 아군 전체를 회복하고 상태이상을 해제한다" },
  { id: "fullheal", skill: "body", min: 3, name: "완전 치유", mp: 15, pow: 1.3, hits: 1, kind: "heal", target: "ally", cleanse: true, desc: "아군 한 명을 크게 회복하고 정화한다" },
  { id: "ironbody", skill: "body", min: 3, name: "금강불괴", mp: 14, pow: 0, hits: 1, kind: "mag", target: "ally", buffDefense: 5, barrier: 16, ctrlTurns: 3, desc: "육체를 강철처럼 단련시킨다" },

  /* ===== 신성: 빛 ===== */
  { id: "holy", skill: "light", min: 1, name: "성스러운 빛", mp: 6, pow: 1.05, hits: 1, kind: "mag", dtype: "light", tagBonus: { undead: 1.6, spirit: 1.25 }, starter: true, desc: "언데드와 영체에 강한 빛" },
  { id: "lightward", skill: "light", min: 1, name: "빛의 수호", mp: 5, pow: 0, hits: 1, kind: "mag", target: "ally", resistBuff: { dark: 0.55, light: 0.75 }, ctrlTurns: 3, starter: true, desc: "어둠·빛 저항을 부여한다" },
  { id: "radiantspark", skill: "light", min: 1, name: "빛무리", mp: 2, pow: 0.7, hits: 1, kind: "mag", dtype: "light", desc: "적은 MP로 빛 조각을 쏘아 보낸다" },
  { id: "blindflash", skill: "light", min: 1, name: "섬광", mp: 5, pow: 0.4, hits: 1, kind: "mag", dtype: "light", slow: 25, save: "wit", ctrlTurns: 2, desc: "눈을 멀게 해 반응을 늦춘다" },
  { id: "mend", skill: "light", min: 1, name: "성스러운 손길", mp: 5, pow: 0.6, hits: 1, kind: "heal", target: "ally", desc: "빛의 온기로 아군을 회복한다" },
  { id: "holdperson", skill: "light", min: 2, name: "성스러운 속박", mp: 9, pow: 0.2, hits: 1, kind: "mag", dtype: "light", paralyze: true, save: "vital", ctrlTurns: 2, desc: "빛으로 적을 옭아매 마비시킨다" },
  { id: "sanctuary", skill: "light", min: 2, name: "성역", mp: 11, pow: 0, hits: 1, kind: "mag", target: "ally", allAllies: true, barrier: 12, resistBuff: { light: 0.75, dark: 0.6 }, ctrlTurns: 3, desc: "파티 전체에 보호막과 빛·어둠 저항을 부여한다" },
  { id: "lightburst", skill: "light", min: 2, name: "성광 파문", mp: 10, pow: 0.75, hits: 1, kind: "mag", dtype: "light", all: true, tagBonus: { undead: 1.5 }, desc: "빛의 파문이 모든 적을 휩쓴다" },
  { id: "sunray", skill: "light", min: 3, name: "태양광선", mp: 17, pow: 1.05, hits: 1, kind: "mag", dtype: "light", all: true, tagBonus: { undead: 1.7, spirit: 1.3 }, desc: "모든 적을 비추며 언데드에 큰 피해를 준다" },
  { id: "judgement", skill: "light", min: 3, name: "심판", mp: 17, pow: 1.4, hits: 1, kind: "mag", dtype: "light", execute: 0.12, tagBonus: { undead: 1.8 }, desc: "빈사의 적을 단죄하는 빛의 철퇴" },
  { id: "divineaegis", skill: "light", min: 3, name: "신성한 방패", mp: 16, pow: 0, hits: 1, kind: "mag", target: "ally", allAllies: true, barrier: 16, resistBuff: { light: 0.7, dark: 0.55 }, ctrlTurns: 3, desc: "파티 전체를 신성한 방패로 감싼다" },

  /* ===== 신성: 어둠 ===== */
  { id: "shadow", skill: "dark", min: 1, name: "암흑구", mp: 5, pow: 1.15, hits: 1, kind: "mag", dtype: "dark", starter: true, desc: "응축된 어둠으로 단일 적을 공격한다" },
  { id: "venom", skill: "dark", min: 1, name: "맹독", mp: 6, pow: 0.5, hits: 1, kind: "mag", dtype: "dark", poison: 5, save: "vital", ctrlTurns: 3, desc: "독을 퍼뜨려 매 턴 고정 피해를 준다" },
  { id: "darkward", skill: "dark", min: 1, name: "어둠의 수호", mp: 5, pow: 0, hits: 1, kind: "mag", target: "ally", resistBuff: { dark: 0.55, light: 0.75 }, ctrlTurns: 3, starter: true, desc: "어둠·빛 저항을 부여한다" },
  { id: "gloomtouch", skill: "dark", min: 1, name: "그늘 손길", mp: 2, pow: 0.7, hits: 1, kind: "mag", dtype: "dark", desc: "적은 MP로 어둠을 흘려 보낸다" },
  { id: "curseweak", skill: "dark", min: 1, name: "쇠약의 저주", mp: 5, pow: 0.6, hits: 1, kind: "mag", dtype: "dark", defDown: 1, save: "wit", desc: "저주로 적의 방어를 갉아먹는다" },
  { id: "shadewrap", skill: "dark", min: 1, name: "그림자 휘감기", mp: 5, pow: 0.8, hits: 1, kind: "mag", dtype: "dark", slow: 20, save: "agi", ctrlTurns: 2, desc: "그림자가 발을 휘감아 늦춘다" },
  { id: "terror", skill: "dark", min: 2, name: "공포", mp: 8, pow: 0.25, hits: 1, kind: "mag", dtype: "dark", fear: true, save: "wit", ctrlTurns: 3, desc: "적의 공격 판정을 불리하게 만든다" },
  { id: "darkpulse", skill: "dark", min: 2, name: "암흑 파동", mp: 10, pow: 0.75, hits: 1, kind: "mag", dtype: "dark", all: true, desc: "어둠의 파동이 모든 적을 덮친다" },
  { id: "doom", skill: "dark", min: 3, name: "파멸", mp: 18, pow: 0.75, hits: 1, kind: "mag", dtype: "dark", currentHpPct: 0.18, execute: 0.15, tagBonus: { living: 1.2 }, desc: "현재 HP 비례 피해를 주고 빈사 상태의 생물을 처형한다" },
  { id: "plague", skill: "dark", min: 3, name: "역병", mp: 16, pow: 0.6, hits: 1, kind: "mag", dtype: "dark", all: true, poison: 6, save: "vital", ctrlTurns: 3, desc: "역병을 퍼뜨려 모든 적을 중독시킨다" },
  { id: "shadowpact", skill: "dark", min: 3, name: "그림자 계약", mp: 14, pow: 0, hits: 1, kind: "mag", target: "self", buffAttack: 30, buffSpeed: 20, ctrlTurns: 3, desc: "어둠과 계약해 공격과 속도를 끌어올린다" },
];

export interface FieldSkillDef {
  id: "recall" | "bless" | "darkveil" | "seek";
  skill: SkillId;
  min: Rank;
  name: string;
  mp: number;
  /** 마법 필드 주문도 전투 주문과 동일한 개인 습득 규칙을 따른다. */
  starter?: boolean;
  desc: string;
}

export type SpellDef = AbilityDef | FieldSkillDef;

export const FIELD_SKILLS: FieldSkillDef[] = [
  { id: "recall", skill: "wind", min: 2, name: "귀환", mp: 5, desc: "일행을 마을로 순간이동시킨다." },
  { id: "bless", skill: "light", min: 1, name: "축복", mp: 4, desc: "다음 전투에서 파티 공격력 +25%." },
  { id: "darkveil", skill: "dark", min: 2, name: "어둠의 장막", mp: 4, desc: "한동안 인카운터율이 크게 감소." },
  { id: "seek", skill: "perception", min: 1, name: "탐색", mp: 2, desc: "주변의 숨겨진 것을 발견한다." },
];
