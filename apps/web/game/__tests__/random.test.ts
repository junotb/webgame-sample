import { describe, expect, it } from "vitest";
import { gameplayRandom, seededRandom, setGameplayRandom } from "../core/random";

describe("결정적 RNG", () => {
  it("같은 시드는 같은 수열을 만든다", () => {
    const a = seededRandom(42), b = seededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("게임 판정 난수원을 주입하고 원복한다", () => {
    const restore = setGameplayRandom(() => 0.25);
    expect(gameplayRandom()).toBe(0.25);
    restore();
    expect(gameplayRandom()).toBeGreaterThanOrEqual(0);
  });
});
