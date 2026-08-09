import { describe, it, expect } from 'vitest';
import { applyDifficultyBonus, CARDS_PER_DAY, generateCards, instantiateCard } from './generate';
import type { GameState, WorkOrderTemplate } from './schema';

const T1: WorkOrderTemplate = {
  id: 'T1',
  minDecay: 0,
  weight: 1,
  face: 'inspection',
  siteId: 'test-site',
  title: [{ text: '정기 점검' }],
  body: [
    { if: [{ path: 'world.zones.{zone}.decay', gte: 6 }], paragraphs: ['악화 본문'] },
    { paragraphs: ['기본 본문'] },
  ],
  options: [
    {
      label: '정석 (narrow)',
      check: { kind: 'narrow', skill: 'inscription', difficulty: 1 },
      timeCost: 1,
      onSuccess: {
        effects: [{ path: 'world.flags.patched_{zone}', op: 'add', value: 1 }],
        text: '성공',
      },
      onFailure: {
        effects: [{ path: 'world.menace.fatigue', op: 'add', value: 2 }],
        text: '실패',
      },
    },
    {
      label: '임시방편 (broad)',
      check: { kind: 'broad', stat: 'repair', difficulty: 30 },
      timeCost: 1,
      onSuccess: { effects: [], text: '성공' },
    },
  ],
};

const T2: WorkOrderTemplate = {
  id: 'T2',
  minDecay: 4,
  weight: 2,
  face: 'patrol',
  siteId: 'test-site',
  title: [{ text: '압력 시정' }],
  body: [{ paragraphs: ['본문'] }],
  options: [
    {
      label: '자동 처리',
      check: { kind: 'auto' },
      timeCost: 1,
      onSuccess: { effects: [], text: '성공' },
    },
  ],
};

const T3: WorkOrderTemplate = { ...T2, id: 'T3', minDecay: 5, weight: 3, face: 'survey', title: [{ text: '명멸 점검' }] };
const T4: WorkOrderTemplate = { ...T2, id: 'T4', minDecay: 0, weight: 2, face: 'supply', title: [{ text: '자재 수령' }] };

const TEMPLATES = [T1, T2, T3, T4];

/** 생성기는 이제 전체 상태를 받는다 — 서사 카드 requirements가 기억·기술·플래그를 본다 */
function worldAt(decay: number, cardNeglect: Record<string, number> = {}, extra?: { memory?: number; flags?: Record<string, number>; day?: number }): GameState {
  return {
    account: { ownedEpisodes: ['ep1'] },
    self: {
      stats: { repair: 40, insight: 35, procedure: 30, nerve: 25 },
      skills: { inscription: 1, flowsense: 1 },
      skillXp: { inscription: 0, flowsense: 0 },
      memory: extra?.memory ?? 0,
      rank: 0,
    },
    world: {
      calendar: { day: extra?.day ?? 1, weekday: 1 },
      assignment: { zone: 'd5' as const },
      weekRatings: {},
      cardNeglect,
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

describe('applyDifficultyBonus', () => {
  it('broad/narrow는 difficulty에 가산, auto는 그대로', () => {
    expect(applyDifficultyBonus({ kind: 'broad', stat: 'repair', difficulty: 30 }, 5)).toEqual({
      kind: 'broad',
      stat: 'repair',
      difficulty: 35,
    });
    expect(applyDifficultyBonus({ kind: 'auto' }, 5)).toEqual({ kind: 'auto' });
  });
});

describe('instantiateCard — 완전 구체화', () => {
  it('difficultyBonus = (decay − minDecay 초과분) + 방치 누적', () => {
    expect(instantiateCard(T1, 'd7', 5, 0).difficultyBonus).toBe(5);
    expect(instantiateCard(T1, 'd7', 5, 2).difficultyBonus).toBe(7);
    expect(instantiateCard(T3, 'd7', 5, 0).difficultyBonus).toBe(0);
  });
  it('face·weight·reissueCount가 채워진다', () => {
    const card = instantiateCard(T1, 'd5', 4, 1);
    expect(card.face).toBe('inspection');
    expect(card.weight).toBe(1);
    expect(card.reissueCount).toBe(1);
    expect(card.resolved).toBe(false);
  });
  it('본문 변형 조건의 {zone}이 구체 경로로 바인딩된다 (악화 축)', () => {
    const card = instantiateCard(T1, 'd5', 4, 0);
    expect(card.body[0].if).toEqual([{ path: 'world.zones.d5.decay', gte: 6 }]);
  });
  it('효과 경로가 구역으로 바인딩되어 치환자가 남지 않는다', () => {
    const card = instantiateCard(T1, 'd5', 3, 0);
    expect(card.options[0].onSuccess.effects).toEqual([
      { path: 'world.flags.patched_d5', op: 'add', value: 1 },
    ]);
  });
  it('원본 템플릿은 불변', () => {
    instantiateCard(T1, 'd5', 5, 3);
    expect(T1.options[0].check).toEqual({ kind: 'narrow', skill: 'inscription', difficulty: 1 });
    expect(T1.body[0].if?.[0].path).toBe('world.zones.{zone}.decay');
  });
});

describe('generateCards — 배치 구역 1곳, 도시 상태가 곧 무작위성 (v3 §4)', () => {
  it('배치 구역에서만 생성, 최대 4장', () => {
    const cards = generateCards(worldAt(5), TEMPLATES, () => 0);
    expect(cards).toHaveLength(CARDS_PER_DAY);
    expect(cards.every((c) => c.zone === 'd5')).toBe(true);
  });
  it('minDecay ≤ decay인 템플릿만 온다 (decay 4 → T3 제외 3장)', () => {
    const cards = generateCards(worldAt(4), TEMPLATES, () => 0);
    expect(cards.map((c) => c.templateId).sort()).toEqual(['T1', 'T2', 'T4']);
  });
  it('방치 누적이 큰 카드가 앞으로 온다 (재발부 우선)', () => {
    const cards = generateCards(worldAt(5, { T1: 2 }), TEMPLATES, () => 0);
    expect(cards[0].templateId).toBe('T1');
    expect(cards[0].reissueCount).toBe(2);
  });
  it('방치 동률이면 minDecay 깊은 순 (노후도가 깊은 곳에 그에 맞는 카드)', () => {
    const cards = generateCards(worldAt(5), TEMPLATES, () => 0);
    expect(cards[0].templateId).toBe('T3');
    expect(cards[1].templateId).toBe('T2');
  });
  it('적격 템플릿이 없으면 throw', () => {
    expect(() => generateCards(worldAt(0), [T3], () => 0)).toThrow(/적격/);
  });
});

describe('generateCards — 서사 카드 (v3 §4 정정: 비밀은 일과 중의 카드에서)', () => {
  const THREAD: WorkOrderTemplate = {
    ...T2,
    id: 'TH1',
    minDecay: 0,
    weight: 1,
    face: 'liaison',
    title: [{ text: '미대조 항목 정정' }],
    requirements: [
      { path: 'world.calendar.day', gte: 2 },
      { path: 'world.flags.ledger_checked', lte: 0 },
    ],
    thread: true,
  };

  it('requirements가 맞아야 등장한다 (일차 게이트)', () => {
    expect(generateCards(worldAt(5, {}, { day: 1 }), [...TEMPLATES, THREAD], () => 0)
      .map((c) => c.templateId)).not.toContain('TH1');
    expect(generateCards(worldAt(5, {}, { day: 2 }), [...TEMPLATES, THREAD], () => 0)
      .map((c) => c.templateId)).toContain('TH1');
  });

  it('플래그가 서면 다시 오지 않는다 — 1회성은 플래그 배제로 닫는다', () => {
    const cards = generateCards(
      worldAt(5, {}, { day: 3, flags: { ledger_checked: 1 } }),
      [...TEMPLATES, THREAD],
      () => 0,
    );
    expect(cards.map((c) => c.templateId)).not.toContain('TH1');
  });

  it('서사 카드는 방치 누적보다 앞에 온다 — 진실이 정렬에 밀려 사라지면 안 된다', () => {
    const cards = generateCards(worldAt(5, { T1: 3 }, { day: 2 }), [...TEMPLATES, THREAD], () => 0);
    expect(cards[0].templateId).toBe('TH1');
    expect(cards[1].templateId).toBe('T1'); // 방치 우선순위는 서사 다음에 그대로
  });

  it('기억 게이트: self.memory 조건이 카드 등장을 건다', () => {
    const gated: WorkOrderTemplate = {
      ...THREAD,
      id: 'TH2',
      requirements: [{ path: 'self.memory', gte: 2 }],
    };
    expect(generateCards(worldAt(5, {}, { memory: 1 }), [...TEMPLATES, gated], () => 0)
      .map((c) => c.templateId)).not.toContain('TH2');
    expect(generateCards(worldAt(5, {}, { memory: 2 }), [...TEMPLATES, gated], () => 0)
      .map((c) => c.templateId)).toContain('TH2');
  });
});
