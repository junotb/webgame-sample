/**
 * 판정 결과 반영 — rollCheck 분기 후 해당 가지의 효과를 적용한다.
 * 순수 함수: PRNG 주입, 새 상태 반환. shiftLeft 차감·resolved 마킹은 리듀서 몫.
 */
import { rollCheck } from './checks';
import { applyEffects } from './effects';
import type { BoundWorkOption, GameState } from './schema';

export interface ResolveResult {
  state: GameState;
  success: boolean;
  p: number;
  roll: number;
  text: string;
}

export function resolveOption(
  state: GameState,
  option: BoundWorkOption,
  rng: () => number,
): ResolveResult {
  const { p, roll, success } = rollCheck(option.check, state.self.stats, state.self.skills, rng);
  const branch = success ? option.onSuccess : option.onFailure;
  return {
    state: branch ? applyEffects(state, branch.effects) : state,
    success,
    p,
    roll,
    text: branch?.text ?? '',
  };
}
