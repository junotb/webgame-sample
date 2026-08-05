/**
 * 판정 수식 — 스펙 phase0-spec.md 3장 확정값
 * 순수 함수만. PRNG는 인자로 주입 (재현성).
 */
import type { Check, SkillId, StatId } from './schema';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Broad: p = clamp(0.6 × stat / difficulty, 0.05, 1.0). difficulty ≤ 0은 자동 성공. */
export function broadProbability(stat: number, difficulty: number): number {
  if (difficulty <= 0) return 1.0;
  return clamp((0.6 * stat) / difficulty, 0.05, 1.0);
}

/** Narrow: p = clamp(0.5 + (skill − difficulty) × 0.1, 0.1, 1.0) */
export function narrowProbability(skill: number, difficulty: number): number {
  return clamp(0.5 + (skill - difficulty) * 0.1, 0.1, 1.0);
}

export function checkProbability(
  check: Check,
  stats: Record<StatId, number>,
  skills: Record<SkillId, number>,
): number {
  switch (check.kind) {
    case 'broad':
      return broadProbability(stats[check.stat], check.difficulty);
    case 'narrow':
      return narrowProbability(skills[check.skill], check.difficulty);
    case 'auto':
      return 1.0;
  }
}

/** mulberry32 — 32비트 시드 기반 PRNG, [0, 1) 반환 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RollResult {
  p: number;
  roll: number;
  success: boolean;
}

/** roll < p 이면 성공. auto(p=1)는 항상 성공 (roll은 1 미만이므로). */
export function rollCheck(
  check: Check,
  stats: Record<StatId, number>,
  skills: Record<SkillId, number>,
  rng: () => number,
): RollResult {
  const p = checkProbability(check, stats, skills);
  const roll = rng();
  return { p, roll, success: roll < p };
}
