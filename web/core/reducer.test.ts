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
      calendar: { day: 1, weekday: 1 },
      assignment: { zone: 'd5' },
      weekRatings: {},
      cardNeglect: {},
      multiday: null,
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

// auto 판정 템플릿 — 판정 난수 없이 전이만 검증하기 위함.
// 노후도 증감은 콘텐츠 효과가 아니라 CLOSE_DAY 가중치 정산의 몫 (v3 §3).
const AUTO_T: WorkOrderTemplate = {
  id: 'AUTO',
  minDecay: 0,
  weight: 2,
  face: 'inspection',
  title: '점검',
  body: [{ text: '본문' }],
  options: [
    {
      label: '처리',
      check: { kind: 'auto' },
      timeCost: 1,
      onSuccess: {
        effects: [],
        text: '처리 완료',
      },
    },
  ],
};

const CONTENT: ContentBundle = {
  bundleId: 'test',
  encounters: [],
  version: '0',
  orderTemplates: [AUTO_T, { ...AUTO_T, id: 'AUTO2', weight: 1, face: 'supply', title: '자재 수령' }],
  storylets: [
    {
      id: 'EV-001',
      requirements: [{ path: 'world.calendar.day', gte: 1 }],
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
      requirements: [{ path: 'world.calendar.day', gte: 99 }],
      body: [{ text: 'x' }],
      choices: [{ label: 'x', check: { kind: 'auto' }, onSuccess: { effects: [], text: 'x' } }],
    },
  ],
};

function makeOrder(
  zone: WorkOrder['zone'],
  resolved: boolean,
  weight = 2,
  outcome?: WorkOrder['outcome'],
): WorkOrder {
  return {
    templateId: 'AUTO',
    zone,
    difficultyBonus: 0,
    weight,
    face: 'inspection',
    reissueCount: 0,
    title: '점검',
    body: [{ text: '본문' }],
    options: [],
    resolved,
    ...(outcome ? { outcome } : {}),
  };
}

describe('START_DAY — morning: 카드 발부 → field', () => {
  it('배치 구역에서만 카드가 발부된다, phase는 field로', () => {
    const { state } = reduce(baseState(), { type: 'START_DAY' }, CONTENT);
    expect(state.world.pendingOrders).toHaveLength(2); // 템플릿 2종 전부 적격
    expect(state.world.pendingOrders.every((o) => o.zone === 'd5')).toBe(true);
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
  it('resolved 마킹 + outcome 기록, shiftLeft 차감 (노후도는 정산 전까지 불변)', () => {
    const { state, log } = reduce(fieldState(), { type: 'RESOLVE_ORDER', orderIndex: 0, optionIndex: 0 }, CONTENT);
    expect(state.world.zones.d5.decay).toBe(4); // 증감은 CLOSE_DAY 가중치 정산의 몫
    expect(state.world.pendingOrders[0].resolved).toBe(true);
    expect(state.world.pendingOrders[0].outcome).toBe('success');
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

describe('CLOSE_DAY — 가중치 정산 (v3 §3: 처리 −w / 방치 +w / 틱 +1)', () => {
  function closingState(): GameState {
    return baseState({
      phase: 'closing',
      pendingOrders: [
        makeOrder('d2', true, 2, 'success'),
        makeOrder('d5', false, 2),
        makeOrder('d7', false, 2),
      ],
    });
  }
  it('처리 성공 −w, 방치 +w, 전 구역 자연 틱 +1', () => {
    const { state } = reduce(closingState(), { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.zones.d2.decay).toBe(2); // 3 − 2(처리) + 1(틱)
    expect(state.world.zones.d5.decay).toBe(7); // 4 + 2(방치) + 1(틱)
    expect(state.world.zones.d7.decay).toBe(8); // 5 + 2(방치) + 1(틱)
  });
  it('처리했지만 실패한 지시서는 −도 +도 아니다 (시간만 잃는다)', () => {
    const s = baseState({ phase: 'closing', pendingOrders: [makeOrder('d2', true, 3, 'failure')] });
    const { state } = reduce(s, { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.zones.d2.decay).toBe(4); // 3 + 1(틱)
  });
  it('노후도는 0~10에서 클램프', () => {
    const s = baseState({
      phase: 'closing',
      zones: { d2: { decay: 10 }, d5: { decay: 9 }, d7: { decay: 1 } },
      pendingOrders: [makeOrder('d5', false, 3), makeOrder('d7', true, 3, 'success')],
    });
    const { state } = reduce(s, { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.zones.d2.decay).toBe(10);
    expect(state.world.zones.d5.decay).toBe(10);
    expect(state.world.zones.d7.decay).toBe(0); // 1 − 3 + 1 → clamp 0
  });
  it('day+1·weekday+1, morning 복귀, shiftLeft 리셋, pendingOrders 비움', () => {
    const { state } = reduce(closingState(), { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.calendar).toEqual({ day: 2, weekday: 2 });
    expect(state.world.phase).toBe('morning');
    expect(state.world.shiftLeft).toBe(SHIFT_PER_DAY);
    expect(state.world.pendingOrders).toEqual([]);
  });
  it('하루 요약에 고도를 표기하지 않는다 (고도는 실패 상태가 아니다 — 2026-08-06 확정)', () => {
    const { log } = reduce(closingState(), { type: 'CLOSE_DAY' }, CONTENT);
    expect(log.join(' ')).toContain('Day 1 종료');
    expect(log.join(' ')).not.toContain('고도');
  });
  it('closing이 아니면 throw', () => {
    expect(() => reduce(baseState(), { type: 'CLOSE_DAY' }, CONTENT)).toThrow(/closing/);
  });
});

describe('CLOSE_DAY — 금요일 주간 평가 (v3 §2·§3: 금요일 밴드 = 등급)', () => {
  function fridayState(d5Decay: number): GameState {
    return baseState({
      calendar: { day: 5, weekday: 5 },
      phase: 'closing',
      zones: { d2: { decay: 3 }, d5: { decay: d5Decay }, d7: { decay: 5 } },
      pendingOrders: [makeOrder('d5', false, 2)],
    });
  }
  it('배치 구역의 정산 후 밴드가 주간 평가로 기록된다', () => {
    // d5: 4 + 2(방치) + 1(틱) = 7 → 3밴드 → 염려
    const { state, log } = reduce(fridayState(4), { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.weekRatings[1]).toBe('concern');
    expect(log.join(' ')).toContain('염려');
  });
  it('최선의 주만 완벽에 닿는다 — 정산 후 1밴드면 perfect', () => {
    const s = baseState({
      calendar: { day: 5, weekday: 5 },
      phase: 'closing',
      zones: { d2: { decay: 3 }, d5: { decay: 3 }, d7: { decay: 5 } },
      pendingOrders: [makeOrder('d5', true, 3, 'success')],
    });
    // d5: 3 − 3 + 1 = 1 → 1밴드 → 완벽
    const { state } = reduce(s, { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.weekRatings[1]).toBe('perfect');
  });
  it('주말을 건너 월요일로: day 5 → 8, weekday 5 → 1', () => {
    const { state } = reduce(fridayState(4), { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.calendar).toEqual({ day: 8, weekday: 1 });
  });
  it('금요일이 아니면 평가가 기록되지 않는다', () => {
    const { state } = reduce(
      baseState({ phase: 'closing', pendingOrders: [] }),
      { type: 'CLOSE_DAY' },
      CONTENT,
    );
    expect(state.world.weekRatings).toEqual({});
  });
});

describe('헬퍼 — altitude·조건·완곡어 변형', () => {
  it('altitude = 8000 − 120×Σdecay', () => {
    expect(altitude({ d2: { decay: 3 }, d5: { decay: 4 }, d7: { decay: 5 } })).toBe(8000 - 120 * 12);
  });
  it('getValueAtPath: 상태 경로 읽기, 없는 flag는 0', () => {
    const s = baseState();
    expect(getValueAtPath(s, 'world.calendar.day')).toBe(1);
    expect(getValueAtPath(s, 'self.stats.repair')).toBe(40);
    expect(getValueAtPath(s, 'world.flags.nope')).toBe(0);
  });
  it('evalConditions: gte/lte 전부 만족해야 true', () => {
    const s = baseState();
    expect(evalConditions(s, [{ path: 'world.calendar.day', gte: 1, lte: 1 }])).toBe(true);
    expect(evalConditions(s, [{ path: 'world.calendar.day', gte: 2 }])).toBe(false);
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
