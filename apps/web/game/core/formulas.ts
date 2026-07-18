/* =====================================================================
 * core/formulas.ts — 데미지/판정 공식 (순수 로직, 전투·필드 공용)
 * 명중은 d20 판정(core/dice), 대미지는 기존 감산식 모델을 유지한다.
 * ===================================================================== */
import { AbilityDef } from "../defs";
import { Stats, magicBase } from "../state";
import { rollAttack } from "./dice";

export interface HitRoll {
  /** 명중 굴림 성공 여부 (false면 dmg 0) */
  hit: boolean;
  dmg: number;
  crit: boolean;
}

/** 아군 기술 1타 판정. 명중(d20+acc vs targetAC) → 대미지 → 치명.
 *  - acc: 명중 보정 (능력치 수정치 + 숙련 랭크). 시전부에서 계산해 전달
 *  - targetAC: 적 회피도, adv: 유리(1)/불리(-1)
 *  - enemyDef: 적 원래 방어력, bonus: 방어 적용 후 고정 추가 피해(강타)
 */
export function rollAllyHit(
  s: Stats,
  a: AbilityDef,
  opts: {
    mult: number; bless: number; enemyDef: number; defDown?: number; bonus?: number;
    acc: number; targetAC: number; adv?: -1 | 0 | 1;
  },
  rng: () => number = Math.random,
): HitRoll {
  /* 명중 판정 — sureCrit(완벽한 일격)은 자동 명중 + 치명 */
  let crit = !!a.sureCrit;
  let hit = crit;
  if (!a.sureCrit) {
    const roll = rollAttack(rng, opts.acc, opts.targetAC, opts.adv ?? 0);
    hit = roll.hit;
    crit = roll.crit;
  }
  if (!hit) return { hit: false, dmg: 0, crit: false };

  const base = a.kind === "mag" ? magicBase(s, a.skill) : s.atk;
  let dmg = Math.round(base * a.pow * opts.mult * opts.bless * (0.9 + rng() * 0.2));
  const defv = Math.max(0, (a.pierce ? Math.floor(opts.enemyDef / 2) : opts.enemyDef) - (opts.defDown ?? 0));
  dmg = Math.max(1, dmg - defv);
  if (opts.bonus) dmg += opts.bonus;
  /* 치명타 — 자연20/sureCrit로 이미 확정이면 굴리지 않음. 아니면 기술 확률 + 운(Fortune) */
  if (!crit) crit = rng() < (a.crit ?? 0) + s.crit;
  if (crit) dmg = Math.round(dmg * 1.7);
  return { hit: true, dmg, crit };
}

/** 아군 치유량 (전투·필드 공용 공식) */
export function healAmount(s: Stats, a: AbilityDef, mult: number): number {
  return Math.round(magicBase(s, a.skill) * 1.8 * mult * a.pow);
}

/** 적 공격 1타 판정. 명중(d20+acc vs 아군 회피도) → 방어력 → 방어 태세 → 방패(guardCut).
 *  방어 태세(guarding)는 공격자에게 불리(disadvantage)를 주고 추가로 피해도 감소시킨다. */
export function rollEnemyHit(
  atk: number,
  target: Stats,
  opts: { aoe: boolean; guarding: boolean; acc: number; targetAC: number },
  rng: () => number = Math.random,
): { hit: boolean; dmg: number } {
  const roll = rollAttack(rng, opts.acc, opts.targetAC, opts.guarding ? -1 : 0);
  if (!roll.hit) return { hit: false, dmg: 0 };
  let dmg = Math.round(atk * (opts.aoe ? 0.65 : 1) * (0.9 + rng() * 0.25));
  dmg = Math.max(1, dmg - target.def);
  if (opts.guarding) dmg = Math.max(1, Math.round(dmg * 0.45));
  dmg = Math.max(1, Math.round(dmg * (1 - target.guardCut)));
  return { hit: true, dmg };
}
