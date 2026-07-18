/* =====================================================================
 * dice.test.ts — D&D식 판정 원시 함수 검증 (순수, rng 주입)
 * ===================================================================== */
import { describe, expect, it } from "vitest";
import { abilityMod, rollAttack, rollD20, rollSave } from "../core/dice";

/** 지정한 자연값(nat)을 내도록 rng를 만든다: floor(x*20)+1 = nat */
const forNat = (nat: number) => () => (nat - 1) / 20 + 1e-9;

describe("dice", () => {
  it("abilityMod — 5e 공식이되 ±5로 캡", () => {
    expect(abilityMod(10)).toBe(0);
    expect(abilityMod(8)).toBe(-1);
    expect(abilityMod(18)).toBe(4);
    expect(abilityMod(20)).toBe(5);
    expect(abilityMod(30)).toBe(5);   // 무한 성장해도 +5 고정 (bounded accuracy)
    expect(abilityMod(0)).toBe(-5);
  });

  it("rollD20 — 유리/불리는 2d20 최고/최저", () => {
    const seq = (...v: number[]) => { let i = 0; return () => v[i++]; };
    // 두 값 8, 15 → 유리 15, 불리 8
    expect(rollD20(seq(0.35, 0.72), 1)).toBe(15);
    expect(rollD20(seq(0.35, 0.72), -1)).toBe(8);
  });

  it("rollAttack — d20+보정 vs AC, 자연20/자연1 처리", () => {
    expect(rollAttack(forNat(11), 3, 14).hit).toBe(true);   // 11+3=14 >= 14
    expect(rollAttack(forNat(10), 3, 14).hit).toBe(false);  // 10+3=13 < 14
    const nat20 = rollAttack(forNat(20), -10, 99);          // 자연20 자동명중+치명
    expect(nat20.hit).toBe(true);
    expect(nat20.crit).toBe(true);
    expect(rollAttack(forNat(1), 99, 0).hit).toBe(false);   // 자연1 자동빗나감
  });

  it("rollSave — 성공(저항) 판정, 자연20 자동성공 자연1 자동실패", () => {
    expect(rollSave(forNat(11), 0, 9)).toBe(true);    // 11 >= 9 저항
    expect(rollSave(forNat(3), 0, 9)).toBe(false);    // 3 < 9 실패 → 효과 적용
    expect(rollSave(forNat(1), 99, 0)).toBe(false);   // 자연1 자동실패
    expect(rollSave(forNat(20), -99, 99)).toBe(true); // 자연20 자동성공
  });
});
