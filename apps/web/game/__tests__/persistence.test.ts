import { beforeEach, describe, expect, it } from "vitest";
import { parseSave, SAVE_VERSION, serializeGame } from "../persistence";
import { PARTY_SLOTS } from "../defs";
import { G, newGame } from "../state";

const configs = PARTY_SLOTS.map((slot, i) => ({
  slotId: slot.id,
  name: slot.name, portrait: i, classId: "fighter" as const, bonusSkills: [],
  attrs: { might: 10, int: 10, wit: 10, vital: 10, agi: 10, fortune: 10 },
}));

describe("버전 세이브", () => {
  beforeEach(() => newGame(configs));

  it("현재 상태를 왕복 직렬화한다", () => {
    G.gold = 777;
    G.townWorld!.day = 3;
    const parsed = parseSave(serializeGame());
    expect(parsed.gold).toBe(777);
    expect(parsed.townWorld?.day).toBe(3);
    expect(parsed.party.map((m) => m.id)).toEqual(PARTY_SLOTS.map((slot) => slot.id));
    expect(parsed).not.toBe(G);
  });

  it("깨진 JSON과 알 수 없는 버전을 거부한다", () => {
    expect(() => parseSave("{")).toThrow("JSON");
    expect(() => parseSave(JSON.stringify({ version: SAVE_VERSION + 1, state: G }))).toThrow("버전");
  });

  it("v2 세이브(사원 상태 없음)를 v3로 마이그레이션한다", () => {
    const legacy = JSON.parse(serializeGame());
    legacy.version = 2;
    delete legacy.state.temple;
    legacy.state.explore.lordIntroSeen = true;
    delete legacy.state.explore.introSeen;
    legacy.state.explore.chestOpened = { c1: true, hidden: false };
    const parsed = parseSave(JSON.stringify(legacy));
    expect(parsed.temple).toBeDefined();
    expect(parsed.temple.enemies.length).toBeGreaterThan(0);
    expect(parsed.explore.introSeen.lord).toBe(true);
    expect(parsed.explore.chestOpened.c1).toBe(true);
  });

  it("v1 통합 원소·영혼 숙련을 v2의 9개 학파로 마이그레이션한다", () => {
    const legacy = JSON.parse(serializeGame());
    legacy.version = 1;
    legacy.state.party[0].bonusSkills = ["elemental", "spirit"];
    legacy.state.party[0].trained = { elemental: 2, spirit: 1 };
    const parsed = parseSave(JSON.stringify(legacy));
    expect(parsed.party[0].bonusSkills).toEqual(expect.arrayContaining([
      "fire", "water", "earth", "wind", "spirit", "mind", "body",
    ]));
    expect(parsed.party[0].trained.fire).toBe(2);
    expect(parsed.party[0].trained.water).toBe(2);
    expect(parsed.party[0].trained.spirit).toBe(1);
    expect(parsed.party[0].trained.mind).toBe(1);
    expect(parsed.party[0].trained.body).toBe(1);
  });
});
