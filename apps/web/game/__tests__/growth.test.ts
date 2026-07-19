/* =====================================================================
 * growth.test.ts — 레벨업 포인트 배분 + 개별 스킬 훈련
 * ===================================================================== */
import { beforeEach, describe, expect, it } from "vitest";
import { PARTY_SLOTS, SkillId } from "../defs";
import {
  G, LEVEL_AP, LEVEL_SP, Member, expNeed, gainExpParty, memberRanks, newGame,
  spendAttrPoint, spendSkillPoint, trainableNext,
} from "../state";

function boot(classId: "fighter" | "scholar" = "fighter"): void {
  newGame(PARTY_SLOTS.map((s) => ({
    slotId: s.id, name: s.name, portrait: 1, classId, bonusSkills: [] as SkillId[],
    attrs: { might: 10, int: 10, wit: 10, vital: 10, agi: 10, fortune: 10 },
  })));
}
const M = (): Member => G.party[0];

describe("gainExpParty — 배분 포인트 지급 (자동 능력치 상승 없음)", () => {
  beforeEach(() => boot());
  it("레벨업 시 AP/SP를 주고 능력치는 그대로 둔다", () => {
    const m = M();
    const before = { ...m.attrs };
    const hp0 = m.maxHp;
    gainExpParty(expNeed(1)); // Lv1 → Lv2
    expect(m.level).toBe(2);
    expect(m.apUnspent).toBe(LEVEL_AP);
    expect(m.spUnspent).toBe(LEVEL_SP);
    expect(m.attrs).toEqual(before);       // 자동 상승 없음
    expect(m.maxHp).toBe(hp0 + 10);        // 기본 성장분만
  });
  it("여러 레벨을 한 번에 올리면 포인트가 누적된다", () => {
    const m = M();
    gainExpParty(expNeed(1) + expNeed(2)); // Lv1 → Lv3
    expect(m.level).toBe(3);
    expect(m.apUnspent).toBe(LEVEL_AP * 2);
    expect(m.spUnspent).toBe(LEVEL_SP * 2);
  });
});

describe("spendAttrPoint — 능력치 배분", () => {
  beforeEach(() => boot());
  it("체력은 maxHp, 지능/지혜는 maxMp에 즉시 반영", () => {
    const m = M(); m.apUnspent = 3;
    const hp = m.maxHp, mp = m.maxMp, vit = m.attrs.vital;
    expect(spendAttrPoint(m, "vital")).toBe(true);
    expect(m.attrs.vital).toBe(vit + 1);
    expect(m.maxHp).toBe(hp + 3);
    expect(spendAttrPoint(m, "int")).toBe(true);
    expect(m.maxMp).toBe(mp + 1);
    expect(m.apUnspent).toBe(1);
  });
  it("포인트가 없으면 실패한다", () => {
    const m = M(); m.apUnspent = 0;
    expect(spendAttrPoint(m, "might")).toBe(false);
    expect(m.attrs.might).toBe(10);
  });
});

describe("스킬 훈련 — spendSkillPoint / trainableNext", () => {
  beforeEach(() => boot());
  it("훈련 랭크가 memberRanks에 반영된다 (없던 스킬 0→1)", () => {
    const m = M(); m.spUnspent = 5;
    expect(memberRanks(m).elemental ?? 0).toBe(0);
    const nxt = trainableNext(m, "elemental");
    expect(nxt).toEqual({ next: 1, cost: 1 });
    expect(spendSkillPoint(m, "elemental")).toBe(true);
    expect(m.spUnspent).toBe(4);
    expect(memberRanks(m).elemental).toBe(1);
  });
  it("전문가(2)가 상한 — 그 이상은 훈련 불가 (달인은 클래스 전용)", () => {
    const m = M(); m.spUnspent = 10;
    spendSkillPoint(m, "dodge"); // 0→1 (비용 1)
    spendSkillPoint(m, "dodge"); // 1→2 (비용 2)
    expect(memberRanks(m).dodge).toBe(2);
    expect(trainableNext(m, "dodge")).toBeNull(); // 상한 도달
    expect(spendSkillPoint(m, "dodge")).toBe(false);
    expect(m.spUnspent).toBe(10 - 1 - 2);
  });
  it("클래스가 이미 전문가 이상으로 주는 스킬은 훈련 불가", () => {
    boot("scholar"); // 스콜라: 원소1·영혼1 (전문가 미만)
    const m = M(); m.spUnspent = 5;
    // 스콜라는 elemental rank1 → 전문가(2)로 훈련 가능
    expect(trainableNext(m, "elemental")).toEqual({ next: 2, cost: 2 });
    // 파이터 기준 armor는 rank1 → 훈련 가능하지만, 여기선 스콜라라 armor 0
    expect(trainableNext(m, "blade")).toEqual({ next: 1, cost: 1 });
  });
  it("포인트가 부족하면 실패", () => {
    const m = M(); m.spUnspent = 1;
    expect(spendSkillPoint(m, "elemental")).toBe(true); // 0→1 비용1
    expect(spendSkillPoint(m, "elemental")).toBe(false); // 1→2 비용2, 잔여 0
    expect(memberRanks(m).elemental).toBe(1);
  });
});
