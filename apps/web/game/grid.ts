/* =====================================================================
 * grid.ts — 그리드 던전 순수 로직 (PIXI 비의존)
 *  방향 수학, ASCII 맵 파싱, 통행 판정, 시야(LOS), 적 AI 스텝
 * ===================================================================== */

/** 0=북 1=동 2=남 3=서 */
export type Facing = 0 | 1 | 2 | 3;
export const DIR = [
  { dx: 0, dy: -1 }, // N
  { dx: 1, dy: 0 },  // E
  { dx: 0, dy: 1 },  // S
  { dx: -1, dy: 0 }, // W
] as const;
export const FACING_NAME = ["북", "동", "남", "서"] as const;

export const leftOf = (f: Facing): Facing => (((f + 3) % 4) as Facing);
export const rightOf = (f: Facing): Facing => (((f + 1) % 4) as Facing);
export const backOf = (f: Facing): Facing => (((f + 2) % 4) as Facing);

export type CellKind = "wall" | "floor" | "door" | "water" | "stairs";

export interface GridMap {
  w: number;
  h: number;
  cells: CellKind[]; // w*h flat, row-major
}

const CHAR_KIND: Record<string, CellKind> = {
  "#": "wall",
  ".": "floor",
  "+": "door",
  "~": "water",
  ">": "stairs",
};

/** ASCII 행 배열 → 맵. 모든 행 길이가 같아야 한다. */
export function parseMap(rows: string[]): GridMap {
  const h = rows.length;
  const w = rows[0].length;
  const cells: CellKind[] = new Array(w * h);
  for (let y = 0; y < h; y++) {
    if (rows[y].length !== w) throw new Error(`parseMap: ${y}행 길이 불일치 (${rows[y].length} != ${w})`);
    for (let x = 0; x < w; x++) {
      const k = CHAR_KIND[rows[y][x]];
      if (!k) throw new Error(`parseMap: 알 수 없는 문자 '${rows[y][x]}' (${x},${y})`);
      cells[y * w + x] = k;
    }
  }
  return { w, h, cells };
}

export function cellAt(map: GridMap, x: number, y: number): CellKind {
  if (x < 0 || y < 0 || x >= map.w || y >= map.h) return "wall";
  return map.cells[y * map.w + x];
}

/** 파티/적이 밟을 수 있는 칸 (물은 장식·차단) */
export function passable(map: GridMap, x: number, y: number): boolean {
  const k = cellAt(map, x, y);
  return k === "floor" || k === "door" || k === "stairs";
}

/** 시야를 가리는 칸 — 벽·물은 차단하지 않되 벽만 차단 (문은 열린 아치로 취급) */
function opaque(map: GridMap, x: number, y: number): boolean {
  return cellAt(map, x, y) === "wall";
}

/** Bresenham 직선 시야. 시점·종점 자체는 차단 판정에서 제외. */
export function hasLOS(map: GridMap, x0: number, y0: number, x1: number, y1: number): boolean {
  let x = x0, y = y0;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    if (!(x === x0 && y === y0) && !(x === x1 && y === y1) && opaque(map, x, y)) return false;
    if (x === x1 && y === y1) return true;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

export function chebyshev(x0: number, y0: number, x1: number, y1: number): number {
  return Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
}
export function manhattan(x0: number, y0: number, x1: number, y1: number): number {
  return Math.abs(x1 - x0) + Math.abs(y1 - y0);
}

/** 상하좌우 인접(대각 제외) — 근접 공격 사거리 */
export function adjacent(x0: number, y0: number, x1: number, y1: number): boolean {
  return manhattan(x0, y0, x1, y1) === 1;
}

export type EnemyStepResult = { x: number; y: number } | "attack" | null;

/**
 * 적 1기의 턴 행동.
 *  - 파티와 상하좌우 인접이면 "attack"
 *  - 아니면 파티 방향으로 탐욕 1칸 (축 거리 큰 쪽 우선, 벽·점유 칸 회피)
 *  - 갈 곳이 없으면 null
 */
export function enemyStep(
  map: GridMap,
  ex: number, ey: number,
  px: number, py: number,
  occupied: (x: number, y: number) => boolean,
): EnemyStepResult {
  if (adjacent(ex, ey, px, py)) return "attack";
  const dx = px - ex, dy = py - ey;
  const cand: { x: number; y: number }[] = [];
  const stepX = { x: ex + Math.sign(dx), y: ey };
  const stepY = { x: ex, y: ey + Math.sign(dy) };
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx !== 0) cand.push(stepX);
    if (dy !== 0) cand.push(stepY);
  } else {
    if (dy !== 0) cand.push(stepY);
    if (dx !== 0) cand.push(stepX);
  }
  /* 막혔을 때 수직 우회 */
  if (dx === 0) { cand.push({ x: ex + 1, y: ey }, { x: ex - 1, y: ey }); }
  if (dy === 0) { cand.push({ x: ex, y: ey + 1 }, { x: ex, y: ey - 1 }); }
  for (const c of cand) {
    if ((c.x === px && c.y === py)) continue; // 파티 칸으로는 진입 불가
    if (passable(map, c.x, c.y) && !occupied(c.x, c.y)) return c;
  }
  return null;
}
