import { WEEKLY_CONTENT } from './test-content';
import { describe, it, expect } from 'vitest';
import { reduce, altitude, getValueAtPath, evalConditions, selectProse, SHIFT_PER_DAY } from './reducer';
import type { ContentBundle, GameState, WorkOrder, WorkOrderTemplate } from './schema';

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
      seed: 42,
      ...overrides,
    },
  };
}

// 정체 증감은 콘텐츠 효과가 아니라 CLOSE_DAY 가중치 정산의 몫 (v3 §3).
const RESULT_PROSE = {
  complete: [{ paragraphs: ['완수 산문'] }],
  partial: [{ paragraphs: ['부분 산문'] }],
  fail: [{ paragraphs: ['실패 산문'] }],
};

const AUTO_T: WorkOrderTemplate = {
  id: 'AUTO',
  minStagnation: 0,
  weight: 2,
  kind: 'circuit',
  siteId: 'test-site',
  title: [{ text: '점검' }],
  body: [{ paragraphs: ['본문'] }],
  resultProse: RESULT_PROSE,
};

const CONTENT: ContentBundle = {
  bundleId: 'test',
  ...WEEKLY_CONTENT,
  encounters: [],
  version: '0',
  zoneMaps: [],
  orderTemplates: [AUTO_T, { ...AUTO_T, id: 'AUTO2', weight: 1, kind: 'material', title: [{ text: '자재 수령' }] }],
  storylets: [
    {
      id: 'EV-001',
      requirements: [{ path: 'world.calendar.day', gte: 1 }],
      body: [
        { if: [{ path: 'self.memory', gte: 1 }], paragraphs: ['기억 변형 본문'] },
        { paragraphs: ['기본 본문'] },
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
      body: [{ paragraphs: ['x'] }],
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
    kind: 'circuit',
    siteId: 'test-site',
    reissueCount: 0,
    title: [{ text: '점검' }],
    body: [{ paragraphs: ['본문'] }],
    resultProse: RESULT_PROSE,
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

describe('카드 처리 흐름 — 미니게임 연쇄와 트리아지', () => {
  function fieldState(): GameState {
    return reduce(baseState(), { type: 'START_DAY' }, CONTENT).state;
  }
  it('처리 두 장이면 shiftLeft 0 → event 전이 (2/3 트리아지)', () => {
    const s1 = reduce(fieldState(), { type: 'RESOLVE_MINIGAME', orderIndex: 0, result: 'partial' }, CONTENT).state;
    expect(s1.world.phase).toBe('field');
    const s2 = reduce(s1, { type: 'RESOLVE_MINIGAME', orderIndex: 1, result: 'complete' }, CONTENT).state;
    expect(s2.world.shiftLeft).toBe(0);
    expect(s2.world.phase).toBe('event');
    expect(s2.world.zones.d5.stagnation).toBe(4); // 증감은 CLOSE_DAY 가중치 정산의 몫
  });
  it('없는 지시서 인덱스 → throw', () => {
    expect(() => reduce(fieldState(), { type: 'RESOLVE_MINIGAME', orderIndex: 9, result: 'fail' }, CONTENT)).toThrow();
  });
});

describe('RESOLVE_MINIGAME — field: 성적 반입 (세션 ② 셸)', () => {
  function fieldState(orders = [makeOrder('d5', false, 2)]): GameState {
    return baseState({ phase: 'field', pendingOrders: orders });
  }
  it('결과가 3등급으로 귀속된다: 완수→perfect / 부분→passed / 실패→notPassed', () => {
    const cases = [
      ['complete', 'perfect'],
      ['partial', 'passed'],
      ['fail', 'notPassed'],
    ] as const;
    for (const [result, grade] of cases) {
      const { state } = reduce(fieldState(), { type: 'RESOLVE_MINIGAME', orderIndex: 0, result }, CONTENT);
      expect(state.world.pendingOrders[0].resolved).toBe(true);
      expect(state.world.pendingOrders[0].outcome).toBe(grade);
    }
  });
  it('근무 슬롯 1 소모, 0이 되면 event로 전이. 판정이 아니므로 seed는 불변', () => {
    const s0 = fieldState();
    s0.world.shiftLeft = 1;
    const { state } = reduce(s0, { type: 'RESOLVE_MINIGAME', orderIndex: 0, result: 'partial' }, CONTENT);
    expect(state.world.shiftLeft).toBe(0);
    expect(state.world.phase).toBe('event');
    expect(state.world.seed).toBe(42);
  });
  it('결과 반영 산문 — 성적 변형이 미니게임 뒤에 온다', () => {
    const order = {
      ...makeOrder('d5', false, 2),
      resultProse: {
        complete: [{ paragraphs: ['회로가 전부 이어졌다.'] }],
        partial: [{ paragraphs: ['절반만 이었다.', '나머지는 어둠 속이다.'] }],
        fail: [{ paragraphs: ['회로가 열리지 않았다.'] }],
      },
    };
    const { log } = reduce(fieldState([order]), { type: 'RESOLVE_MINIGAME', orderIndex: 0, result: 'partial' }, CONTENT);
    expect(log).toEqual(['절반만 이었다.', '나머지는 어둠 속이다.']);
  });
  it('perfect는 정산에서 성공(−w)이며 주간 장부 perfect에 계상된다', () => {
    const s = baseState({ phase: 'closing', pendingOrders: [makeOrder('d5', true, 2, 'perfect')] });
    const { state } = reduce(s, { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.zones.d5.stagnation).toBe(3); // 4 − 2 + 1(틱)
    expect(state.world.weekTally).toEqual({ processed: 1, notPassed: 0, perfect: 1 });
  });
  it('이미 처리한 지시서·근무 시간 부족·field 밖 → throw', () => {
    expect(() => reduce(fieldState([makeOrder('d5', true, 2, 'passed')]), { type: 'RESOLVE_MINIGAME', orderIndex: 0, result: 'fail' }, CONTENT)).toThrow(/이미 처리/);
    const tired = fieldState();
    tired.world.shiftLeft = 0;
    expect(() => reduce(tired, { type: 'RESOLVE_MINIGAME', orderIndex: 0, result: 'fail' }, CONTENT)).toThrow(/근무 시간/);
    expect(() => reduce(baseState(), { type: 'RESOLVE_MINIGAME', orderIndex: 0, result: 'fail' }, CONTENT)).toThrow(/field/);
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
        makeOrder('d2', true, 2, 'passed'),
        makeOrder('d5', false, 2),
        makeOrder('d7', false, 2),
      ],
    });
  }
  it('처리 성공 −w, 방치 +w, 전 구역 자연 틱 +1', () => {
    const { state } = reduce(closingState(), { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.zones.d2.stagnation).toBe(2); // 3 − 2(처리) + 1(틱)
    expect(state.world.zones.d5.stagnation).toBe(7); // 4 + 2(방치) + 1(틱)
    expect(state.world.zones.d7.stagnation).toBe(8); // 5 + 2(방치) + 1(틱)
  });
  it('처리했지만 실패한 지시서는 −도 +도 아니다 (시간만 잃는다)', () => {
    const s = baseState({ phase: 'closing', pendingOrders: [makeOrder('d2', true, 3, 'notPassed')] });
    const { state } = reduce(s, { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.zones.d2.stagnation).toBe(4); // 3 + 1(틱)
  });
  it('정체는 0~10에서 클램프', () => {
    const s = baseState({
      phase: 'closing',
      zones: { d2: { stagnation: 10 }, d5: { stagnation: 9 }, d7: { stagnation: 1 } },
      pendingOrders: [makeOrder('d5', false, 3), makeOrder('d7', true, 3, 'passed')],
    });
    const { state } = reduce(s, { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.zones.d2.stagnation).toBe(10);
    expect(state.world.zones.d5.stagnation).toBe(10);
    expect(state.world.zones.d7.stagnation).toBe(0); // 1 − 3 + 1 → clamp 0
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

describe('CLOSE_DAY — 금요일 주간 평가 (경계 합산식, 2026-08-11 확정)', () => {
  function fridayState(tally: GameState['world']['weekTally'], orders: GameState['world']['pendingOrders'] = []): GameState {
    return baseState({
      calendar: { day: 5, weekday: 5 },
      phase: 'closing',
      weekTally: tally,
      pendingOrders: orders,
    });
  }
  it('성공 위주의 주는 Passed — 넓은 기본값', () => {
    const { state, log } = reduce(
      fridayState({ processed: 2, notPassed: 0, perfect: 0 }, [makeOrder('d5', true, 2, 'passed')]),
      { type: 'CLOSE_DAY' },
      CONTENT,
    );
    expect(state.world.weekRatings[1]).toBe('passed');
    expect(log.join(' ')).toContain('Passed');
  });
  it('전 장 Perfect여야만 주 Perfect', () => {
    const { state } = reduce(fridayState({ processed: 3, notPassed: 0, perfect: 3 }), { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.weekRatings[1]).toBe('perfect');
  });
  it('Perfect가 하나라도 모자라면 Passed', () => {
    const { state } = reduce(fridayState({ processed: 3, notPassed: 0, perfect: 2 }), { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.weekRatings[1]).toBe('passed');
  });
  // 주말 롤오버(day+3·장부 리셋)는 FINAL_WEEK 이전 주 전용 — FINAL_WEEK=1인
  // 현재 슬라이스에서는 도달할 수 없는 경로라 테스트를 두지 않는다 (사이클 확장 시 복원)
  it('금요일이 아니면 평가가 기록되지 않는다', () => {
    const { state } = reduce(
      baseState({ phase: 'closing', pendingOrders: [] }),
      { type: 'CLOSE_DAY' },
      CONTENT,
    );
    expect(state.world.weekRatings).toEqual({});
  });
});

describe('저녁 우회 — 조건 맞는 장면이 없으면 event를 세우지 않는다 (2026-08-11)', () => {
  const noEvening = { ...CONTENT, storylets: [] };
  it('마지막 카드 처리 후 곧장 정산으로 간다', () => {
    const s = baseState({ phase: 'field', shiftLeft: 1, pendingOrders: [makeOrder('d5', false, 1)] });
    const { state } = reduce(s, { type: 'RESOLVE_MINIGAME', orderIndex: 0, result: 'complete' }, noEvening);
    expect(state.world.phase).toBe('closing');
  });
  it('현장 업무 종료(SKIP_TO_EVENT)도 곧장 정산으로 간다', () => {
    const { state } = reduce(baseState({ phase: 'field' }), { type: 'SKIP_TO_EVENT' }, noEvening);
    expect(state.world.phase).toBe('closing');
  });
  it('조건 맞는 장면이 있으면 여전히 event를 연다 — 관계 이벤트의 그릇은 남는다', () => {
    const { state } = reduce(baseState({ phase: 'field' }), { type: 'SKIP_TO_EVENT' }, CONTENT);
    expect(state.world.phase).toBe('event');
  });
});

describe('주간 마감 흐름 — 총평(debrief) → 주말 택2 → 엔딩 (확정 2026-08-11)', () => {
  function finalFriday(tally: GameState['world']['weekTally'], orders: GameState['world']['pendingOrders'] = []): GameState {
    return baseState({
      calendar: { day: 5, weekday: 5 },
      phase: 'closing',
      weekTally: tally,
      pendingOrders: orders,
    });
  }
  /** 금요일 정산이 끝난 상태에서 총평 확인 → 주말 4슬롯 소화 (학습2 + 인물2) */
  function throughWeekend(afterFriday: GameState) {
    let result = reduce(afterFriday, { type: 'CONFIRM_DEBRIEF' }, CONTENT);
    for (const activityId of ['WKD-frost', 'WKD-neighbor', 'WKD-frost', 'WKD-chief']) {
      result = reduce(result.state, { type: 'CHOOSE_WEEKEND', activityId }, CONTENT);
    }
    return result;
  }
  it('금요일 정산은 즉시 끝내지 않는다 — 등급·통지서를 확정하고 debrief로 간다', () => {
    const { state, log } = reduce(finalFriday({ processed: 3, notPassed: 1, perfect: 0 }), { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.phase).toBe('debrief');
    expect(state.world.ending).toBeNull(); // 엔딩 확정은 주말 뒤
    expect(state.world.weekRatings[1]).toBe('passed');
    expect(state.world.archive).toContainEqual({ kind: 'notice', day: 5, week: 1 });
    expect(log.join(' ')).toContain('통지서');
  });
  it('CONFIRM_DEBRIEF → 토요일(주말) — 슬롯 2, 이후 흐름의 요일은 6·7', () => {
    const friday = reduce(finalFriday({ processed: 3, notPassed: 0, perfect: 0 }), { type: 'CLOSE_DAY' }, CONTENT).state;
    const { state } = reduce(friday, { type: 'CONFIRM_DEBRIEF' }, CONTENT);
    expect(state.world.phase).toBe('weekend');
    expect(state.world.calendar).toEqual({ day: 6, weekday: 6 });
    expect(state.world.weekend).toEqual({ slotsLeft: 2, doneToday: [], done: [] });
  });
  it('Not Passed가 처리의 절반 미만 → 주말 뒤 유임, ended 종착 (weekTally는 금요일 값 유지)', () => {
    const friday = reduce(finalFriday({ processed: 3, notPassed: 1, perfect: 0 }), { type: 'CLOSE_DAY' }, CONTENT).state;
    const { state, log } = throughWeekend(friday);
    expect(state.world.ending).toBe('retained');
    expect(state.world.phase).toBe('ended');
    expect(state.world.weekTally).toEqual({ processed: 3, notPassed: 1, perfect: 0 });
    expect(log.join(' ')).toContain('배치 유지');
  });
  it('Not Passed가 처리의 절반 이상 → 총평 장면 없이 금요일 정산에서 곧장 해고 엔딩', () => {
    const { state, log } = reduce(finalFriday({ processed: 2, notPassed: 1, perfect: 0 }), { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.ending).toBe('fired');
    expect(state.world.phase).toBe('ended');
    expect(state.world.weekend).toBeNull(); // 총평·주말 진입 없음
    expect(state.world.archive).toContainEqual({ kind: 'notice', day: 5, week: 1 }); // 통지서는 발행된다
    expect(log.join(' ')).toContain('배치 해제');
  });
  it('한 장도 처리하지 않은 주는 해고다 (0 ≥ 0×½ — 방치만 한 주가 유임이 되지 않는다)', () => {
    const { state } = reduce(finalFriday({ processed: 0, notPassed: 0, perfect: 0 }), { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.ending).toBe('fired');
  });
  it('금요일 당일 처리분도 합산에 들어간다 — 주중 누적 + 당일 실패로 경계에 닿으면 해고', () => {
    const { state } = reduce(
      finalFriday({ processed: 1, notPassed: 0, perfect: 0 }, [makeOrder('d5', true, 2, 'notPassed')]),
      { type: 'CLOSE_DAY' },
      CONTENT,
    );
    expect(state.world.weekTally).toEqual({ processed: 2, notPassed: 1, perfect: 0 });
    expect(state.world.ending).toBe('fired');
  });
  it('ended는 종착 상태 — START_DAY를 받지 않는다', () => {
    const friday = reduce(finalFriday({ processed: 3, notPassed: 0, perfect: 0 }), { type: 'CLOSE_DAY' }, CONTENT).state;
    const { state } = throughWeekend(friday);
    expect(() => reduce(state, { type: 'START_DAY' }, CONTENT)).toThrow(/morning/);
  });
  it('토요일 슬롯 2 소진 → 일요일 — 하루 제한(doneToday)만 풀리고 주말 누적(done)은 남는다', () => {
    const friday = reduce(finalFriday({ processed: 3, notPassed: 0, perfect: 0 }), { type: 'CLOSE_DAY' }, CONTENT).state;
    let s = reduce(friday, { type: 'CONFIRM_DEBRIEF' }, CONTENT).state;
    s = reduce(s, { type: 'CHOOSE_WEEKEND', activityId: 'WKD-frost' }, CONTENT).state;
    s = reduce(s, { type: 'CHOOSE_WEEKEND', activityId: 'WKD-neighbor' }, CONTENT).state;
    expect(s.world.calendar).toEqual({ day: 7, weekday: 7 });
    expect(s.world.weekend).toEqual({ slotsLeft: 2, doneToday: [], done: ['WKD-frost', 'WKD-neighbor'] });
  });
  it('같은 활동을 같은 날 두 번 고를 수 없다', () => {
    const friday = reduce(finalFriday({ processed: 3, notPassed: 0, perfect: 0 }), { type: 'CLOSE_DAY' }, CONTENT).state;
    let s = reduce(friday, { type: 'CONFIRM_DEBRIEF' }, CONTENT).state;
    s = reduce(s, { type: 'CHOOSE_WEEKEND', activityId: 'WKD-frost' }, CONTENT).state;
    expect(() => reduce(s, { type: 'CHOOSE_WEEKEND', activityId: 'WKD-frost' }, CONTENT)).toThrow(/이미/);
  });
  it('인물 장면은 주말 전체 1회 — 다음 날에도 다시 겪을 수 없다', () => {
    const friday = reduce(finalFriday({ processed: 3, notPassed: 0, perfect: 0 }), { type: 'CLOSE_DAY' }, CONTENT).state;
    let s = reduce(friday, { type: 'CONFIRM_DEBRIEF' }, CONTENT).state;
    s = reduce(s, { type: 'CHOOSE_WEEKEND', activityId: 'WKD-neighbor' }, CONTENT).state;
    s = reduce(s, { type: 'CHOOSE_WEEKEND', activityId: 'WKD-chief' }, CONTENT).state;
    // 일요일 — 옆집은 이미 다녀왔다. 학습은 반복형이라 된다
    expect(() => reduce(s, { type: 'CHOOSE_WEEKEND', activityId: 'WKD-neighbor' }, CONTENT)).toThrow(/이미/);
    expect(() => reduce(s, { type: 'CHOOSE_WEEKEND', activityId: 'WKD-frost' }, CONTENT)).not.toThrow();
  });
  it('빙결 학습 2회 = 경험치 8 → 빙결술 2등급 (0등급 미습득에서 승격, frost는 정식 스킬)', () => {
    const friday = reduce(finalFriday({ processed: 3, notPassed: 0, perfect: 0 }), { type: 'CLOSE_DAY' }, CONTENT).state;
    expect(friday.self.skills.frost).toBe(0);
    const first = reduce(reduce(friday, { type: 'CONFIRM_DEBRIEF' }, CONTENT).state, { type: 'CHOOSE_WEEKEND', activityId: 'WKD-frost' }, CONTENT);
    expect(first.state.self.skills.frost).toBe(1); // 첫 학습에 습득
    expect(first.log.join(' ')).toContain('빙결술');
    const { state } = throughWeekend(friday); // 학습 2회 포함
    expect(state.self.skillXp.frost).toBe(8);
    expect(state.self.skills.frost).toBe(2);
  });
  it('주말 밖에서는 CHOOSE_WEEKEND를 받지 않는다', () => {
    expect(() => reduce(baseState(), { type: 'CHOOSE_WEEKEND', activityId: 'WKD-frost' }, CONTENT)).toThrow(/weekend/);
  });
  it('평일의 처리·실패가 장부에 누적된다 (방치는 처리 장수에 들어가지 않는다)', () => {
    const s = baseState({
      phase: 'closing',
      pendingOrders: [
        makeOrder('d2', true, 2, 'passed'),
        makeOrder('d5', true, 2, 'notPassed'),
        makeOrder('d7', false, 2),
      ],
    });
    const { state } = reduce(s, { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.weekTally).toEqual({ processed: 2, notPassed: 1, perfect: 0 });
    expect(state.world.ending).toBeNull();
  });
});

describe('헬퍼 — altitude·조건·완곡어 변형', () => {
  it('altitude = 8000 − 120×Σstagnation', () => {
    expect(altitude({ d2: { stagnation: 3 }, d5: { stagnation: 4 }, d7: { stagnation: 5 } })).toBe(8000 - 120 * 12);
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
  it('selectProse: 첫 매치 우선, 조건 없는 변형이 기본값', () => {
    const body = CONTENT.storylets[0].body;
    expect(selectProse(baseState(), body)).toEqual(['기본 본문']);
    const remembered = baseState();
    remembered.self.memory = 1;
    expect(selectProse(remembered, body)).toEqual(['기억 변형 본문']);
  });
});
