/* =====================================================================
 * core/formulas.ts — 데미지/판정 공식 (순수 로직, 전투·필드 공용)
 * 명중은 d20 판정(core/dice), 대미지는 기존 감산식 모델을 유지한다.
 * ===================================================================== */
import { AbilityDef, DamageComponent, DamageType, ResistBand, ResistTable, normalizeDamage, resistBand, resistMult } from "../defs";
import { Stats, magicBase } from "../state";
import { rollAttack } from "./dice";
import { gameplayRandom } from "./random";

export interface HitRoll {
  /** 명중 굴림 성공 여부 (false면 dmg 0) */
  hit: boolean;
  dmg: number;
  crit: boolean;
  /** 대상의 데미지 타입 저항 판정 — normal/resist/weak/immune */
  resist: ResistBand;
}

/** 아군 1타 판정. (기본 공격만) 명중(d20+acc vs targetAC) → 대미지 → 치명 → 저항.
 *  **기술·마법(a.id ≠ "")은 명중 굴림에서 제외 — 항상 명중한다.** 기본 공격만 빗나갈 수 있다.
 *  - acc/targetAC/adv: 기본 공격 명중 굴림용 (기술·마법에서는 무시)
 *  - enemyDef: 적 원래 방어력, bonus: 방어 적용 후 고정 추가 피해(강타)
 *  - dtype: 이 공격의 데미지 타입, res: 대상의 타입별 배율 테이블
 */
export function rollAllyHit(
  s: Stats,
  a: AbilityDef,
  opts: {
    mult: number; bless: number; enemyDef: number; defDown?: number; bonus?: number;
    attackMult?: number; tagMult?: number; currentHpBonus?: number;
    acc: number; targetAC: number; adv?: -1 | 0 | 1;
    dtype: DamageType; damageTypes?: DamageComponent[]; res?: ResistTable;
  },
  rng: () => number = gameplayRandom,
): HitRoll {
  /* 명중 판정 — sureCrit(완벽한 일격)은 자동 명중+치명. 기술·마법은 명중 굴림 없이 자동 명중.
   *  오직 기본 공격(a.id === "")만 d20 명중 굴림을 한다. */
  let crit = !!a.sureCrit;
  let hit = crit;
  if (!a.sureCrit) {
    if (a.id) {
      hit = true; // 기술·마법 — 명중 굴림 제외
    } else {
      const roll = rollAttack(rng, opts.acc, opts.targetAC, opts.adv ?? 0);
      hit = roll.hit;
      crit = roll.crit;
    }
  }
  if (!hit) return { hit: false, dmg: 0, crit: false, resist: "normal" };

  const base = a.kind === "mag" ? magicBase(s, a.skill) : s.atk;
  let dmg = Math.round(base * a.pow * opts.mult * opts.bless * (opts.attackMult ?? 1) * (opts.tagMult ?? 1) * (0.9 + rng() * 0.2));
  /* 물리 방어는 주문에는 1/3만 적용된다. 속성 저항이 마법 방어의 주축이다. */
  const armor = a.kind === "mag" ? Math.floor(opts.enemyDef / 3) : opts.enemyDef;
  const defv = Math.max(0, (a.pierce ? Math.floor(armor / 2) : armor) - (opts.defDown ?? 0));
  dmg = Math.max(1, dmg - defv);
  if (opts.bonus) dmg += opts.bonus;
  if (opts.currentHpBonus) dmg += opts.currentHpBonus;
  /* 치명타 — 자연20/sureCrit로 이미 확정이면 굴리지 않음. 아니면 기술 확률 + 운(Fortune) */
  if (!crit) crit = rng() < (a.crit ?? 0) + s.crit;
  if (crit) dmg = Math.round(dmg * 1.7);
  /* 저항/약점 — 최종 피해에 타입 배율. 무효(≤0)는 0, 그 외는 최소 1 보장 */
  const components = normalizeDamage(opts.damageTypes?.length ? opts.damageTypes : [{ type: opts.dtype, ratio: 1 }]);
  const weightedMult = components.reduce((sum, c) => sum + c.ratio * resistMult(opts.res, c.type), 0);
  const band = resistBand(weightedMult);
  dmg = band === "immune" ? 0 : Math.max(1, Math.round(dmg * weightedMult));
  return { hit: true, dmg, crit, resist: band };
}

/** 아군 치유량 (전투·필드 공용 공식) */
export function healAmount(s: Stats, a: AbilityDef, mult: number): number {
  return Math.round(magicBase(s, a.skill) * 1.8 * mult * a.pow);
}

/** 적 공격 1타 판정. 명중(d20+acc vs 아군 회피도) → 방어력 → 방어 태세 → 방패(guardCut) → 저항.
 *  방어 태세(guarding)는 공격자에게 불리(disadvantage)를 주고 추가로 피해도 감소시킨다.
 *  dtype: 적 공격의 데미지 타입, res: 아군의 타입별 저항 배율. */
export function rollEnemyHit(
  atk: number,
  target: Stats,
  opts: {
    aoe: boolean; guarding: boolean; acc: number; targetAC: number;
    dtype: DamageType; res?: ResistTable;
    /** 공포 상태의 적 — 명중을 불리하게 굴린다 */
    attackerFeared?: boolean;
  },
  rng: () => number = gameplayRandom,
): { hit: boolean; dmg: number; resist: ResistBand } {
  /* 방어 태세(대상)나 공포(공격자) 어느 쪽이든 불리 */
  const adv: -1 | 0 | 1 = opts.guarding || opts.attackerFeared ? -1 : 0;
  const roll = rollAttack(rng, opts.acc, opts.targetAC, adv);
  if (!roll.hit) return { hit: false, dmg: 0, resist: "normal" };
  let dmg = Math.round(atk * (opts.aoe ? 0.65 : 1) * (0.9 + rng() * 0.25));
  dmg = Math.max(1, dmg - target.def);
  if (opts.guarding) dmg = Math.max(1, Math.round(dmg * 0.45));
  dmg = Math.max(1, Math.round(dmg * (1 - target.guardCut)));
  /* 저항/약점 — 아군의 타입 저항을 최종 피해에 곱한다 */
  const mult = resistMult(opts.res, opts.dtype);
  const band = resistBand(mult);
  dmg = band === "immune" ? 0 : Math.max(1, Math.round(dmg * mult));
  return { hit: true, dmg, resist: band };
}
