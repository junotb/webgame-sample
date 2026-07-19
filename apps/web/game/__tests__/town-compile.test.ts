import { describe, expect, it } from "vitest";
import { compileTown } from "../town/compile";
import type { TownData } from "../town/types";
import { TOWNS } from "../towns";

const crossvale = TOWNS.crossvale;
const withChanges = (changes: Partial<TownData>): TownData => ({ ...crossvale, ...changes });

describe("compileTown", () => {
  it("같은 좌표의 NPC를 거부한다", () => {
    const npcs = [
      { id: "first", gx: 12, gy: 5 },
      { id: "second", gx: 12, gy: 5 },
    ];

    expect(() => compileTown(crossvale, npcs)).toThrow(/NPC 좌표 중복 \(12,5\)/);
  });

  it("문이 아닌 칸에 배치한 시설을 거부한다", () => {
    const facilities = [
      { ...crossvale.facilities[0], x: 12, y: 5 },
      ...crossvale.facilities.slice(1),
    ];

    expect(() => compileTown(withChanges({ facilities }), [])).toThrow(/문 칸에 있지 않음/);
  });

  it("진입 지점과 다른 배치의 겹침을 거부한다", () => {
    const start = crossvale.starts.gate!;
    const npc = { id: "gatekeeper", gx: start.x, gy: start.y };

    expect(() => compileTown(crossvale, [npc])).toThrow(/진입 지점 'gate'.*겹침/);
  });

  it("진입 지점에서 고립된 통행 칸을 거부한다", () => {
    const cells = [...crossvale.map.cells];
    cells[0] = "floor";
    const map = { ...crossvale.map, cells };

    expect(() => compileTown(withChanges({ map }), [])).toThrow(/도달할 수 없는 통행 칸 \(0,0\)/);
  });
});
