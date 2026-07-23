/* =====================================================================
 * entrances.ts — 다른 맵으로 가는 입구 비주얼
 *  손그림 없이 원본 에셋 프롭만 조합한다. 모든 입구는 문/게이트 프롭을
 *  중심에 두어 "통로"로 읽히게 하고, 양옆의 액센트 프롭이 목적지를
 *  예고한다: 숲길은 나무에 감싸인 울타리문, 사원길은 석주 곁의 석문,
 *  계곡길은 고블린 뼈 문, 마을길은 울타리문, 성길은 석문, 해안길은
 *  나룻배 곁의 울타리문.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import type { DungeonId } from "./dungeons";
import type { FieldId } from "./fieldmaps";
import type { TownId } from "./town/types";
import { TileName, tileSprite } from "./tiles";

export type EntranceKind = "forest" | "ruins" | "valley" | "town" | "castle" | "coast" | "swamp" | "glowwood";

/** 필드로 나가는 입구 — 필드의 지형 테마를 예고한다. */
export const FIELD_ENTRANCE_KIND: Record<FieldId, EntranceKind> = {
  coastRoad: "coast",
  goblinValley: "valley",
  hermanForest: "forest",
  evermoreOutskirts: "forest",
  mistmarsh: "swamp",
  gleamwood: "glowwood",
};

/** 마을로 돌아가는 입구 — 마을의 성격(전원 마을·성곽 도시)을 예고한다. */
export const TOWN_ENTRANCE_KIND: Record<TownId, EntranceKind> = {
  crossvale: "town",
  evermore: "castle",
};

/** 던전으로 들어가는 입구 — 던전 어귀의 재질을 예고한다. */
export const DUNGEON_ENTRANCE_KIND: Record<DungeonId, EntranceKind> = {
  fortress: "valley",
  fortressB1: "valley", // 필드에서 직접 잇지 않는 지하층 — 요새와 같은 재질
  temple: "ruins",
  royalTomb: "ruins",
};

/** 입구 주변 외곽 벽 스킨 — 출구를 감싼 벽을 목적지 재질로 갈아입히고,
 *  진행 방향 벽면에는 문/아치를 걸어 벽에 뚫린 통로처럼 보이게 한다. */
export interface EntranceWallSkin {
  /** 입구를 감싸는 외곽 벽 재질 */
  base: TileName;
  /** 진행 방향 벽면에 거는 문/아치 데칼 */
  gate: TileName;
}

export const ENTRANCE_WALL_SKIN: Record<EntranceKind, EntranceWallSkin> = {
  forest: { base: "village_wall_timber", gate: "door_obj" },
  ruins: { base: "temple_wall_ornate", gate: "door_obj" },
  valley: { base: "cave_wall", gate: "door_obj" },
  town: { base: "village_wall_brick", gate: "village_door_wood" },
  castle: { base: "village_wall_stone", gate: "village_door_arch" },
  coast: { base: "village_wall_plaster", gate: "door_obj" },
  swamp: { base: "trunk_wall", gate: "door_obj" },
  glowwood: { base: "trunk_wall", gate: "door_obj" },
};

export interface EntranceVisual {
  node: PIXI.Container;
  worldH: number;
  baseH: number;
}

/** 다른 빌보드 프롭과 같은 접지 그림자 (fieldBuilding·well과 동일한 관례) */
const groundShadow = (rx: number): PIXI.Graphics =>
  new PIXI.Graphics().ellipse(0, 3, rx, 10).fill({ color: 0x16120e, alpha: 0.35 });

interface PropSpec {
  tile: TileName;
  x: number;
  scale?: number;
  flip?: boolean;
}

function assemble(shadowRx: number, props: PropSpec[], worldH: number, baseH: number): EntranceVisual {
  const node = new PIXI.Container();
  node.addChild(groundShadow(shadowRx));
  for (const prop of props) {
    const sprite = tileSprite(prop.tile, prop.scale ?? 2);
    sprite.anchor.set(0.5, 1);
    sprite.x = prop.x;
    if (prop.flip) sprite.scale.x = -sprite.scale.x;
    node.addChild(sprite);
  }
  return { node, worldH, baseH };
}

const BUILDERS: Record<EntranceKind, () => EntranceVisual> = {
  /** 숲길 — 울타리문을 가운데 두고 숲 나무가 양옆에서 문을 감싼다. */
  forest: () => assemble(60, [
    { tile: "tree_02", x: -44, scale: 1.3 },
    { tile: "tree_03", x: 44, scale: 1.3, flip: true },
    { tile: "fence_wing_obj", x: 0, scale: 2.6 },
    { tile: "fence_gate_obj", x: 0, scale: 2.1 },
  ], 1.1, 144),
  /** 사원길 — 열린 석문 곁에 이끼 낀 석주 하나가 옛 참배로를 예고한다. */
  ruins: () => assemble(56, [
    { tile: "stone_gate_obj", x: 4 },
    { tile: "ruin_column_obj", x: -52, scale: 1.3 },
  ], 1.15, 160),
  /** 계곡길 — 고블린 뼈 문. 거석 하나가 문기둥처럼 붙어 있다. */
  valley: () => assemble(60, [
    { tile: "goblin_bone_gate_obj", x: 0, scale: 1.0 }, /* 크롭이 기둥 발끝까지 길어져(100→141px) 스케일로 종전 크기를 유지 */
    { tile: "valley_rock_obj", x: -52, scale: 0.95 },
  ], 1.05, 140),
  /** 마을길 — 울타리 사이의 나무 문. 문가에 들꽃이 핀다. */
  town: () => assemble(64, [
    { tile: "fence_wing_obj", x: 0, scale: 2.6 },
    { tile: "fence_gate_obj", x: 0, scale: 2.1 },
    { tile: "flower_01", x: -34 },
    { tile: "flower_02", x: 36 },
  ], 0.75, 88),
  /** 성길 — 활짝 열린 석문. 뚫린 문 안으로 뒤편 풍경이 그대로 보인다. */
  castle: () => assemble(66, [
    { tile: "stone_gate_obj", x: 0 },
  ], 1.15, 160),
  /** 해안길 — 울타리문 곁에 뒤집힌 나룻배가 바닷길을 예고한다. */
  coast: () => assemble(62, [
    { tile: "fence_wing_obj", x: 0, scale: 2.6 },
    { tile: "fence_gate_obj", x: 0, scale: 2.1 },
    { tile: "shore_boat_obj", x: -42, scale: 0.5 },
    { tile: "flower_01", x: 36 },
  ], 0.75, 88),
  /** 늪길 — 이끼 늘어진 버드나무가 울타리문 위로 드리운다. */
  swamp: () => assemble(62, [
    { tile: "swamp_willow_obj", x: -40, scale: 0.85 },
    { tile: "fence_wing_obj", x: 0, scale: 2.6 },
    { tile: "fence_gate_obj", x: 0, scale: 2.1 },
    { tile: "swamp_shroom_violet_obj", x: 42, scale: 0.55 },
  ], 1.1, 157),
  /** 빛숲길 — 등불나무 두 그루 사이의 울타리문, 문가에 발광 수정. */
  glowwood: () => assemble(62, [
    { tile: "glow_tree_small_obj", x: -46, scale: 1.05 },
    { tile: "glow_tree_small_obj", x: 46, scale: 1.05, flip: true },
    { tile: "fence_wing_obj", x: 0, scale: 2.6 },
    { tile: "fence_gate_obj", x: 0, scale: 2.1 },
    { tile: "glow_crystal_green_obj", x: 24, scale: 0.5 },
  ], 0.85, 111),
};

/** 목적지 테마에 맞는 입구 노드를 새로 만든다 (호출마다 새 인스턴스). */
export function entranceNode(kind: EntranceKind): EntranceVisual {
  return BUILDERS[kind]();
}
