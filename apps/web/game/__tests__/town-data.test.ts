/* =====================================================================
 * town-data.test.ts — 마을 정의와 맵 데이터 정합성 검증
 * ===================================================================== */
import { describe, expect, it } from "vitest";
import { NPCS, QUESTS } from "../defs";
import { cellAt, passable } from "../grid";
import { TOWNS, TownData, TownId } from "../towns";

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
const townIds = Object.keys(TOWNS) as TownId[];
const npcsOf = (id: TownId) => NPCS.filter((n) => (n.town ?? "crossvale") === id);
/** 연결성 BFS 시작점 — 성문(gate) 우선, 없으면 마차/알현실 스폰 */
const bfsStart = (t: TownData) => t.starts.gate ?? t.starts.carriage ?? t.starts.throne
  ?? t.starts.fountain ?? Object.values(t.starts)[0]!;

describe.each(townIds)("마을 맵 규칙 — %s", (id) => {
  const t = TOWNS[id];
  const blocked = () => new Set([
    ...t.decos.map((d) => `${d.x},${d.y}`),
    ...npcsOf(id).map((n) => `${n.gx},${n.gy}`),
  ]);

  it("진입 지점은 통행 가능하고 차단 POI와 겹치지 않는다", () => {
    const b = blocked();
    for (const s of Object.values(t.starts)) {
      expect(passable(t.map, s.x, s.y)).toBe(true);
      expect(b.has(`${s.x},${s.y}`)).toBe(false);
    }
  });

  it("시설 위치는 문(+) 칸이고, 접근 가능한 정면 칸이 있다", () => {
    for (const f of t.facilities) {
      expect(cellAt(t.map, f.x, f.y), `${f.id}`).toBe("door");
      const approach = DIRS.some(([dx, dy]) =>
        cellAt(t.map, f.x + dx, f.y + dy) === "floor");
      expect(approach, `${f.id}: 문 앞 접근 칸 없음`).toBe(true);
    }
  });

  it("시설 의뢰는 실재하며 NPC 의뢰와 중복되지 않는다", () => {
    for (const f of t.facilities) for (const qid of f.quests ?? []) {
      const quest = QUESTS.find((q) => q.id === qid);
      expect(quest, `${f.name}: 없는 의뢰 ${qid}`).toBeTruthy();
      expect(quest?.giver, `${f.name}: ${qid}은 NPC 의뢰와 중복`).toBeUndefined();
    }
  });

  it("장식 POI와 성문은 바닥 칸 위에 있다", () => {
    for (const d of t.decos) expect(cellAt(t.map, d.x, d.y), d.id).toBe("floor");
    for (const g of t.gates) expect(cellAt(t.map, g.x, g.y), "gate").toBe("floor");
  });

  it("모든 통행 가능 칸은 진입 지점에서 도달 가능하다 (차단 POI 제외)", () => {
    const b = blocked();
    const start = bfsStart(t);
    const seen = new Set<string>([`${start.x},${start.y}`]);
    const queue = [[start.x, start.y]];
    while (queue.length) {
      const [x, y] = queue.pop()!;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        const key = `${nx},${ny}`;
        if (seen.has(key) || b.has(key) || !passable(t.map, nx, ny)) continue;
        seen.add(key);
        queue.push([nx, ny]);
      }
    }
    for (let y = 0; y < t.map.h; y++) for (let x = 0; x < t.map.w; x++) {
      const key = `${x},${y}`;
      if (!passable(t.map, x, y) || b.has(key)) continue;
      expect(seen.has(key), `(${x},${y}) 고립 칸`).toBe(true);
    }
  });
});
