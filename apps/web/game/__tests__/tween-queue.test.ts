import { describe, expect, it } from "vitest";
import { TweenQueue } from "../core/tween-queue";

const linear = (t: number) => t;

describe("TweenQueue", () => {
  it("완료 콜백이 씬 트윈을 모두 취소해도 현재 프레임 순회가 깨지지 않는다", () => {
    const queue = new TweenQueue();
    const cancelled = { x: 0 };
    const completed = { x: 0 };

    queue.add({
      obj: cancelled,
      from: { x: 0 },
      to: { x: 1 },
      dur: 200,
      ease: linear,
      global: false,
    });
    queue.add({
      obj: completed,
      from: { x: 0 },
      to: { x: 1 },
      dur: 100,
      ease: linear,
      global: false,
      onDone: () => queue.cancelSceneTweens(),
    });

    expect(() => queue.tick(100)).not.toThrow();
    expect(completed.x).toBe(1);
    expect(cancelled.x).toBe(0);

    queue.tick(200);
    expect(cancelled.x).toBe(0);
  });
});
