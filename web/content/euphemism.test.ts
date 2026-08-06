/**
 * 완곡어 증명 시나리오의 성립 보장 (v3 §4 검증 목표 3).
 *
 * v3 §4 정정 이후: 도시의 비밀은 저녁 장면이 아니라 **일과 중의 카드**에서 알게 된다.
 * 1) WO-T6(미대조 항목)의 '대조한다'는 판정 결과와 무관하게 기억 0→1을 부여한다.
 * 2) WO-T3는 배치 구역 노후도 5 이상에서 결정적으로 등장한다 —
 *    시작 4에서 방치·틱으로 오르면 반드시 온다 (변형 확인 지점).
 * 3) 단서 축이 실제로 성립한다: 기억·기술이 오르면 제목이 달라진다.
 */
import { describe, expect, it } from 'vitest';
import { selectVariant } from '../core/conditions';
import { generateCards } from '../core/generate';
import type { Effect, GameState, TemplateEffect } from '../core/schema';
import { loadContent } from './loader';

const [bundle] = loadContent();

function grantsMemory(effects: (Effect | TemplateEffect)[] | undefined): boolean {
  return (effects ?? []).some((e) => e.path === 'self.memory' && e.op === 'add' && e.value >= 1);
}

function stateAt(
  decay: number,
  extra?: { day?: number; memory?: number; flowsense?: number; flags?: Record<string, number> },
): GameState {
  return {
    account: { ownedEpisodes: ['ep1'] },
    self: {
      stats: { repair: 40, insight: 35, procedure: 30, nerve: 25 },
      skills: { inscription: 1, flowsense: extra?.flowsense ?? 1 },
      memory: extra?.memory ?? 0,
      rank: 0,
    },
    world: {
      calendar: { day: extra?.day ?? 1, weekday: 1 },
      assignment: { zone: 'd5' },
      weekRatings: {},
      cardNeglect: {},
      multiday: null,
      archive: [],
      phase: 'morning',
      zones: { d2: { decay: 3 }, d5: { decay }, d7: { decay: 5 } },
      menace: { fatigue: 0, scrutiny: 0, unrest: 0 },
      npcs: { protagonist: { trust: 0 } },
      flags: extra?.flags ?? {},
      shiftLeft: 2,
      pendingOrders: [],
      seed: 42,
    },
  };
}

describe('WO-T6 — 대조한다 선택의 기억 부여 (기억 0→1 관문)', () => {
  const t6 = bundle.orderTemplates.find((t) => t.id === 'WO-T6')!;
  const check = t6.options.find((o) => o.label.includes('대조한다'))!;

  it('성공 시 기억 +1', () => {
    expect(grantsMemory(check.onSuccess.effects)).toBe(true);
  });

  it('실패 시에도 기억 +1 (시연이 판정 운에 좌우되지 않는다)', () => {
    expect(grantsMemory(check.onFailure?.effects)).toBe(true);
  });

  it('day 2부터 서사 카드로 등장하고, 처리 후에는 다시 오지 않는다', () => {
    expect(generateCards(stateAt(5), bundle.orderTemplates, () => 0)
      .some((c) => c.templateId === 'WO-T6')).toBe(false);
    expect(generateCards(stateAt(5, { day: 2 }), bundle.orderTemplates, () => 0)
      .some((c) => c.templateId === 'WO-T6')).toBe(true);
    expect(generateCards(stateAt(5, { day: 3, flags: { ledger_checked: 1 } }), bundle.orderTemplates, () => 0)
      .some((c) => c.templateId === 'WO-T6')).toBe(false);
  });
});

describe('WO-T3 — 결정적 등장 (도시 상태가 곧 무작위성)', () => {
  it('시작 노후도 4에서는 아직 오지 않는다 (임계 아래의 평온)', () => {
    for (const r of [0, 0.5, 0.999]) {
      const cards = generateCards(stateAt(4), bundle.orderTemplates, () => r);
      expect(cards.some((c) => c.templateId === 'WO-T3')).toBe(false);
    }
  });

  it('노후도 5부터 rng와 무관하게 반드시 온다 (변형 확인 지점)', () => {
    for (const decay of [5, 7, 10]) {
      for (const r of [0, 0.5, 0.999]) {
        const cards = generateCards(stateAt(decay), bundle.orderTemplates, () => r);
        expect(cards.some((c) => c.templateId === 'WO-T3')).toBe(true);
      }
    }
  });

  it('노후도 6(임계)부터 미확인 구간 카드(조우 입구)가 맨 앞에 온다', () => {
    const cards = generateCards(stateAt(6), bundle.orderTemplates, () => 0);
    expect(cards[0].templateId).toBe('WO-T5');
    expect(cards[0].options[0].startsEncounter).toBe('ENC-001');
  });
});

describe('단서 축 — 제목이 지금의 나로 다시 읽힌다 (v3 §4 「단서」)', () => {
  function titleOf(id: string, state: GameState): string {
    const t = bundle.orderTemplates.find((t) => t.id === id)!;
    return selectVariant(state, t.title);
  }

  it('WO-T7 (기억 축): 기억 2부터 반려 이력이 제목에 나타난다', () => {
    expect(titleOf('WO-T7', stateAt(5))).toBe('야간 소음 민원 순시 — 서편 3구');
    expect(titleOf('WO-T7', stateAt(5, { memory: 2 }))).toContain('가동 중단 요청 3회 반려');
  });

  it('WO-T8 (기술 축): 감류학 2부터 역류 흔적이 제목에 나타난다', () => {
    expect(titleOf('WO-T8', stateAt(5))).toBe('배기 갱도 정기 점검 — 7구 하부');
    expect(titleOf('WO-T8', stateAt(5, { flowsense: 2 }))).toContain('역류 흔적 재확인');
  });

  it('WO-T2 정석 성공이 감류학 2를 연다 — 기술 단서로 가는 다리 (set이라 멱등)', () => {
    const t2 = bundle.orderTemplates.find((t) => t.id === 'WO-T2')!;
    const fx = t2.options[0].onSuccess.effects.find((e) => e.path === 'self.skills.flowsense');
    expect(fx).toEqual({ path: 'self.skills.flowsense', op: 'set', value: 2 });
  });

  it('단서 카드도 표면 분류는 5종 그대로다 — 단서는 문구이지 표식이 아니다', () => {
    for (const id of ['WO-T6', 'WO-T7', 'WO-T8']) {
      const t = bundle.orderTemplates.find((t) => t.id === id)!;
      expect(['inspection', 'patrol', 'liaison', 'supply', 'survey']).toContain(t.face);
    }
  });
});
