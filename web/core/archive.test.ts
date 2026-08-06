/**
 * 재열람 서류함 (v3 §7) — 제시된 문서가 기록되고, 본문은 저장하지 않으며,
 * 기억이 오르면 그 사실만 알린다. 강조는 답을 주고, 재열람은 질문을 준다.
 */
import { describe, expect, it } from 'vitest';
import { growthNotes, reduce, selectVariant } from './reducer';
import { bindVariants } from './bind';
import type { ContentBundle, GameState, WorkOrderTemplate } from './schema';

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
      shiftLeft: 2,
      pendingOrders: [],
      seed: 42,
      ...overrides,
    },
  };
}

const T: WorkOrderTemplate = {
  id: 'AUTO',
  minDecay: 0,
  weight: 1,
  face: 'inspection',
  siteId: 'test-site',
  title: '점검',
  body: [
    { if: [{ path: 'self.memory', gte: 1 }], text: '기억 변형' },
    { text: '기본 본문' },
  ],
  options: [
    { label: '처리', check: { kind: 'auto' }, timeCost: 1, onSuccess: { effects: [], text: '완료' } },
  ],
};

const CONTENT: ContentBundle = {
  bundleId: 'archive-test',
  version: '0',
  zoneMaps: [],
  encounters: [],
  orderTemplates: [T],
  storylets: [
    {
      id: 'EV-001',
      requirements: [],
      body: [{ text: '이벤트' }],
      choices: [
        {
          label: '묻는다',
          check: { kind: 'auto' },
          onSuccess: { effects: [{ path: 'self.memory', op: 'add', value: 1 }], text: '기억이 새겨졌다' },
        },
      ],
    },
  ],
};

describe('서류함 기록', () => {
  it('START_DAY: 제시된 카드가 서류함에 오르고, 재발부돼도 중복되지 않는다', () => {
    const day1 = reduce(baseState(), { type: 'START_DAY' }, CONTENT).state;
    expect(day1.world.archive).toEqual([{ kind: 'order', day: 1, templateId: 'AUTO', zone: 'd5' }]);
    const again = reduce({ ...day1, world: { ...day1.world, phase: 'morning' } }, { type: 'START_DAY' }, CONTENT).state;
    expect(again.world.archive).toHaveLength(1);
  });
  it('재발부돼도 남는 일차는 처음 겪은 날이다', () => {
    const day1 = reduce(baseState(), { type: 'START_DAY' }, CONTENT).state;
    const later = reduce(
      { ...day1, world: { ...day1.world, phase: 'morning', calendar: { day: 4, weekday: 4 } } },
      { type: 'START_DAY' },
      CONTENT,
    ).state;
    expect(later.world.archive).toEqual([{ kind: 'order', day: 1, templateId: 'AUTO', zone: 'd5' }]);
  });
  it('CHOOSE_STORYLET: 읽은 스토리렛이 서류함에 오른다', () => {
    const { state } = reduce(baseState({ phase: 'event' }), { type: 'CHOOSE_STORYLET', storyletId: 'EV-001', choiceIndex: 0 }, CONTENT);
    expect(state.world.archive).toContainEqual({ kind: 'storylet', day: 1, id: 'EV-001' });
  });
});

describe('기억 상승 알림 (§7: 사실만 알리고 내용은 말하지 않는다)', () => {
  it('기억이 오르면 재열람 안내가 로그에 실린다', () => {
    const { log } = reduce(baseState({ phase: 'event' }), { type: 'CHOOSE_STORYLET', storyletId: 'EV-001', choiceIndex: 0 }, CONTENT);
    expect(log.join(' ')).toContain('서류함');
    expect(log.join(' ')).toContain('1/7');
  });
  it('growthNotes: 기억 불변이면 침묵', () => {
    expect(growthNotes(baseState(), baseState())).toEqual([]);
  });
});

describe('재열람 렌더링 — 같은 문서, 달라진 독자', () => {
  it('보관된 카드 본문이 현재 기억으로 다시 선택된다', () => {
    const bound = bindVariants(T.body, 'd5');
    const before = baseState();
    expect(selectVariant(before, bound)).toBe('기본 본문');
    const after = baseState();
    after.self.memory = 1;
    expect(selectVariant(after, bound)).toBe('기억 변형');
  });
});
