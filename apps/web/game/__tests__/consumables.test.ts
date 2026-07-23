/* =====================================================================
 * consumables.test.ts — 소모품·재료·조합 (엔진 아이템 사용 포함)
 * ===================================================================== */
import { describe, expect, it } from "vitest";
import {
  CONSUMABLES, CONSUMABLE_IDS, CRAFT_RECIPES, ENEMY_DEFS, MATERIALS,
  canCraft, emptyItems, emptyMats, materialOf, rollMaterialDrop,
} from "../defs";
import { Member } from "../state";
import { BattleEngine } from "../core/battle-engine";
import { upsertStatus } from "../core/statuses";

function mkMember(id: string, over: Partial<Member> = {}): Member {
  return {
    id, name: id, color: 0, accent: 0, portrait: 0,
    classId: "fighter", ld: null,
    attrs: { might: 10, int: 10, wit: 10, vital: 10, agi: 12, fortune: 10 },
    bonusSkills: [],
    level: 1, exp: 0,
    hp: 100, mp: 50, maxHp: 100, maxMp: 50,
    equip: {},
    back: false,
    apUnspent: 0, spUnspent: 0, trained: {},
    ...over,
  };
}
const flat = (x: number) => () => x;

describe("소모품 정의", () => {
  it("모든 소모품은 회복·부활·해제·버프 중 하나 이상의 효과를 가진다", () => {
    for (const id of CONSUMABLE_IDS) {
      const c = CONSUMABLES[id];
      expect(c.hp || c.mp || c.full || c.cure || c.buff, id).toBeTruthy();
      expect(c.price).toBeGreaterThan(0);
    }
  });

  it("조합법의 산출물과 재료는 전부 정의되어 있다", () => {
    for (const r of CRAFT_RECIPES) {
      expect(CONSUMABLES[r.out]).toBeDefined();
      for (const k of Object.keys(r.mats)) expect(MATERIALS[k as keyof typeof MATERIALS]).toBeDefined();
    }
  });

  it("canCraft — 재료가 모자라면 거부한다", () => {
    const recipe = CRAFT_RECIPES[0]; // potion: flask1 + herb2
    const mats = emptyMats();
    expect(canCraft(recipe, mats)).toBe(false);
    mats.flask = 1; mats.herb = 2;
    expect(canCraft(recipe, mats)).toBe(true);
  });
});

describe("재료 드랍", () => {
  it("종족 태그별 재료 — 고블린(인간형)은 빈 플라스크, 슬라임(점액)은 점액 응고물", () => {
    expect(materialOf(ENEMY_DEFS.goblin)).toBe("flask");
    expect(materialOf(ENEMY_DEFS.slime)).toBe("gel");
  });

  it("rollMaterialDrop — rng가 확률 이하면 드랍, 아니면 null", () => {
    expect(rollMaterialDrop(ENEMY_DEFS.goblin, 10, flat(0.01))).toBe("flask");
    expect(rollMaterialDrop(ENEMY_DEFS.goblin, 10, flat(0.99))).toBeNull();
  });
});

describe("엔진 아이템 사용", () => {
  function engineWith(items: Partial<Record<string, number>>, member = mkMember("a")) {
    const engine = new BattleEngine([member], ["goblin"], {
      items: { ...emptyItems(), ...items }, rng: flat(0.5),
    });
    engine.gridEnter();
    return { engine, member };
  }

  it("고급 치유 물약 — HP 150 회복, 전투불능도 일으킨다", () => {
    const m = mkMember("a", { hp: 0, maxHp: 200 });
    const { engine } = engineWith({ potion2: 1 }, m);
    const ev = engine.gridItem("potion2", "a");
    expect(m.hp).toBe(150);
    expect(ev.some((e) => e.t === "healed" && e.resource === "hp")).toBe(true);
  });

  it("부활의 성수 — 전투불능 아군을 HP 전량으로 일으키고 해로운 상태를 정화한다", () => {
    const m = mkMember("a", { hp: 0, maxHp: 140 });
    const { engine } = engineWith({ elixir: 1 }, m);
    upsertStatus(engine.allies[0].statuses, { id: "poison", turns: 3, power: 5 });
    engine.gridItem("elixir", "a");
    expect(m.hp).toBe(140);
    expect(engine.allies[0].statuses.some((s) => s.id === "poison")).toBe(false);
  });

  it("해독제 — 중독·출혈·화상만 해제하고 다른 해로운 상태는 남긴다", () => {
    const { engine } = engineWith({ antidote: 1 });
    upsertStatus(engine.allies[0].statuses, { id: "poison", turns: 3, power: 5 });
    upsertStatus(engine.allies[0].statuses, { id: "fear", turns: 3 });
    const ev = engine.gridItem("antidote", "a");
    expect(engine.allies[0].statuses.some((s) => s.id === "poison")).toBe(false);
    expect(engine.allies[0].statuses.some((s) => s.id === "fear")).toBe(true);
    expect(ev.some((e) => e.t === "status" && e.status === "poison" && !e.on)).toBe(true);
  });

  it("만병통치약 — 모든 해로운 상태를 해제한다", () => {
    const { engine } = engineWith({ panacea: 1 });
    upsertStatus(engine.allies[0].statuses, { id: "paralyze", turns: 2 });
    upsertStatus(engine.allies[0].statuses, { id: "burn", turns: 3, power: 4 });
    engine.gridItem("panacea", "a");
    expect(engine.allies[0].statuses.length).toBe(0);
  });

  it("힘의 비약 — atkup 버프를 지속 턴과 함께 건다", () => {
    const { engine } = engineWith({ atk_tonic: 1 });
    const ev = engine.gridItem("atk_tonic", "a");
    const buff = engine.allies[0].statuses.find((s) => s.id === "atkup");
    expect(buff?.power).toBe(25);
    expect(buff?.turns).toBe(3);
    expect(ev.some((e) => e.t === "status" && e.status === "atkup" && e.on)).toBe(true);
  });

  it("아이템 사용은 보유 수량을 1 줄인다", () => {
    const items = { ...emptyItems(), mpotion2: 2 };
    const m = mkMember("a", { mp: 0 });
    const engine = new BattleEngine([m], ["goblin"], { items, rng: flat(0.5) });
    engine.gridEnter();
    engine.gridItem("mpotion2", "a");
    expect(items.mpotion2).toBe(1);
    expect(m.mp).toBe(50); // 60 회복이지만 최대 50 캡
  });
});
