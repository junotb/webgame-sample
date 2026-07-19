/* =====================================================================
 * defs/damage.ts — 데미지 타입·저항 (물리 3 · 원소 4 · 그 외 마법 3)
 *  물리:  베기(칼/단검) · 찌르기(창/활/투척) · 때리기(둔기/맨손)
 *  원소:  땅 · 불 · 바람 · 물
 *  마법:  영혼 · 빛 · 어둠
 *  저항도 동일한 10종 타입을 키로 쓰는 배율 테이블(ResistTable)이다.
 * ===================================================================== */
import { SkillId } from "./skills";

export type DamageType =
  /* 물리 */
  | "slash" // 베기 — 칼/단검
  | "pierce" // 찌르기 — 창/활/투척
  | "bludgeon" // 때리기 — 둔기/맨손
  /* 원소 */
  | "earth" // 땅
  | "fire" // 불
  | "wind" // 바람
  | "water" // 물
  /* 그 외 마법 */
  | "spirit" // 영혼
  | "light" // 빛
  | "dark"; // 어둠

export const DAMAGE_TYPES: DamageType[] = [
  "slash", "pierce", "bludgeon",
  "earth", "fire", "wind", "water",
  "spirit", "light", "dark",
];

export type DamageCategory = "물리" | "원소" | "마법";
export interface DamageTypeMeta {
  name: string;
  cat: DamageCategory;
  /** 데미지 숫자·속성 태그 색 */
  color: number;
}
export const DAMAGE_META: Record<DamageType, DamageTypeMeta> = {
  slash: { name: "베기", cat: "물리", color: 0xd6d6de },
  pierce: { name: "찌르기", cat: "물리", color: 0xc4d6e2 },
  bludgeon: { name: "때리기", cat: "물리", color: 0xe0c79a },
  earth: { name: "땅", cat: "원소", color: 0xc9a24a },
  fire: { name: "불", cat: "원소", color: 0xff7a3c },
  wind: { name: "바람", cat: "원소", color: 0x8fe0a0 },
  water: { name: "물", cat: "원소", color: 0x4aa8ff },
  spirit: { name: "영혼", cat: "마법", color: 0xb99cff },
  light: { name: "빛", cat: "마법", color: 0xffe08a },
  dark: { name: "어둠", cat: "마법", color: 0x9a6ff0 },
};

/** 무기 계열 3종 — 물리 데미지 타입은 장착 무기의 계열이 결정한다 */
export type WeaponType = "slash" | "pierce" | "bludgeon";

/** 무기·공격 사거리 — 근접(전열 전용) / 원거리(후열에서도 시야 내 공격) */
export type WeaponReach = "melee" | "ranged";

/** 물리 무기 스킬 → 무기 계열 (마법·보조 스킬은 없음).
 *  상점 무기 정의·검증에 쓰는 참조 표. */
export const SKILL_WTYPE: Partial<Record<SkillId, WeaponType>> = {
  blade: "slash",
  spear: "pierce",
  bow: "pierce",
  thrown: "pierce",
  cudgel: "bludgeon",
  unarmed: "bludgeon",
};

/** 적/아군의 타입별 피해 배율. 미지정 타입은 1.0(보통).
 *  <1 저항 · 1 보통 · >1 약점 · ≤0 무효 */
export type ResistTable = Partial<Record<DamageType, number>>;

export function resistMult(table: ResistTable | undefined, dt: DamageType): number {
  return table?.[dt] ?? 1;
}

export type ResistBand = "immune" | "resist" | "normal" | "weak";
export function resistBand(mult: number): ResistBand {
  if (mult <= 0) return "immune";
  if (mult < 1) return "resist";
  if (mult > 1) return "weak";
  return "normal";
}

/** 공격 1타의 데미지 타입.
 *  - 명시 dtype 우선 (원소 세부 속성은 반드시 여기서 지정)
 *  - 그 외 마법은 스킬 계열(영혼/빛/어둠)이 곧 타입
 *  - 물리는 장착 무기의 계열(weaponType)이 타입 */
export function attackDamageType(
  a: { dtype?: DamageType; kind: "phys" | "mag" | "heal"; skill: SkillId },
  weaponType: WeaponType,
): DamageType {
  if (a.dtype) return a.dtype;
  if (a.kind === "mag") {
    if (a.skill === "spirit") return "spirit";
    if (a.skill === "light") return "light";
    if (a.skill === "dark") return "dark";
    return "fire"; // 원소 dtype 누락 방어 (damage.test가 강제)
  }
  return weaponType;
}
