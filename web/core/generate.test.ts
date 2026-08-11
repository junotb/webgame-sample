import { describe, it, expect } from 'vitest';
import { mulberry32 } from './checks';
import { CARDS_PER_DAY, generateCards, instantiateCard } from './generate';
import type { GameState, WorkOrderTemplate } from './schema';

const RESULT_PROSE = {
  complete: [{ paragraphs: ['완수 산문'] }],
  partial: [{ paragraphs: ['부분 산문'] }],
  fail: [
    { if: [{ path: 'world.zones.{zone}.decay' as const, gte: 6 }], paragraphs: ['악화 실패 산문'] },
    { paragraphs: ['실패 산문'] },
  ],
};

const T1: WorkOrderTemplate = {
  id: 'T1',
  minDecay: 0,
  weight: 1,
  kind: 'circuit',
  siteId: 'test-site',
  title: [{ text: '정기 점검' }],
  body: [
    { if: [{ path: 'world.zones.{zone}.decay', gte: 6 }], paragraphs: ['악화 본문'] },
    { paragraphs: ['기본 본문'] },
  ],
  resultProse: RESULT_PROSE,
};

const T2: WorkOrderTemplate = { ...T1, id: 'T2', minDecay: 4, weight: 2, kind: 'patrol', title: [{ text: '압력 시정' }] };
const T3: WorkOrderTemplate = { ...T1, id: 'T3', minDecay: 5, weight: 3, kind: 'circuit', title: [{ text: '명멸 점검' }] };
const T4: WorkOrderTemplate = { ...T1, id: 'T4', minDecay: 0, weight: 2, kind: 'material', title: [{ text: '자재 수령' }] };
const N3: WorkOrderTemplate = { ...T1, id: 'N3', minDecay: 0, weight: 2, kind: 'incinerate', title: [{ text: '정기 소각' }] };

const TEMPLATES = [T1, T2, T3, T4, N3];

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
      weekTally: { processed: 0, notPassed: 0, perfect: 0 },
      ending: null,
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

describe('instantiateCard — 완전 구체화', () => {
  it('difficultyBonus = (decay − minDecay 초과분) + 방치 누적', () => {
    expect(instantiateCard(T1, 'd7', 5, 0).difficultyBonus).toBe(5);
    expect(instantiateCard(T1, 'd7', 5, 2).difficultyBonus).toBe(7);
    expect(instantiateCard(T3, 'd7', 5, 0).difficultyBonus).toBe(0);
  });
  it('kind·weight·reissueCount가 채워진다', () => {
    const card = instantiateCard(T1, 'd5', 4, 1);
    expect(card.kind).toBe('circuit');
    expect(card.weight).toBe(1);
    expect(card.reissueCount).toBe(1);
    expect(card.resolved).toBe(false);
  });
  it('본문 변형 조건의 {zone}이 구체 경로로 바인딩된다 (악화 축)', () => {
    const card = instantiateCard(T1, 'd5', 4, 0);
    expect(card.body[0].if).toEqual([{ path: 'world.zones.d5.decay', gte: 6 }]);
  });
  it('결과 산문의 변형 조건도 구역으로 바인딩된다 (악화 축)', () => {
    const card = instantiateCard(T1, 'd5', 4, 0);
    expect(card.resultProse.fail[0].if).toEqual([{ path: 'world.zones.d5.decay', gte: 6 }]);
  });
  it('원본 템플릿은 불변', () => {
    instantiateCard(T1, 'd5', 5, 3);
    expect(T1.body[0].if?.[0].path).toBe('world.zones.{zone}.decay');
    expect(T1.resultProse.fail[0].if?.[0].path).toBe('world.zones.{zone}.decay');
  });
});

describe('generateCards — 배부 3장 무작위 추첨 (고정 배치표 폐기, 2026-08-11)', () => {
  it('배치 구역에서만 3장 추첨된다', () => {
    const cards = generateCards(worldAt(5), TEMPLATES, mulberry32(1));
    expect(cards).toHaveLength(CARDS_PER_DAY);
    expect(cards.every((c) => c.zone === 'd5')).toBe(true);
  });
  it('minDecay ≤ decay인 템플릿만 온다 (decay 4 → T3 제외 풀)', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const ids = generateCards(worldAt(4), TEMPLATES, mulberry32(seed)).map((c) => c.templateId);
      expect(ids).not.toContain('T3');
    }
  });
  it('추첨이다 — seed에 따라 구성이 달라진다', () => {
    const draws = new Set(
      Array.from({ length: 20 }, (_, seed) =>
        generateCards(worldAt(5), TEMPLATES, mulberry32(seed)).map((c) => c.templateId).sort().join(','),
      ),
    );
    expect(draws.size).toBeGreaterThan(1);
  });
  it('ENC-001 발생 전에는 소각 카드가 매일 1장 보장된다', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const cards = generateCards(worldAt(5), TEMPLATES, mulberry32(seed));
      expect(cards.some((c) => c.kind === 'incinerate')).toBe(true);
    }
  });
  it('ENC-001 발생 후에는 소각도 일반 추첨 — 빠지는 날이 존재한다', () => {
    const misses = Array.from({ length: 30 }, (_, seed) =>
      generateCards(worldAt(5, {}, { flags: { enc001_done: 1 } }), TEMPLATES, mulberry32(seed))
        .every((c) => c.kind !== 'incinerate'),
    );
    expect(misses.some(Boolean)).toBe(true);
  });
  it('적격 템플릿이 없으면 throw', () => {
    expect(() => generateCards(worldAt(0), [T3], mulberry32(1))).toThrow(/적격/);
  });
});

describe('generateCards — 서사 카드 (추첨 위에 선다. 현재 콘텐츠엔 없음 — 특수 보류)', () => {
  const THREAD: WorkOrderTemplate = {
    ...T1,
    id: 'TH1',
    title: [{ text: '미대조 항목 정정' }],
    requirements: [
      { path: 'world.calendar.day', gte: 2 },
      { path: 'world.flags.ledger_checked', lte: 0 },
    ],
    thread: true,
  };

  it('requirements가 맞아야 등장한다 (일차 게이트)', () => {
    expect(generateCards(worldAt(5, {}, { day: 1 }), [...TEMPLATES, THREAD], mulberry32(1))
      .map((c) => c.templateId)).not.toContain('TH1');
    expect(generateCards(worldAt(5, {}, { day: 2 }), [...TEMPLATES, THREAD], mulberry32(1))
      .map((c) => c.templateId)).toContain('TH1');
  });

  it('플래그가 서면 다시 오지 않는다 — 1회성은 플래그 배제로 닫는다', () => {
    const cards = generateCards(
      worldAt(5, {}, { day: 3, flags: { ledger_checked: 1 } }),
      [...TEMPLATES, THREAD],
      mulberry32(1),
    );
    expect(cards.map((c) => c.templateId)).not.toContain('TH1');
  });

  it('서사 카드는 추첨 운에 밀리지 않는다 — 조건이 맞는 날 반드시 온다', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const ids = generateCards(worldAt(5, {}, { day: 2 }), [...TEMPLATES, THREAD], mulberry32(seed))
        .map((c) => c.templateId);
      expect(ids).toContain('TH1');
    }
  });

  it('기억 게이트: self.memory 조건이 카드 등장을 건다', () => {
    const gated: WorkOrderTemplate = {
      ...THREAD,
      id: 'TH2',
      requirements: [{ path: 'self.memory', gte: 2 }],
    };
    expect(generateCards(worldAt(5, {}, { memory: 1 }), [...TEMPLATES, gated], mulberry32(1))
      .map((c) => c.templateId)).not.toContain('TH2');
    expect(generateCards(worldAt(5, {}, { memory: 2 }), [...TEMPLATES, gated], mulberry32(1))
      .map((c) => c.templateId)).toContain('TH2');
  });
});
