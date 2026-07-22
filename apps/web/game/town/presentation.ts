import * as PIXI from "pixi.js";
import { AmbientTick, bobSprite, particleField, swaySprite } from "../ambient";
import { C, H, W, panel, txt } from "../core";
import { questStatus } from "../core/quests";
import type { NpcDef } from "../defs";
import { FACING_NAME, cellAt } from "../grid";
import type { GridMap } from "../grid";
import { FIELD_ENTRANCE_KIND, entranceNode } from "../entrances";
import { drawAdventurer } from "../monsters";
import { createFPView } from "../fpview";
import type { FPEntity, FPTheme, SurfacePick } from "../fpview";
import { tileSprite, tileTex } from "../tiles";
import type { TileName } from "../tiles";
import type { CompiledTown } from "./compile";
import type { TownPose } from "./navigation";
import type { TownData, TownFacilityDef, TownFacilityId } from "./types";
import type { TownTimePhase } from "./world-state";

export interface TownPresentation {
  viewRoot: PIXI.Container;
  render(pose: TownPose): void;
  tick(deltaMS: number): void;
  refreshNpcMarks(): void;
  visitFacility(id: TownFacilityId): void;
  setTime(time: { phase: TownTimePhase; label: string }): void;
}

/** 분수 물빛 일렁임 — 수면 밝기와 물기둥 높이를 잔잔히 진동시킨다 */
function fountainShimmer(sprite: PIXI.Sprite): AmbientTick {
  const baseScaleY = sprite.scale.y;
  let elapsed = 0;
  return (deltaMS) => {
    elapsed += deltaMS;
    sprite.alpha = 0.93 + 0.07 * Math.sin(elapsed / 480);
    sprite.scale.y = baseScaleY * (1 + 0.009 * Math.sin(elapsed / 620));
  };
}

const hash01 = (x: number, y: number, a: number, b: number): number => {
  const s = Math.sin(x * a + y * b) * 43758.5453;
  return s - Math.floor(s);
};

type CrossvaleGroundKind = "grass" | "road" | "plaza";

/* 크로스베일은 이름 그대로 교차로 마을 — 남문~신전의 남북 대로와 서문~동문의
 * 동서 가로가 분수 광장에서 만나고, 시설 문 앞까지는 좁은 골목만 닿는다.
 * 나머지는 전부 초지: 변경 마을답게 돌보다 풀이 많아야 한다. */
const CROSSVALE_LANES: ReadonlyArray<{ y: number; x1: number; x2: number }> = [
  { y: 7, x1: 8, x2: 11 }, { y: 7, x1: 15, x2: 19 },   // 자아 길드 · 원소 길드
  { y: 12, x1: 8, x2: 11 }, { y: 12, x1: 15, x2: 19 }, // 현상금 길드 · 무기점
  { y: 17, x1: 8, x2: 11 }, { y: 17, x1: 15, x2: 19 }, // 도구점 · 방어구점
  { y: 19, x1: 15, x2: 23 },                           // 마굿간·여관 골목
];

function crossvaleGroundKind(x: number, y: number): CrossvaleGroundKind {
  const dx = x - 13.5, dy = y - 10.5;
  if (dx * dx * 0.7 + dy * dy <= 9.5) return "plaza";  // 분수 중심의 원형 광장
  if (x >= 12 && x <= 14 && y >= 5) return "road";     // 남북 대로 (남문~신전 앞)
  if (y === 14) return "road";                         // 동서 가로 (서문~동문)
  if (CROSSVALE_LANES.some((lane) => y === lane.y && x >= lane.x1 && x <= lane.x2)) return "road";
  return "grass";
}

/* 같은 자갈돌 타일에 색조만 달리해 재질을 가른다 — 광장은 밝은 회백 포석,
 * 길은 흙먼지 앉은 갈색 자갈길. 파랗게 도드라지던 벽돌 포장은 쓰지 않는다. */
const PLAZA_TINT = 0xf0e4d2;
const ROAD_TINT = 0xd9b184;

function crossvaleFloor(x: number, y: number): SurfacePick {
  const kind = crossvaleGroundKind(x, y);
  if (kind !== "grass") {
    const base = hash01(x, y, 91.7, 53.3) < 0.5 ? "village_cobble" : "village_cobble_alt";
    return { base, tint: kind === "plaza" ? PLAZA_TINT : ROAD_TINT };
  }
  return { base: hash01(x, y, 91.7, 53.3) < 0.28 ? "village_grass_alt" : "village_grass" };
}

const FACILITY_EMBLEM_TILE: Partial<Record<TownFacilityId, TileName>> = {
  weapon: "facility_emblem_weapon",
  armor: "facility_emblem_armor",
  item: "facility_emblem_item",
  inn: "facility_emblem_inn",
  stable: "facility_emblem_stable",
  bountyGuild: "facility_emblem_bounty",
  elementsGuild: "facility_emblem_elements",
  spiritGuild: "facility_emblem_spirit",
};

interface FacilityFacade {
  wall: TileName;
  roof: TileName;
  door: TileName;
  window?: TileName;
}

const FACILITY_FACADE: Record<TownFacilityId, FacilityFacade> = {
  weapon: { wall: "village_wall_brick", roof: "village_roof_red", door: "village_door_wood", window: "village_window_wide" },
  armor: { wall: "village_wall_stone", roof: "village_roof_blue", door: "village_door_arch", window: "village_window_small" },
  item: { wall: "village_wall_plaster", roof: "village_roof_red", door: "village_door_wood", window: "village_window_wide" },
  inn: { wall: "village_wall_timber", roof: "village_roof_red", door: "village_door_wood", window: "village_window_flower" },
  stable: { wall: "village_wall_timber", roof: "village_roof_red", door: "village_door_wood" },
  bountyGuild: { wall: "village_wall_brick", roof: "village_roof_red", door: "village_door_wood", window: "village_window_small" },
  elementsGuild: { wall: "village_wall_plaster", roof: "village_roof_blue", door: "village_door_arch", window: "village_window_arch" },
  spiritGuild: { wall: "village_wall_stone", roof: "village_roof_blue", door: "village_door_arch", window: "village_window_arch" },
  temple: { wall: "village_wall_stone", roof: "village_roof_blue", door: "village_door_arch", window: "village_window_arch" },
  throne: { wall: "village_wall_stone", roof: "village_roof_blue", door: "village_door_arch", window: "village_window_wide" },
};

interface GridOffset { dx: number; dy: number }

const CARDINAL_OFFSETS: readonly GridOffset[] = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

function facilityFacadePositions(town: TownData, facility: TownFacilityDef): Array<{ x: number; y: number }> {
  const floorSides = CARDINAL_OFFSETS.filter(({ dx, dy }) =>
    cellAt(town.map, facility.x + dx, facility.y + dy) === "floor");
  const front = floorSides.find(({ dx, dy }) =>
    cellAt(town.map, facility.x - dx, facility.y - dy) === "wall") ?? floorSides[0];
  if (!front) return [];

  const lateral = [
    { dx: -front.dy, dy: front.dx },
    { dx: front.dy, dy: -front.dx },
  ];
  return lateral
    .map(({ dx, dy }) => ({ x: facility.x + dx, y: facility.y + dy }))
    .filter(({ x, y }) => cellAt(town.map, x, y) === "wall");
}

function createTheme(town: TownData, spatial: CompiledTown<NpcDef>): FPTheme {
  const facadeWalls = new Map<string, SurfacePick>();
  for (const facility of town.facilities) {
    const facade = FACILITY_FACADE[facility.id];
    const sides = facilityFacadePositions(town, facility);
    const emblem = FACILITY_EMBLEM_TILE[facility.id];
    if (emblem && sides[0])
      facadeWalls.set(`${sides[0].x},${sides[0].y}`, { base: facade.wall, decal: emblem, cap: facade.roof });
    const windowStart = emblem ? 1 : 0;
    if (facade.window) for (const position of sides.slice(windowStart))
      facadeWalls.set(`${position.x},${position.y}`, { base: facade.wall, decal: facade.window, cap: facade.roof });
  }

  /* 문에서 가까운 벽은 같은 건물로 간주해 재료가 블록 전체에서 일관되게 보이게 한다. */
  const buildingWalls = new Map<string, TownFacilityDef>();
  for (let y = 0; y < town.map.h; y++) for (let x = 0; x < town.map.w; x++) {
    if (cellAt(town.map, x, y) !== "wall") continue;
    let nearest: TownFacilityDef | undefined;
    let nearestDistance = Infinity;
    for (const facility of town.facilities) {
      const distance = Math.max(Math.abs(x - facility.x), Math.abs(y - facility.y));
      if (distance <= 5 && distance < nearestDistance) {
        nearest = facility;
        nearestDistance = distance;
      }
    }
    if (nearest) buildingWalls.set(`${x},${y}`, nearest);
  }

  return {
    floorAt: (x, y): SurfacePick => town.id === "crossvale"
      ? crossvaleFloor(x, y)
      : { base: "floor", decal: hash01(x, y, 91.7, 53.3) < 0.5 ? "pave_decal" : "pave2_decal" },
    wallAt: (x, y): SurfacePick => {
      const facility = spatial.facilityAt(x, y);
      if (facility) {
        const facade = FACILITY_FACADE[facility.id];
        return { base: facade.wall, decal: facade.door, cap: facade.roof };
      }
      const facadeWall = facadeWalls.get(`${x},${y}`);
      if (facadeWall) return facadeWall;
      const owner = buildingWalls.get(`${x},${y}`);
      if (owner) {
        const facade = FACILITY_FACADE[owner.id];
        const exposed = CARDINAL_OFFSETS.some(({ dx, dy }) =>
          cellAt(town.map, x + dx, y + dy) !== "wall");
        const window = exposed && facade.window && hash01(x, y, 37.1, 83.9) < 0.38
          ? facade.window : undefined;
        return { base: facade.wall, decal: window, cap: facade.roof };
      }
      const h = hash01(x, y, 17.3, 71.9);
      if (h < 0.14) return { base: "village_wall_plaster", decal: "village_window_small", cap: "village_roof_red" };
      if (h < 0.28) return { base: "village_wall_brick", cap: "village_roof_red" };
      if (h < 0.38) return { base: "village_wall_timber", cap: "village_roof_red" };
      return { base: "village_wall_plaster", cap: "village_roof_blue" };
    },
    torchAt: (x, y) => !facadeWalls.has(`${x},${y}`) && hash01(x, y, 29.1, 47.7) < 0.05,
    ceiling: town.id === "crossvale" ? null : "ceiling",
    /* 하늘이 보이는 야외 마을에서만 벽 위에 지붕을 얹는다(실내는 천장이 대신한다). */
    roofHeight: town.id === "crossvale" ? 0.45 : undefined,
    water: town.id === "crossvale" ? "village_water" : "water",
    stairs: { base: "floor", decal: "stairs_decal" },
    floorTint: town.id === "crossvale" ? 0xffffff : 0x93a85a,
    waterTint: town.id === "crossvale" ? 0xd7fff1 : undefined,
    wallTint: 0xffffff,
    ceilingTint: 0x73834e,
    /* 긴 대로 끝의 건물도 미리 실루엣이 보이게 한다. */
    viewDistance: 9,
  };
}

function createEntities(town: TownData, npcs: readonly NpcDef[]): {
  entities: FPEntity[];
  refreshNpcMarks: () => void;
  ambientTicks: AmbientTick[];
} {
  const entities: FPEntity[] = [];
  const ambientTicks: AmbientTick[] = [];

  for (const facility of town.facilities) {
    const node = new PIXI.Container();
    const label = txt(facility.name, 12, C.border, { weight: "700", shadow: true });
    label.anchor.set(0.5, 1); label.y = -108; node.addChild(label);
    entities.push({
      id: `door-label:${facility.x},${facility.y}`,
      x: facility.x, y: facility.y, node, worldH: 0.8, baseH: 112,
    });
  }

  const fountain = town.decos.find((deco) => deco.id === "fountain");
  if (fountain) {
    const node = new PIXI.Container();
    /* 원본에 접지 그림자가 그려져 있어 별도 그림자는 두지 않는다.
     * 원화는 약 31° 부감이라 눈높이(바닥 위 0.5칸)에서 보면 너무 위에서 내려다본 꼴이 된다.
     * 세로를 눌러 두어 칸 거리에서 보는 각도(≈13°)의 납작한 수반으로 맞춘다. */
    if (town.id === "evermore") {
      /* 왕도 대분수 — 분수 홀 원화(scene_01_fountain_hall)에서 추출한 3단 백석 분수 */
      const sprite = tileSprite("royal_fountain_obj", 1); sprite.scale.set(0.8, 0.52);
      sprite.anchor.set(0.5, 1);
      node.addChild(sprite);
      entities.push({ id: "fountain", x: fountain.x, y: fountain.y, node, worldH: 0.44, baseH: 89 });
      ambientTicks.push(fountainShimmer(sprite));
    } else {
      const sprite = tileSprite("fountain_obj", 2); sprite.scale.set(2, 0.9);
      sprite.anchor.set(0.5, 1);
      node.addChild(sprite);
      entities.push({ id: "fountain", x: fountain.x, y: fountain.y, node, worldH: 0.32, baseH: 61 });
      ambientTicks.push(fountainShimmer(sprite));
    }
  }

  const well = town.decos.find((deco) => deco.id === "well");
  if (well) {
    const node = new PIXI.Container();
    const shadow = new PIXI.Graphics();
    shadow.ellipse(0, 2, 34, 8).fill({ color: 0x000000, alpha: 0.3 });
    const sprite = tileSprite("well_obj", 2); sprite.anchor.set(0.5, 1);
    node.addChild(shadow, sprite);
    entities.push({ id: "well", x: well.x, y: well.y, node, worldH: 0.55, baseH: 116 });
  }

  for (const deco of town.decos) {
    if (deco.id === "statue") {
      const node = new PIXI.Container();
      const g = new PIXI.Graphics();
      g.ellipse(0, 2, 24, 6).fill({ color: 0x000000, alpha: 0.3 });
      g.roundRect(-20, -22, 40, 22, 4).fill(0x4a4560);
      g.roundRect(-20, -22, 40, 22, 4).stroke({ width: 2, color: 0x6a657f, alpha: 0.7 });
      g.roundRect(-10, -76, 20, 54, 8).fill(0x8a86a0);
      g.circle(0, -86, 11).fill(0x9a96b0);
      g.roundRect(-13, -60, 26, 8, 3).fill({ color: 0x7a7690, alpha: 0.9 });
      node.addChild(g);
      entities.push({ id: `statue:${deco.x},${deco.y}`, x: deco.x, y: deco.y, node, worldH: 0.62, baseH: 92 });
    }
    if (deco.id === "barrel" || deco.id === "crate") {
      const node = new PIXI.Container();
      const sprite = tileSprite(deco.id === "barrel" ? "barrel_obj" : "crate_obj", 2);
      sprite.anchor.set(0.5, 1); node.addChild(sprite);
      entities.push({
        id: deco.id, x: deco.x, y: deco.y, node,
        worldH: deco.id === "barrel" ? 0.5 : 0.45, baseH: 64,
      });
    }
  }

  const treeTiles: TileName[] = ["tree_01", "tree_02", "tree_03", "tree_04"];
  for (const deco of town.decos) {
    if (!["tree", "bush", "flower", "mushroom"].includes(deco.id)) continue;
    const tile: TileName = deco.id === "tree"
      ? treeTiles[(deco.x + deco.y) % treeTiles.length]
      : deco.id === "bush" ? ((deco.x + deco.y) % 2 ? "bush_01" : "bush_02")
        : deco.id === "flower" ? ((deco.x + deco.y) % 2 ? "flower_01" : "flower_02") : "mushroom_01";
    const node = new PIXI.Container();
    const sprite = tileSprite(tile); sprite.anchor.set(0.5, 1); node.addChild(sprite);
    const tall = deco.id === "tree";
    entities.push({
      id: `deco:${deco.x},${deco.y}`, x: deco.x, y: deco.y, node,
      worldH: tall ? 0.98 : deco.id === "bush" ? 0.34 : 0.16,
      baseH: tall ? 112 : deco.id === "bush" ? 32 : 16,
    });
    ambientTicks.push(swaySprite(sprite, {
      amp: tall ? 0.016 : deco.id === "bush" ? 0.03 : 0.05,
      period: tall ? 3400 : 2200,
      phase: deco.x * 1.3 + deco.y * 2.1,
    }));
  }

  /* 통행·조사를 방해하지 않는 작은 바닥 장식을 초지에 결정적으로 배치한다. */
  if (town.id === "crossvale") {
    const occupied = new Set<string>();
    const reserve = (x: number, y: number) => occupied.add(`${x},${y}`);
    town.facilities.forEach((entry) => reserve(entry.x, entry.y));
    town.decos.forEach((entry) => reserve(entry.x, entry.y));
    town.gates.forEach((entry) => reserve(entry.x, entry.y));
    npcs.forEach((entry) => reserve(entry.gx, entry.gy));
    Object.values(town.starts).forEach((entry) => { if (entry) reserve(entry.x, entry.y); });

    for (let y = 1; y < town.map.h - 1; y++) for (let x = 1; x < town.map.w - 1; x++) {
      if (cellAt(town.map, x, y) !== "floor" || crossvaleGroundKind(x, y) !== "grass"
        || occupied.has(`${x},${y}`)) continue;
      const roll = hash01(x, y, 13.7, 61.3);
      let tile: TileName | undefined;
      let scale = 1.4, worldH = 0.12, baseH = 20;
      if (roll < 0.11) tile = hash01(x, y, 31.1, 17.9) < 0.5 ? "flower_01" : "flower_02";
      else if (roll < 0.16) tile = "mushroom_01";
      else if (roll < 0.22) {
        tile = hash01(x, y, 47.3, 29.5) < 0.5 ? "bush_01" : "bush_02";
        scale = 0.9; worldH = 0.18; baseH = 28;
      }
      if (!tile) continue;

      const node = new PIXI.Container();
      const sprite = tileSprite(tile, scale);
      sprite.anchor.set(0.5, 1);
      sprite.x = Math.round((hash01(x, y, 71.9, 23.7) - 0.5) * 12);
      node.addChild(sprite);
      entities.push({ id: `ground-deco:${x},${y}`, x, y, node, worldH, baseH });
      ambientTicks.push(swaySprite(sprite, { amp: 0.05, period: 2100, phase: x * 1.7 + y * 0.9 }));
    }
  }

  /* 외곽길 입구 — 이어지는 필드의 풍경을 미리 보여 주는 테마 입구 */
  for (const gate of town.gates) {
    const { node, worldH, baseH } = entranceNode(FIELD_ENTRANCE_KIND[gate.target]);
    const label = txt(gate.label, 12, C.text, { weight: "700", shadow: true });
    label.anchor.set(0.5, 1); label.y = -(baseH + 10); node.addChild(label);
    entities.push({ id: `gate:${gate.id}`, x: gate.x, y: gate.y, node, worldH, baseH });
  }

  const npcMarks: Array<() => void> = [];
  for (const npc of npcs) {
    const node = new PIXI.Container();
    const body = drawAdventurer(npc.color, npc.accent, 1.2);
    node.addChild(body);
    /* 제자리 숨쉬기 — NPC마다 위상을 어긋내 광장이 살아 보이게 한다 */
    ambientTicks.push(bobSprite(body, { pixels: 2, period: 1700 + (npc.gx * 37 + npc.gy * 59) % 600, phase: npc.gx + npc.gy }));
    const name = txt(npc.name, 12, C.border, { weight: "700", shadow: true });
    name.anchor.set(0.5, 0); name.y = 6; node.addChild(name);
    const mark = txt("!", 18, C.elite, { weight: "900", shadow: true });
    mark.anchor.set(0.5, 1); mark.y = -84; node.addChild(mark);
    const refreshMark = () => {
      const statuses = (npc.quests ?? []).map((quest) => questStatus(quest));
      mark.text = statuses.includes("done") ? "!" : statuses.includes("available") ? "?" : "";
      mark.style.fill = statuses.includes("done") ? C.elite : C.dim;
    };
    refreshMark();
    npcMarks.push(refreshMark);
    entities.push({ id: `npc:${npc.id}`, x: npc.gx, y: npc.gy, node, worldH: 0.62, baseH: 92 });
  }

  return { entities, refreshNpcMarks: () => npcMarks.forEach((refresh) => refresh()), ambientTicks };
}

function createMinimap(
  root: PIXI.Container,
  town: TownData,
  npcs: readonly NpcDef[],
  visitedFacilities: ReadonlySet<TownFacilityId>,
) {
  const map = town.map;
  const cellSize = 6;
  const minimap = new PIXI.Container(); minimap.x = 16; minimap.y = 54; root.addChild(minimap);
  minimap.addChild(panel(map.w * cellSize + 16, map.h * cellSize + 16, { alpha: 0.88 }));
  const graphics = new PIXI.Graphics(); graphics.x = 8; graphics.y = 8; minimap.addChild(graphics);
  const compass = txt("", 14, C.border, { weight: "700" });
  compass.x = 16; compass.y = minimap.y + map.h * cellSize + 22; root.addChild(compass);
  const legend = txt("◆ 시설  ● NPC  ? 의뢰", 11, C.dim);
  legend.x = 16; legend.y = compass.y + 22; root.addChild(legend);

  return (pose: TownPose): void => {
    graphics.clear();
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const kind = cellAt(map, x, y);
      const color = kind === "wall" ? 0x35304a
        : kind === "water" ? 0x2c4a6e
          : kind === "door" ? 0x7a5a34
            : town.id !== "crossvale" ? 0x6e6552
              : { grass: 0x50673d, road: 0x87704f, plaza: 0x968b78 }[crossvaleGroundKind(x, y)];
      graphics.rect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1).fill(color);
    }
    for (const facility of town.facilities) {
      const visited = visitedFacilities.has(facility.id);
      graphics.rect(facility.x * cellSize, facility.y * cellSize, cellSize - 1, cellSize - 1)
        .fill(visited ? C.border : 0x655a42);
      const statuses = (facility.quests ?? []).map((quest) => questStatus(quest));
      if (statuses.includes("available") || statuses.includes("done")) {
        graphics.circle(facility.x * cellSize + cellSize / 2, facility.y * cellSize + cellSize / 2, 2.2)
          .fill(statuses.includes("done") ? C.elite : 0xffffff);
      }
    }
    for (const deco of town.decos.filter((entry) => entry.interactive !== false))
      graphics.rect(deco.x * cellSize + 1, deco.y * cellSize + 1, cellSize - 3, cellSize - 3)
        .fill(deco.id === "fountain" ? 0x4f9fd0 : deco.id === "statue" ? 0x9a96b0 : 0x8a7430);
    for (const gate of town.gates)
      graphics.rect(gate.x * cellSize, gate.y * cellSize, cellSize - 1, cellSize - 1).fill(0x5ad07a);
    for (const npc of npcs)
      graphics.circle(npc.gx * cellSize + cellSize / 2, npc.gy * cellSize + cellSize / 2, 2.4).fill(npc.accent);

    const cx = pose.x * cellSize + cellSize / 2 - 0.5;
    const cy = pose.y * cellSize + cellSize / 2 - 0.5;
    const points = [[0, -3.6], [3, 2.8], [-3, 2.8]].map(([x, y]) => {
      const angle = (pose.facing * Math.PI) / 2;
      return [cx + x * Math.cos(angle) - y * Math.sin(angle), cy + x * Math.sin(angle) + y * Math.cos(angle)];
    });
    graphics.moveTo(points[0][0], points[0][1]).lineTo(points[1][0], points[1][1])
      .lineTo(points[2][0], points[2][1]).closePath().fill(0xffffff);
    compass.text = `▲ ${FACING_NAME[pose.facing]}쪽을 보는 중`;
  };
}

export function createTownPresentation(
  root: PIXI.Container,
  town: TownData,
  npcs: readonly NpcDef[],
  spatial: CompiledTown<NpcDef>,
  initialTime: { phase: TownTimePhase; label: string },
): TownPresentation {
  const background = new PIXI.Container();
  const backgroundFill = new PIXI.Graphics();
  backgroundFill.rect(0, 0, W, H).fill(C.night);
  background.addChild(backgroundFill);
  /* 마을별 원경 — 크로스베일: 계곡 원경 / 에버모어: 푸른 황혼 하늘 + 흐르는 구름 */
  const backdropSprites: PIXI.Container[] = [];
  let backgroundTick: ((deltaMS: number) => void) | null = null;
  if (town.id === "crossvale") {
    const valley = new PIXI.Sprite(tileTex("crossvale_valley_bg"));
    valley.width = W; valley.height = H;
    /* 정지화 원경 위에도 옅은 구름막을 흘려 하늘이 살아 있게 한다 */
    const clouds = new PIXI.TilingSprite({ texture: tileTex("evermore_sky_clouds"), width: W, height: H * 0.5 });
    clouds.tileScale.set(W / 576, (H * 0.5) / 324);
    clouds.alpha = 0.35;
    background.addChild(valley, clouds);
    backdropSprites.push(valley, clouds);
    backgroundTick = (deltaMS) => { clouds.tilePosition.x -= deltaMS * 0.004; };
  } else if (town.id === "evermore") {
    const sky = new PIXI.Sprite(tileTex("evermore_sky_base"));
    sky.width = W; sky.height = H;
    const clouds = new PIXI.TilingSprite({ texture: tileTex("evermore_sky_clouds"), width: W, height: H });
    clouds.tileScale.set(W / 576, H / 324);
    background.addChild(sky, clouds);
    backdropSprites.push(sky, clouds);
    backgroundTick = (deltaMS) => { clouds.tilePosition.x -= deltaMS * 0.006; };
  }
  root.addChild(background);

  const visualMap: GridMap = {
    ...town.map,
    cells: town.map.cells.map((cell) => cell === "door" ? "wall" : cell),
  };
  const view = createFPView(createTheme(town, spatial));
  root.addChild(view.root);
  /* 마을 부유 입자 — 야외 크로스베일은 낙엽, 실내형 마을은 빛먼지 */
  const ambient = particleField(town.id === "crossvale" ? "leaves" : "motes");
  root.addChild(ambient.node);
  const lighting = new PIXI.Graphics();
  lighting.rect(0, 0, W, H).fill({ color: 0x17102d, alpha: 1 });
  root.addChild(lighting);
  const { entities, refreshNpcMarks, ambientTicks } = createEntities(town, npcs);
  const visitedFacilities = new Set<TownFacilityId>();
  const redrawMinimap = createMinimap(root, town, npcs, visitedFacilities);
  const districtLabel = txt("", 16, C.border, { serif: true, weight: "700", shadow: true });
  districtLabel.anchor.set(0.5, 0); districtLabel.x = W / 2; districtLabel.y = 64; root.addChild(districtLabel);
  let time = initialTime;
  const applyTime = () => {
    const tint = time.phase === "night" ? 0x78829b
      : time.phase === "evening" ? 0xe6b39b : 0xffffff;
    for (const sprite of backdropSprites) (sprite as PIXI.Sprite).tint = tint;
    lighting.alpha = time.phase === "night" ? 0.32 : time.phase === "evening" ? 0.14 : 0;
  };
  applyTime();

  return {
    viewRoot: view.root,
    render(pose) {
      view.render(visualMap, pose.x, pose.y, pose.facing, entities);
      redrawMinimap(pose);
      districtLabel.text = `${spatial.districtAt(pose.x, pose.y)?.name ?? town.name} · ${time.label}`;
    },
    tick: (deltaMS) => {
      view.tick(deltaMS);
      backgroundTick?.(deltaMS);
      ambient.tick(deltaMS);
      for (const tickAmbient of ambientTicks) tickAmbient(deltaMS);
    },
    refreshNpcMarks,
    visitFacility(id) { visitedFacilities.add(id); },
    setTime(next) { time = next; applyTime(); },
  };
}
