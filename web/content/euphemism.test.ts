/**
 * 완곡어 증명 시나리오의 성립 보장.
 *
 * 서사 카드(구 WO-T6~T8)·조우 입구 카드(구 WO-T5)는 폐기되었다(2026-08-11) —
 * 기억 관문·단서 축 검증은 특수 카드 보류 해제 후 새 콘텐츠로 재작성한다.
 * 남는 검증: WO-T3의 결정적 등장 (배치 구역 노후도 5 이상 — 변형 확인 지점).
 */
import { describe, expect, it } from 'vitest';
import { generateCards } from '../core/generate';
import type { GameState } from '../core/schema';
import { loadContent } from './loader';

const [bundle] = loadContent();

function stateAt(
  decay: number,
  extra?: { day?: number; memory?: number; flowsense?: number; flags?: Record<string, number> },
): GameState {
  return {
    account: { ownedEpisodes: ['ep1'] },
    self: {
      stats: { repair: 40, insight: 35, procedure: 30, nerve: 25 },
      skills: { inscription: 1, flowsense: extra?.flowsense ?? 1 },
      skillXp: { inscription: 0, flowsense: 0 },
      memory: extra?.memory ?? 0,
      rank: 0,
    },
    world: {
      calendar: { day: extra?.day ?? 1, weekday: 1 },
      assignment: { zone: 'd5' },
      weekRatings: {},
      weekTally: { processed: 0, notPassed: 0, perfect: 0 },
      ending: null,
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
});
