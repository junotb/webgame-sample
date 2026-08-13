/**
 * 순찰 경로 로직 (구역 순찰) — 지정된 시작 지점에서 끝 지점까지,
 * 지났던 칸을 다시 밟지 않고 **모든 칸을** 지나는 한붓 경로 게임.
 * 구 기사 행마(기사의 여행) 구현은 폐기 — 파일명·게임 id('onestroke')만 잔재로 남는다.
 *
 * 해 보장: 판 생성이 곧 정답 경로 생성이다 — 시드 DFS로 해밀턴 경로를 하나 만들고
 * 그 양 끝을 시작·끝 지점으로 삼는다. 풀 수 없는 판은 존재할 수 없다.
 */
import { mulberry32 } from '../../core/checks';
import type { MinigameResult } from '../../core/schema';

export interface PatrolBoard {
  size: number;
  /** 정답 경로 (생성 근거) — 시작 = path[0], 끝 = path[path.length-1]. UI는 양 끝만 쓴다 */
  path: Array<[number, number]>;
  start: [number, number];
  end: [number, number];
}

export const cellKey = (r: number, c: number) => `${r}:${c}`;

/** 상하좌우 인접 — 순찰은 걸어서 도는 일이다 */
export function isAdjacent(a: [number, number], b: [number, number]): boolean {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
}

function neighbors(r: number, c: number, size: number): Array<[number, number]> {
  return ([[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as Array<[number, number]>).filter(
    ([nr, nc]) => nr >= 0 && nr < size && nc >= 0 && nc < size,
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

/** 시드 DFS 해밀턴 경로 — 탐색량 상한을 두고, 못 찾으면 다른 시작점으로 재시도 */
function tryPath(size: number, rng: () => number): Array<[number, number]> | null {
  const total = size * size;
  const start: [number, number] = [Math.floor(rng() * size), Math.floor(rng() * size)];
  const path: Array<[number, number]> = [start];
  const visited = new Set([cellKey(...start)]);
  let budget = 20000;

  function dfs(cell: [number, number]): boolean {
    if (path.length === total) return true;
    if (budget <= 0) return false;
    const nexts = shuffle(
      neighbors(cell[0], cell[1], size).filter(([r, c]) => !visited.has(cellKey(r, c))),
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

/** 뱀 모양 경로 — DFS가 전부 불발일 때의 결정적 예비 해 (항상 존재) */
function serpentine(size: number): Array<[number, number]> {
  const path: Array<[number, number]> = [];
  for (let r = 0; r < size; r += 1) {
    for (let i = 0; i < size; i += 1) {
      path.push([r, r % 2 === 0 ? i : size - 1 - i]);
    }
  }
  return path;
}

export function generatePatrolBoard(seed: number, difficulty: number): PatrolBoard {
  // 난이도(정체)는 판을 키운다 — 같은 순찰인데 구역이 더 넓고 꼬여 있다
  const size = difficulty >= 4 ? 5 : 4;
  const rng = mulberry32(seed);
  let path: Array<[number, number]> | null = null;
  for (let attempt = 0; attempt < 20 && !path; attempt += 1) {
    path = tryPath(size, rng);
  }
  if (!path) path = serpentine(size);
  return { size, path, start: path[0], end: path[path.length - 1] };
}

/**
 * 한 걸음 뒤의 즉시 판정 — 잘못된 경로는 그 자리에서 끝난다.
 * complete: 끝 타일 + 전 칸 답사 / earlyEnd: 끝 타일인데 아직 남았다 /
 * deadEnd: 갈 곳이 없는데 끝 타일이 아니다 / walking: 계속
 */
export type PatrolVerdict = 'walking' | 'complete' | 'earlyEnd' | 'deadEnd';

export function judgeStep(board: PatrolBoard, trail: Array<[number, number]>): PatrolVerdict {
  const head = trail[trail.length - 1];
  const visited = new Set(trail.map((c) => cellKey(...c)));
  const atEnd = head[0] === board.end[0] && head[1] === board.end[1];
  if (atEnd) return trail.length === board.size * board.size ? 'complete' : 'earlyEnd';
  const open = neighbors(head[0], head[1], board.size).filter(([r, c]) => !visited.has(cellKey(r, c)));
  return open.length === 0 ? 'deadEnd' : 'walking';
}

/**
 * 성적 — 끝 지점 도달 + 전 칸 답사가 완수. 잘못된 경로(earlyEnd·deadEnd)는 즉시 실패.
 * 부분은 시간 만료 한정: 아직 유효한 경로 위에서 절반 이상 밟았을 때만.
 */
export function gradePatrol(visitedCount: number, total: number, reachedEnd: boolean): MinigameResult {
  if (reachedEnd && visitedCount === total) return 'complete';
  if (visitedCount * 2 >= total) return 'partial';
  return 'fail';
}
