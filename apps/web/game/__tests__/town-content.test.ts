import { describe, expect, it } from "vitest";
import { keeperSays, townContentUnlocked } from "../town/content";

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

describe("keeperSays", () => {
  it("시설 담당자 이름과 구어체 대사를 한 줄로 표시한다", () => {
    const keeper = { name: "미리", role: "상인", portrait: 1, greeting: "어서 와요." };
    expect(keeperSays(keeper, "필요한 걸 골라 봐요.")).toBe("미리  “필요한 걸 골라 봐요.”");
  });
});
