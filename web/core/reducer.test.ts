import { describe, it, expect } from 'vitest';
import { reduce, altitude, getValueAtPath, evalConditions, selectVariant, SHIFT_PER_DAY } from './reducer';
import type { ContentBundle, GameState, WorkOrder, WorkOrderTemplate } from './schema';

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

// auto 판정 템플릿 — 판정 난수 없이 전이만 검증하기 위함
const AUTO_T: WorkOrderTemplate = {
  id: 'AUTO',
  minDecay: 0,
  title: '점검',
  body: [{ text: '본문' }],
  options: [
    {
      label: '처리',
      check: { kind: 'auto' },
      timeCost: 1,
      onSuccess: {
        effects: [{ path: 'world.zones.{zone}.decay', op: 'add', value: -2 }],
        text: '처리 완료',
      },
    },
  ],
};

const CONTENT: ContentBundle = {
  bundleId: 'test',
  version: '0',
  orderTemplates: [AUTO_T],
  storylets: [
    {
      id: 'EV-001',
      requirements: [{ path: 'world.day', gte: 1 }],
      body: [
        { if: [{ path: 'self.memory', gte: 1 }], text: '기억 변형 본문' },
        { text: '기본 본문' },
      ],
      choices: [
        {
          label: '묻는다',
          check: { kind: 'auto' },
          onSuccess: {
            effects: [{ path: 'self.memory', op: 'add', value: 1 }],
            text: '기억이 새겨졌다',
          },
        },
      ],
    },
    {
      id: 'EV-LOCKED',
      requirements: [{ path: 'world.day', gte: 99 }],
      body: [{ text: 'x' }],
      choices: [{ label: 'x', check: { kind: 'auto' }, onSuccess: { effects: [], text: 'x' } }],
    },
  ],
};

function makeOrder(zone: WorkOrder['zone'], resolved: boolean): WorkOrder {
  return {
    templateId: 'AUTO',
    zone,
    difficultyBonus: 0,
    title: '점검',
    body: [{ text: '본문' }],
    options: [],
    resolved,
  };
}

describe('START_DAY — morning: 지시서 생성 → field', () => {
  it('구역당 1건씩 3건 생성, phase는 field로', () => {
    const { state } = reduce(baseState(), { type: 'START_DAY' }, CONTENT);
    expect(state.world.pendingOrders).toHaveLength(3);
    expect(state.world.pendingOrders.map((o) => o.zone)).toEqual(['d2', 'd5', 'd7']);
    expect(state.world.phase).toBe('field');
  });
  it('seed가 전진한다 (같은 seed → 같은 결과, 재현성)', () => {
    const a = reduce(baseState(), { type: 'START_DAY' }, CONTENT);
    const b = reduce(baseState(), { type: 'START_DAY' }, CONTENT);
    expect(a.state).toEqual(b.state);
    expect(a.state.world.seed).not.toBe(42);
  });
  it('morning이 아니면 throw', () => {
    expect(() => reduce(baseState({ phase: 'field' }), { type: 'START_DAY' }, CONTENT)).toThrow(/morning/);
  });
});

describe('RESOLVE_ORDER — field: 판정·효과·트리아지', () => {
  function fieldState(): GameState {
    return reduce(baseState(), { type: 'START_DAY' }, CONTENT).state;
  }
  it('효과 적용, resolved 마킹, shiftLeft 차감', () => {
    const { state, log } = reduce(fieldState(), { type: 'RESOLVE_ORDER', orderIndex: 0, optionIndex: 0 }, CONTENT);
    expect(state.world.zones.d2.decay).toBe(1); // 3 − 2
    expect(state.world.pendingOrders[0].resolved).toBe(true);
    expect(state.world.shiftLeft).toBe(SHIFT_PER_DAY - 1);
    expect(state.world.phase).toBe('field');
    expect(log.join(' ')).toContain('처리 완료');
  });
  it('shiftLeft가 0이 되면 event로 강제 전이 (2/3건 트리아지)', () => {
    const s1 = reduce(fieldState(), { type: 'RESOLVE_ORDER', orderIndex: 0, optionIndex: 0 }, CONTENT).state;
    const s2 = reduce(s1, { type: 'RESOLVE_ORDER', orderIndex: 1, optionIndex: 0 }, CONTENT).state;
    expect(s2.world.shiftLeft).toBe(0);
    expect(s2.world.phase).toBe('event');
  });
  it('이미 처리한 지시서 재처리 → throw', () => {
    const s1 = reduce(fieldState(), { type: 'RESOLVE_ORDER', orderIndex: 0, optionIndex: 0 }, CONTENT).state;
    expect(() => reduce(s1, { type: 'RESOLVE_ORDER', orderIndex: 0, optionIndex: 0 }, CONTENT)).toThrow(/처리/);
  });
  it('없는 지시서·옵션 인덱스 → throw', () => {
    expect(() => reduce(fieldState(), { type: 'RESOLVE_ORDER', orderIndex: 9, optionIndex: 0 }, CONTENT)).toThrow();
    expect(() => reduce(fieldState(), { type: 'RESOLVE_ORDER', orderIndex: 0, optionIndex: 9 }, CONTENT)).toThrow();
  });
  it('field가 아니면 throw', () => {
    expect(() => reduce(baseState(), { type: 'RESOLVE_ORDER', orderIndex: 0, optionIndex: 0 }, CONTENT)).toThrow(/field/);
  });
});

describe('SKIP_TO_EVENT — field → event', () => {
  it('남은 근무 시간을 버리고 event로', () => {
    const field = reduce(baseState(), { type: 'START_DAY' }, CONTENT).state;
    const { state } = reduce(field, { type: 'SKIP_TO_EVENT' }, CONTENT);
    expect(state.world.phase).toBe('event');
    expect(state.world.shiftLeft).toBe(0);
  });
  it('field가 아니면 throw', () => {
    expect(() => reduce(baseState(), { type: 'SKIP_TO_EVENT' }, CONTENT)).toThrow(/field/);
  });
});

describe('CHOOSE_STORYLET — event: 조건 매칭 → 선택 → closing', () => {
  function eventState(): GameState {
    return baseState({ phase: 'event' });
  }
  it('효과 적용 후 closing으로 (기억 0→1 시나리오)', () => {
    const { state, log } = reduce(eventState(), { type: 'CHOOSE_STORYLET', storyletId: 'EV-001', choiceIndex: 0 }, CONTENT);
    expect(state.self.memory).toBe(1);
    expect(state.world.phase).toBe('closing');
    expect(log.join(' ')).toContain('기억이 새겨졌다');
  });
  it('requirements 미충족 → throw', () => {
    expect(() => reduce(eventState(), { type: 'CHOOSE_STORYLET', storyletId: 'EV-LOCKED', choiceIndex: 0 }, CONTENT)).toThrow(/조건/);
  });
  it('없는 스토리렛 id → throw', () => {
    expect(() => reduce(eventState(), { type: 'CHOOSE_STORYLET', storyletId: 'EV-999', choiceIndex: 0 }, CONTENT)).toThrow(/EV-999/);
  });
  it('event가 아니면 throw', () => {
    expect(() => reduce(baseState(), { type: 'CHOOSE_STORYLET', storyletId: 'EV-001', choiceIndex: 0 }, CONTENT)).toThrow(/event/);
  });
});

describe('CLOSE_DAY — closing 정산', () => {
  function closingState(): GameState {
    return baseState({
      phase: 'closing',
      pendingOrders: [makeOrder('d2', true), makeOrder('d5', false), makeOrder('d7', false)],
    });
  }
  it('미처리 구역 +1(방치) 후 전 구역 +1(자연 틱)', () => {
    const { state } = reduce(closingState(), { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.zones.d2.decay).toBe(4); // 3 + 틱
    expect(state.world.zones.d5.decay).toBe(6); // 4 + 방치 + 틱
    expect(state.world.zones.d7.decay).toBe(7); // 5 + 방치 + 틱
  });
  it('노후도는 10에서 클램프', () => {
    const s = baseState({ phase: 'closing', zones: { d2: { decay: 10 }, d5: { decay: 9 }, d7: { decay: 0 } }, pendingOrders: [makeOrder('d5', false)] });
    const { state } = reduce(s, { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.zones.d2.decay).toBe(10);
    expect(state.world.zones.d5.decay).toBe(10);
  });
  it('day+1, morning 복귀, shiftLeft 리셋, pendingOrders 비움', () => {
    const { state } = reduce(closingState(), { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.day).toBe(2);
    expect(state.world.phase).toBe('morning');
    expect(state.world.shiftLeft).toBe(SHIFT_PER_DAY);
    expect(state.world.pendingOrders).toEqual([]);
  });
  it('하루 요약에 고도(8000 − 120×Σ노후도)가 표기된다', () => {
    const { log } = reduce(closingState(), { type: 'CLOSE_DAY' }, CONTENT);
    // 정산 후 4+6+7=17 → 8000 − 2040 = 5960
    expect(log.join(' ')).toContain('5960');
  });
  it('closing이 아니면 throw', () => {
    expect(() => reduce(baseState(), { type: 'CLOSE_DAY' }, CONTENT)).toThrow(/closing/);
  });
});

describe('헬퍼 — altitude·조건·완곡어 변형', () => {
  it('altitude = 8000 − 120×Σdecay', () => {
    expect(altitude({ d2: { decay: 3 }, d5: { decay: 4 }, d7: { decay: 5 } })).toBe(8000 - 120 * 12);
  });
  it('getValueAtPath: 상태 경로 읽기, 없는 flag는 0', () => {
    const s = baseState();
    expect(getValueAtPath(s, 'world.day')).toBe(1);
    expect(getValueAtPath(s, 'self.stats.repair')).toBe(40);
    expect(getValueAtPath(s, 'world.flags.nope')).toBe(0);
  });
  it('evalConditions: gte/lte 전부 만족해야 true', () => {
    const s = baseState();
    expect(evalConditions(s, [{ path: 'world.day', gte: 1, lte: 1 }])).toBe(true);
    expect(evalConditions(s, [{ path: 'world.day', gte: 2 }])).toBe(false);
    expect(evalConditions(s, [])).toBe(true);
  });
  it('selectVariant: 첫 매치 우선, 조건 없는 변형이 기본값', () => {
    const body = CONTENT.storylets[0].body;
    expect(selectVariant(baseState(), body)).toBe('기본 본문');
    const remembered = baseState();
    remembered.self.memory = 1;
    expect(selectVariant(remembered, body)).toBe('기억 변형 본문');
  });
});
