import { describe, expect, it } from "vitest";
import { createInitialState } from "./game-state";
import { SKILL_LABELS } from "../core/reducer";
import { skillLevelOf } from "../core/skills";

describe("createInitialState", () => {
  it("Phase 0 확정값으로 Day 1 morning 상태를 만든다", () => {
    expect(createInitialState(42)).toEqual({
      account: { ownedEpisodes: ["ep1"] },
      self: {
        stats: { repair: 40, insight: 35, procedure: 30, nerve: 25 },
        skills: {
          flowsense: 1,
          incantation: 1,
          inscription: 1,
          flame: 1,
          frost: 0,
        },
        skillXp: {
          flowsense: 0,
          incantation: 0,
          inscription: 0,
          flame: 0,
          frost: 0,
        },
        memory: 0,
        rank: 0,
      },
      world: {
        calendar: { day: 1, weekday: 1 },
        assignment: { zone: "d5" },
        weekRatings: {},
        weekTally: { processed: 0, notPassed: 0, perfect: 0 },
        ending: null,
        weekend: null,
        cardNeglect: {},
        multiday: null,
        archive: [],
        phase: "morning",
        zones: { d2: { stagnation: 3 }, d5: { stagnation: 4 }, d7: { stagnation: 5 } },
        menace: { fatigue: 0, scrutiny: 0, unrest: 0 },
        npcs: { returned: { trust: 0 } },
        flags: {},
        shiftLeft: 2,
        pendingOrders: [],
        activeOrder: null,
        seed: 42,
      },
    });
  });

  /**
   * 기술 5종 (design-structure §2).
   * 언어 3종(감류학=듣기 / 영창술=말하기 / 각인학=쓰기) + 술법 2종(화염술 · 빙결술).
   */
  it("기술은 5종이며 표기는 언어 3종 → 술법 2종 순서다", () => {
    expect(Object.keys(SKILL_LABELS)).toEqual([
      "flowsense",
      "incantation",
      "inscription",
      "flame",
      "frost",
    ]);
    expect(Object.values(SKILL_LABELS)).toEqual([
      "감류학",
      "영창술",
      "각인학",
      "화염술",
      "빙결술",
    ]);
  });

  it("빙결술만 미습득(0)에서 시작한다 — 나머지 4종은 신입 기본 소양 1등급", () => {
    const { skills, skillXp } = createInitialState().self;
    expect(skills.frost).toBe(0);
    for (const id of [
      "flowsense",
      "incantation",
      "inscription",
      "flame",
    ] as const) {
      expect(skills[id]).toBe(1);
    }
    // 등급은 경험치에서 파생된다 — 시작 경험치는 전부 0이고 등급 1이 그 파생값이다
    expect(Object.values(skillXp).every((xp) => xp === 0)).toBe(true);
    expect(skillLevelOf(0)).toBe(1);
  });

  it("호출마다 독립된 상태 객체를 반환한다", () => {
    const first = createInitialState();
    first.world.zones.d2.stagnation = 9;

    expect(createInitialState().world.zones.d2.stagnation).toBe(3);
  });
});
