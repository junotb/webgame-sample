/**
 * 블록 퍼즐 로직 (자재 옮기기) — 잘라낸 조각들을 수레 판에 다시 채워 넣는다.
 * 판을 조각으로 분할해 만들므로 항상 완전 적재 해가 존재한다.
 * 난이도(노후도)는 판 크기를 키운다 — 회수분이 많은 날.
 */
import { mulberry32 } from '../../core/checks';
import type { MinigameResult } from '../../core/schema';

export interface BlockPiece {
  id: number;
  /** 정규화된 상대 좌표 (최소 행·열 = 0) */
  cells: Array<[number, number]>;
}

export interface BlockPuzzle {
  size: number;
  pieces: BlockPiece[];
}

export function generateBlockPuzzle(seed: number, difficulty: number): BlockPuzzle {
  const rng = mulberry32(seed);
  const size = difficulty >= 4 ? 5 : 4;
  const owner: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));

  // 판을 3~4칸 조각으로 분할 — 남는 외톨이는 이웃 조각에 붙인다
  let pieceId = 0;
  const unassigned = (): Array<[number, number]> => {
    const list: Array<[number, number]> = [];
    for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) {
      if (owner[r][c] === -1) list.push([r, c]);
    }
    return list;
  };
  const neighbors = (r: number, c: number): Array<[number, number]> =>
    ([[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as Array<[number, number]>)
      .filter(([nr, nc]) => nr >= 0 && nr < size && nc >= 0 && nc < size);

  while (true) {
    const pool = unassigned();
    if (pool.length === 0) break;
    const target = 3 + Math.floor(rng() * 2); // 3~4칸
    const seedCell = pool[Math.floor(rng() * pool.length)];
    const grown: Array<[number, number]> = [seedCell];
    owner[seedCell[0]][seedCell[1]] = pieceId;
    while (grown.length < target) {
      const frontier = grown
        .flatMap(([r, c]) => neighbors(r, c))
        .filter(([r, c]) => owner[r][c] === -1);
      if (frontier.length === 0) break;
      const [nr, nc] = frontier[Math.floor(rng() * frontier.length)];
      owner[nr][nc] = pieceId;
      grown.push([nr, nc]);
    }
    if (grown.length === 1) {
      // 외톨이 — 이웃 조각에 편입
      const near = neighbors(seedCell[0], seedCell[1]).find(([r, c]) => owner[r][c] !== -1 && owner[r][c] !== pieceId);
      if (near) {
        owner[seedCell[0]][seedCell[1]] = owner[near[0]][near[1]];
        continue;
      }
    }
    pieceId += 1;
  }

  const byId = new Map<number, Array<[number, number]>>();
  for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) {
    const id = owner[r][c];
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id)!.push([r, c]);
  }
  const pieces: BlockPiece[] = [...byId.entries()].map(([id, cells]) => {
    const minR = Math.min(...cells.map(([r]) => r));
    const minC = Math.min(...cells.map(([, c]) => c));
    return { id, cells: cells.map(([r, c]): [number, number] => [r - minR, c - minC]) };
  });

  // 배치 순서 셔플 — 원래 자리 순서대로 나오면 퍼즐이 아니다
  for (let i = pieces.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  return { size, pieces };
}

export function canPlace(
  occupied: boolean[][],
  piece: BlockPiece,
  anchor: [number, number],
): boolean {
  const size = occupied.length;
  return piece.cells.every(([dr, dc]) => {
    const r = anchor[0] + dr;
    const c = anchor[1] + dc;
    return r >= 0 && r < size && c >= 0 && c < size && !occupied[r][c];
  });
}

export function place(occupied: boolean[][], piece: BlockPiece, anchor: [number, number]): boolean[][] {
  const next = occupied.map((row) => [...row]);
  for (const [dr, dc] of piece.cells) next[anchor[0] + dr][anchor[1] + dc] = true;
  return next;
}

/** 채운 칸 비율로 성적 — 전부 적재 완수 / 절반 이상 부분 / 그 외 실패 */
export function gradeBlock(placedCells: number, totalCells: number): MinigameResult {
  if (placedCells >= totalCells) return 'complete';
  if (placedCells * 2 >= totalCells) return 'partial';
  return 'fail';
}
