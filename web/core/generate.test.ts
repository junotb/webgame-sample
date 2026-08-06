import { describe, it, expect } from 'vitest';
import { applyDifficultyBonus, CARDS_PER_DAY, generateCards, instantiateCard } from './generate';
import type { WorkOrderTemplate } from './schema';

const T1: WorkOrderTemplate = {
  id: 'T1',
  minDecay: 0,
  weight: 1,
  face: 'inspection',
  siteId: 'test-site',
  title: '정기 점검',
  body: [
    { if: [{ path: 'world.zones.{zone}.decay', gte: 6 }], text: '악화 본문' },
    { text: '기본 본문' },
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
  title: '압력 시정',
  body: [{ text: '본문' }],
  options: [
    {
      label: '자동 처리',
      check: { kind: 'auto' },
      timeCost: 1,
      onSuccess: { effects: [], text: '성공' },
    },
  ],
};

const T3: WorkOrderTemplate = { ...T2, id: 'T3', minDecay: 5, weight: 3, face: 'survey', title: '명멸 점검' };
const T4: WorkOrderTemplate = { ...T2, id: 'T4', minDecay: 0, weight: 2, face: 'supply', title: '자재 수령' };

const TEMPLATES = [T1, T2, T3, T4];

function worldAt(decay: number, cardNeglect: Record<string, number> = {}) {
  return {
    assignment: { zone: 'd5' as const },
    zones: { d2: { decay: 3 }, d5: { decay }, d7: { decay: 5 } },
    cardNeglect,
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
