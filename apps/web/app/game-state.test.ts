import { describe, expect, it } from 'vitest';
import { createInitialState } from './game-state';

describe('createInitialState', () => {
  it('Phase 0 확정값으로 Day 1 morning 상태를 만든다', () => {
    expect(createInitialState(42)).toEqual({
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
        districts: { d2: { decay: 3 }, d5: { decay: 4 }, d7: { decay: 5 } },
        menace: { fatigue: 0, scrutiny: 0, unrest: 0 },
        npcs: { protagonist: { trust: 0 } },
        flags: {},
        shiftLeft: 2,
        pendingOrders: [],
        seed: 42,
      },
    });
  });

  it('호출마다 독립된 상태 객체를 반환한다', () => {
    const first = createInitialState();
    first.world.districts.d2.decay = 9;

    expect(createInitialState().world.districts.d2.decay).toBe(3);
  });
});
