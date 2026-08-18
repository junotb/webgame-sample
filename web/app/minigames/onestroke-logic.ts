/**
 * 순찰 경로 로직 (구역 순찰) — 지정된 시작 지점에서 끝 지점까지,
 * 지났던 칸을 다시 밟지 않고 장애물을 제외한 **모든 통행 칸을** 지나면 완수.
 * 끝에 도달했지만 미답사 칸이 남으면 부분, 끝에 못 닿으면 실패 (규칙: system-rules "순찰 미니게임").
 * 구 기사 행마(기사의 여행) 구현은 폐기 — 파일명·게임 id('onestroke')만 잔재로 남는다.
 *
 * 해 보장: 판 생성이 곧 정답 경로 생성이다 — 시드 DFS로 목표 길이의 자기회피 경로를 만들고,
 * 경로가 지나지 않은 칸을 장애물로 굳힌다. 풀 수 없는 판은 존재할 수 없다.
 */
import { mulberry32 } from '../../core/checks';
import type { MinigameResult } from '../../core/schema';

export interface PatrolBoard {
  rows: number;
  cols: number;
  /** 정답 경로 (생성 근거) — 시작 = path[0], 끝 = path[path.length-1]. UI는 양 끝만 쓴다 */
  path: Array<[number, number]>;
  /** 경로가 지나지 않는 칸 — 밟을 수 없다. 통행 칸 수 = path.length */
  obstacles: Set<string>;
  start: [number, number];
  end: [number, number];
}

export const cellKey = (r: number, c: number) => `${r}:${c}`;

/** 상하좌우 인접 — 순찰은 걸어서 도는 일이다 */
export function isAdjacent(a: [number, number], b: [number, number]): boolean {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
}

const manhattan = (a: [number, number], b: [number, number]) =>
  Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

function neighbors(r: number, c: number, rows: number, cols: number): Array<[number, number]> {
  return ([[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as Array<[number, number]>).filter(
    ([nr, nc]) => nr >= 0 && nr < rows && nc >= 0 && nc < cols,
  );
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 시드 DFS 자기회피 경로 — 목표 길이 + 시작·끝 최소 거리를 만족할 때만 채택 */
function tryPath(
  rows: number,
  cols: number,
  targetLen: number,
  minDist: number,
  rng: () => number,
): Array<[number, number]> | null {
  const start: [number, number] = [Math.floor(rng() * rows), Math.floor(rng() * cols)];
  const path: Array<[number, number]> = [start];
  const visited = new Set([cellKey(...start)]);
  let budget = 20000;

  function dfs(cell: [number, number]): boolean {
    if (path.length === targetLen) return manhattan(start, cell) >= minDist;
    if (budget <= 0) return false;
    const nexts = shuffle(
      neighbors(cell[0], cell[1], rows, cols).filter(([r, c]) => !visited.has(cellKey(r, c))),
      rng,
    );
    for (const next of nexts) {
      budget -= 1;
      visited.add(cellKey(...next));
      path.push(next);
      if (dfs(next)) return true;
      visited.delete(cellKey(...next));
      path.pop();
    }
    return false;
  }

  return dfs(start) ? path : null;
}

/**
 * 뱀 모양 전 칸 경로 — DFS가 전부 불발일 때의 결정적 예비 해 (장애물 0개).
 * 행·열 순회 중 시작·끝 거리 조건을 만족하는 쪽을 쓴다 — 두 방향 중 하나는 항상 만족
 * (마지막 줄이 짝수 번째면 끝이 반대편 모서리에 닿는다).
 */
function serpentine(rows: number, cols: number, minDist: number): Array<[number, number]> {
  const rowMajor: Array<[number, number]> = [];
  for (let r = 0; r < rows; r += 1) {
    for (let i = 0; i < cols; i += 1) rowMajor.push([r, r % 2 === 0 ? i : cols - 1 - i]);
  }
  if (manhattan(rowMajor[0], rowMajor[rowMajor.length - 1]) >= minDist) return rowMajor;
  const colMajor: Array<[number, number]> = [];
  for (let c = 0; c < cols; c += 1) {
    for (let i = 0; i < rows; i += 1) colMajor.push([c % 2 === 0 ? i : rows - 1 - i, c]);
  }
  return colMajor;
}

export function generatePatrolBoard(seed: number, difficulty: number): PatrolBoard {
  // 난이도(정체)는 판을 키운다 — 같은 순찰인데 구역이 더 넓고 꼬여 있다
  const [rows, cols, obstacleCount] = difficulty >= 4 ? [5, 6, 5] : [4, 5, 3];
  const minDist = Math.min(rows, cols);
  const targetLen = rows * cols - obstacleCount;
  const rng = mulberry32(seed);
  let path: Array<[number, number]> | null = null;
  for (let attempt = 0; attempt < 20 && !path; attempt += 1) {
    path = tryPath(rows, cols, targetLen, minDist, rng);
  }
  if (!path) path = serpentine(rows, cols, minDist);
  const onPath = new Set(path.map((c) => cellKey(...c)));
  const obstacles = new Set<string>();
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (!onPath.has(cellKey(r, c))) obstacles.add(cellKey(r, c));
    }
  }
  return { rows, cols, path, obstacles, start: path[0], end: path[path.length - 1] };
}

/**
 * 한 걸음 뒤의 즉시 판정 — 끝 도달은 그 자리에서 종료된다.
 * complete: 끝 타일 + 통행 칸 전부 / earlyEnd: 끝 타일인데 미답사가 남았다 (부분으로 종료) /
 * deadEnd: 갈 곳이 없는데 끝 타일이 아니다 (실패) / walking: 계속
 */
export type PatrolVerdict = 'walking' | 'complete' | 'earlyEnd' | 'deadEnd';

export function judgeStep(board: PatrolBoard, trail: Array<[number, number]>): PatrolVerdict {
  const head = trail[trail.length - 1];
  const visited = new Set(trail.map((c) => cellKey(...c)));
  const atEnd = head[0] === board.end[0] && head[1] === board.end[1];
  if (atEnd) return trail.length === board.path.length ? 'complete' : 'earlyEnd';
  const open = neighbors(head[0], head[1], board.rows, board.cols).filter(
    ([r, c]) => !visited.has(cellKey(r, c)) && !board.obstacles.has(cellKey(r, c)),
  );
  return open.length === 0 ? 'deadEnd' : 'walking';
}

/**
 * 성적 — 끝 도달 + 통행 칸 전부 답사가 완수, 끝 도달만 하면 부분.
 * 끝에 못 닿으면(막다른 길·시간 만료) 얼마나 밟았든 실패.
 */
export function gradePatrol(visitedCount: number, total: number, reachedEnd: boolean): MinigameResult {
  if (!reachedEnd) return 'fail';
  return visitedCount === total ? 'complete' : 'partial';
}
