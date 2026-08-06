import { describe, it, expect } from 'vitest';
import { SKILL_XP_MAX, XP_PER_LEVEL } from './skills';
import { applyEffect, applyEffects } from './effects';
import type { GameState } from './schema';

function baseState(): GameState {
  return {
    account: { ownedEpisodes: ['ep1'] },
    self: {
      stats: { repair: 40, insight: 35, procedure: 30, nerve: 25 },
      skills: { inscription: 1, flowsense: 1 },
      skillXp: { inscription: 0, flowsense: 0 },
      memory: 2,
      rank: 0,
    },
    world: {
      calendar: { day: 1, weekday: 1 },
      assignment: { zone: 'd5' },
      weekRatings: {},
      cardNeglect: {},
      multiday: null,
      archive: [],
      phase: 'field',
      zones: { d2: { decay: 3 }, d5: { decay: 4 }, d7: { decay: 5 } },
      menace: { fatigue: 0, scrutiny: 0, unrest: 0 },
      npcs: { protagonist: { trust: 0 } },
      flags: {},
      shiftLeft: 2,
      pendingOrders: [],
      seed: 42,
    },
  };
}

describe('applyEffect — add/set', () => {
  it('add: 기존 값에 가산', () => {
    const next = applyEffect(baseState(), { path: 'world.zones.d5.decay', op: 'add', value: -3 });
    expect(next.world.zones.d5.decay).toBe(1);
  });
  it('set: 값 대입', () => {
    const next = applyEffect(baseState(), { path: 'world.menace.unrest', op: 'set', value: 2 });
    expect(next.world.menace.unrest).toBe(2);
  });
  it('flags: 없는 키에 add하면 0에서 시작', () => {
    const next = applyEffect(baseState(), { path: 'world.flags.patched_d5', op: 'add', value: 1 });
    expect(next.world.flags.patched_d5).toBe(1);
  });
  it('순수 함수: 원본 상태 불변', () => {
    const state = baseState();
    applyEffect(state, { path: 'self.stats.repair', op: 'add', value: 10 });
    expect(state.self.stats.repair).toBe(40);
  });
});

describe('applyEffect — 범위 클램프 (스키마 주석 범위)', () => {
  it('decay는 0~10', () => {
    expect(
      applyEffect(baseState(), { path: 'world.zones.d2.decay', op: 'add', value: -99 }).world.zones.d2.decay,
    ).toBe(0);
    expect(
      applyEffect(baseState(), { path: 'world.zones.d2.decay', op: 'add', value: 99 }).world.zones.d2.decay,
    ).toBe(10);
  });
  it('menace는 0~8, stats는 0~100, memory·trust는 0~7', () => {
    expect(applyEffect(baseState(), { path: 'world.menace.fatigue', op: 'add', value: 99 }).world.menace.fatigue).toBe(8);
    expect(applyEffect(baseState(), { path: 'self.stats.repair', op: 'add', value: 999 }).self.stats.repair).toBe(100);
    expect(applyEffect(baseState(), { path: 'self.memory', op: 'add', value: 99 }).self.memory).toBe(7);
    expect(
      applyEffect(baseState(), { path: 'world.npcs.protagonist.trust', op: 'add', value: 9 }).world.npcs.protagonist.trust,
    ).toBe(7);
  });
});

describe('applyEffect — 기술 경험치 (경험치가 원본, 등급은 파생)', () => {
  it('경험치가 등급 임계를 넘으면 등급이 승격된다', () => {
    const next = applyEffect(baseState(), { path: 'self.skillXp.flowsense', op: 'add', value: XP_PER_LEVEL });
    expect(next.self.skillXp.flowsense).toBe(XP_PER_LEVEL);
    expect(next.self.skills.flowsense).toBe(2);
  });
  it('임계 미만이면 등급은 그대로', () => {
    const next = applyEffect(baseState(), { path: 'self.skillXp.inscription', op: 'add', value: 3 });
    expect(next.self.skills.inscription).toBe(1);
  });
  it('경험치는 상한에서 클램프되고 등급은 7을 넘지 않는다', () => {
    const next = applyEffect(baseState(), { path: 'self.skillXp.inscription', op: 'add', value: 9999 });
    expect(next.self.skillXp.inscription).toBe(SKILL_XP_MAX);
    expect(next.self.skills.inscription).toBe(7);
  });
  it('경험치 감소는 throw — 경험은 비가역', () => {
    expect(() => applyEffect(baseState(), { path: 'self.skillXp.flowsense', op: 'add', value: -1 })).toThrow(/비가역/);
  });
});

describe('applyEffect — 기억 감소 가드 (비가역 원칙)', () => {
  it('memory add 음수 → throw', () => {
    expect(() => applyEffect(baseState(), { path: 'self.memory', op: 'add', value: -1 })).toThrow(/기억/);
  });
  it('memory set 현재값 미만 → throw', () => {
    expect(() => applyEffect(baseState(), { path: 'self.memory', op: 'set', value: 1 })).toThrow(/기억/);
  });
  it('memory 증가·동일값 set은 허용', () => {
    expect(applyEffect(baseState(), { path: 'self.memory', op: 'add', value: 1 }).self.memory).toBe(3);
    expect(applyEffect(baseState(), { path: 'self.memory', op: 'set', value: 2 }).self.memory).toBe(2);
  });
});

describe('applyEffects — 순차 적용', () => {
  it('여러 효과를 순서대로 누적 적용', () => {
    const next = applyEffects(baseState(), [
      { path: 'world.zones.d5.decay', op: 'add', value: -1 },
      { path: 'world.flags.patched_d5', op: 'add', value: 1 },
      { path: 'world.flags.patched_d5', op: 'add', value: 1 },
    ]);
    expect(next.world.zones.d5.decay).toBe(3);
    expect(next.world.flags.patched_d5).toBe(2);
  });
  it('빈 배열이면 동등한 상태 반환', () => {
    const state = baseState();
    expect(applyEffects(state, [])).toEqual(state);
  });
});
