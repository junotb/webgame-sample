/* =====================================================================
 * defs/shop.ts — 상점 물품
 * ===================================================================== */
import { Attrs } from "./attrs";
import { ResistTable, WeaponReach, WeaponType } from "./damage";
import { EquipSlot } from "./equip";

export interface GearDef {
  id: string;
  name: string;
  /** 장착 슬롯. "ring"은 빈 반지 칸(ring1/ring2)에 자동 배치. 소모품은 생략 */
  slot?: EquipSlot | "ring";
  atk?: number;
  def?: number;
  price: number;
  /** 무기 계열 — 물리 데미지 타입을 결정 (무기 물품에만) */
  wtype?: WeaponType;
  /** 무기 사거리 — 근접/원거리 (무기 물품에만, 생략 시 근접) */
  reach?: WeaponReach;
  /** 양손무기 — mainHand 장착 시 offHand를 점유(비운다) */
  twoHanded?: boolean;
  /** 부여하는 타입별 피해 배율(저항) — 방어구·망토·장신구 */
  res?: ResistTable;
  /** 능력치 보너스 — 목걸이·반지·서클릿 등 */
  attrs?: Partial<Attrs>;
  desc?: string;
}

/* 무기 3계열 — 베기(slash)·찌르기(pierce)·때리기(bludgeon). 활은 원거리(후열 공격)·양손.
 * 왼손(offHand) 무기는 오른손과 공격력이 합산된다(듀얼윌드). */
export const SHOP_WEAPONS: GearDef[] = [
  { id: "w0", name: "단검", slot: "offHand", atk: 4, wtype: "slash", reach: "melee", price: 90 },
  { id: "w1", name: "강철 검", slot: "mainHand", atk: 5, wtype: "slash", reach: "melee", price: 120 },
  { id: "w2", name: "강철 창", slot: "mainHand", atk: 6, wtype: "pierce", reach: "reach", price: 140 },
  { id: "w3", name: "전투 망치", slot: "mainHand", atk: 7, wtype: "bludgeon", reach: "melee", price: 150 },
  { id: "w4", name: "사냥 활", slot: "mainHand", atk: 9, wtype: "pierce", reach: "ranged", twoHanded: true, price: 260 },
  { id: "w5", name: "대검", slot: "mainHand", atk: 14, wtype: "slash", reach: "melee", twoHanded: true, price: 520 },
  { id: "w6", name: "은장 검", slot: "mainHand", atk: 11, wtype: "slash", reach: "melee", price: 420 },
  { id: "w7", name: "룬 메이스", slot: "mainHand", atk: 17, wtype: "bludgeon", reach: "melee", price: 900 },
  { id: "w8", name: "장궁", slot: "mainHand", atk: 16, wtype: "pierce", reach: "ranged", twoHanded: true, price: 820 },
  { id: "w9", name: "룬 블레이드", slot: "mainHand", atk: 19, wtype: "slash", reach: "melee", price: 980 },
  { id: "w10", name: "룬 미늘창", slot: "mainHand", atk: 17, wtype: "pierce", reach: "reach", twoHanded: true, price: 940 },
];

/* 방어구·방패·장신구 — 투구·갑옷·신발·망토(방어/저항) + 목걸이·반지(능력치) */
export const SHOP_ARMORS: GearDef[] = [
  /* 갑옷(body) */
  { id: "a1", name: "사슬 갑옷", slot: "body", def: 4, price: 110 },
  { id: "a2", name: "판금 갑옷", slot: "body", def: 9, price: 400 },
  { id: "a3", name: "룬 아머", slot: "body", def: 15, price: 950,
    /* 룬으로 벼린 원소 방벽 — 4원소 피해 15% 경감 */
    res: { earth: 0.85, fire: 0.85, wind: 0.85, water: 0.85 } },
  /* 방패(offHand) */
  { id: "s1", name: "라운드 실드", slot: "offHand", def: 4, price: 130 },
  { id: "s2", name: "카이트 실드", slot: "offHand", def: 7, price: 380 },
  /* 투구(helmet) */
  { id: "h1", name: "강철 투구", slot: "helmet", def: 3, price: 100 },
  { id: "h2", name: "현자의 서클릿", slot: "helmet", def: 1, attrs: { int: 2, wit: 2 }, price: 340 },
  /* 신발(boots) */
  { id: "b1", name: "질주의 장화", slot: "boots", def: 1, attrs: { agi: 2 }, price: 180 },
  /* 망토(cloak) — 저항 슬롯 */
  { id: "c1", name: "원소 저항 망토", slot: "cloak", def: 1, price: 300,
    res: { earth: 0.9, fire: 0.9, wind: 0.9, water: 0.9 } },
  /* 목걸이(amulet) */
  { id: "m1", name: "수호의 부적", slot: "amulet", attrs: { vital: 3 }, price: 260,
    res: { dark: 0.85 } },
  /* 반지(ring) — 빈 반지 칸에 자동 장착 */
  { id: "r1", name: "힘의 반지", slot: "ring", attrs: { might: 3 }, price: 200 },
  { id: "r2", name: "행운의 반지", slot: "ring", attrs: { fortune: 3 }, price: 240 },
];

export const SHOP_ITEMS: GearDef[] = [
  {
    id: "potion",
    name: "치유 물약",
    price: 30,
    desc: "아군 1명 HP 60 회복 (전투불능 회복 가능)",
  },
  { id: "mpotion", name: "마나 물약", price: 45, desc: "아군 1명 MP 25 회복" },
];
