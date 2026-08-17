/**
 * 미니게임 4종 순수 로직 — 생성의 건전성(풀 수 있는 판인가)과 성적 경계를 고정한다.
 * 렌더링·타이머는 셸 테스트의 몫, 여기는 시드 재현성과 규칙만 본다.
 */
import { describe, expect, it } from 'vitest';
import { canPlace, generateBlockPuzzle, gradeBlock, place } from './block-logic';
import { cellKey, generatePatrolBoard, gradePatrol, isAdjacent, judgeStep, type PatrolBoard } from './onestroke-logic';
import { correctCount, dirsAt, generatePipePuzzle, gradePipe, isSolved } from './pipe-logic';
import {
  generateWhackPlan,
  gradeWhack,
  WHACK_HOLES,
  WHACK_LIFE_MS,
  WHACK_MAX_CONCURRENT,
  WHACK_RESIDUE_SHARE,
  WHACK_TARGET,
} from './whack-logic';

describe('파이프 퍼즐', () => {
  it('경로는 왼쪽 가장자리에서 오른쪽 가장자리까지 인접 셀로 이어진다', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const p = generatePipePuzzle(seed, seed % 6);
      expect(p.cells[0].col).toBe(0);
      expect(p.cells[p.cells.length - 1].col).toBe(p.size - 1);
      for (let i = 1; i < p.cells.length; i += 1) {
        const d = Math.abs(p.cells[i].row - p.cells[i - 1].row) + Math.abs(p.cells[i].col - p.cells[i - 1].col);
        expect(d).toBe(1);
      }
    }
  });
  it('정답 회전을 넣으면 풀린다 — 항상 해가 있는 판', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const p = generatePipePuzzle(seed, 2);
      const solved = { ...p, cells: p.cells.map((c) => ({ ...c, rotation: c.correct })) };
      expect(isSolved(solved)).toBe(true);
      // 인접 셀의 연결 방향이 실제로 맞물린다
      for (let i = 1; i < solved.cells.length; i += 1) {
        const prev = solved.cells[i - 1];
        const cur = solved.cells[i];
        const prevDirs = dirsAt(prev.type, prev.rotation);
        const curDirs = dirsAt(cur.type, cur.rotation);
        if (cur.col > prev.col) {
          expect(prevDirs).toContain('R');
          expect(curDirs).toContain('L');
        } else if (cur.row > prev.row) {
          expect(prevDirs).toContain('D');
          expect(curDirs).toContain('U');
        } else {
          expect(prevDirs).toContain('U');
          expect(curDirs).toContain('D');
        }
      }
    }
  });
  it('같은 시드는 같은 판 (재현성)', () => {
    expect(generatePipePuzzle(7, 3)).toEqual(generatePipePuzzle(7, 3));
  });
  it('난이도 4부터 판이 5×5로 커진다', () => {
    expect(generatePipePuzzle(1, 0).size).toBe(4);
    expect(generatePipePuzzle(1, 4).size).toBe(5);
  });
  it('성적 경계: 전부/절반/미만', () => {
    expect(gradePipe(6, 6)).toBe('complete');
    expect(gradePipe(3, 6)).toBe('partial');
    expect(gradePipe(2, 6)).toBe('fail');
  });
  it('correctCount는 정답 회전과의 일치만 센다 (straight는 180° 대칭 허용)', () => {
    const p = generatePipePuzzle(3, 0);
    const straight = p.cells.find((c) => c.type === 'straight');
    if (straight) {
      const flipped = { ...straight, rotation: straight.correct + 2 };
      expect(correctCount({ size: p.size, cells: [flipped] })).toBe(1);
    }
  });
});

describe('순찰 경로 (한붓 재설계)', () => {
  it('정답 경로가 모든 칸을 정확히 한 번씩, 인접 이동으로 지난다 — 항상 해가 있는 판', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const b = generatePatrolBoard(seed, seed % 6);
      expect(b.path).toHaveLength(b.size * b.size);
      expect(new Set(b.path.map((c) => cellKey(...c))).size).toBe(b.size * b.size);
      for (let i = 1; i < b.path.length; i += 1) {
        expect(isAdjacent(b.path[i - 1], b.path[i])).toBe(true);
      }
      expect(b.start).toEqual(b.path[0]);
      expect(b.end).toEqual(b.path[b.path.length - 1]);
    }
  });
  it('같은 시드는 같은 판 (재현성)', () => {
    expect(generatePatrolBoard(7, 3)).toEqual(generatePatrolBoard(7, 3));
  });
  it('난이도 4부터 판이 5×5로 커진다', () => {
    expect(generatePatrolBoard(1, 0).size).toBe(4);
    expect(generatePatrolBoard(1, 4).size).toBe(5);
  });
  it('즉시 판정: 잘못된 경로는 그 자리에서 끝난다', () => {
    // 판정은 size·end만 본다 — 정답 경로 자체는 무관
    const board: PatrolBoard = {
      size: 3,
      path: [],
      start: [0, 0],
      end: [2, 2],
    };
    // 계속: 갈 곳이 남아 있다
    expect(judgeStep(board, [[0, 0], [0, 1]])).toBe('walking');
    // 이른 도착: 끝 타일인데 남은 칸이 있다
    expect(judgeStep(board, [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]])).toBe('earlyEnd');
    // 막다른 길: 갈 곳이 없는데 끝 타일이 아니다
    expect(judgeStep(board, [[1, 0], [1, 1], [0, 1], [0, 0]])).toBe('deadEnd');
    // 완주: 끝 타일 + 전 칸
    expect(
      judgeStep(board, [[0, 0], [0, 1], [0, 2], [1, 2], [1, 1], [1, 0], [2, 0], [2, 1], [2, 2]]),
    ).toBe('complete');
  });
  it('성적: 끝 도달+전 칸 완수 / 절반 이상 부분 / 미만 실패', () => {
    expect(gradePatrol(16, 16, true)).toBe('complete');
    expect(gradePatrol(16, 16, false)).toBe('partial'); // 다 밟아도 끝 지점이 아니면 완수가 아니다
    expect(gradePatrol(8, 16, false)).toBe('partial');
    expect(gradePatrol(7, 16, false)).toBe('fail');
  });
});

describe('블록 퍼즐', () => {
  it('조각을 원래 자리대로 놓으면 판이 정확히 가득 찬다 — 항상 해가 있는 판', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const p = generateBlockPuzzle(seed, seed % 6);
      const totalCells = p.pieces.reduce((s, piece) => s + piece.cells.length, 0);
      expect(totalCells).toBe(p.size * p.size);
      expect(p.pieces.every((piece) => piece.cells.length >= 2)).toBe(true);
    }
  });
  it('canPlace/place — 겹침·범위 밖을 거부하고 칸을 채운다', () => {
    const empty = Array.from({ length: 4 }, () => Array(4).fill(false));
    const piece = { id: 0, cells: [[0, 0], [0, 1], [1, 0]] as Array<[number, number]> };
    expect(canPlace(empty, piece, [0, 0])).toBe(true);
    expect(canPlace(empty, piece, [3, 3])).toBe(false); // 범위 밖
    const filled = place(empty, piece, [0, 0]);
    expect(filled[0][0] && filled[0][1] && filled[1][0]).toBe(true);
    expect(canPlace(filled, piece, [0, 0])).toBe(false); // 겹침
  });
  it('성적 경계: 전부/절반 칸', () => {
    expect(gradeBlock(16, 16)).toBe('complete');
    expect(gradeBlock(8, 16)).toBe('partial');
    expect(gradeBlock(7, 16)).toBe('fail');
  });
});

describe('선별 두더지', () => {
  it('스폰 계획: 시간 순, 포트 범위, 유지시간 고정', () => {
    const plan = generateWhackPlan(5, 2);
    expect(plan.spawns.length).toBeGreaterThan(20);
    for (let i = 1; i < plan.spawns.length; i += 1) {
      expect(plan.spawns[i].at).toBeGreaterThan(plan.spawns[i - 1].at);
    }
    expect(plan.spawns.every((s) => s.hole >= 0 && s.hole < WHACK_HOLES)).toBe(true);
    expect(plan.spawns.every((s) => s.life === WHACK_LIFE_MS)).toBe(true);
  });
  it('동시 노출은 최대 5, 노출이 겹치는 스폰은 포트를 공유하지 않는다', () => {
    for (const seed of [1, 5, 9, 42]) {
      const plan = generateWhackPlan(seed, 3);
      plan.spawns.forEach((s, i) => {
        // 동시 수는 순간 기준 — 개수가 변하는 순간은 스폰 시각뿐이다
        const atSpawn = plan.spawns.filter(
          (o) => o.at <= s.at && s.at < o.at + o.life,
        );
        expect(atSpawn.length).toBeLessThanOrEqual(WHACK_MAX_CONCURRENT);
        // 포트 공유 금지는 쌍별 — 노출이 겹치는 두 스폰은 다른 포트
        for (const o of plan.spawns.slice(i + 1)) {
          if (o.at < s.at + s.life && s.at < o.at + o.life) {
            expect(o.hole).not.toBe(s.hole);
          }
        }
      });
    }
  });
  it('불순물은 고정 몫 — 시드와 무관하게 공급이 목표를 웃돈다', () => {
    for (const seed of [1, 2, 3, 7, 11, 99]) {
      const plan = generateWhackPlan(seed, 2);
      const residue = plan.spawns.filter((s) => s.kind === 'residue').length;
      expect(residue).toBe(Math.round(plan.spawns.length * WHACK_RESIDUE_SHARE));
      expect(residue).toBeGreaterThan(WHACK_TARGET);
    }
  });
  it('난이도는 모호함만 올린다 — 스폰 일정은 그대로', () => {
    const easy = generateWhackPlan(5, 0);
    const hard = generateWhackPlan(5, 6);
    expect(hard.ambiguity).toBeGreaterThan(easy.ambiguity);
    expect(hard.spawns).toEqual(easy.spawns);
  });
  it('판정 = 점수 달성: 20점 도달이 통과, 오인 유무가 완수/부분', () => {
    expect(gradeWhack(WHACK_TARGET, 0)).toBe('complete');
    expect(gradeWhack(WHACK_TARGET + 1, 1)).toBe('partial');
    expect(gradeWhack(WHACK_TARGET, 1)).toBe('fail'); // 점수 19 — 오인이 깎는다
    expect(gradeWhack(WHACK_TARGET - 1, 0)).toBe('fail');
  });
});
