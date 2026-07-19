import { beforeEach, describe, expect, it } from "vitest";
import { PARTY_SLOTS } from "../defs";
import { G, newGame } from "../state";
import { advanceTownTime, enterTown, ensureTownWorld, townTime } from "../town/world-state";

const configs = PARTY_SLOTS.map((slot, index) => ({
  slotId: slot.id, name: slot.name, portrait: index, classId: "fighter" as const, bonusSkills: [],
  attrs: { might: 10, int: 10, wit: 10, vital: 10, agi: 10, fortune: 10 },
}));

describe("마을 월드 시계", () => {
  beforeEach(() => newGame(configs));

  it("진입과 숙박으로 날짜·시간·방문 횟수가 흐른다", () => {
    enterTown(G, "crossvale");
    expect(ensureTownWorld(G).visits.crossvale).toBe(1);
    expect(townTime(G).label).toBe("1일 08:30");

    advanceTownTime(G, 12 * 60);
    expect(townTime(G)).toMatchObject({ day: 1, phase: "night", label: "1일 20:30" });
    advanceTownTime(G, 5 * 60);
    expect(townTime(G)).toMatchObject({ day: 2, phase: "night", label: "2일 01:30" });
  });

  it("구버전 상태에는 기본 시계를 지연 생성한다", () => {
    G.townWorld = undefined;
    expect(ensureTownWorld(G)).toEqual({ day: 1, minuteOfDay: 480, visits: {} });
  });
});
