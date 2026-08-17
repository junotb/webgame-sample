import { WEEKLY_CONTENT } from './test-content';
import { describe, expect, it } from 'vitest';
import { cappedMenaces, MENACE_CAP, reduce, SHIFT_PER_DAY } from './reducer';
import type { ContentBundle, GameState, WorkOrder } from './schema';

function baseState(overrides?: Partial<GameState['world']>): GameState {
  return {
    account: { ownedEpisodes: ['ep1'] },
    self: {
      stats: { repair: 40, insight: 35, procedure: 30, nerve: 25 },
      skills: { flowsense: 1, incantation: 1, inscription: 1, flame: 1, frost: 0 },
      skillXp: { flowsense: 0, incantation: 0, inscription: 0, flame: 0, frost: 0 },
      memory: 0,
      rank: 0,
    },
    world: {
      calendar: { day: 1, weekday: 1 },
      assignment: { zone: 'd5' },
      weekRatings: {},
      weekTally: { processed: 0, notPassed: 0, perfect: 0 },
      ending: null,
      weekend: null,
      cardNeglect: {},
      multiday: null,
      archive: [],
      phase: 'morning',
      zones: { d2: { stagnation: 3 }, d5: { stagnation: 4 }, d7: { stagnation: 5 } },
      menace: { fatigue: 0, scrutiny: 0, unrest: 0 },
      npcs: { returned: { trust: 0 } },
      flags: {},
      shiftLeft: SHIFT_PER_DAY,
      pendingOrders: [],
      activeOrder: null,
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

describe('cappedMenaces — 상한 도달 감지', () => {
  it('상한 미만 → 상한 도달 시 해당 메나스를 돌려준다', () => {
    const prev = baseState();
    expect(cappedMenaces(prev, menaceOf(prev, MENACE_CAP))).toEqual(['fatigue']);
  });

  it('상한 미만에서는 아무것도 없다', () => {
    const prev = baseState();
    expect(cappedMenaces(prev, menaceOf(prev, MENACE_CAP - 1))).toEqual([]);
  });

  it('이미 상한인 메나스는 다시 알리지 않는다 (도달 시 1회)', () => {
    const prev = menaceOf(baseState(), MENACE_CAP);
    expect(cappedMenaces(prev, menaceOf(prev, MENACE_CAP))).toEqual([]);
  });

  it('동시에 둘이 도달하면 둘 다 돌려준다', () => {
    const prev = baseState();
    expect(cappedMenaces(prev, menaceOf(prev, MENACE_CAP, MENACE_CAP))).toEqual(['fatigue', 'unrest']);
  });
});

// ── 리듀서 통합: 효과 적용 경로에서 통지가 StepResult에 실리는가 ──

const FATIGUE_ENCOUNTER = {
  type: 'RESOLVE_ENCOUNTER' as const,
  encounterId: 'ENC-X',
  zone: 'd5' as const,
  outcome: 'burned' as const,
  effects: [{ path: 'world.menace.fatigue' as const, op: 'add' as const, value: 8 }],
  text: '몸이 무겁다.',
};

const CONTENT: ContentBundle = {
  bundleId: 'test',
  ...WEEKLY_CONTENT,
  encounters: [],
  version: '0',
  zoneMaps: [],
  orderTemplates: [],
  storylets: [
    {
      id: 'EV-UNREST',
      requirements: [],
      body: [{ paragraphs: ['x'] }],
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

describe('리듀서 — 메나스 상한 통지 (UI 층위 §6)', () => {
  it('RESOLVE_ENCOUNTER로 피로가 상한에 닿으면 통지가 실린다', () => {
    const state = baseState({ phase: 'field' });
    const { state: next, notices } = reduce(state, FATIGUE_ENCOUNTER, CONTENT);
    expect(next.world.menace.fatigue).toBe(MENACE_CAP);
    expect(notices).toEqual(['fatigue']);
  });

  it('CHOOSE_STORYLET으로 동요가 상한에 닿으면 통지가 실린다', () => {
    const state = baseState({ phase: 'event' });
    const { state: next, notices } = reduce(state, { type: 'CHOOSE_STORYLET', storyletId: 'EV-UNREST', choiceIndex: 0 }, CONTENT);
    expect(next.world.menace.unrest).toBe(MENACE_CAP);
    expect(notices).toEqual(['unrest']);
  });

  it('이미 상한인 상태에서 추가 효과가 와도 통지를 반복하지 않는다', () => {
    const at = baseState({ phase: 'field' });
    at.world.menace.fatigue = MENACE_CAP;
    const { notices } = reduce(at, FATIGUE_ENCOUNTER, CONTENT);
    expect(notices).toEqual([]);
  });

  it('경고 문구를 로그로 흘려보내지 않는다 — 통지는 L4의 몫이다', () => {
    const state = baseState({ phase: 'field' });
    const { log } = reduce(state, FATIGUE_ENCOUNTER, CONTENT);
    expect(log.join(' ')).not.toContain('한계에 달했다');
    expect(log.join(' ')).not.toContain('⚠');
  });
});
