/**
 * 기사의 여행 로직 (구역 순찰) — 5×5 순찰로를 기사 행마로 최대한 밟는다.
 * 난이도(노후도)는 통행 불가 지점을 늘린다 — 순찰로가 끊겨 있는 구역.
 */
import { mulberry32 } from '../../core/checks';
import type { MinigameResult } from '../../core/schema';

export const KNIGHT_SIZE = 5;

const DELTAS: Array<[number, number]> = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];

export interface KnightBoard {
  size: number;
  /** 통행 불가 지점 키("r:c") — 난이도만큼 */
  blocked: string[];
  start: [number, number];
}

export const cellKey = (r: number, c: number) => `${r}:${c}`;

export function generateKnightBoard(seed: number, difficulty: number): KnightBoard {
  const rng = mulberry32(seed);
  const size = KNIGHT_SIZE;
  const blocked = new Set<string>();
  const blockCount = Math.min(Math.max(difficulty, 0), 5);
  while (blocked.size < blockCount) {
    blocked.add(cellKey(Math.floor(rng() * size), Math.floor(rng() * size)));
  }
  let start: [number, number];
  do {
    start = [Math.floor(rng() * size), Math.floor(rng() * size)];
  } while (blocked.has(cellKey(...start)));
  return { size, blocked: [...blocked], start };
}

export function legalMoves(
  pos: [number, number],
  visited: Set<string>,
  blocked: Set<string>,
  size: number,
): Array<[number, number]> {
  return DELTAS
    .map(([dr, dc]): [number, number] => [pos[0] + dr, pos[1] + dc])
    .filter(([r, c]) => r >= 0 && r < size && c >= 0 && c < size)
    .filter(([r, c]) => !visited.has(cellKey(r, c)) && !blocked.has(cellKey(r, c)));
}

/** 밟은 비율로 성적 — 전 지점 완주는 드물므로 완수 경계는 2/3 선이다 */
export function gradeKnight(visitedCount: number, playableCount: number): MinigameResult {
  const ratio = visitedCount / playableCount;
  if (ratio >= 0.64) return 'complete';
  if (ratio >= 0.32) return 'partial';
  return 'fail';
}
