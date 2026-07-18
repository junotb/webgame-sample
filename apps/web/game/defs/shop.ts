/* =====================================================================
 * defs/shop.ts — 상점 물품
 * ===================================================================== */

export interface GearDef {
  id: string;
  name: string;
  atk?: number;
  def?: number;
  price: number;
  desc?: string;
}
export const SHOP_WEAPONS: GearDef[] = [
  { id: "w1", name: "강철 검", atk: 5, price: 120 },
  { id: "w2", name: "은장 검", atk: 11, price: 420 },
  { id: "w3", name: "룬 블레이드", atk: 19, price: 980 },
];
export const SHOP_ARMORS: GearDef[] = [
  { id: "a1", name: "사슬 갑옷", def: 4, price: 110 },
  { id: "a2", name: "판금 갑옷", def: 9, price: 400 },
  { id: "a3", name: "룬 아머", def: 15, price: 950 },
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
