/**
 * 시간·평가 코어 (slice v3 §2·§3)
 * 밴드는 저장하지 않는 파생값 — decay → band는 렌더링·평가 시점에만 접는다.
 * 금요일 종료 시점의 밴드가 곧 주간 평가 등급이다 (별도 산식 없음).
 */
import type { WeeklyRating } from './schema';

export type Band = 1 | 2 | 3 | 4;

export const WORKDAYS_PER_WEEK = 5;
export const DAYS_PER_WEEK = 7;

/** 0~2 정상 / 3~5 삐걱임 / 6~8 이상(임계) / 9~10 한계 */
export function bandOf(decay: number): Band {
  if (decay <= 2) return 1;
  if (decay <= 5) return 2;
  if (decay <= 8) return 3;
  return 4;
}

/** 가안 (v3 §10) — 확정 시 여기와 calendar.test.ts만 갱신 */
export const BAND_NAMES: Record<Band, string> = {
  1: '정상',
  2: '삐걱임',
  3: '이상',
  4: '한계',
};

export function ratingOfBand(band: Band): WeeklyRating {
  return (['perfect', 'good', 'concern', 'warning'] as const)[band - 1];
}

export const RATING_LABELS: Record<WeeklyRating, string> = {
  perfect: '완벽',
  good: '양호',
  concern: '염려',
  warning: '경고',
};

/** 통산 일차(주말 포함) → 주차. day 1 = 1주차 월요일. */
export function weekOf(day: number): number {
  return Math.ceil(day / DAYS_PER_WEEK);
}
