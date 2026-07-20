/* =====================================================================
 * damage.test.ts — 데미지 타입 해석·저항 배율 검증
 * ===================================================================== */
import { describe, expect, it } from "vitest";
import {
  ABILITIES, CLASSES, DAMAGE_META, DAMAGE_TYPES, DamageType, ENEMY_DEFS, MAGIC_TRADITIONS,
  Rank, attackDamageType, attackDamageTypes, enemyMelee, resistBand, resistMult,
} from "../defs";
import { BattleAbility, Member, attackReach, memberResist, memberStats } from "../state";
import { BASIC_ATTACK, BattleEngine, BattleEvent } from "../core/battle-engine";
import { rollEnemyHit } from "../core/formulas";

function mkMember(over: Partial<Member> = {}): Member {
  return {
    id: "a", name: "a", color: 0, accent: 0, portrait: 0,
    classId: "fighter", ld: null,
    attrs: { might: 10, int: 10, wit: 10, vital: 10, agi: 12, fortune: 10 },
    bonusSkills: [],
    level: 1, exp: 0,
    hp: 100, mp: 50, maxHp: 100, maxMp: 50,
    equip: {
      mainHand: { name: "검", atk: 0, wtype: "slash", reach: "melee" },
      body: { name: "", def: 0 },
    },
    back: false,
    apUnspent: 0, spUnspent: 0, trained: {},
    ...over,
  };
}
const ab = (id: string, rank: Rank): BattleAbility => {
  const def = ABILITIES.find((a) => a.id === id);
  if (!def) throw new Error(`unknown ability: ${id}`);
  return { ...def, rank };
};
const nat = (n: number) => (n - 1) / 20 + 1e-6;
const hits = (evs: BattleEvent[]) => evs.filter((e) => e.t === "hit");
/** 명중 자연15 + 편차 0.5 + 치명 롤 0.99(비치명)를 순환 — 모든 굴림 성공·비치명 */
const seqRng = (): (() => number) => {
  const v = [nat(15), 0.5, 0.99];
  let i = 0;
  return () => v[i++ % v.length];
};

describe("resistBand / resistMult", () => {
  it("배율을 밴드로 분류한다", () => {
    expect(resistBand(0)).toBe("immune");
    expect(resistBand(-1)).toBe("immune");
    expect(resistBand(0.5)).toBe("resist");
    expect(resistBand(1)).toBe("normal");
    expect(resistBand(1.5)).toBe("weak");
  });
  it("미지정 타입은 1.0(보통)", () => {
    expect(resistMult(undefined, "fire")).toBe(1);
    expect(resistMult({ fire: 2 }, "fire")).toBe(2);
    expect(resistMult({ fire: 2 }, "water")).toBe(1);
  });
});

describe("attackDamageType", () => {
  it("물리는 장착 무기 계열이 타입", () => {
    expect(attackDamageType(BASIC_ATTACK, "slash")).toBe("slash");
    expect(attackDamageType(BASIC_ATTACK, "pierce")).toBe("pierce");
    expect(attackDamageType(BASIC_ATTACK, "bludgeon")).toBe("bludgeon");
    /* 무술 기술도 무기 계열을 따른다 */
    expect(attackDamageType(ab("slam", 2), "bludgeon")).toBe("bludgeon");
  });
  it("명시 dtype이 최우선 — 원소 세부 속성", () => {
    expect(attackDamageType(ab("fireball", 2), "slash")).toBe("fire");
    expect(attackDamageType(ab("chainlt", 2), "slash")).toBe("wind");
    expect(attackDamageType(ab("meteor", 3), "slash")).toBe("earth");
  });
  it("학파 마법은 피해 타입으로 해석된다", () => {
    expect(attackDamageType(ab("psyshock", 1), "slash")).toBe("spirit");
    expect(attackDamageType(ab("holy", 1), "slash")).toBe("light");
    expect(attackDamageType(ab("shadow", 1), "slash")).toBe("dark");
  });
  it("메테오는 땅 60% + 불 40% 복합 피해", () => {
    expect(attackDamageTypes(ab("meteor", 3), "slash")).toEqual([
      { type: "earth", ratio: 0.6 },
      { type: "fire", ratio: 0.4 },
    ]);
  });
});

describe("데이터 무결성", () => {
  it("마법은 원소·자아·신성 3계통 9학파로 구성된다", () => {
    expect(MAGIC_TRADITIONS.elemental.schools).toEqual(["fire", "water", "earth", "wind"]);
    expect(MAGIC_TRADITIONS.self.schools).toEqual(["spirit", "mind", "body"]);
    expect(MAGIC_TRADITIONS.divine.schools).toEqual(["light", "dark"]);
  });
  it("모든 데미지 타입에 메타(이름/색)가 있다", () => {
    for (const t of DAMAGE_TYPES) {
      expect(DAMAGE_META[t]).toBeDefined();
      expect(typeof DAMAGE_META[t].name).toBe("string");
    }
  });
  it("모든 공격 어빌리티가 유효한 데미지 타입으로 해석된다", () => {
    for (const a of ABILITIES) {
      if (a.kind === "heal") continue;
      const dt = attackDamageType({ ...a, rank: 1 } as BattleAbility, "slash");
      expect(DAMAGE_TYPES).toContain(dt);
    }
  });
  it("모든 원소 공격 어빌리티는 해당 원소 또는 유효한 복합 피해를 쓴다", () => {
    const elemental: DamageType[] = ["earth", "fire", "wind", "water"];
    for (const a of ABILITIES) {
      if (elemental.includes(a.skill as DamageType) && a.target !== "ally" && a.kind !== "heal") {
        const components = attackDamageTypes(a, "slash");
        expect(components.length).toBeGreaterThan(0);
        for (const component of components) expect(elemental).toContain(component.type);
      }
    }
  });
  it("적 저항 테이블의 키는 모두 유효한 데미지 타입", () => {
    for (const def of Object.values(ENEMY_DEFS)) {
      for (const k of Object.keys(def.res ?? {})) {
        expect(DAMAGE_TYPES).toContain(k as DamageType);
      }
    }
  });
});

describe("전투 내 저항 적용", () => {
  /* 슬라임: 불 약점 */
  it("약점(불) 공격은 배율만큼 피해가 늘고 resist:weak를 낸다", () => {
    const caster = mkMember({ attrs: { might: 10, int: 20, wit: 10, vital: 10, agi: 12, fortune: 0 } });
    const engine = new BattleEngine([caster], ["slime"], { rng: seqRng() });
    engine.next();
    const res = engine.act({ type: "ability", ability: ab("fireball", 2), target: "enemy:0" });
    const h = hits(res.events)[0];
    expect(h && h.t === "hit" && h.resist).toBe("weak");
    expect(res.events.some((e) => e.t === "log" && e.text.includes("약점"))).toBe(true);
  });

  it("무효(어둠) 공격은 피해 0에 resist:immune", () => {
    /* 냉기 망령(skeleton): 어둠 ×0 무효 */
    const caster = mkMember({ attrs: { might: 10, int: 20, wit: 10, vital: 10, agi: 12, fortune: 0 } });
    const engine = new BattleEngine([caster], ["skeleton"], { rng: seqRng() });
    engine.next();
    const res = engine.act({ type: "ability", ability: ab("shadow", 1), target: "enemy:0" });
    const h = hits(res.events)[0];
    expect(h && h.t === "hit" && h.amount).toBe(0);
    expect(h && h.t === "hit" && h.resist).toBe("immune");
    expect(res.events.some((e) => e.t === "log" && e.text.includes("효과가 없다"))).toBe(true);
  });
});

describe("memberResist — 직업 × 방어구 곱연산", () => {
  it("직업 저항과 방어구 저항이 곱해진다", () => {
    /* 대마법사: 불 0.8 · 바람 0.8. 룬 아머(불 0.85) 장착 */
    const m = mkMember({ classId: "archmage", equip: { body: { name: "룬 아머", def: 15, res: { fire: 0.85 } } } });
    const r = memberResist(m);
    expect(r.fire).toBeCloseTo(0.8 * 0.85, 5);
    expect(r.wind).toBeCloseTo(0.8, 5); // 방어구엔 없고 직업만
    expect(r.water).toBeUndefined();
  });
  it("저항이 없는 직업·장비는 빈 테이블", () => {
    expect(Object.keys(memberResist(mkMember())).length).toBe(0);
  });
  it("정의된 모든 직업/방어구 저항 키가 유효한 데미지 타입", () => {
    for (const c of Object.values(CLASSES))
      for (const k of Object.keys(c.res ?? {})) expect(DAMAGE_TYPES).toContain(k as DamageType);
  });
});

describe("전열/후열 — 사거리(attackReach)와 적 근접 판정(enemyMelee)", () => {
  const melee = { name: "검", atk: 5, wtype: "slash" as const, reach: "melee" as const };
  const bow = { name: "활", atk: 5, wtype: "pierce" as const, reach: "ranged" as const };

  it("기본 공격의 사거리는 장착 무기가 결정한다", () => {
    expect(attackReach(BASIC_ATTACK, melee)).toBe("melee");
    expect(attackReach(BASIC_ATTACK, bow)).toBe("ranged");
  });
  it("마법·회복은 항상 원거리(시야)", () => {
    expect(attackReach(ab("fireball", 2), melee)).toBe("ranged");
    expect(attackReach(ab("heal", 1), melee)).toBe("ranged");
  });
  it("물리 스킬은 활·투척만 원거리, 그 외 근접", () => {
    expect(attackReach(ab("poisonblade", 1), melee)).toBe("ranged"); // thrown
    expect(attackReach(ab("slam", 2), bow)).toBe("melee");            // martial — 무기가 활이어도 근접기
  });
  it("적 공격의 근접 여부는 공격 타입으로 갈린다", () => {
    expect(enemyMelee(ENEMY_DEFS.goblin)).toBe(true);   // slash
    expect(enemyMelee(ENEMY_DEFS.slime)).toBe(true);    // bludgeon
    expect(enemyMelee(ENEMY_DEFS.skeleton)).toBe(false); // water(냉기) — 원거리
    expect(enemyMelee(ENEMY_DEFS.lord)).toBe(false);     // fire — 원거리
    expect(enemyMelee(ENEMY_DEFS.ancient)).toBe(false);  // spirit — 원거리
  });
});

describe("rollEnemyHit — 아군 측 저항 적용", () => {
  const s = memberStats(mkMember());
  const opt = (dtype: DamageType, res?: Record<string, number>) =>
    ({ aoe: false, guarding: false, acc: 100, targetAC: 0, dtype, res });
  it("저항 타입은 피해가 줄고 resist:resist", () => {
    const r = rollEnemyHit(100, s, opt("fire", { fire: 0.5 }), () => 0.5);
    expect(r.resist).toBe("resist");
  });
  it("무효 타입은 피해 0에 resist:immune", () => {
    const r = rollEnemyHit(100, s, opt("dark", { dark: 0 }), () => 0.5);
    expect(r.dmg).toBe(0);
    expect(r.resist).toBe("immune");
  });
  it("약점 타입은 피해가 늘고 resist:weak", () => {
    const base = rollEnemyHit(100, s, opt("fire"), () => 0.5);
    const weak = rollEnemyHit(100, s, opt("fire", { fire: 1.5 }), () => 0.5);
    expect(weak.resist).toBe("weak");
    expect(weak.dmg).toBeGreaterThan(base.dmg);
  });
});
