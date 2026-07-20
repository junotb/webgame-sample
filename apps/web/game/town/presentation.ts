import * as PIXI from "pixi.js";
import { C, H, W, panel, txt } from "../core";
import { questStatus } from "../core/quests";
import type { NpcDef } from "../defs";
import { FACING_NAME, cellAt } from "../grid";
import type { GridMap } from "../grid";
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

const hash01 = (x: number, y: number, a: number, b: number): number => {
  const s = Math.sin(x * a + y * b) * 43758.5453;
  return s - Math.floor(s);
};

type CrossvaleGroundKind = "grass" | "paving" | "cobble";

function crossvaleGroundKind(x: number, y: number): CrossvaleGroundKind {
  const mainRoad = x >= 11 && x <= 16;
  const square = x >= 9 && x <= 18 && y >= 9 && y <= 15;
  const gateRoad = y >= 14 && y <= 15;
  const guildLane = y >= 6 && y <= 8 && x >= 7 && x <= 20;
  const tradeLane = y >= 16 && y <= 18 && x >= 7 && x <= 20;
  const carriageLane = y >= 19 && x >= 11 && x <= 24;
  if (square) return "cobble";
  if (mainRoad || gateRoad || guildLane || tradeLane || carriageLane) return "paving";
  return "grass";
}

function crossvaleFloor(x: number, y: number): SurfacePick {
  const kind = crossvaleGroundKind(x, y);
  if (kind === "cobble") return { base: "village_cobble" };
  if (kind === "paving") return { base: "village_paving" };
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
} {
  const entities: FPEntity[] = [];

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
    const g = new PIXI.Graphics();
    g.ellipse(0, 2, 48, 10).fill({ color: 0x000000, alpha: 0.3 });
    g.roundRect(-44, -24, 88, 24, 6).fill(0x4a4560);
    g.roundRect(-44, -24, 88, 24, 6).stroke({ width: 2, color: 0x6a657f, alpha: 0.8 });
    g.ellipse(0, -24, 40, 12).fill(0x3c6e8e);
    g.rect(-5, -58, 10, 34).fill(0x6a657f);
    g.ellipse(0, -58, 18, 6).fill(0x5a5570);
    g.ellipse(0, -60, 14, 4).fill(0x4f9fd0);
    g.rect(-1.5, -78, 3, 18).fill({ color: 0x9fd0e8, alpha: 0.8 });
    g.circle(0, -79, 4).fill({ color: 0xcfe8f4, alpha: 0.9 });
    node.addChild(g);
    entities.push({ id: "fountain", x: fountain.x, y: fountain.y, node, worldH: 0.55, baseH: 84 });
  }

  const well = town.decos.find((deco) => deco.id === "well");
  if (well) {
    const node = new PIXI.Container();
    const g = new PIXI.Graphics();
    g.ellipse(0, 2, 28, 7).fill({ color: 0x000000, alpha: 0.3 });
    g.roundRect(-24, -26, 48, 26, 5).fill(0x5a5570);
    g.roundRect(-24, -26, 48, 26, 5).stroke({ width: 2, color: 0x6a657f, alpha: 0.8 });
    g.ellipse(0, -26, 20, 6).fill(0x14101f);
    g.rect(-21, -58, 4, 32).rect(17, -58, 4, 32).fill(0x4a3a2a);
    g.moveTo(-27, -56).lineTo(0, -72).lineTo(27, -56).closePath().fill(0x6a4a3a);
    node.addChild(g);
    entities.push({ id: "well", x: well.x, y: well.y, node, worldH: 0.5, baseH: 74 });
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
    }
  }

  for (const gate of town.gates) {
    const node = new PIXI.Container();
    const g = new PIXI.Graphics();
    g.rect(-34, -116, 18, 116).rect(16, -116, 18, 116).fill(0x5a4939);
    g.rect(-38, -128, 76, 16).fill(0x3f3329);
    g.rect(-34, -116, 18, 116).rect(16, -116, 18, 116)
      .stroke({ width: 2, color: C.border, alpha: 0.28 });
    node.addChild(g);
    const label = txt(gate.label, 12, C.text, { weight: "700", shadow: true });
    label.anchor.set(0.5, 1); label.y = -134; node.addChild(label);
    entities.push({ id: `gate:${gate.id}`, x: gate.x, y: gate.y, node, worldH: 1, baseH: 120 });
  }

  const npcMarks: Array<() => void> = [];
  for (const npc of npcs) {
    const node = new PIXI.Container();
    node.addChild(drawAdventurer(npc.color, npc.accent, 1.2));
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

  return { entities, refreshNpcMarks: () => npcMarks.forEach((refresh) => refresh()) };
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
          : kind === "door" ? 0x7a5a34 : 0x6e6552;
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
  const valleyBackground = town.id === "crossvale"
    ? new PIXI.Sprite(tileTex("crossvale_valley_bg")) : null;
  if (valleyBackground) {
    valleyBackground.width = W;
    valleyBackground.height = H;
    background.addChild(valleyBackground);
  }
  root.addChild(background);

  const visualMap: GridMap = {
    ...town.map,
    cells: town.map.cells.map((cell) => cell === "door" ? "wall" : cell),
  };
  const view = createFPView(createTheme(town, spatial));
  root.addChild(view.root);
  const lighting = new PIXI.Graphics();
  lighting.rect(0, 0, W, H).fill({ color: 0x17102d, alpha: 1 });
  root.addChild(lighting);
  const { entities, refreshNpcMarks } = createEntities(town, npcs);
  const visitedFacilities = new Set<TownFacilityId>();
  const redrawMinimap = createMinimap(root, town, npcs, visitedFacilities);
  const districtLabel = txt("", 16, C.border, { serif: true, weight: "700", shadow: true });
  districtLabel.anchor.set(0.5, 0); districtLabel.x = W / 2; districtLabel.y = 64; root.addChild(districtLabel);
  let time = initialTime;
  const applyTime = () => {
    if (valleyBackground) valleyBackground.tint = time.phase === "night" ? 0x78829b
      : time.phase === "evening" ? 0xe6b39b : 0xffffff;
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
    tick: (deltaMS) => view.tick(deltaMS),
    refreshNpcMarks,
    visitFacility(id) { visitedFacilities.add(id); },
    setTime(next) { time = next; applyTime(); },
  };
}
