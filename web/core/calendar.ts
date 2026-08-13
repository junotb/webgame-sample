/**
 * 시간·평가 코어 (slice v3 §2·§3)
 * 밴드는 저장하지 않는 파생값 — stagnation → band는 렌더링·평가 시점에만 접는다.
 * 금요일 종료 시점의 밴드가 곧 주간 평가 등급이다 (별도 산식 없음).
 */
import type { WeeklyRating } from './schema';

export type Band = 1 | 2 | 3 | 4;

export const WORKDAYS_PER_WEEK = 5;
export const DAYS_PER_WEEK = 7;

/**
 * 종결 주차 (2026-08-11 확정) — 이 주의 금요일 정산에서 엔딩으로 분기한다.
 * 4주 사이클 확장 시 이 값만 올리면 그 전 주는 기존 주말 롤오버를 탄다.
 */
export const FINAL_WEEK = 1;

/** 0~2 정상 / 3~5 삐걱임 / 6~8 이상(임계) / 9~10 한계 */
export function bandOf(stagnation: number): Band {
  if (stagnation <= 2) return 1;
  if (stagnation <= 5) return 2;
  if (stagnation <= 8) return 3;
  return 4;
}

/** 가안 (v3 §10) — 확정 시 여기와 calendar.test.ts만 갱신 */
export const BAND_NAMES: Record<Band, string> = {
  1: '정상',
  2: '삐걱임',
  3: '이상',
  4: '한계',
};

/**
 * 경계 합산식 (2026-08-11 확정) — 주간 등급이자 엔딩 경계.
 * Not Passed가 처리의 절반 이상 → 주 Not Passed (= 해고 경계) /
 * 전 장 Perfect → 주 Perfect / 그 외 → 주 Passed.
 * 한 장도 처리하지 않은 주는 0 ≥ 0으로 Not Passed — 방치만 한 주가 유임이 되지 않는다.
 */
export function summarizeWeek(tally: { processed: number; notPassed: number; perfect: number }): WeeklyRating {
  if (tally.notPassed * 2 >= tally.processed) return 'notPassed';
  if (tally.perfect === tally.processed) return 'perfect';
  return 'passed';
}

/** 통지서·총평의 표기 언어 — 등급명은 영문 그대로 (CLAUDE.md 평가 절) */
export const RATING_LABELS: Record<WeeklyRating, string> = {
  perfect: 'Perfect',
  passed: 'Passed',
  notPassed: 'Not Passed',
};

/** 통산 일차(주말 포함) → 주차. day 1 = 1주차 월요일. */
export function weekOf(day: number): number {
  return Math.ceil(day / DAYS_PER_WEEK);
}
