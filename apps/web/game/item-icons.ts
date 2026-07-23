/* =====================================================================
 * item-icons.ts — 소모품·조합 재료 아이콘 카탈로그
 *  assets-source의 32px 아이콘 시트를 public 런타임 시트로 슬라이스한다.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import type { ConsumableId, MaterialId } from "./defs";

export const SHEET_SRC = {
  consumables: "/assets/items/icons/consumables.png",
  misc: "/assets/items/icons/misc.png",
  plants: "/assets/items/icons/plants.png",
  monsterParts: "/assets/items/icons/monster_parts.png",
  gems: "/assets/items/icons/gems.png",
  weapons: "/assets/items/icons/weapons.png",
  armorLeather: "/assets/items/icons/armor_leather.png",
  armorIron: "/assets/items/icons/armor_iron.png",
  armorSteel: "/assets/items/icons/armor_steel.png",
  armorSpecial: "/assets/items/icons/armor_special.png",
  armorExtras: "/assets/items/icons/armor_extras.png",
  accessories: "/assets/items/icons/accessories.png",
} as const;
type SheetName = keyof typeof SHEET_SRC;

interface FrameDef { s: SheetName; x: number; y: number }

/** 의미가 겹치지 않도록 색과 실루엣을 달리 배정한 소모품 아이콘. */
export const CONSUMABLE_ICON_FRAMES: Record<ConsumableId, FrameDef> = {
  potion:   { s: "consumables", x: 0,   y: 0 },
  potion2:  { s: "consumables", x: 96,  y: 0 },
  mpotion:  { s: "consumables", x: 0,   y: 32 },
  mpotion2: { s: "consumables", x: 96,  y: 32 },
  elixir:   { s: "consumables", x: 96,  y: 128 },
  antidote: { s: "consumables", x: 0,   y: 64 },
  panacea:  { s: "consumables", x: 128, y: 128 },
  atk_tonic:{ s: "consumables", x: 0,   y: 96 },
  def_tonic:{ s: "consumables", x: 128, y: 32 },
};

/** 재료의 실제 형태와 가장 가까운 원본 픽셀 아이콘. */
export const MATERIAL_ICON_FRAMES: Record<MaterialId, FrameDef> = {
  flask:     { s: "consumables", x: 0,  y: 160 },
  herb:      { s: "plants", x: 96, y: 0 },
  fang:      { s: "monsterParts", x: 32, y: 64 },
  gel:       { s: "gems", x: 0, y: 288 },
  bone_dust: { s: "monsterParts", x: 32, y: 0 },
  ember:     { s: "misc", x: 64, y: 96 },
};

/** 장비 기반 이름(GearDef.name = OwnedGear.base) → 아이콘 프레임.
 *  희귀도 접사가 붙어도 기반 이름은 변하지 않으므로 드랍 장비도 같은 키로 찾는다. */
export const GEAR_ICON_FRAMES: Record<string, FrameDef> = {
  /* 무기 (weapons = uniques 시트) */
  "단검":       { s: "weapons", x: 256, y: 32 },
  "강철 검":    { s: "weapons", x: 320, y: 0 },
  "강철 창":    { s: "weapons", x: 256, y: 96 },
  "전투 망치":  { s: "weapons", x: 544, y: 128 },
  "사냥 활":    { s: "weapons", x: 0,   y: 160 },
  "대검":       { s: "weapons", x: 448, y: 0 },
  "은장 검":    { s: "weapons", x: 352, y: 0 },
  "룬 메이스":  { s: "weapons", x: 256, y: 128 },
  "장궁":       { s: "weapons", x: 448, y: 160 },
  "룬 블레이드": { s: "weapons", x: 416, y: 0 },
  "룬 미늘창":  { s: "weapons", x: 608, y: 96 },
  /* 방어구 — 재질 시트의 행: 갑옷/신발/건틀릿/투구/방패 */
  "사슬 갑옷":     { s: "armorIron",    x: 96, y: 0 },
  "판금 갑옷":     { s: "armorSteel",   x: 32, y: 0 },
  "룬 아머":       { s: "armorSpecial", x: 32, y: 0 },
  "라운드 실드":   { s: "armorLeather", x: 0,  y: 128 },
  "카이트 실드":   { s: "armorIron",    x: 32, y: 128 },
  "강철 투구":     { s: "armorSteel",   x: 96, y: 96 },
  "현자의 서클릿": { s: "armorExtras",  x: 0,  y: 0 },
  "질주의 장화":   { s: "armorLeather", x: 32, y: 32 },
  "원소 저항 망토": { s: "armorExtras", x: 96, y: 0 },
  /* 장신구 — accessories 시트: 0행 목걸이, 1행 반지 */
  "수호의 부적":   { s: "accessories", x: 128, y: 0 },
  "힘의 반지":     { s: "accessories", x: 288, y: 32 },
  "행운의 반지":   { s: "accessories", x: 96,  y: 32 },
};

const textures: Partial<Record<ConsumableId | MaterialId, PIXI.Texture>> = {};
const gearTextures: Record<string, PIXI.Texture> = {};

/** boot에서 한 번 호출한다. */
export async function loadItemIcons(): Promise<void> {
  const sheets: Record<string, PIXI.Texture> = await PIXI.Assets.load(
    (Object.keys(SHEET_SRC) as SheetName[]).map((key) => ({
      alias: `item-icons-${key}`,
      src: SHEET_SRC[key],
      data: { scaleMode: "nearest" as const },
    })),
  );
  const cut = (frame: FrameDef) => new PIXI.Texture({
    source: sheets[`item-icons-${frame.s}`].source,
    frame: new PIXI.Rectangle(frame.x, frame.y, 32, 32),
  });
  for (const [id, frame] of Object.entries(CONSUMABLE_ICON_FRAMES))
    textures[id as ConsumableId] = cut(frame);
  for (const [id, frame] of Object.entries(MATERIAL_ICON_FRAMES))
    textures[id as MaterialId] = cut(frame);
  for (const [base, frame] of Object.entries(GEAR_ICON_FRAMES))
    gearTextures[base] = cut(frame);
}

export function itemIcon(id: ConsumableId | MaterialId, size = 40): PIXI.Sprite {
  const texture = textures[id];
  if (!texture) throw new Error(`item-icons: "${id}" 미로드 — boot 이후 사용 가능`);
  const sprite = new PIXI.Sprite(texture);
  sprite.width = size;
  sprite.height = size;
  return sprite;
}

/** 장비 아이콘 — 기반 이름으로 찾는다. 프레임이 없는 이름은 null (호출부가 생략) */
export function gearIcon(base: string, size = 40): PIXI.Sprite | null {
  const texture = gearTextures[base];
  if (!texture) return null;
  const sprite = new PIXI.Sprite(texture);
  sprite.width = size;
  sprite.height = size;
  return sprite;
}

