/**
 * 격리된 다단 조우 리듀서 (v3 §6).
 * 조우 상태는 하루 루프(GameState)에 섞지 않는다 — 이 모듈의 로컬 상태로만 존재하고,
 * 종료 시 outcome별 효과(Effect[])만 반환한다. 하루 루프는 그것을
 * RESOLVE_ENCOUNTER 액션으로 반입해 기존 effect 적용기로 처리한다.
 * 새 자원 없음: 판정은 self의 스탯·기술, 비용·보상은 피로·동요·기억·노후도·플래그.
 *
 * 턴 구조: 매 턴 4행동 중 하나. 관찰이 태우기/재우기를 쉽게 만들고,
 * 진정 누적이 임계에 닿으면 잠들며, 턴이 다하면 강제 이탈이다.
 * 최종 선택은 확정 설계 그대로 — 태울 것인가(동력 회수) vs 재울 것인가(보상 없음).
 */
import { bindEffects } from './bind';
import { mulberry32, rollCheck } from './checks';
import type {
  CharacterSheet,
  Check,
  Effect,
  EncounterActionId,
  EncounterDef,
  EncounterOutcome,
  ZoneId,
} from './schema';

/** 관찰 1회당 태우기/재우기 판정 난이도 감소 폭 */
export const OBSERVE_BONUS = 1;

export interface EncounterState {
  encounterId: string;
  zone: ZoneId;                     // outcome 효과 바인딩 대상
  turn: number;                     // 1부터, maxTurns까지
  calm: number;                     // 진정 성공 누적
  observed: number;                 // 관찰 성공 누적
  outcome: EncounterOutcome | null; // null = 진행 중
  seed: number;                     // 조우 전용 PRNG (재현성)
}

export interface EncounterStep {
  state: EncounterState;
  log: string[];
}

/** 종료된 조우의 반출물 — 하루 루프가 RESOLVE_ENCOUNTER로 반입한다 */
export interface EncounterResult {
  outcome: EncounterOutcome;
  effects: Effect[];
  text: string;
}

/** 다단 필드 확인 — 설명형(briefing) 조우는 이 리듀서를 타지 않는다 (UI가 직접 닫는다) */
function assertInteractive(def: EncounterDef): asserts def is EncounterDef & {
  maxTurns: number;
  calmToSleep: number;
  actions: NonNullable<EncounterDef['actions']>;
  outcomes: NonNullable<EncounterDef['outcomes']>;
} {
  if (def.briefing || !def.actions || !def.outcomes || def.maxTurns === undefined || def.calmToSleep === undefined) {
    throw new Error(`설명형 조우는 다단 리듀서를 타지 않는다: ${def.id}`);
  }
}

export function startEncounter(def: EncounterDef, zone: ZoneId, seed: number): EncounterState {
  assertInteractive(def);
  return { encounterId: def.id, zone, turn: 1, calm: 0, observed: 0, outcome: null, seed };
}

function eased(check: Check, observed: number): Check {
  if (check.kind === 'auto') return { ...check };
  return { ...check, difficulty: Math.max(0, check.difficulty - observed * OBSERVE_BONUS) };
}

/** 현재 조우 상태 기준의 실효 판정 — UI 성공률 표시용 (관찰 보정 반영) */
export function effectiveCheck(def: EncounterDef, state: EncounterState, actionId: EncounterActionId): Check {
  assertInteractive(def);
  const check = def.actions[actionId].check;
  return actionId === 'burn' || actionId === 'soothe' ? eased(check, state.observed) : { ...check };
}

export const encounterReduce = (
  state: EncounterState,
  def: EncounterDef,
  actionId: EncounterActionId,
  self: CharacterSheet,
): EncounterStep => {
  assertInteractive(def);
  if (state.encounterId !== def.id) {
    throw new Error(`조우 정의 불일치: 상태 ${state.encounterId}, 정의 ${def.id}`);
  }
  if (state.outcome !== null) {
    throw new Error(`이미 종료된 조우: ${state.encounterId} (${state.outcome})`);
  }
  const action = def.actions[actionId];
  const rng = mulberry32(state.seed);
  const next: EncounterState = { ...state };
  const log: string[] = [];

  if (actionId === 'withdraw') {
    next.outcome = 'withdrawn';
    log.push(action.successText);
  } else {
    // 관찰 보정: 읽을수록 손이 정확해진다 (태우기·재우기에만 적용)
    const check = actionId === 'observe' ? action.check : eased(action.check, state.observed);
    const { success } = rollCheck(check, self.stats, self.skills, rng);
    if (success) {
      log.push(action.successText);
      if (actionId === 'observe') next.observed += 1;
      if (actionId === 'soothe') {
        next.calm += 1;
        if (next.calm >= def.calmToSleep) next.outcome = 'soothed';
      }
      if (actionId === 'burn') next.outcome = 'burned';
    } else if (action.failureText) {
      log.push(action.failureText);
    }
  }

  next.seed = Math.floor(rng() * 4294967296);
  if (next.outcome === null) {
    if (next.turn >= def.maxTurns) {
      next.outcome = 'expired';
    } else {
      next.turn += 1;
    }
  }
  return { state: next, log };
};

/** 종료된 조우 → 반출물. outcome 효과를 조우 구역으로 바인딩해 완성한다. */
export function finishEncounter(def: EncounterDef, state: EncounterState): EncounterResult {
  if (state.outcome === null) {
    throw new Error(`진행 중인 조우는 반출할 수 없음: ${state.encounterId} (턴 ${state.turn})`);
  }
  assertInteractive(def);
  const outcome = def.outcomes[state.outcome];
  if (!outcome) throw new Error(`정의되지 않은 outcome: ${state.outcome} (${def.id})`);
  return {
    outcome: state.outcome,
    effects: bindEffects(outcome.effects, state.zone),
    text: outcome.text,
  };
}
