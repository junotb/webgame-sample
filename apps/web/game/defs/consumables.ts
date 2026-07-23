/* =====================================================================
 * defs/consumables.ts — 소모품·조합 재료 마스터 데이터
 *  아이콘 대응: assets-source/items/icons/consumable_potion_*(빨강=HP·파랑=MP),
 *  prismatic_flask(성수), green(해독), orange(비약), empty_flask(빈 병),
 *  material_*(조합 재료).
 * ===================================================================== */
import type { BattleStatusId } from "../core/statuses";
import type { CreatureTag, EnemyDef } from "./enemies";
import type { GearDef } from "./shop";

export type ConsumableId =
  | "potion"     // 치유 물약
  | "potion2"    // 고급 치유 물약
  | "mpotion"    // 마나 물약
  | "mpotion2"   // 고급 마나 물약
  | "elixir"     // 부활의 성수
  | "antidote"   // 해독제
  | "panacea"    // 만병통치약
  | "atk_tonic"  // 힘의 비약
  | "def_tonic"; // 철벽의 비약

export interface ConsumableDef {
  id: ConsumableId;
  name: string;
  price: number;
  desc: string;
  /** HP 회복량 (full이면 전량) */
  hp?: number;
  /** MP 회복량 */
  mp?: number;
  /** 전투불능 대상에게 사용 가능 — 일으켜 세운 뒤 회복 */
  revive?: boolean;
  /** HP를 최대치까지 회복 */
  full?: boolean;
  /** 사용 시 해제하는 해로운 상태 — 목록 또는 전부 */
  cure?: BattleStatusId[] | "all";
  /** 사용 시 거는 전투 버프 */
  buff?: { id: "atkup" | "defup"; power: number; turns: number };
  /** 전투 중에만 사용 가능 (버프·상태 해제는 전투 밖에서 의미가 없다) */
  battleOnly?: boolean;
  /** 상점에서 팔지 않음 (조합 전용 등) */
  unsold?: boolean;
}

export const CONSUMABLES: Record<ConsumableId, ConsumableDef> = {
  potion: {
    id: "potion", name: "치유 물약", price: 30,
    desc: "아군 1명 HP 60 회복 (전투불능 회복 가능)",
    hp: 60, revive: true,
  },
  potion2: {
    id: "potion2", name: "고급 치유 물약", price: 100,
    desc: "아군 1명 HP 150 회복 (전투불능 회복 가능)",
    hp: 150, revive: true,
  },
  mpotion: {
    id: "mpotion", name: "마나 물약", price: 45,
    desc: "아군 1명 MP 25 회복",
    mp: 25,
  },
  mpotion2: {
    id: "mpotion2", name: "고급 마나 물약", price: 130,
    desc: "아군 1명 MP 60 회복",
    mp: 60,
  },
  elixir: {
    id: "elixir", name: "부활의 성수", price: 320,
    desc: "전투불능 아군을 일으키고 HP를 전부 회복",
    revive: true, full: true,
  },
  antidote: {
    id: "antidote", name: "해독제", price: 25,
    desc: "중독·출혈·화상을 해제 (전투 중)",
    cure: ["poison", "bleed", "burn"], battleOnly: true,
  },
  panacea: {
    id: "panacea", name: "만병통치약", price: 120,
    desc: "모든 해로운 상태를 해제 (전투 중)",
    cure: "all", battleOnly: true,
  },
  atk_tonic: {
    id: "atk_tonic", name: "힘의 비약", price: 60,
    desc: "아군 1명 공격 +25% (3턴, 전투 중)",
    buff: { id: "atkup", power: 25, turns: 3 }, battleOnly: true,
  },
  def_tonic: {
    id: "def_tonic", name: "철벽의 비약", price: 60,
    desc: "아군 1명 방어 +6 (3턴, 전투 중)",
    buff: { id: "defup", power: 6, turns: 3 }, battleOnly: true,
  },
};

export const CONSUMABLE_IDS = Object.keys(CONSUMABLES) as ConsumableId[];

/** 전 소모품 0개 인벤토리 (새 게임·구 세이브 보강용) */
export function emptyItems(): Record<ConsumableId, number> {
  const out = {} as Record<ConsumableId, number>;
  for (const id of CONSUMABLE_IDS) out[id] = 0;
  return out;
}

/** 도구점 판매 목록 — 상점 UI(GearDef 목록)와 호환되는 형태로 노출 */
export const SHOP_ITEMS: GearDef[] = CONSUMABLE_IDS
  .filter((id) => !CONSUMABLES[id].unsold)
  .map((id) => {
    const c = CONSUMABLES[id];
    return { id: c.id, name: c.name, price: c.price, desc: c.desc };
  });

/* =====================================================================
 * 조합 재료 — 몬스터 종족 태그별 드랍. 도구점에서 물약으로 조합한다.
 * ===================================================================== */
export type MaterialId =
  | "flask"        // 빈 플라스크 (인간형)
  | "herb"         // 약초 (식물)
  | "fang"         // 짐승 송곳니 (야수)
  | "gel"          // 점액 응고물 (점액)
  | "bone_dust"    // 뼛가루 (언데드)
  | "ember";       // 영혼 불씨 (영체)

export interface MaterialDef {
  id: MaterialId;
  name: string;
  desc: string;
  /** 도구점 판매가 (재료를 팔 때 받는 값) */
  sell: number;
}

export const MATERIALS: Record<MaterialId, MaterialDef> = {
  flask: { id: "flask", name: "빈 플라스크", desc: "물약 조합의 바탕이 되는 유리병", sell: 8 },
  herb: { id: "herb", name: "약초", desc: "짓이기면 상처에 듣는 들풀", sell: 6 },
  fang: { id: "fang", name: "짐승 송곳니", desc: "갈아서 강장제에 쓰는 송곳니", sell: 7 },
  gel: { id: "gel", name: "점액 응고물", desc: "물약의 점도를 잡아 주는 응고 점액", sell: 7 },
  bone_dust: { id: "bone_dust", name: "뼛가루", desc: "정화 의식에 쓰이는 고운 뼛가루", sell: 12 },
  ember: { id: "ember", name: "영혼 불씨", desc: "영체가 남기는 식지 않는 불씨", sell: 18 },
};

export const MATERIAL_IDS = Object.keys(MATERIALS) as MaterialId[];

export function emptyMats(): Record<MaterialId, number> {
  const out = {} as Record<MaterialId, number>;
  for (const id of MATERIAL_IDS) out[id] = 0;
  return out;
}

/** 종족 태그 → 드랍 재료. 앞에 오는 태그가 우선한다. */
const TAG_MATERIAL: Partial<Record<CreatureTag, MaterialId>> = {
  undead: "bone_dust",
  spirit: "ember",
  humanoid: "flask",
  plant: "herb",
  ooze: "gel",
  beast: "fang",
};
const TAG_PRIORITY: CreatureTag[] = ["undead", "spirit", "humanoid", "plant", "ooze", "beast"];

/** 이 적이 떨어뜨릴 수 있는 재료 (없으면 null) */
export function materialOf(def: Pick<EnemyDef, "tags">): MaterialId | null {
  for (const tag of TAG_PRIORITY) {
    if (def.tags.includes(tag)) return TAG_MATERIAL[tag] ?? null;
  }
  return null;
}

/** 재료 드랍 판정 — 기본 28% + 파티 평균 운 보정 */
export function rollMaterialDrop(
  def: Pick<EnemyDef, "tags">, fortune: number, rng: () => number,
): MaterialId | null {
  const mat = materialOf(def);
  if (!mat) return null;
  return rng() < Math.min(0.6, 0.28 + fortune * 0.01) ? mat : null;
}

/* ---- 조합법 — 빈 플라스크 + 재료 → 소모품 ---- */
export interface CraftRecipe {
  out: ConsumableId;
  mats: Partial<Record<MaterialId, number>>;
}

export const CRAFT_RECIPES: CraftRecipe[] = [
  { out: "potion", mats: { flask: 1, herb: 2 } },
  { out: "potion2", mats: { flask: 1, herb: 3, gel: 2 } },
  { out: "mpotion", mats: { flask: 1, gel: 1, herb: 1 } },
  { out: "antidote", mats: { flask: 1, herb: 1, gel: 1 } },
  { out: "atk_tonic", mats: { flask: 1, fang: 2 } },
  { out: "def_tonic", mats: { flask: 1, fang: 1, gel: 2 } },
  { out: "elixir", mats: { flask: 1, bone_dust: 2, ember: 1 } },
];

/** 보유 재료로 이 조합이 가능한가 */
export function canCraft(recipe: CraftRecipe, mats: Record<MaterialId, number>): boolean {
  return (Object.keys(recipe.mats) as MaterialId[]).every((k) => mats[k] >= (recipe.mats[k] ?? 0));
}
