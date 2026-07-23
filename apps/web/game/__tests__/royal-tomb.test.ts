/* =====================================================================
 * royal-tomb.test.ts — 왕실 묘소 맵 데이터 무결성 검증
 * ===================================================================== */
import { describe, expect, it } from "vitest";
import { DIR, passable } from "../grid";
import {
  TOMB_NORMAL_SPAWNS, TOMB_POIS, TOMB_PROPS, TOMB_ROWS, TOMB_START, TOMB_SYMBOL_SPAWNS, tombMap,
} from "../royal-tomb";

describe("왕실 묘소 데이터 무결성", () => {
  it("22×20, 시작 지점은 통행 가능", () => {
    expect(tombMap.w).toBe(22);
    expect(tombMap.h).toBe(20);
    expect(passable(tombMap, TOMB_START.x, TOMB_START.y)).toBe(true);
  });

  it("차단형 POI·프롭을 두고도 모든 통행 칸이 시작 지점에서 도달 가능", () => {
    const blocked = new Set([
      ...TOMB_POIS.filter((p) => p.blocking).map((p) => `${p.x},${p.y}`),
      ...TOMB_PROPS.map((p) => `${p.x},${p.y}`),
    ]);
    const seen = new Set([`${TOMB_START.x},${TOMB_START.y}`]);
    const q = [[TOMB_START.x, TOMB_START.y]];
    while (q.length) {
      const [x, y] = q.pop()!;
      for (const d of DIR) {
        const nx = x + d.dx, ny = y + d.dy, key = `${nx},${ny}`;
        if (passable(tombMap, nx, ny) && !blocked.has(key) && !seen.has(key)) {
          seen.add(key);
          q.push([nx, ny]);
        }
      }
    }
    for (let y = 0; y < tombMap.h; y++)
      for (let x = 0; x < tombMap.w; x++)
        if (passable(tombMap, x, y) && !blocked.has(`${x},${y}`))
          expect(seen.has(`${x},${y}`), `(${x},${y}) 도달 불가`).toBe(true);
  });

  it("POI·프롭·스폰이 전부 통행 가능한 칸 위에 있다", () => {
    for (const p of [...TOMB_POIS, ...TOMB_PROPS]) expect(passable(tombMap, p.x, p.y), p.id).toBe(true);
    for (const s of [...TOMB_NORMAL_SPAWNS, ...TOMB_SYMBOL_SPAWNS])
      expect(passable(tombMap, s.x, s.y), s.id).toBe(true);
  });

  it("배치 좌표가 서로 겹치지 않는다", () => {
    const all = [
      ...TOMB_NORMAL_SPAWNS, ...TOMB_SYMBOL_SPAWNS, ...TOMB_PROPS,
      ...TOMB_POIS.filter((p) => p.blocking),
    ];
    const keys = all.map((s) => `${s.x},${s.y}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("ASCII 행이 전부 같은 길이", () => {
    for (const r of TOMB_ROWS) expect(r.length).toBe(22);
  });
});
