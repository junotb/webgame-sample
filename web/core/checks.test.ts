import { describe, it, expect } from "vitest";
import {
  clamp,
  broadProbability,
  narrowProbability,
  checkProbability,
  mulberry32,
  rollCheck,
} from "./checks";

// 스펙 3장 확정값:
// Broad:  p = clamp(0.6 × stat / difficulty, 0.05, 1.0)
// Narrow: p = clamp(0.5 + (skill − difficulty) × 0.1, 0.1, 1.0)

describe("clamp", () => {
  it("경계 안 값은 그대로", () => expect(clamp(0.5, 0.05, 1)).toBe(0.5));
  it("하한/상한에 정확히 걸리는 값", () => {
    expect(clamp(0.05, 0.05, 1)).toBe(0.05);
    expect(clamp(1, 0.05, 1)).toBe(1);
  });
  it("범위 밖은 잘림", () => {
    expect(clamp(-3, 0.05, 1)).toBe(0.05);
    expect(clamp(42, 0.05, 1)).toBe(1);
  });
});

describe("broadProbability — p = clamp(0.6·stat/diff, 0.05, 1.0)", () => {
  it("일반값: stat 40, diff 60 → 0.4", () => {
    expect(broadProbability(40, 60)).toBeCloseTo(0.4, 10);
  });

  it("하한 경계: 0.6·stat/diff = 0.05가 되는 정확한 지점", () => {
    // stat 1, diff 12 → 0.6/12 = 0.05 (클램프 직전 경계)
    expect(broadProbability(1, 12)).toBeCloseTo(0.05, 10);
  });
  it("하한 미만은 0.05로 클램프 (stat 1, diff 100 → 0.006)", () => {
    expect(broadProbability(1, 100)).toBe(0.05);
  });
  it("stat 0이면 0이 아니라 하한 0.05", () => {
    expect(broadProbability(0, 50)).toBe(0.05);
  });

  it("상한 경계: 0.6·stat/diff = 1.0이 되는 정확한 지점 (stat 100, diff 60)", () => {
    expect(broadProbability(100, 60)).toBeCloseTo(1.0, 10);
  });
  it("상한 초과는 1.0으로 클램프 (stat 100, diff 30 → 2.0)", () => {
    expect(broadProbability(100, 30)).toBe(1.0);
  });

  it("difficulty 0 이하는 자동 성공(1.0)으로 취급 — 0 나눗셈 가드", () => {
    expect(broadProbability(0, 0)).toBe(1.0);
    expect(broadProbability(40, 0)).toBe(1.0);
    expect(broadProbability(40, -1)).toBe(1.0);
  });
});

describe("narrowProbability — p = clamp(0.5 + (skill−diff)·0.1, 0.1, 1.0)", () => {
  it("동률: skill = diff → 0.5", () => {
    expect(narrowProbability(3, 3)).toBeCloseTo(0.5, 10);
  });
  it("±1 차이 → 0.6 / 0.4", () => {
    expect(narrowProbability(4, 3)).toBeCloseTo(0.6, 10);
    expect(narrowProbability(2, 3)).toBeCloseTo(0.4, 10);
  });

  it("하한 경계: skill − diff = −4 → 정확히 0.1", () => {
    expect(narrowProbability(1, 5)).toBeCloseTo(0.1, 10);
  });
  it("하한 미만은 0.1로 클램프 (skill − diff = −5 → 0.0)", () => {
    expect(narrowProbability(0, 5)).toBe(0.1);
    expect(narrowProbability(0, 7)).toBe(0.1);
  });

  it("상한 경계: skill − diff = +5 → 정확히 1.0", () => {
    expect(narrowProbability(5, 0)).toBeCloseTo(1.0, 10);
  });
  it("상한 초과는 1.0으로 클램프 (skill − diff = +7)", () => {
    expect(narrowProbability(7, 0)).toBe(1.0);
  });
});

describe("checkProbability — Check 객체 디스패치", () => {
  it("broad", () => {
    expect(
      checkProbability(
        { kind: "broad", stat: "repair", difficulty: 60 },
        { repair: 40, insight: 35, procedure: 30, nerve: 25 },
        { flowsense: 1, incantation: 1, inscription: 1, flame: 1, frost: 0 },
      ),
    ).toBeCloseTo(0.4, 10);
  });
  it("narrow", () => {
    expect(
      checkProbability(
        { kind: "narrow", skill: "inscription", difficulty: 1 },
        { repair: 40, insight: 35, procedure: 30, nerve: 25 },
        { flowsense: 1, incantation: 1, inscription: 1, flame: 1, frost: 0 },
      ),
    ).toBeCloseTo(0.5, 10);
  });
  it("auto는 항상 1.0", () => {
    expect(
      checkProbability(
        { kind: "auto" },
        { repair: 0, insight: 0, procedure: 0, nerve: 0 },
        { flowsense: 0, incantation: 0, inscription: 0, flame: 0, frost: 0 },
      ),
    ).toBe(1.0);
  });
});

describe("mulberry32 — seedable PRNG 재현성", () => {
  it("같은 시드 → 같은 수열", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });
  it("다른 시드 → 다른 첫 값", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
  it("출력은 [0, 1) 범위", () => {
    const rng = mulberry32(999);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("rollCheck — roll < p 성공, 같은 시드는 같은 결과", () => {
  const stats = { repair: 40, insight: 35, procedure: 30, nerve: 25 } as const;
  const skills = {
    flowsense: 1,
    incantation: 1,
    inscription: 1,
    flame: 1,
    frost: 0,
  } as const;

  it("p = 1.0이면 어떤 roll에도 성공 (roll < p, roll은 1 미만)", () => {
    const result = rollCheck({ kind: "auto" }, stats, skills, mulberry32(7));
    expect(result.success).toBe(true);
    expect(result.p).toBe(1.0);
  });
  it("같은 시드로 두 번 굴리면 결과·roll 동일", () => {
    const check = { kind: "broad", stat: "repair", difficulty: 60 } as const;
    const r1 = rollCheck(check, stats, skills, mulberry32(42));
    const r2 = rollCheck(check, stats, skills, mulberry32(42));
    expect(r1).toEqual(r2);
  });
  it("성공 판정은 roll < p 와 일치", () => {
    const check = {
      kind: "narrow",
      skill: "flowsense",
      difficulty: 3,
    } as const; // p = 0.3
    const rng = mulberry32(2026);
    const roll = mulberry32(2026)(); // 동일 시드로 roll 값을 미리 확인
    const result = rollCheck(check, stats, skills, rng);
    expect(result.roll).toBe(roll);
    expect(result.success).toBe(roll < result.p);
  });
});
