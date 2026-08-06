/**
 * 시간·평가 코어 파생값 (slice v3 §2·§3)
 * 밴드는 저장하지 않는 파생값 — 경계값을 여기서 고정한다.
 */
import { describe, expect, it } from 'vitest';
import { BAND_NAMES, bandOf, RATING_LABELS, ratingOfBand, weekOf, WORKDAYS_PER_WEEK } from './calendar';

describe('bandOf — 노후도 0~10 → 4밴드 (v3 §3 표)', () => {
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
  it('범위 밖 입력은 클램프된다 (decay는 0~10 계약)', () => {
    expect(bandOf(-1)).toBe(1);
    expect(bandOf(11)).toBe(4);
  });
});

describe('ratingOfBand — 금요일 밴드가 곧 주간 평가 (별도 산식 없음)', () => {
  it('1→완벽, 2→양호, 3→염려, 4→경고', () => {
    expect(ratingOfBand(1)).toBe('perfect');
    expect(ratingOfBand(2)).toBe('good');
    expect(ratingOfBand(3)).toBe('concern');
    expect(ratingOfBand(4)).toBe('warning');
  });
  it('라벨 매핑이 스펙 명칭과 일치한다', () => {
    expect(RATING_LABELS.perfect).toBe('완벽');
    expect(RATING_LABELS.good).toBe('양호');
    expect(RATING_LABELS.concern).toBe('염려');
    expect(RATING_LABELS.warning).toBe('경고');
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
