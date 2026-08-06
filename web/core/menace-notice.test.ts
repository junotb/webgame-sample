import { describe, expect, it } from 'vitest';
import { cappedMenaces, MENACE_CAP, reduce, SHIFT_PER_DAY } from './reducer';
import type { ContentBundle, GameState, WorkOrder } from './schema';

function baseState(overrides?: Partial<GameState['world']>): GameState {
  return {
    account: { ownedEpisodes: ['ep1'] },
    self: {
      stats: { repair: 40, insight: 35, procedure: 30, nerve: 25 },
      skills: { inscription: 1, flowsense: 1 },
      skillXp: { inscription: 0, flowsense: 0 },
      memory: 0,
      rank: 0,
    },
    world: {
      calendar: { day: 1, weekday: 1 },
      assignment: { zone: 'd5' },
      weekRatings: {},
      cardNeglect: {},
      multiday: null,
      archive: [],
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

const FATIGUE_ORDER: WorkOrder = {
  templateId: 'WO-FATIGUE',
  zone: 'd2',
  difficultyBonus: 0,
  face: 'inspection' as const,
  siteId: 'test-site',
  reissueCount: 0,
  weight: 1,
  title: [{ text: '소모적인 작업' }],
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
  encounters: [],
  version: '0',
  zoneMaps: [],
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

describe('리듀서 — 메나스 상한 통지 (UI 층위 §6)', () => {
  it('RESOLVE_ORDER로 피로가 상한에 닿으면 통지가 실린다', () => {
    const state = baseState({ phase: 'field', pendingOrders: [FATIGUE_ORDER] });
    const { state: next, notices } = reduce(state, { type: 'RESOLVE_ORDER', orderIndex: 0, optionIndex: 0 }, CONTENT);
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
    const at = baseState({ phase: 'field', pendingOrders: [structuredClone(FATIGUE_ORDER)] });
    at.world.menace.fatigue = MENACE_CAP;
    const { notices } = reduce(at, { type: 'RESOLVE_ORDER', orderIndex: 0, optionIndex: 0 }, CONTENT);
    expect(notices).toEqual([]);
  });

  it('경고 문구를 로그로 흘려보내지 않는다 — 통지는 L4의 몫이다', () => {
    const state = baseState({ phase: 'field', pendingOrders: [FATIGUE_ORDER] });
    const { log } = reduce(state, { type: 'RESOLVE_ORDER', orderIndex: 0, optionIndex: 0 }, CONTENT);
    expect(log.join(' ')).not.toContain('한계에 달했다');
    expect(log.join(' ')).not.toContain('⚠');
  });
});
