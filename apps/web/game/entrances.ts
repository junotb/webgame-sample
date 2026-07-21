/* =====================================================================
 * entrances.ts — 다른 맵으로 가는 입구 비주얼
 *  손그림 없이 원본 에셋 프롭만 조합한다. 입구를 목적지의 재료로 짜서
 *  문 너머에 어떤 땅이 이어지는지 예고한다: 숲길은 나무 아치, 사원길은
 *  이끼 낀 석주, 계곡길은 거석과 고블린 토템, 마을길은 울타리문, 성길은 석문.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import type { FieldId } from "./fieldmaps";
import type { TownId } from "./town/types";
import { TileName, tileSprite } from "./tiles";

export type EntranceKind = "forest" | "ruins" | "valley" | "town" | "castle";

/** 필드로 나가는 입구 — 필드의 지형 테마를 예고한다. */
export const FIELD_ENTRANCE_KIND: Record<FieldId, EntranceKind> = {
  ruinedTemple: "ruins",
  goblinValley: "valley",
  hermanForest: "forest",
};

/** 마을로 돌아가는 입구 — 마을의 성격(전원 마을·성곽 도시)을 예고한다. */
export const TOWN_ENTRANCE_KIND: Record<TownId, EntranceKind> = {
  crossvale: "town",
  evermore: "castle",
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
  /** 숲길 — 두 그루 나무가 길 위에서 만나 초록 아치를 이룬다. */
  forest: () => assemble(60, [
    { tile: "tree_02", x: -40, scale: 1.3 },
    { tile: "tree_03", x: 40, scale: 1.5 },
    { tile: "bush_01", x: -28, scale: 1.4 },
    { tile: "flower_01", x: 24 },
    { tile: "flower_02", x: -8 },
  ], 1.1, 144),
  /** 사원길 — 이끼 낀 석주 한 쌍과 부러진 밑동이 남은 옛 참배로. */
  ruins: () => assemble(56, [
    { tile: "ruin_column_obj", x: -40, scale: 1.4 },
    { tile: "ruin_pillar_obj", x: 42, scale: 1.4 },
    { tile: "ruin_stump_obj", x: 14, scale: 1.1 },
    { tile: "mushroom_01", x: -20 },
  ], 1.05, 134),
  /** 계곡길 — 협곡 어귀의 거석 사이에 고블린 뼈 토템이 서 있다. */
  valley: () => assemble(60, [
    { tile: "valley_rock_obj", x: -48, scale: 1.15 },
    { tile: "valley_rock_obj", x: 50, scale: 0.95, flip: true },
    { tile: "goblin_totem_obj", x: 26, scale: 0.95 },
  ], 1.0, 134),
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
};

/** 목적지 테마에 맞는 입구 노드를 새로 만든다 (호출마다 새 인스턴스). */
export function entranceNode(kind: EntranceKind): EntranceVisual {
  return BUILDERS[kind]();
}
