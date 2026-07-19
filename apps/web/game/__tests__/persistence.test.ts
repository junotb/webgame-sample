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
});
