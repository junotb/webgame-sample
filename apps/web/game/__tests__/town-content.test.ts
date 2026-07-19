import { describe, expect, it } from "vitest";
import { townContentUnlocked } from "../town/content";

const context = {
  questCompleted: (id: string) => id === "done",
  flagEnabled: (id: "intro" | "ending" | "letter") => id === "letter",
  partyLevel: 4,
};

describe("townContentUnlocked", () => {
  it("퀘스트·플래그·레벨 조건을 함께 판정한다", () => {
    expect(townContentUnlocked({ quests: ["done"], flags: ["letter"], minLevel: 4 }, context)).toBe(true);
    expect(townContentUnlocked({ quests: ["missing"] }, context)).toBe(false);
    expect(townContentUnlocked({ flags: ["ending"] }, context)).toBe(false);
    expect(townContentUnlocked({ minLevel: 5 }, context)).toBe(false);
  });
});
