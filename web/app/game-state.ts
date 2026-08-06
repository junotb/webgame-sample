import type { GameState } from '../core/schema';
import { SHIFT_PER_DAY } from '../core/reducer';

const DEFAULT_SEED = 0xdecafbad;

export function createInitialState(seed = DEFAULT_SEED): GameState {
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
      assignment: { zone: 'd5' }, // 1주차는 한 구역 고정 (v3 §9) — 시작 노후도 4 (v3 §3 강제값)
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
      seed,
    },
  };
}
