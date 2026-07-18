/* =====================================================================
 * core/formulas.ts — 데미지/판정 공식 (순수 로직, 전투·필드 공용)
 * ===================================================================== */
import { AbilityDef } from "../defs";
import { Stats, magicBase } from "../state";

export interface HitRoll {
  dmg: number;
  crit: boolean;
}

/** 아군 기술 1타 판정.
 *  - enemyDef: 적 원래 방어력 (pierce/defDown 보정은 내부에서)
 *  - bonus: 방어 적용 후 더해지는 고정 피해 (강타의 마나 소모 비례분)
 */
export function rollAllyHit(
  s: Stats,
  a: AbilityDef,
  opts: { mult: number; bless: number; enemyDef: number; defDown?: number; bonus?: number },
  rng: () => number = Math.random,
): HitRoll {
  const base = a.kind === "mag" ? magicBase(s, a.skill) : s.atk;
  let dmg = Math.round(base * a.pow * opts.mult * opts.bless * (0.9 + rng() * 0.2));
  const defv = Math.max(0, (a.pierce ? Math.floor(opts.enemyDef / 2) : opts.enemyDef) - (opts.defDown ?? 0));
  dmg = Math.max(1, dmg - defv);
  if (opts.bonus) dmg += opts.bonus;
  /* 치명타 — 기술 자체 확률 + 운(Fortune) 보정. sureCrit은 확정 */
  const crit = !!a.sureCrit || rng() < (a.crit ?? 0) + s.crit;
  if (crit) dmg = Math.round(dmg * 1.7);
  return { dmg, crit };
}

/** 아군 치유량 (전투·필드 공용 공식) */
export function healAmount(s: Stats, a: AbilityDef, mult: number): number {
  return Math.round(magicBase(s, a.skill) * 1.8 * mult * a.pow);
}

/** 적 공격 1타 판정. 회피 → 방어력 → 방어 태세 → 방패(guardCut) 순 */
export function rollEnemyHit(
  atk: number,
  target: Stats,
  opts: { aoe: boolean; guarding: boolean },
  rng: () => number = Math.random,
): { dmg: number; evaded: boolean } {
  if (rng() < target.evade) return { dmg: 0, evaded: true };
  let dmg = Math.round(atk * (opts.aoe ? 0.65 : 1) * (0.9 + rng() * 0.25));
  dmg = Math.max(1, dmg - target.def);
  if (opts.guarding) dmg = Math.max(1, Math.round(dmg * 0.45));
  dmg = Math.max(1, Math.round(dmg * (1 - target.guardCut)));
  return { dmg, evaded: false };
}
