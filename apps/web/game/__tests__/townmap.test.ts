/* =====================================================================
 * townmap.test.ts — 마을 맵 데이터 정합성 검증
 * ===================================================================== */
import { describe, expect, it } from "vitest";
import { NPCS } from "../defs";
import { cellAt, passable } from "../grid";
import {
  TOWN_DECOS, TOWN_FACILITIES, TOWN_GATES, TOWN_STARTS, townMap,
} from "../townmap";

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;

describe("마을 맵 규칙", () => {
  it("진입 지점은 통행 가능하고 차단 POI와 겹치지 않는다", () => {
    const blocked = new Set([
      ...TOWN_DECOS.map((d) => `${d.x},${d.y}`),
      ...NPCS.map((n) => `${n.gx},${n.gy}`),
    ]);
    for (const s of Object.values(TOWN_STARTS)) {
      expect(passable(townMap, s.x, s.y)).toBe(true);
      expect(blocked.has(`${s.x},${s.y}`)).toBe(false);
    }
  });

  it("시설 위치는 문(+) 칸이고, 접근 가능한 정면 칸이 있다", () => {
    for (const f of TOWN_FACILITIES) {
      expect(cellAt(townMap, f.x, f.y), `${f.id}`).toBe("door");
      const approach = DIRS.some(([dx, dy]) =>
        cellAt(townMap, f.x + dx, f.y + dy) === "floor");
      expect(approach, `${f.id}: 문 앞 접근 칸 없음`).toBe(true);
    }
  });

  it("장식 POI와 성문은 바닥 칸 위에 있다", () => {
    for (const d of TOWN_DECOS) expect(cellAt(townMap, d.x, d.y), d.id).toBe("floor");
    for (const g of TOWN_GATES) expect(cellAt(townMap, g.x, g.y), "gate").toBe("floor");
  });

  it("모든 통행 가능 칸은 남문에서 도달 가능하다 (차단 POI 제외)", () => {
    const blocked = new Set([
      ...TOWN_DECOS.map((d) => `${d.x},${d.y}`),
      ...NPCS.map((n) => `${n.gx},${n.gy}`),
    ]);
    const start = TOWN_STARTS.gate;
    const seen = new Set<string>([`${start.x},${start.y}`]);
    const queue = [[start.x, start.y]];
    while (queue.length) {
      const [x, y] = queue.pop()!;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        const key = `${nx},${ny}`;
        if (seen.has(key) || blocked.has(key) || !passable(townMap, nx, ny)) continue;
        seen.add(key);
        queue.push([nx, ny]);
      }
    }
    for (let y = 0; y < townMap.h; y++) for (let x = 0; x < townMap.w; x++) {
      const key = `${x},${y}`;
      if (!passable(townMap, x, y) || blocked.has(key)) continue;
      expect(seen.has(key), `(${x},${y}) 고립 칸`).toBe(true);
    }
  });
});
