import { cellAt, passable } from "../grid";
import type { TownData, TownDecoDef, TownFacilityDef, TownGateDef } from "./types";

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;

export interface TownNpcPosition {
  id: string;
  gx: number;
  gy: number;
}

export interface CompiledTown<TNpc extends TownNpcPosition> {
  facilityByPosition: ReadonlyMap<string, TownFacilityDef>;
  decoByPosition: ReadonlyMap<string, TownDecoDef>;
  gateByPosition: ReadonlyMap<string, TownGateDef>;
  npcByPosition: ReadonlyMap<string, TNpc>;
  blockedPositions: ReadonlySet<string>;
  facilityAt(x: number, y: number): TownFacilityDef | undefined;
  decoAt(x: number, y: number): TownDecoDef | undefined;
  gateAt(x: number, y: number): TownGateDef | undefined;
  npcAt(x: number, y: number): TNpc | undefined;
  blockedAt(x: number, y: number): boolean;
}

export const townPositionKey = (x: number, y: number): string => `${x},${y}`;

function fail(town: TownData, message: string): never {
  throw new Error(`마을 정의 오류 [${town.id}]: ${message}`);
}

function addUnique<T>(
  town: TownData,
  map: Map<string, T>,
  item: T,
  x: number,
  y: number,
  label: string,
): void {
  const key = townPositionKey(x, y);
  if (map.has(key)) fail(town, `${label} 좌표 중복 (${key})`);
  map.set(key, item);
}

/**
 * 정적 마을 정의와 현재 NPC 배치를 검증하고 O(1) 좌표 조회 구조로 컴파일한다.
 * 잘못된 콘텐츠는 플레이 도중 조용히 무시하지 않고 마을 진입 시 즉시 실패한다.
 */
export function compileTown<TNpc extends TownNpcPosition>(
  town: TownData,
  npcs: readonly TNpc[],
): CompiledTown<TNpc> {
  const facilityByPosition = new Map<string, TownFacilityDef>();
  const decoByPosition = new Map<string, TownDecoDef>();
  const gateByPosition = new Map<string, TownGateDef>();
  const npcByPosition = new Map<string, TNpc>();
  const floorOccupants = new Map<string, string>();
  const blockedPositions = new Set<string>();

  const occupyFloor = (x: number, y: number, label: string): void => {
    const key = townPositionKey(x, y);
    const previous = floorOccupants.get(key);
    if (previous) fail(town, `${previous}와(과) ${label} 좌표 겹침 (${key})`);
    floorOccupants.set(key, label);
  };

  for (const facility of town.facilities) {
    if (cellAt(town.map, facility.x, facility.y) !== "door") {
      fail(town, `시설 '${facility.name}'이 문 칸에 있지 않음 (${facility.x},${facility.y})`);
    }
    if (!DIRS.some(([dx, dy]) => cellAt(town.map, facility.x + dx, facility.y + dy) === "floor")) {
      fail(town, `시설 '${facility.name}'에 접근 가능한 정면 칸이 없음`);
    }
    addUnique(town, facilityByPosition, facility, facility.x, facility.y, "시설");
    blockedPositions.add(townPositionKey(facility.x, facility.y));
  }

  for (const deco of town.decos) {
    if (cellAt(town.map, deco.x, deco.y) !== "floor") {
      fail(town, `장식 '${deco.name}'이 바닥 칸에 있지 않음 (${deco.x},${deco.y})`);
    }
    addUnique(town, decoByPosition, deco, deco.x, deco.y, "장식");
    occupyFloor(deco.x, deco.y, `장식 '${deco.name}'`);
    if (deco.blocking !== false) blockedPositions.add(townPositionKey(deco.x, deco.y));
  }

  for (const gate of town.gates) {
    if (cellAt(town.map, gate.x, gate.y) !== "floor") {
      fail(town, `성문 '${gate.label}'이 바닥 칸에 있지 않음 (${gate.x},${gate.y})`);
    }
    addUnique(town, gateByPosition, gate, gate.x, gate.y, "성문");
    occupyFloor(gate.x, gate.y, `성문 '${gate.label}'`);
  }

  for (const npc of npcs) {
    if (cellAt(town.map, npc.gx, npc.gy) !== "floor") {
      fail(town, `NPC '${npc.id}'가 바닥 칸에 있지 않음 (${npc.gx},${npc.gy})`);
    }
    addUnique(town, npcByPosition, npc, npc.gx, npc.gy, "NPC");
    occupyFloor(npc.gx, npc.gy, `NPC '${npc.id}'`);
    blockedPositions.add(townPositionKey(npc.gx, npc.gy));
  }

  const starts = Object.entries(town.starts);
  if (!starts.length) fail(town, "진입 지점이 하나도 없음");
  for (const [name, start] of starts) {
    if (!start || !passable(town.map, start.x, start.y)) {
      fail(town, `진입 지점 '${name}'이 통행 불가 칸에 있음`);
    }
    if (floorOccupants.has(townPositionKey(start.x, start.y))) {
      fail(town, `진입 지점 '${name}'이 다른 배치와 겹침 (${start.x},${start.y})`);
    }
  }

  const origin = town.starts.gate ?? town.starts.carriage ?? town.starts.throne
    ?? town.starts.fountain ?? starts[0][1]!;
  const seen = new Set<string>([townPositionKey(origin.x, origin.y)]);
  const queue: Array<[number, number]> = [[origin.x, origin.y]];
  while (queue.length) {
    const [x, y] = queue.pop()!;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      const key = townPositionKey(nx, ny);
      if (seen.has(key) || blockedPositions.has(key) || !passable(town.map, nx, ny)) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }
  for (let y = 0; y < town.map.h; y++) for (let x = 0; x < town.map.w; x++) {
    const key = townPositionKey(x, y);
    if (passable(town.map, x, y) && !blockedPositions.has(key) && !seen.has(key)) {
      fail(town, `진입 지점에서 도달할 수 없는 통행 칸 (${key})`);
    }
  }

  return {
    facilityByPosition,
    decoByPosition,
    gateByPosition,
    npcByPosition,
    blockedPositions,
    facilityAt: (x, y) => facilityByPosition.get(townPositionKey(x, y)),
    decoAt: (x, y) => decoByPosition.get(townPositionKey(x, y)),
    gateAt: (x, y) => gateByPosition.get(townPositionKey(x, y)),
    npcAt: (x, y) => npcByPosition.get(townPositionKey(x, y)),
    blockedAt: (x, y) => blockedPositions.has(townPositionKey(x, y)),
  };
}
