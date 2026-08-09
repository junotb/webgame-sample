/**
 * 카드 레이어 리듀서 흐름 (v3 §4·§5) —
 * 방치 장부(미시 피드백)와 다일 이벤트 점유의 수명 주기.
 */
import { describe, expect, it } from 'vitest';
import { MULTIDAY_SHIFT, reduce, SHIFT_PER_DAY } from './reducer';
import type { ContentBundle, GameState, WorkOrder, WorkOrderTemplate } from './schema';

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

const AUTO_T: WorkOrderTemplate = {
  id: 'AUTO',
  minDecay: 0,
  weight: 2,
  face: 'inspection',
  siteId: 'test-site',
  title: [{ text: '점검' }],
  body: [{ paragraphs: ['본문'] }],
  options: [
    { label: '처리', check: { kind: 'auto' }, timeCost: 1, onSuccess: { effects: [], text: '처리 완료' } },
  ],
};

const CONTENT: ContentBundle = {
  bundleId: 'cards-test',
  encounters: [],
  version: '0',
  zoneMaps: [],
  orderTemplates: [AUTO_T, { ...AUTO_T, id: 'AUTO2', weight: 1, face: 'supply', title: [{ text: '자재 수령' }] }],
  storylets: [
    {
      id: 'EV-MD',
      requirements: [],
      body: [{ paragraphs: ['동료의 부탁'] }],
      choices: [
        {
          label: '사흘을 내어준다',
          check: { kind: 'auto' },
          startsMultiday: { id: 'errand', days: 3 },
          onSuccess: { effects: [{ path: 'world.npcs.protagonist.trust', op: 'add', value: 1 }], text: '수락했다' },
        },
        { label: '거절한다', check: { kind: 'auto' }, onSuccess: { effects: [], text: '거절했다' } },
      ],
    },
  ],
};

function card(templateId: string, resolved: boolean, outcome?: WorkOrder['outcome']): WorkOrder {
  return {
    templateId,
    zone: 'd5',
    difficultyBonus: 0,
    weight: 2,
    face: 'inspection',
    siteId: 'test-site',
    reissueCount: 0,
    title: [{ text: '점검' }],
    body: [{ paragraphs: ['본문'] }],
    options: [],
    resolved,
    ...(outcome ? { outcome } : {}),
  };
}

describe('방치 장부 — 미시 피드백의 근거 (v3 §2)', () => {
  it('CLOSE_DAY: 방치 카드는 neglect +1, 처리 성공 카드는 리셋', () => {
    const s = baseState({
      phase: 'closing',
      cardNeglect: { AUTO: 3 },
      pendingOrders: [card('AUTO', true, 'success'), card('AUTO2', false)],
    });
    const { state } = reduce(s, { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.cardNeglect).toEqual({ AUTO2: 1 });
  });
  it('처리 실패는 방치가 아니다 — 장부 불변', () => {
    const s = baseState({ phase: 'closing', pendingOrders: [card('AUTO', true, 'failure')] });
    const { state } = reduce(s, { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.cardNeglect).toEqual({});
  });
  it('START_DAY: 방치된 카드가 우선 등장하되, 재발부는 표기되지 않는다 (v3 §0)', () => {
    const s = baseState({ cardNeglect: { AUTO2: 1 } });
    const { state, log } = reduce(s, { type: 'START_DAY' }, CONTENT);
    expect(state.world.pendingOrders[0].templateId).toBe('AUTO2');
    expect(state.world.pendingOrders[0].reissueCount).toBe(1);
    expect(state.world.pendingOrders[0].difficultyBonus).toBe(1 + 4); // 방치 1 + decay 초과분 4
    expect(log.join(' ')).not.toContain('재발부');
  });
  it('START_DAY 로그는 건수만 말하고 제목을 나열하지 않는다 (UI 층위 §5)', () => {
    const { state, log } = reduce(baseState(), { type: 'START_DAY' }, CONTENT);
    expect(log).toEqual([`지시서 ${state.world.pendingOrders.length}건 발부.`]);
    // 로그가 먼저 읽어 주면 카드를 열 이유가 준다 — v3 §4가 노린 지점이 무너진다
    for (const order of state.world.pendingOrders) {
      expect(log.join(' ')).not.toContain(order.title);
    }
  });
});

describe('다일 이벤트 — 3일 점유의 수명 주기 (v3 §5)', () => {
  function choose(state: GameState, choiceIndex: number) {
    return reduce(state, { type: 'CHOOSE_STORYLET', storyletId: 'EV-MD', choiceIndex }, CONTENT);
  }
  it('선택 즉시 점유 시작 + started 플래그', () => {
    const { state } = choose(baseState({ phase: 'event' }), 0);
    expect(state.world.multiday).toEqual({ id: 'errand', daysLeft: 3 });
    expect(state.world.flags['md_errand_started']).toBe(1);
  });
  it('점유 중 중복 선언은 throw', () => {
    const s = baseState({ phase: 'event', multiday: { id: 'other', daysLeft: 2 } });
    expect(() => choose(s, 0)).toThrow(/점유/);
  });
  it('점유 중 START_DAY: 하루 소모 + 근무 슬롯 축소', () => {
    const s = baseState({ multiday: { id: 'errand', daysLeft: 3 } });
    const { state } = reduce(s, { type: 'START_DAY' }, CONTENT);
    expect(state.world.multiday).toEqual({ id: 'errand', daysLeft: 2 });
    expect(state.world.shiftLeft).toBe(MULTIDAY_SHIFT);
  });
  it('마지막 점유일 저녁에 종료 — done 플래그, multiday 해제', () => {
    const s = baseState({ phase: 'closing', multiday: { id: 'errand', daysLeft: 0 }, pendingOrders: [] });
    const { state, log } = reduce(s, { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.multiday).toBeNull();
    expect(state.world.flags['md_errand_done']).toBe(1);
    expect(log.join(' ')).toContain('일정이 끝났다');
  });
  it('점유 잔여 중 CLOSE_DAY는 종료하지 않는다', () => {
    const s = baseState({ phase: 'closing', multiday: { id: 'errand', daysLeft: 2 }, pendingOrders: [] });
    const { state } = reduce(s, { type: 'CLOSE_DAY' }, CONTENT);
    expect(state.world.multiday).toEqual({ id: 'errand', daysLeft: 2 });
  });
  it('거절 선택은 점유를 만들지 않는다', () => {
    const { state } = choose(baseState({ phase: 'event' }), 1);
    expect(state.world.multiday).toBeNull();
  });
});

describe('RESOLVE_ENCOUNTER — 조우 결과 반입 (v3 §6)', () => {
  function encounterCard(): WorkOrder {
    return {
      ...card('AUTO', false),
      options: [
        {
          label: '구간을 확인한다',
          check: { kind: 'auto' },
          timeCost: 1,
          startsEncounter: 'ENC-001',
          onSuccess: { effects: [], text: '' },
        },
      ],
    };
  }
  function fieldState(): GameState {
    return baseState({ phase: 'field', pendingOrders: [encounterCard()] });
  }
  it('burned/soothed는 처리 성공으로 정산된다 — 효과 적용 + shiftLeft 차감', () => {
    const { state, log } = reduce(
      fieldState(),
      {
        type: 'RESOLVE_ENCOUNTER',
        orderIndex: 0,
        outcome: 'burned',
        effects: [{ path: 'world.menace.fatigue', op: 'add', value: 1 }],
        text: '동력이 회수되었다.',
      },
      CONTENT,
    );
    expect(state.world.pendingOrders[0].resolved).toBe(true);
    expect(state.world.pendingOrders[0].outcome).toBe('success');
    expect(state.world.menace.fatigue).toBe(1);
    expect(state.world.shiftLeft).toBe(SHIFT_PER_DAY - 1);
    expect(log.join(' ')).toContain('동력이 회수되었다');
  });
  it('withdrawn/expired는 처리 실패 — 시간만 소모', () => {
    const { state } = reduce(
      fieldState(),
      { type: 'RESOLVE_ENCOUNTER', orderIndex: 0, outcome: 'withdrawn', effects: [], text: '물러섰다.' },
      CONTENT,
    );
    expect(state.world.pendingOrders[0].outcome).toBe('failure');
  });
  it('조우 진입 옵션은 RESOLVE_ORDER로 처리할 수 없다', () => {
    expect(() =>
      reduce(fieldState(), { type: 'RESOLVE_ORDER', orderIndex: 0, optionIndex: 0 }, CONTENT),
    ).toThrow(/조우/);
  });
  it('조우 진입 옵션이 없는 지시서에 반입하면 throw', () => {
    const s = baseState({ phase: 'field', pendingOrders: [card('AUTO', false)] });
    expect(() =>
      reduce(s, { type: 'RESOLVE_ENCOUNTER', orderIndex: 0, outcome: 'burned', effects: [], text: '' }, CONTENT),
    ).toThrow(/조우 진입/);
  });
  it('반입 효과도 기억 비가역 런타임 가드를 지난다', () => {
    expect(() =>
      reduce(
        fieldState(),
        {
          type: 'RESOLVE_ENCOUNTER',
          orderIndex: 0,
          outcome: 'burned',
          effects: [{ path: 'self.memory', op: 'add', value: -1 }],
          text: '',
        },
        CONTENT,
      ),
    ).toThrow();
  });
});

describe('SKIP_EVENT — 빈 저녁 (v3 §4 정정 이후)', () => {
  it('조건 맞는 스토리렛이 없으면 event → closing', () => {
    // CONTENT의 EV-MD는 requirements가 비어 항상 열린다 — 닫힌 버전으로 검사
    const noEvening: ContentBundle = {
      ...CONTENT,
      storylets: [{ ...CONTENT.storylets[0], requirements: [{ path: 'world.calendar.day', gte: 99 }] }],
    };
    const { state, log } = reduce(baseState({ phase: 'event' }), { type: 'SKIP_EVENT' }, noEvening);
    expect(state.world.phase).toBe('closing');
    expect(log.join(' ')).toContain('아무도 없었다');
  });

  it('열린 스토리렛이 있으면 거부한다 — 관계 이벤트를 건너뛰는 문이 아니다', () => {
    expect(() => reduce(baseState({ phase: 'event' }), { type: 'SKIP_EVENT' }, CONTENT)).toThrow(/건너뛸 수 없음/);
  });
});
