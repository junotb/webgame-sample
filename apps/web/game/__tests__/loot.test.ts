/* =====================================================================
 * loot.test.ts — 랜덤 드랍·희귀도·인챈트 생성 + 가방(인벤토리)·감정
 * ===================================================================== */
import { beforeEach, describe, expect, it } from "vitest";
import {
  PARTY_SLOTS, RARITIES, SHOP_ARMORS, SHOP_WEAPONS, SkillId,
  _resetUid, basePool, generateGear, rollDrop, rollRarity,
} from "../defs";
import {
  G, addDrop, equipFromBag, identifyGear, newGame, sellGear, sellPrice, partyIdentifyRank,
} from "../state";

const sword = SHOP_WEAPONS.find((g) => g.id === "w1")!;   // 강철 검 atk5
const chain = SHOP_ARMORS.find((g) => g.id === "a1")!;    // 사슬 갑옷 def4
const flat = (x: number) => () => x;

describe("generateGear — 희귀도별 접사 수·적용·감정 상태", () => {
  beforeEach(() => _resetUid());
  it("평범은 접사 없음·즉시 감정, 스탯은 기반 그대로", () => {
    const o = generateGear(sword, "common", flat(0));
    expect(o.affixes).toEqual([]);
    expect(o.identified).toBe(true);
    expect(o.atk).toBe(5);
    expect(o.name).toBe("강철 검");
  });
  it("마법은 접사 1개·미확인(감정 필요), 접사가 스탯에 반영", () => {
    const o = generateGear(sword, "magic", flat(0)); // rng0 → 무기풀 첫 접사 '힘의'(might+2)
    expect(o.affixes.length).toBe(1);
    expect(o.identified).toBe(false);
    expect(o.attrs?.might).toBe(2);
    expect(o.name).toBe("힘의 강철 검");
    expect(o.price).toBe(sword.price + 100);
  });
  it("희귀는 접사 2개(서로 다름)", () => {
    const o = generateGear(sword, "rare", flat(0)); // 힘의 → 곰의
    expect(o.affixes.length).toBe(2);
    expect(o.attrs?.might).toBe(2);
    expect(o.attrs?.vital).toBe(2);
    expect(o.name).toBe("힘의 곰의 강철 검");
  });
  it("방어구 접사 — 견고한(def+3)·저항 접사가 붙는다", () => {
    const ward = generateGear(chain, "magic", flat(0.97)); // 방어구풀 끝 '견고한'
    expect(ward.def).toBe(chain.def! + 3);
    expect(ward.affixes[0]).toBe("견고한");
    const res = generateGear(chain, "magic", flat(0.58)); // 불수호의
    expect(res.res?.fire).toBeCloseTo(0.8, 5);
  });
});

describe("rollRarity / rollDrop / basePool", () => {
  it("모든 희귀도는 RARITIES 안에 있다", () => {
    for (const t of ["일반", "정예", "보스", "에픽"] as const)
      expect(RARITIES).toContain(rollRarity(t, flat(0.99)));
  });
  it("basePool은 티어 이하 밴드만 — 일반은 저가, 에픽은 전체", () => {
    const low = basePool("일반");
    expect(low.every((g) => g.price < 200)).toBe(true);
    expect(basePool("에픽").length).toBe(SHOP_WEAPONS.length + SHOP_ARMORS.length);
  });
  it("드랍 확률 판정 — 굴림이 낮으면 획득, 높으면 null (일반)", () => {
    expect(rollDrop("일반", 0, flat(0.05))).not.toBeNull();
    expect(rollDrop("일반", 0, flat(0.99))).toBeNull();
  });
  it("보스는 항상 드랍(확률 1.0)", () => {
    expect(rollDrop("보스", 0, flat(0.99))).not.toBeNull();
  });
});

/* ---- 가방(인벤토리)·감정: G 상태가 필요하므로 newGame으로 부팅 ---- */
function boot(): void {
  newGame(PARTY_SLOTS.map((s) => ({
    slotId: s.id, name: s.name, portrait: 1, classId: "fighter", bonusSkills: [] as SkillId[],
    attrs: { might: 10, int: 10, wit: 10, vital: 10, agi: 10, fortune: 10 },
  })));
}

describe("addDrop / identifyGear — 식별 랭크 게이팅", () => {
  beforeEach(() => { _resetUid(); boot(); });
  it("식별 랭크가 없으면 마법 이상은 미확인으로 들어온다", () => {
    expect(partyIdentifyRank()).toBe(0);
    addDrop(generateGear(sword, "magic", flat(0)));
    expect(G.bag[0].identified).toBe(false);
  });
  it("식별 랭크가 충분하면 획득 즉시 감정된다", () => {
    G.party[0].trained.identify = 1;             // 노비스 식별
    expect(partyIdentifyRank()).toBe(1);
    addDrop(generateGear(sword, "magic", flat(0))); // magic idReq 1
    expect(G.bag[0].identified).toBe(true);
  });
  it("감정은 랭크 부족 시 실패, 충분하면 성공", () => {
    const o = generateGear(sword, "rare", flat(0)); // rare idReq 2
    addDrop(o);
    expect(identifyGear(o.uid)).toBe(false);      // 랭크 0 < 2
    G.party[0].trained.identify = 2;              // 전문가
    expect(identifyGear(o.uid)).toBe(true);
    expect(G.bag[0].identified).toBe(true);
  });
});

describe("equipFromBag / sellGear — 장착 시 교체품 회수·판매", () => {
  beforeEach(() => { _resetUid(); boot(); });
  it("가방 무기를 장착하면 기존 무기가 가방으로 돌아온다", () => {
    const o = generateGear(sword, "common", flat(0)); // 감정 완료
    addDrop(o);
    const m = G.party[0];
    const oldName = m.equip.mainHand!.name;           // 낡은 검
    expect(G.bag.length).toBe(1);
    expect(equipFromBag(m, o.uid)).toBe(true);
    expect(m.equip.mainHand!.name).toBe("강철 검");
    expect(G.bag.length).toBe(1);                     // 교체품 회수로 개수 유지
    expect(G.bag[0].name).toBe(oldName);
  });
  it("미확인 장비는 장착 불가", () => {
    const o = generateGear(sword, "magic", flat(0));  // 미확인
    addDrop(o);
    expect(equipFromBag(G.party[0], o.uid)).toBe(false);
  });
  it("양손무기 장착 시 왼손 장비도 가방으로 회수된다", () => {
    const m = G.party[0];
    m.equip.offHand = { name: "방패", def: 5 };
    const bow = generateGear(SHOP_WEAPONS.find((g) => g.id === "w8")!, "common", flat(0)); // 장궁(양손)
    addDrop(bow);
    equipFromBag(m, bow.uid);
    expect(m.equip.mainHand!.name).toBe("장궁");
    expect(m.equip.offHand).toBeUndefined();
    expect(G.bag.some((x) => x.name === "방패")).toBe(true); // 왼손 방패 회수
  });
  it("판매하면 가방에서 빠지고 골드가 판매가만큼 는다", () => {
    const o = generateGear(sword, "common", flat(0));
    addDrop(o);
    const gold0 = G.gold;
    const got = sellGear(o.uid);
    expect(got).toBe(sellPrice(o));
    expect(G.gold).toBe(gold0 + got);
    expect(G.bag.length).toBe(0);
  });
});
