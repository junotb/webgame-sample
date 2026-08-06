import { describe, expect, it } from 'vitest';
import { MENACE_CAP, menaceWarnings, reduce, SHIFT_PER_DAY } from './reducer';
import type { ContentBundle, GameState, WorkOrder } from './schema';

function baseState(overrides?: Partial<GameState['world']>): GameState {
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
      phase: 'morning',
      zones: { d2: { decay: 3 }, d5: { decay: 4 }, d7: { decay: 5 } },
      menace: { fatigue: 0, scrutiny: 0, unrest: 0 },
      npcs: { protagonist: { trust: 0 } },
      flags: {},
      shiftLeft: SHIFT_PER_DAY,
      pendingOrders: [],
      seed: 42,
      ...overrides,
    },
  };
}

function menaceOf(state: GameState, fatigue: number, unrest = 0): GameState {
  const next = structuredClone(state);
  next.world.menace.fatigue = fatigue;
  next.world.menace.unrest = unrest;
  return next;
}

describe('menaceWarnings — 상한 도달 감지', () => {
  it('상한 미만 → 상한 도달 시 해당 메나스 경고를 낸다', () => {
    const prev = baseState();
    const warnings = menaceWarnings(prev, menaceOf(prev, MENACE_CAP));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('피로');
  });

  it('상한 미만에서는 경고가 없다', () => {
    const prev = baseState();
    expect(menaceWarnings(prev, menaceOf(prev, MENACE_CAP - 1))).toEqual([]);
  });

  it('이미 상한인 메나스는 다시 경고하지 않는다 (도달 시 1회)', () => {
    const prev = menaceOf(baseState(), MENACE_CAP);
    expect(menaceWarnings(prev, menaceOf(prev, MENACE_CAP))).toEqual([]);
  });

  it('동시에 둘이 도달하면 둘 다 경고한다', () => {
    const prev = baseState();
    const warnings = menaceWarnings(prev, menaceOf(prev, MENACE_CAP, MENACE_CAP));
    expect(warnings).toHaveLength(2);
    expect(warnings.join(' ')).toContain('피로');
    expect(warnings.join(' ')).toContain('동요');
  });
});

// ── 리듀서 통합: 효과 적용 경로에서 경고가 로그에 실리는가 ──

const FATIGUE_ORDER: WorkOrder = {
  templateId: 'WO-FATIGUE',
  zone: 'd2',
  difficultyBonus: 0,
  title: '소모적인 작업',
  body: [{ text: '본문' }],
  options: [
    {
      label: '무리해서 처리한다',
      check: { kind: 'auto' },
      timeCost: 1,
      onSuccess: {
        effects: [{ path: 'world.menace.fatigue', op: 'add', value: 8 }],
        text: '몸이 무겁다.',
      },
    },
  ],
  resolved: false,
};

const CONTENT: ContentBundle = {
  bundleId: 'test',
  version: '0',
  orderTemplates: [],
  storylets: [
    {
      id: 'EV-UNREST',
      requirements: [],
      body: [{ text: 'x' }],
      choices: [
        {
          label: '소란을 일으킨다',
          check: { kind: 'auto' },
          onSuccess: {
            effects: [{ path: 'world.menace.unrest', op: 'add', value: 8 }],
            text: '웅성거림이 커진다.',
          },
        },
      ],
    },
  ],
};

describe('리듀서 — 메나스 상한 경고 로그', () => {
  it('RESOLVE_ORDER로 피로가 상한에 닿으면 로그에 경고가 실린다', () => {
    const state = baseState({ phase: 'field', pendingOrders: [FATIGUE_ORDER] });
    const { state: next, log } = reduce(state, { type: 'RESOLVE_ORDER', orderIndex: 0, optionIndex: 0 }, CONTENT);
    expect(next.world.menace.fatigue).toBe(MENACE_CAP);
    expect(log.some((l) => l.includes('피로'))).toBe(true);
  });

  it('CHOOSE_STORYLET으로 동요가 상한에 닿으면 로그에 경고가 실린다', () => {
    const state = baseState({ phase: 'event' });
    const { state: next, log } = reduce(state, { type: 'CHOOSE_STORYLET', storyletId: 'EV-UNREST', choiceIndex: 0 }, CONTENT);
    expect(next.world.menace.unrest).toBe(MENACE_CAP);
    expect(log.some((l) => l.includes('동요'))).toBe(true);
  });

  it('이미 상한인 상태에서 추가 효과가 와도 경고를 반복하지 않는다', () => {
    const at = baseState({ phase: 'field', pendingOrders: [structuredClone(FATIGUE_ORDER)] });
    at.world.menace.fatigue = MENACE_CAP;
    const { log } = reduce(at, { type: 'RESOLVE_ORDER', orderIndex: 0, optionIndex: 0 }, CONTENT);
    expect(log.some((l) => l.includes('한계'))).toBe(false);
  });
});
