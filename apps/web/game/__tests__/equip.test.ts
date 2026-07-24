/* =====================================================================
 * equip.test.ts — 장비 슬롯(오른손/왼손·투구·갑옷·신발·망토·목걸이·반지)
 * ===================================================================== */
import { describe, expect, it } from "vitest";
import { GearDef } from "../defs";
import {
  Member, effectiveAttrs, equipAttrs, equipDefense, equipGear, equippedWeapon,
  memberResist, memberStats, weaponAtk,
} from "../state";

function mkMember(over: Partial<Member> = {}): Member {
  return {
    id: "a", name: "a", color: 0, accent: 0, portrait: 0,
    classId: "fighter", ld: null,
    attrs: { might: 10, int: 10, wit: 10, vital: 10, agi: 12, fortune: 10 },
    bonusSkills: [],
    level: 1, exp: 0,
    hp: 100, mp: 50, maxHp: 100, maxMp: 50,
    equip: {},
    back: false,
    apUnspent: 0, spUnspent: 0, trained: {}, learnedSpells: [],
    ...over,
  };
}
const sword: GearDef = { id: "sw", name: "검", slot: "mainHand", atk: 5, wtype: "slash", reach: "melee", price: 0 };
const dagger: GearDef = { id: "dg", name: "단검", slot: "offHand", atk: 4, wtype: "slash", reach: "melee", price: 0 };
const bow: GearDef = { id: "bw", name: "장궁", slot: "mainHand", atk: 16, wtype: "pierce", reach: "ranged", twoHanded: true, price: 0 };
const shield: GearDef = { id: "sh", name: "방패", slot: "offHand", def: 7, price: 0 };
const ring = (id: string, attrs: GearDef["attrs"]): GearDef => ({ id, name: "반지", slot: "ring", attrs, price: 0 });

describe("equippedWeapon — 오른손 무기 뷰 / 맨손 기본값", () => {
  it("빈 오른손은 맨손(때리기·근접·공격 0)", () => {
    const w = equippedWeapon(mkMember());
    expect(w).toEqual({ name: "맨손", atk: 0, wtype: "bludgeon", reach: "melee" });
  });
  it("장착 무기의 계열·사거리를 반영한다", () => {
    const m = mkMember(); equipGear(m, bow);
    expect(equippedWeapon(m)).toMatchObject({ wtype: "pierce", reach: "ranged", atk: 16 });
  });
});

describe("양손무기 / 듀얼윌드 / 반지 자동 슬롯", () => {
  it("양손무기를 오른손에 장착하면 왼손을 비운다", () => {
    const m = mkMember(); equipGear(m, shield); // 왼손 방패
    expect(m.equip.offHand?.name).toBe("방패");
    equipGear(m, bow); // 양손 장궁 → 왼손 해제
    expect(m.equip.mainHand?.name).toBe("장궁");
    expect(m.equip.offHand).toBeUndefined();
  });
  it("양손무기를 낀 채 왼손을 채우면 오른손(양손)이 해제된다", () => {
    const m = mkMember(); equipGear(m, bow);
    equipGear(m, shield);
    expect(m.equip.offHand?.name).toBe("방패");
    expect(m.equip.mainHand).toBeUndefined();
  });
  it("왼손 무기는 오른손과 공격력이 합산된다(듀얼윌드)", () => {
    const m = mkMember(); equipGear(m, sword); equipGear(m, dagger);
    expect(weaponAtk(m)).toBe(9);
    expect(memberStats(m).atk).toBe(10 + 9); // 근력 10 + 무기 9
  });
  it("반지는 빈 칸(ring1→ring2)에 자동 배치, 셋째는 ring1 교체", () => {
    const m = mkMember();
    expect(equipGear(m, ring("r1", { might: 1 }))).toBe("ring1");
    expect(equipGear(m, ring("r2", { might: 2 }))).toBe("ring2");
    expect(equipGear(m, ring("r3", { might: 3 }))).toBe("ring1");
    expect(m.equip.ring1?.attrs?.might).toBe(3);
    expect(m.equip.ring2?.attrs?.might).toBe(2);
  });
});

describe("스탯 합산 — 방어·능력치·저항이 파생 스탯에 반영", () => {
  it("여러 슬롯의 방어도가 합산된다", () => {
    const base = memberStats(mkMember()).def; // 장비 없는 기준(체력/2 + 스킬 랭크)
    const m = mkMember();
    equipGear(m, { id: "b", name: "갑옷", slot: "body", def: 9, price: 0 });
    equipGear(m, { id: "h", name: "투구", slot: "helmet", def: 3, price: 0 });
    equipGear(m, shield); // 왼손 방패 def 7
    expect(equipDefense(m)).toBe(19);
    expect(memberStats(m).def).toBe(base + 19); // 장비 방어도만큼 증가
  });
  it("장신구 능력치 보너스가 유효 능력치·공격/명중에 반영된다", () => {
    const m = mkMember();
    equipGear(m, ring("might", { might: 3 }));
    equipGear(m, { id: "amu", name: "목걸이", slot: "amulet", attrs: { fortune: 5 }, price: 0 });
    expect(equipAttrs(m).might).toBe(3);
    expect(effectiveAttrs(m).might).toBe(13);
    expect(memberStats(m).atk).toBe(13); // 근력 13(=10+3) + 맨손 0
    expect(memberStats(m).crit).toBeCloseTo(0.15, 5); // 운 15 → 15%
  });
  it("맨손 공격력 0은 오른손 미장착일 때만 (왼손 무기가 있으면 무장)", () => {
    const m = mkMember();
    expect(weaponAtk(m)).toBe(0);
    equipGear(m, dagger); // 왼손만
    expect(weaponAtk(m)).toBe(4);
  });
  it("전 슬롯 저항이 곱연산으로 합쳐진다(망토×목걸이)", () => {
    const m = mkMember();
    equipGear(m, { id: "cl", name: "망토", slot: "cloak", res: { fire: 0.9 }, price: 0 });
    equipGear(m, { id: "am", name: "목걸이", slot: "amulet", res: { fire: 0.5, dark: 0.8 }, price: 0 });
    const r = memberResist(m);
    expect(r.fire).toBeCloseTo(0.45, 5);
    expect(r.dark).toBeCloseTo(0.8, 5);
  });
});
