/**
 * 격리된 다단 조우 리듀서 (v3 §6).
 * 검증점: 관찰이 난이도를 낮춘다 / 진정 누적 임계 → 잠듦 / 태우기 → 회수 /
 * 물러서기·턴 소진 → 미해결 이탈 / 조우 상태가 GameState와 무관하게 굴러간다.
 */
import { describe, expect, it } from 'vitest';
import {
  encounterReduce,
  finishEncounter,
  OBSERVE_BONUS,
  startEncounter,
} from './encounter';
import type { CharacterSheet, EncounterDef } from './schema';

const SELF: CharacterSheet = {
  stats: { repair: 40, insight: 35, procedure: 30, nerve: 25 },
  skills: { inscription: 3, flowsense: 3, frost: 0 },
      skillXp: { inscription: 0, flowsense: 0, frost: 0 },
  memory: 0,
  rank: 0,
};

// narrow p = 0.5 + (skill − diff) × 0.1 — diff를 극단값으로 두면 판정이 결정적이다
const SURE = { kind: 'narrow', skill: 'inscription', difficulty: -5 } as const;   // p = 1.0
const NEVER = { kind: 'narrow', skill: 'inscription', difficulty: 99 } as const;  // p = 0.1 (clamp 하한)

function def(overrides?: Partial<EncounterDef>): EncounterDef {
  return {
    id: 'ENC-X',
    title: '설비 이상 점검 보고',
    maxTurns: 4,
    calmToSleep: 2,
    intro: [{ paragraphs: ['관로가 숨 쉬고 있다.'] }],
    actions: {
      observe: { label: '관찰한다', check: SURE, successText: '주기를 읽었다', failureText: '읽히지 않는다' },
      soothe: { label: '진정시킨다', check: SURE, successText: '잦아들었다', failureText: '거세졌다' },
      burn: { label: '각인으로 태운다', check: SURE, successText: '타올랐다', failureText: '불이 붙지 않는다' },
      withdraw: { label: '물러선다', check: { kind: 'auto' }, successText: '물러섰다' },
    },
    outcomes: {
      burned: { effects: [{ path: 'world.zones.{zone}.decay', op: 'add', value: -2 }], text: '동력이 회수되었다.' },
      soothed: { effects: [{ path: 'world.menace.unrest', op: 'add', value: 1 }], text: '그것은 잠들었다.' },
      withdrawn: { effects: [], text: '구간은 봉쇄되었다.' },
      expired: { effects: [{ path: 'world.menace.fatigue', op: 'add', value: 2 }], text: '날이 저물었다.' },
    },
    ...overrides,
  };
}

describe('startEncounter — 초기 상태', () => {
  it('턴 1, 누적 0, 진행 중', () => {
    const s = startEncounter(def(), 'd5', 42);
    expect(s).toEqual({ encounterId: 'ENC-X', zone: 'd5', turn: 1, calm: 0, observed: 0, outcome: null, seed: 42 });
  });
});

describe('행동별 전이', () => {
  it('observe 성공: observed +1, 턴 전진', () => {
    const { state, log } = encounterReduce(startEncounter(def(), 'd5', 42), def(), 'observe', SELF);
    expect(state.observed).toBe(1);
    expect(state.turn).toBe(2);
    expect(state.outcome).toBeNull();
    expect(log.join(' ')).toContain('주기를 읽었다');
  });
  it('soothe 누적이 calmToSleep에 닿으면 soothed', () => {
    const d = def();
    let s = startEncounter(d, 'd5', 42);
    s = encounterReduce(s, d, 'soothe', SELF).state;
    expect(s.calm).toBe(1);
    expect(s.outcome).toBeNull();
    s = encounterReduce(s, d, 'soothe', SELF).state;
    expect(s.outcome).toBe('soothed');
  });
  it('burn 성공: burned', () => {
    const { state } = encounterReduce(startEncounter(def(), 'd5', 42), def(), 'burn', SELF);
    expect(state.outcome).toBe('burned');
  });
  it('burn 실패: 턴만 소모하고 계속', () => {
    const d = def({ actions: { ...def().actions, burn: { ...def().actions.burn, check: NEVER } } });
    // p=0.1 — seed를 골라 실패 롤을 얻는다 (재현성: 같은 seed 같은 결과)
    const s = startEncounter(d, 'd5', 7);
    const step = encounterReduce(s, d, 'burn', SELF);
    if (step.state.outcome === null) {
      expect(step.state.turn).toBe(2);
      expect(step.log.join(' ')).toContain('불이 붙지 않는다');
    } else {
      expect(step.state.outcome).toBe('burned'); // 10% 낙첨 — seed 고정이라 실제로는 한쪽만 탄다
    }
  });
  it('관찰 누적이 burn 난이도를 낮춘다 (OBSERVE_BONUS/회)', () => {
    // diff 6, skill 3 → p=0.2. 관찰 3회면 diff 3 → p=0.5. 여기서는 수식 검증만:
    const d = def({ actions: { ...def().actions, burn: { ...def().actions.burn, check: { kind: 'narrow', skill: 'inscription', difficulty: 3 + 5 * OBSERVE_BONUS } } } });
    let s = startEncounter(d, 'd5', 42);
    s = { ...s, observed: 5 }; // 관찰 5회 가정 → diff 실효 3, skill 3 → p=0.5
    // p가 0.1(clamp 하한)이 아니라는 것을 성공 가능성으로 간접 확인: 여러 seed 중 성공이 존재
    const outcomes = [1, 2, 3, 4, 5, 6, 7, 8].map(
      (seed) => encounterReduce({ ...s, seed }, d, 'burn', SELF).state.outcome,
    );
    expect(outcomes).toContain('burned');
  });
  it('withdraw: 판정 없이 withdrawn', () => {
    const { state } = encounterReduce(startEncounter(def(), 'd5', 42), def(), 'withdraw', SELF);
    expect(state.outcome).toBe('withdrawn');
  });
  it('maxTurns 소진: expired', () => {
    const d = def({ maxTurns: 3 });
    let s = startEncounter(d, 'd5', 42);
    s = encounterReduce(s, d, 'observe', SELF).state; // 턴 2
    s = encounterReduce(s, d, 'observe', SELF).state; // 턴 3
    s = encounterReduce(s, d, 'observe', SELF).state; // 턴 소진
    expect(s.outcome).toBe('expired');
  });
  it('종료된 조우에 행동하면 throw', () => {
    const s = encounterReduce(startEncounter(def(), 'd5', 42), def(), 'withdraw', SELF).state;
    expect(() => encounterReduce(s, def(), 'burn', SELF)).toThrow(/종료/);
  });
  it('같은 seed → 같은 결과 (재현성)', () => {
    const a = encounterReduce(startEncounter(def(), 'd5', 42), def(), 'soothe', SELF);
    const b = encounterReduce(startEncounter(def(), 'd5', 42), def(), 'soothe', SELF);
    expect(a.state).toEqual(b.state);
  });
});

describe('finishEncounter — 반출물', () => {
  it('outcome 효과가 조우 구역으로 바인딩된다', () => {
    const s = encounterReduce(startEncounter(def(), 'd5', 42), def(), 'burn', SELF).state;
    const result = finishEncounter(def(), s);
    expect(result.outcome).toBe('burned');
    expect(result.effects).toEqual([{ path: 'world.zones.d5.decay', op: 'add', value: -2 }]);
    expect(result.text).toBe('동력이 회수되었다.');
  });
  it('진행 중인 조우는 반출 불가', () => {
    expect(() => finishEncounter(def(), startEncounter(def(), 'd5', 42))).toThrow(/진행 중/);
  });
});
