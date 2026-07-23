import { describe, expect, it } from "vitest";
import { CONSUMABLE_IDS, MATERIAL_IDS } from "../defs";
import { CONSUMABLE_ICON_FRAMES, MATERIAL_ICON_FRAMES } from "../item-icons";

describe("item icon catalog", () => {
  it("소모품마다 아이콘 프레임이 있다", () => {
    expect(Object.keys(CONSUMABLE_ICON_FRAMES).sort()).toEqual([...CONSUMABLE_IDS].sort());
  });

  it("조합 재료마다 아이콘 프레임이 있다", () => {
    expect(Object.keys(MATERIAL_ICON_FRAMES).sort()).toEqual([...MATERIAL_IDS].sort());
  });

  it("모든 프레임이 32px 시트 격자에 맞는다", () => {
    for (const frame of [
      ...Object.values(CONSUMABLE_ICON_FRAMES),
      ...Object.values(MATERIAL_ICON_FRAMES),
    ]) {
      expect(frame.x % 32).toBe(0);
      expect(frame.y % 32).toBe(0);
    }
  });
});
