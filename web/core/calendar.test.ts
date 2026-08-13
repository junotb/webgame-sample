/**
 * 시간·평가 코어 파생값 (slice v3 §2·§3)
 * 밴드는 저장하지 않는 파생값 — 경계값을 여기서 고정한다.
 */
import { describe, expect, it } from 'vitest';
import { BAND_NAMES, bandOf, RATING_LABELS, summarizeWeek, weekOf, WORKDAYS_PER_WEEK } from './calendar';

describe('bandOf — 정체 0~10 → 4밴드 (v3 §3 표)', () => {
  it('경계값: 0·2 → 1밴드(정상)', () => {
    expect(bandOf(0)).toBe(1);
    expect(bandOf(2)).toBe(1);
  });
  it('경계값: 3·5 → 2밴드(삐걱임)', () => {
    expect(bandOf(3)).toBe(2);
    expect(bandOf(5)).toBe(2);
  });
  it('경계값: 6·8 → 3밴드(이상, 임계)', () => {
    expect(bandOf(6)).toBe(3);
    expect(bandOf(8)).toBe(3);
  });
  it('경계값: 9·10 → 4밴드(한계)', () => {
    expect(bandOf(9)).toBe(4);
    expect(bandOf(10)).toBe(4);
  });
  it('범위 밖 입력은 클램프된다 (stagnation는 0~10 계약)', () => {
    expect(bandOf(-1)).toBe(1);
    expect(bandOf(11)).toBe(4);
  });
});

describe('summarizeWeek — 경계 합산식 (2026-08-11 확정)', () => {
  it('Not Passed가 처리의 절반 이상 → notPassed (해고 경계)', () => {
    expect(summarizeWeek({ processed: 2, notPassed: 1, perfect: 0 })).toBe('notPassed');
    expect(summarizeWeek({ processed: 4, notPassed: 2, perfect: 2 })).toBe('notPassed');
  });
  it('절반 미만이면 경계를 넘지 않는다', () => {
    expect(summarizeWeek({ processed: 3, notPassed: 1, perfect: 0 })).toBe('passed');
  });
  it('전 장 Perfect → perfect, 하나라도 모자라면 passed', () => {
    expect(summarizeWeek({ processed: 3, notPassed: 0, perfect: 3 })).toBe('perfect');
    expect(summarizeWeek({ processed: 3, notPassed: 0, perfect: 2 })).toBe('passed');
  });
  it('한 장도 처리하지 않은 주는 notPassed — 방치만 한 주가 유임이 되지 않는다', () => {
    expect(summarizeWeek({ processed: 0, notPassed: 0, perfect: 0 })).toBe('notPassed');
  });
  it('라벨은 영문 그대로 (통지서·총평 표기)', () => {
    expect(RATING_LABELS.perfect).toBe('Perfect');
    expect(RATING_LABELS.passed).toBe('Passed');
    expect(RATING_LABELS.notPassed).toBe('Not Passed');
  });
  it('밴드 이름 가안 (§10 — 확정 시 이 테스트만 갱신)', () => {
    expect(BAND_NAMES).toEqual({ 1: '정상', 2: '삐걱임', 3: '이상', 4: '한계' });
  });
});

describe('weekOf — 통산 일차(주말 포함) → 주차', () => {
  it('1주차: day 1~7', () => {
    expect(weekOf(1)).toBe(1);
    expect(weekOf(5)).toBe(1);
    expect(weekOf(7)).toBe(1);
  });
  it('2주차: day 8', () => {
    expect(weekOf(8)).toBe(2);
  });
  it('근무일은 주당 5일', () => {
    expect(WORKDAYS_PER_WEEK).toBe(5);
  });
});
