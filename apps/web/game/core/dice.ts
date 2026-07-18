/* =====================================================================
 * core/dice.ts — D&D식 d20 판정 원시 함수 (의존성 없음)
 * 능력치 수정치·명중·내성 굴림. 순수 함수라 rng 주입으로 결정적 테스트 가능.
 * ===================================================================== */

/** 능력치 수정치를 ±5로 캡 (bounded accuracy — 5e 능력치 20 상한과 동일) */
export const clampMod = (m: number) => Math.max(-5, Math.min(5, m));

/** D&D 능력치 수정치: floor((score-10)/2), ±5 캡 */
export const abilityMod = (score: number) => clampMod(Math.floor((score - 10) / 2));

/** d20 1개 (adv>0 유리=2d20 최고, adv<0 불리=2d20 최저). 1~20 반환 */
export function rollD20(rng: () => number, adv: -1 | 0 | 1 = 0): number {
  const one = () => (Math.floor(rng() * 20) + 1);
  if (adv === 0) return one();
  const a = one(), b = one();
  return adv > 0 ? Math.max(a, b) : Math.min(a, b);
}

export interface AttackOutcome {
  hit: boolean;
  /** 자연 20 = 자동 명중 + 치명 */
  crit: boolean;
  nat: number;
}

/** 명중 굴림: d20 + bonus >= targetAC. 자연20 자동명중+치명, 자연1 자동빗나감 */
export function rollAttack(
  rng: () => number, bonus: number, targetAC: number, adv: -1 | 0 | 1 = 0,
): AttackOutcome {
  const nat = rollD20(rng, adv);
  if (nat === 20) return { hit: true, crit: true, nat };
  if (nat === 1) return { hit: false, crit: false, nat };
  return { hit: nat + bonus >= targetAC, crit: false, nat };
}

/** 내성 굴림 — 성공(= 효과 저항) 여부. 자연20 자동성공, 자연1 자동실패 */
export function rollSave(
  rng: () => number, saveMod: number, dc: number, adv: -1 | 0 | 1 = 0,
): boolean {
  const nat = rollD20(rng, adv);
  if (nat === 20) return true;
  if (nat === 1) return false;
  return nat + saveMod >= dc;
}
