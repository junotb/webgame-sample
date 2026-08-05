import { describe, it, expect } from 'vitest';
import { resolveOption } from './resolve';
import type { BoundWorkOption, GameState } from './schema';

function baseState(): GameState {
  return {
    account: { ownedEpisodes: ['ep1'] },
    self: {
      stats: { repair: 40, insight: 35, procedure: 30, nerve: 25 },
      skills: { inscription: 1, flowsense: 1 },
      memory: 0,
      rank: 0,
    },
    world: {
      day: 1,
      phase: 'field',
      districts: { d2: { decay: 3 }, d5: { decay: 4 }, d7: { decay: 5 } },
      menace: { fatigue: 0, scrutiny: 0, unrest: 0 },
      npcs: { protagonist: { trust: 0 } },
      flags: {},
      shiftLeft: 2,
      pendingOrders: [],
      seed: 42,
    },
  };
}

// narrow inscription 1 vs difficulty 1 → p = 0.5 (경계가 명확한 판정)
const OPTION: BoundWorkOption = {
  label: '정석 수리',
  check: { kind: 'narrow', skill: 'inscription', difficulty: 1 },
  timeCost: 1,
  onSuccess: {
    effects: [{ path: 'world.districts.d5.decay', op: 'add', value: -3 }],
    text: '수리 성공',
  },
  onFailure: {
    effects: [{ path: 'world.menace.fatigue', op: 'add', value: 2 }],
    text: '수리 실패',
  },
};

describe('resolveOption — 판정 → 분기 → 효과 반영', () => {
  it('성공(roll < p): onSuccess 효과 적용, 성공 텍스트', () => {
    const result = resolveOption(baseState(), OPTION, () => 0.49);
    expect(result.success).toBe(true);
    expect(result.state.world.districts.d5.decay).toBe(1);
    expect(result.state.world.menace.fatigue).toBe(0);
    expect(result.text).toBe('수리 성공');
  });
  it('실패(roll ≥ p): onFailure 효과 적용, 실패 텍스트', () => {
    const result = resolveOption(baseState(), OPTION, () => 0.5);
    expect(result.success).toBe(false);
    expect(result.state.world.districts.d5.decay).toBe(4);
    expect(result.state.world.menace.fatigue).toBe(2);
    expect(result.text).toBe('수리 실패');
  });
  it('onFailure 없는 옵션의 실패: 효과 없음, 텍스트 빈 문자열', () => {
    const noFailure: BoundWorkOption = { ...OPTION, onFailure: undefined };
    const result = resolveOption(baseState(), noFailure, () => 0.99);
    expect(result.success).toBe(false);
    expect(result.state).toEqual(baseState());
    expect(result.text).toBe('');
  });
  it('auto 판정은 항상 성공', () => {
    const auto: BoundWorkOption = { ...OPTION, check: { kind: 'auto' } };
    const result = resolveOption(baseState(), auto, () => 0.999999);
    expect(result.success).toBe(true);
    expect(result.state.world.districts.d5.decay).toBe(1);
  });
  it('p와 roll을 결과에 노출 (로그·디버그용)', () => {
    const result = resolveOption(baseState(), OPTION, () => 0.3);
    expect(result.p).toBe(0.5);
    expect(result.roll).toBe(0.3);
  });
  it('순수 함수: 원본 상태 불변', () => {
    const state = baseState();
    resolveOption(state, OPTION, () => 0.1);
    expect(state).toEqual(baseState());
  });
  it('효과가 기억을 감소시키면 throw가 전파된다 (런타임 가드)', () => {
    const bad: BoundWorkOption = {
      ...OPTION,
      onSuccess: { effects: [{ path: 'self.memory', op: 'add', value: -1 }], text: 'x' },
    };
    expect(() => resolveOption(baseState(), bad, () => 0)).toThrow(/기억/);
  });
});
