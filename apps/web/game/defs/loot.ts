/* =====================================================================
 * defs/loot.ts — 랜덤 드랍 · 희귀도 · 인챈트(접사) 생성 (순수 로직)
 *  M&M7식 접사 시스템: 희귀도가 높을수록 붙는 인챈트(접사) 수가 많다.
 *  희귀도가 높은(마법 이상) 아이템은 미확인 상태로 떨어지며 "식별" 스킬로 감정한다.
 *  한국어 관형어 접사를 아이템 이름 앞에 붙인다 ("전사의 행운의 강철 검").
 * ===================================================================== */
import { AttrId } from "./attrs";
import { ResistTable } from "./damage";
import { EquipSlot } from "./equip";
import { GearDef, SHOP_ARMORS, SHOP_WEAPONS } from "./shop";
import { Rank } from "./skills";
import { Tier } from "./enemies";

export type Rarity = "common" | "magic" | "rare" | "epic";
export interface RarityMeta {
  name: string;
  color: number;
  /** 붙는 접사(인챈트) 수 */
  affixes: number;
  /** 감정에 필요한 식별 스킬 랭크 (0=식별 불필요) */
  idReq: Rank;
}
export const RARITY_META: Record<Rarity, RarityMeta> = {
  common: { name: "평범", color: 0xc8c8d0, affixes: 0, idReq: 0 },
  magic: { name: "마법", color: 0x6ea8ff, affixes: 1, idReq: 1 },
  rare: { name: "희귀", color: 0xffcf4a, affixes: 2, idReq: 2 },
  epic: { name: "유물", color: 0xb066ff, affixes: 3, idReq: 3 },
};
export const RARITIES: Rarity[] = ["common", "magic", "rare", "epic"];

/** 소유 장비 인스턴스 — 상점 GearDef와 달리 개체 고유(uid)·희귀도·감정 상태를 가진다.
 *  장착 슬롯 필드는 GearDef와 호환되어 equipGear가 그대로 받는다. */
export interface OwnedGear {
  uid: string;
  /** 기반 아이템 이름 (접사 제외) */
  base: string;
  /** 표시 이름 (감정 시 접사 포함) */
  name: string;
  slot: EquipSlot | "ring";
  atk?: number;
  def?: number;
  wtype?: GearDef["wtype"];
  reach?: GearDef["reach"];
  twoHanded?: boolean;
  res?: ResistTable;
  attrs?: Partial<Record<AttrId, number>>;
  rarity: Rarity;
  /** 감정 완료 여부 — false면 "미확인"으로 표시·장착 불가 */
  identified: boolean;
  /** 붙은 접사 표시명 (감정 후 노출) */
  affixes: string[];
  /** 기준 가치 (판매가 산정용) */
  price: number;
}

/* ---- 접사(인챈트) 풀 — 한국어 관형어. 적용 대상 슬롯군으로 분류 ---- */
type AffixTarget = "weapon" | "armor" | "any";
interface Affix {
  id: string;
  name: string;
  target: AffixTarget;
  value: number;
  apply: (g: MutGear) => void;
}
/** generateGear 내부 누적용 가변 형태 */
interface MutGear {
  atk?: number; def?: number;
  attrs: Partial<Record<AttrId, number>>;
  res: ResistTable;
}
const addAttr = (g: MutGear, k: AttrId, n: number) => { g.attrs[k] = (g.attrs[k] ?? 0) + n; };
const mulRes = (g: MutGear, k: keyof ResistTable, m: number) => { g.res[k] = (g.res[k] ?? 1) * m; };

export const AFFIXES: Affix[] = [
  /* 능력치 (어느 슬롯이든) */
  { id: "might", name: "힘의", target: "any", value: 100, apply: (g) => addAttr(g, "might", 2) },
  { id: "vital", name: "곰의", target: "any", value: 100, apply: (g) => addAttr(g, "vital", 2) },
  { id: "agi", name: "제비의", target: "any", value: 100, apply: (g) => addAttr(g, "agi", 2) },
  { id: "fortune", name: "행운의", target: "any", value: 120, apply: (g) => addAttr(g, "fortune", 2) },
  { id: "int", name: "현자의", target: "any", value: 100, apply: (g) => addAttr(g, "int", 2) },
  { id: "wit", name: "달의", target: "any", value: 100, apply: (g) => addAttr(g, "wit", 2) },
  /* 복합 (전사/도적/마법사) */
  { id: "warrior", name: "전사의", target: "any", value: 220, apply: (g) => { addAttr(g, "might", 2); addAttr(g, "vital", 1); } },
  { id: "rogue", name: "도적의", target: "any", value: 220, apply: (g) => { addAttr(g, "agi", 2); addAttr(g, "fortune", 1); } },
  { id: "wizard", name: "현인의", target: "any", value: 220, apply: (g) => { addAttr(g, "int", 2); addAttr(g, "wit", 1); } },
  /* 저항 (방어구·장신구) */
  { id: "rFire", name: "불수호의", target: "armor", value: 150, apply: (g) => mulRes(g, "fire", 0.8) },
  { id: "rWater", name: "냉기수호의", target: "armor", value: 150, apply: (g) => mulRes(g, "water", 0.8) },
  { id: "rEarth", name: "대지수호의", target: "armor", value: 150, apply: (g) => mulRes(g, "earth", 0.8) },
  { id: "rWind", name: "질풍수호의", target: "armor", value: 150, apply: (g) => mulRes(g, "wind", 0.8) },
  { id: "rLight", name: "성광수호의", target: "armor", value: 180, apply: (g) => mulRes(g, "light", 0.8) },
  { id: "rDark", name: "심연수호의", target: "armor", value: 180, apply: (g) => mulRes(g, "dark", 0.8) },
  /* 방어 (방어구) */
  { id: "ward", name: "견고한", target: "armor", value: 120, apply: (g) => { g.def = (g.def ?? 0) + 3; } },
  /* 공격 (무기) */
  { id: "sharp", name: "예리한", target: "weapon", value: 150, apply: (g) => { g.atk = (g.atk ?? 0) + 3; } },
  { id: "cruel", name: "파괴의", target: "weapon", value: 260, apply: (g) => { g.atk = (g.atk ?? 0) + 6; } },
  { id: "deadly", name: "잔혹한", target: "weapon", value: 200, apply: (g) => addAttr(g, "fortune", 3) },
];

/** 기반 아이템이 무기군인지 (접사 대상 판정) */
function isWeaponBase(base: GearDef): boolean { return base.atk !== undefined; }
function affixPool(base: GearDef): Affix[] {
  const w = isWeaponBase(base);
  return AFFIXES.filter((a) => a.target === "any" || a.target === (w ? "weapon" : "armor"));
}

let uidSeq = 0;
/** 테스트에서 uid 시퀀스를 초기화 */
export function _resetUid(): void { uidSeq = 0; }
function pick<T>(arr: T[], rng: () => number): T { return arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))]; }

/** 기반 아이템 + 희귀도로 개체 장비를 생성한다. 접사는 희귀도만큼 서로 다른 것을 뽑아 적용. */
export function generateGear(base: GearDef, rarity: Rarity, rng: () => number = Math.random): OwnedGear {
  const mut: MutGear = { atk: base.atk, def: base.def, attrs: { ...(base.attrs ?? {}) }, res: { ...(base.res ?? {}) } };
  const names: string[] = [];
  let addedValue = 0;
  const n = RARITY_META[rarity].affixes;
  const pool = affixPool(base).slice();
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
    const af = pool.splice(idx, 1)[0];
    af.apply(mut);
    names.push(af.name);
    addedValue += af.value;
  }
  const displayName = names.length ? `${names.join(" ")} ${base.name}` : base.name;
  const res = Object.keys(mut.res).length ? mut.res : undefined;
  const attrs = Object.keys(mut.attrs).length ? mut.attrs : undefined;
  return {
    uid: `g${uidSeq++}`,
    base: base.name,
    name: displayName,
    slot: base.slot ?? (isWeaponBase(base) ? "mainHand" : "body"),
    atk: mut.atk, def: mut.def, wtype: base.wtype, reach: base.reach, twoHanded: base.twoHanded,
    res, attrs,
    rarity,
    identified: RARITY_META[rarity].idReq === 0,
    affixes: names,
    price: base.price + addedValue,
  };
}

/* ---- 티어별 드랍 판정 ---- */
const TIER_ORDER: Tier[] = ["일반", "정예", "보스", "에픽"];
function bandOf(price: number): Tier {
  return price < 200 ? "일반" : price < 500 ? "정예" : price < 900 ? "보스" : "에픽";
}
const ALL_BASES: GearDef[] = [...SHOP_WEAPONS, ...SHOP_ARMORS];
/** 적 티어 이하 밴드의 기반 아이템 풀 (높은 티어일수록 강한 기반도 후보) */
export function basePool(tier: Tier): GearDef[] {
  const maxIdx = TIER_ORDER.indexOf(tier);
  return ALL_BASES.filter((g) => TIER_ORDER.indexOf(bandOf(g.price)) <= maxIdx);
}

/** 티어별 드랍 확률 (운으로 소폭 상승) */
const DROP_CHANCE: Record<Tier, number> = { "일반": 0.12, "정예": 0.55, "보스": 1, "에픽": 1 };
/** 티어별 희귀도 가중치 [common, magic, rare, epic] */
const RARITY_WEIGHT: Record<Tier, number[]> = {
  "일반": [70, 25, 5, 0],
  "정예": [35, 45, 18, 2],
  "보스": [0, 40, 45, 15],
  "에픽": [0, 20, 50, 30],
};
export function rollRarity(tier: Tier, rng: () => number = Math.random): Rarity {
  const w = RARITY_WEIGHT[tier];
  const total = w.reduce((a, b) => a + b, 0);
  let t = rng() * total;
  for (let i = 0; i < w.length; i++) { t -= w[i]; if (t < 0) return RARITIES[i]; }
  return "common";
}

/** 적 처치 드랍 판정 — 드랍하면 생성된 개체, 아니면 null. fortune는 파티 평균 운. */
export function rollDrop(tier: Tier, fortune: number, rng: () => number = Math.random): OwnedGear | null {
  const chance = Math.min(1, DROP_CHANCE[tier] + fortune * 0.01);
  if (rng() >= chance) return null;
  const pool = basePool(tier);
  if (!pool.length) return null;
  const base = pick(pool, rng);
  const rarity = rollRarity(tier, rng);
  return generateGear(base, rarity, rng);
}

/** 미확인/감정 상태를 반영한 표시 이름 */
export function gearDisplayName(o: OwnedGear): string {
  if (o.identified) return o.name;
  return `미확인 ${o.base}`;
}
