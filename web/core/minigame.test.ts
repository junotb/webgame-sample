/**
 * 미니게임 셸 계약 (세션 ②) — 성적 귀속은 확정 규칙이며 여기서 고정한다.
 * 완수→Perfect / 부분→Passed / 실패→Not Passed (2026-08-11).
 */
import { describe, expect, it } from 'vitest';
import { gradeOf, MINIGAME_NAMES } from './minigame';

describe('gradeOf — 성적 귀속 (확정)', () => {
  it('완수 → perfect', () => {
    expect(gradeOf('complete')).toBe('perfect');
  });
  it('부분 → passed', () => {
    expect(gradeOf('partial')).toBe('passed');
  });
  it('실패 → notPassed', () => {
    expect(gradeOf('fail')).toBe('notPassed');
  });
});

describe('레지스트리 어휘 — 카드 4종과 1:1', () => {
  it('미니게임 ID는 정확히 4종이다', () => {
    expect(Object.keys(MINIGAME_NAMES).sort()).toEqual(['block', 'knight', 'pipe', 'whack']);
  });
});
