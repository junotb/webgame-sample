/* =====================================================================
 * defs/equip.ts — 장비 슬롯 (M&M식 다중 슬롯)
 *  무기 오른손(mainHand)/왼손(offHand) · 투구 · 갑옷 · 신발 · 망토
 *  목걸이 · 반지(왼/오른손, 좌우 차이 없음)
 *  양손무기는 mainHand + offHand 두 칸을 함께 점유한다.
 *  장신구(반지·목걸이·망토 등)는 능력치·저항을 부여해 파생 스탯을 강화한다.
 * ===================================================================== */
import { Attrs } from "./attrs";
import { ResistTable, WeaponReach, WeaponType } from "./damage";

export type EquipSlot =
  | "mainHand" // 오른손 무기
  | "offHand" // 왼손 무기/방패 (양손무기가 점유)
  | "helmet" // 투구
  | "body" // 갑옷
  | "boots" // 신발
  | "cloak" // 망토
  | "amulet" // 목걸이
  | "ring1" // 반지 (왼손)
  | "ring2"; // 반지 (오른손)

export const EQUIP_SLOTS: EquipSlot[] = [
  "mainHand", "offHand", "helmet", "body", "boots", "cloak", "amulet", "ring1", "ring2",
];

export type SlotGroup = "weapon" | "shield" | "armor" | "accessory";
export interface SlotMeta { name: string; group: SlotGroup; }
export const SLOT_META: Record<EquipSlot, SlotMeta> = {
  mainHand: { name: "오른손", group: "weapon" },
  offHand: { name: "왼손", group: "weapon" },
  helmet: { name: "투구", group: "armor" },
  body: { name: "갑옷", group: "armor" },
  boots: { name: "신발", group: "armor" },
  cloak: { name: "망토", group: "armor" },
  amulet: { name: "목걸이", group: "accessory" },
  ring1: { name: "반지", group: "accessory" },
  ring2: { name: "반지", group: "accessory" },
};

/** 한 슬롯에 장착된 장비 한 점.
 *  무기: atk·wtype·reach(+twoHanded) / 방어구·방패: def / 장신구: attrs·res 위주.
 *  어느 슬롯이든 res·attrs를 가질 수 있다(망토=저항, 목걸이·반지=능력치). */
export interface Equipped {
  name: string;
  /** 무기 공격력 (오른손·왼손 무기가 합산됨) */
  atk?: number;
  /** 무기 계열 — 물리 데미지 타입 결정 */
  wtype?: WeaponType;
  /** 무기 사거리 — 근접/원거리 */
  reach?: WeaponReach;
  /** 양손무기 — mainHand에 장착 시 offHand를 점유(비운다) */
  twoHanded?: boolean;
  /** 방어도(AC) — 방어구·방패·일부 장신구 */
  def?: number;
  /** 타입별 피해 배율(저항) — 방어구·망토·장신구가 곱연산으로 합쳐진다 */
  res?: ResistTable;
  /** 능력치 보너스 — 목걸이·반지·서클릿 등. 파생 스탯(공격·방어·명중·마법)에 반영 */
  attrs?: Partial<Attrs>;
  /** 기준 가치 (판매가 산정용) — 상점/드랍에서 장착 시 이월 */
  price?: number;
}

/** 무기 파생값 뷰 — 사거리·데미지 타입 판정에 쓰는 정규화된 형태 */
export interface WeaponView {
  name: string;
  atk: number;
  wtype: WeaponType;
  reach: WeaponReach;
}

/** 맨손 — mainHand가 비었을 때의 기본 무기(때리기·근접·공격력 0) */
export const FISTS: WeaponView = { name: "맨손", atk: 0, wtype: "bludgeon", reach: "melee" };
