/**
 * 파이프 퍼즐 로직 (마력회로 점검) — 왼쪽 급원에서 오른쪽 종점까지 회로를 잇는다.
 * 셀을 탭하면 90° 회전. 경로는 시드로 생성되므로 같은 카드 재도전은 같은 판이다.
 * 난이도(정체)는 판 크기를 키운다 — "같은 점검인데 회로가 더 꼬여 있다".
 */
import { mulberry32 } from '../../core/checks';
import type { MinigameResult } from '../../core/schema';

export type Dir = 'L' | 'R' | 'U' | 'D';

export interface PipeCell {
  row: number;
  col: number;
  type: 'straight' | 'elbow';
  /** 정답 회전 (0~3). straight는 2회전 대칭이라 %2로 비교한다 */
  correct: number;
  rotation: number;
}

export interface PipePuzzle {
  size: number;
  cells: PipeCell[];
  /** 경로 밖 폐색 칸 ("row:col") — 회전·통과 불가. 경로 생성이 먼저라 해를 막을 수 없다 */
  obstacles: Set<string>;
}

/** 회전 0 기준 연결 방향 — straight: L↔R, elbow: U↔R. 회전은 시계방향 90°씩 */
const BASE_DIRS: Record<PipeCell['type'], [Dir, Dir]> = {
  straight: ['L', 'R'],
  elbow: ['U', 'R'],
};

const CW: Record<Dir, Dir> = { R: 'D', D: 'L', L: 'U', U: 'R' };

export function dirsAt(type: PipeCell['type'], rotation: number): [Dir, Dir] {
  let dirs = BASE_DIRS[type];
  for (let i = 0; i < ((rotation % 4) + 4) % 4; i += 1) {
    dirs = [CW[dirs[0]], CW[dirs[1]]];
  }
  return dirs;
}

/** 방향쌍 → 정답 회전. straight 2종·elbow 4종의 전수 표 */
function correctRotation(a: Dir, b: Dir): { type: PipeCell['type']; correct: number } {
  const key = [a, b].sort().join('');
  if (key === 'LR') return { type: 'straight', correct: 0 };
  if (key === 'DU') return { type: 'straight', correct: 1 };
  const elbow: Record<string, number> = { RU: 0, DR: 1, DL: 2, LU: 3 };
  return { type: 'elbow', correct: elbow[key] };
}

export function generatePipePuzzle(seed: number, difficulty: number): PipePuzzle {
  const rng = mulberry32(seed);
  const size = difficulty >= 4 ? 5 : 4;
  const key = (r: number, c: number) => `${r}:${c}`;

  // 왼쪽 가장자리에서 출발해 오른쪽 가장자리까지 — 우측 전진 + 같은 열 안의 상하 굽이
  let row = 1 + Math.floor(rng() * (size - 2));
  let col = 0;
  const visited = new Set([key(row, col)]);
  const path: Array<{ row: number; col: number }> = [{ row, col }];
  let guard = 0;
  while (col < size - 1) {
    guard += 1;
    const options: Array<[number, number]> = [[row, col + 1]];
    if (guard < size * 4) {
      if (row > 0 && !visited.has(key(row - 1, col))) options.push([row - 1, col]);
      if (row < size - 1 && !visited.has(key(row + 1, col))) options.push([row + 1, col]);
    }
    const [nr, nc] = options[Math.floor(rng() * options.length)];
    visited.add(key(nr, nc));
    path.push({ row: nr, col: nc });
    row = nr;
    col = nc;
  }

  const dirBetween = (from: { row: number; col: number }, to: { row: number; col: number }): Dir => {
    if (to.col > from.col) return 'R';
    if (to.col < from.col) return 'L';
    return to.row > from.row ? 'D' : 'U';
  };

  const cells: PipeCell[] = path.map((cell, i) => {
    const entry: Dir = i === 0 ? 'L' : ((): Dir => {
      const d = dirBetween(cell, path[i - 1]);
      return d;
    })();
    const exit: Dir = i === path.length - 1 ? 'R' : dirBetween(cell, path[i + 1]);
    const { type, correct } = correctRotation(entry, exit);
    return { row: cell.row, col: cell.col, type, correct, rotation: Math.floor(rng() * 4) };
  });

  // 장애물 — 경로 밖 빈 칸의 시드 셔플에서 앞 N칸 (4×4에 2, 5×5에 4)
  const empty: string[] = [];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!visited.has(key(r, c))) empty.push(key(r, c));
    }
  }
  for (let i = empty.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [empty[i], empty[j]] = [empty[j], empty[i]];
  }
  const obstacles = new Set(empty.slice(0, size === 5 ? 4 : 2));

  return { size, cells, obstacles };
}

export function isCellCorrect(cell: PipeCell): boolean {
  if (cell.type === 'straight') return cell.rotation % 2 === cell.correct % 2;
  return ((cell.rotation % 4) + 4) % 4 === cell.correct;
}

export function correctCount(puzzle: PipePuzzle): number {
  return puzzle.cells.filter(isCellCorrect).length;
}

export function isSolved(puzzle: PipePuzzle): boolean {
  return correctCount(puzzle) === puzzle.cells.length;
}

/** 시간 만료 시의 성적 — 전부 이으면 완수(만료 전 즉시), 절반 이상 부분, 그 외 실패 */
export function gradePipe(correct: number, total: number): MinigameResult {
  if (correct >= total) return 'complete';
  if (correct * 2 >= total) return 'partial';
  return 'fail';
}
