/**
 * Effect 적용기 — 구체 EffectPath만 받는다 (치환자는 생성기에서 이미 소거됨).
 * 기억(self.memory)은 비가역: 감소시키는 효과는 콘텐츠 빌드 검증과 별개로
 * 런타임에서도 throw로 차단한다 (이중 방어).
 */
import { skillLevelOf, SKILL_XP_MAX } from './skills';
import type { Effect, GameState, SkillId } from './schema';

/** 경로 접두사별 값 범위 — 스키마 주석의 범위와 일치해야 한다 */
const RANGES: Array<{ test: RegExp; min: number; max: number }> = [
  { test: /^self\.stats\./, min: 0, max: 100 },
  { test: /^self\.skillXp\./, min: 0, max: SKILL_XP_MAX },
  { test: /^self\.memory$/, min: 0, max: 7 },
  { test: /^world\.zones\..+\.stagnation$/, min: 0, max: 10 },
  { test: /^world\.menace\./, min: 0, max: 8 },
  { test: /^world\.npcs\..+\.trust$/, min: 0, max: 7 },
  // world.flags.* 는 클램프 없음
];

function clampForPath(path: string, value: number): number {
  const range = RANGES.find((r) => r.test.test(path));
  return range ? Math.min(range.max, Math.max(range.min, value)) : value;
}

export function applyEffect(state: GameState, effect: Effect): GameState {
  const next = structuredClone(state);
  const segments = effect.path.split('.');
  const key = segments[segments.length - 1];
  let parent: Record<string, unknown> = next as unknown as Record<string, unknown>;
  for (const seg of segments.slice(0, -1)) {
    const child = parent[seg];
    if (typeof child !== 'object' || child === null) {
      throw new Error(`효과 경로가 상태에 없음: ${effect.path} ('${seg}' 지점)`);
    }
    parent = child as Record<string, unknown>;
  }
  const current = typeof parent[key] === 'number' ? (parent[key] as number) : 0;
  const raw = effect.op === 'add' ? current + effect.value : effect.value;

  if (effect.path === 'self.memory' && raw < current) {
    throw new Error(`기억은 비가역: 감소 효과 거부 (현재 ${current} → ${raw})`);
  }
  if (effect.path.startsWith('self.skillXp.') && raw < current) {
    throw new Error(`경험은 비가역: 감소 효과 거부 (${effect.path}: ${current} → ${raw})`);
  }

  parent[key] = clampForPath(effect.path, raw);

  // 등급 승격 — 경험치가 원본, 등급은 파생 캐시 (core/skills.ts)
  if (effect.path.startsWith('self.skillXp.')) {
    const skill = key as SkillId;
    next.self.skills[skill] = Math.max(next.self.skills[skill], skillLevelOf(next.self.skillXp[skill]));
  }
  return next;
}

export function applyEffects(state: GameState, effects: Effect[]): GameState {
  return effects.reduce(applyEffect, state);
}
