import { describe, expect, it } from "vitest";
import { DIR, passable } from "../grid";
import {
  TEMPLE_NORMAL_SPAWNS, TEMPLE_POIS, TEMPLE_PROPS, TEMPLE_ROWS, TEMPLE_START, TEMPLE_SYMBOL_SPAWNS,
  templeMap,
} from "../abandoned-temple";
import { ENEMY_DEFS } from "../defs";
import { FORTRESS_ROWS, fortressMap } from "../goblin-fortress";

describe("버려진 사원 데이터 무결성", () => {
  it("24×24, 시작 지점은 통행 가능", () => {
    expect(templeMap.w).toBe(24);
    expect(templeMap.h).toBe(24);
    expect(passable(templeMap, TEMPLE_START.x, TEMPLE_START.y)).toBe(true);
  });
  it("모든 통행 칸이 시작 지점에서 도달 가능", () => {
    const seen = new Set<number>([TEMPLE_START.y * templeMap.w + TEMPLE_START.x]);
    const q = [[TEMPLE_START.x, TEMPLE_START.y]];
    while (q.length) {
      const [x, y] = q.pop()!;
      for (const d of DIR) {
        const nx = x + d.dx, ny = y + d.dy;
        const idx = ny * templeMap.w + nx;
        if (passable(templeMap, nx, ny) && !seen.has(idx)) { seen.add(idx); q.push([nx, ny]); }
      }
    }
    for (let y = 0; y < templeMap.h; y++)
      for (let x = 0; x < templeMap.w; x++)
        if (passable(templeMap, x, y))
          expect(seen.has(y * templeMap.w + x), `(${x},${y}) 도달 불가`).toBe(true);
  });
  it("POI·스폰·소품이 전부 통행 가능한 칸 위에 있다", () => {
    for (const p of TEMPLE_POIS) expect(passable(templeMap, p.x, p.y), p.id).toBe(true);
    for (const s of [...TEMPLE_NORMAL_SPAWNS, ...TEMPLE_SYMBOL_SPAWNS])
      expect(passable(templeMap, s.x, s.y), s.id).toBe(true);
    for (const pr of TEMPLE_PROPS) expect(passable(templeMap, pr.x, pr.y), pr.id).toBe(true);
  });
  it("스폰·차단 POI·소품 좌표가 서로 겹치지 않는다", () => {
    const all = [
      ...TEMPLE_NORMAL_SPAWNS, ...TEMPLE_SYMBOL_SPAWNS,
      ...TEMPLE_POIS.filter((p) => p.blocking), ...TEMPLE_PROPS,
    ];
    const keys = all.map((s) => `${s.x},${s.y}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("차단형 POI·소품을 벽으로 쳐도 고립 칸이 없고, 각 차단물은 접근 가능하다", () => {
    const blocked = new Set(
      [...TEMPLE_POIS.filter((p) => p.blocking), ...TEMPLE_PROPS].map((p) => `${p.x},${p.y}`),
    );
    const open = (x: number, y: number) => passable(templeMap, x, y) && !blocked.has(`${x},${y}`);
    const seen = new Set<string>([`${TEMPLE_START.x},${TEMPLE_START.y}`]);
    const q = [[TEMPLE_START.x, TEMPLE_START.y]];
    while (q.length) {
      const [x, y] = q.pop()!;
      for (const d of DIR) {
        const nx = x + d.dx, ny = y + d.dy, k = `${nx},${ny}`;
        if (open(nx, ny) && !seen.has(k)) { seen.add(k); q.push([nx, ny]); }
      }
    }
    for (let y = 0; y < templeMap.h; y++)
      for (let x = 0; x < templeMap.w; x++)
        if (open(x, y)) expect(seen.has(`${x},${y}`), `(${x},${y}) 고립`).toBe(true);
    for (const b of [...TEMPLE_POIS.filter((p) => p.blocking), ...TEMPLE_PROPS]) {
      const approachable = DIR.some((d) => seen.has(`${b.x + d.dx},${b.y + d.dy}`));
      expect(approachable, `${b.id} 접근 불가`).toBe(true);
    }
  });
  it("스폰 defId가 전부 적 정의에 존재한다", () => {
    for (const s of [...TEMPLE_NORMAL_SPAWNS, ...TEMPLE_SYMBOL_SPAWNS])
      expect(ENEMY_DEFS[s.defId], s.defId).toBeDefined();
  });
  it("주교 심볼은 퀘스트 목표 target(fallen_bishop)과 일치한다", () => {
    expect(TEMPLE_SYMBOL_SPAWNS.some((s) => s.symbol === "fallen_bishop")).toBe(true);
  });
  it("ASCII 행이 전부 같은 길이", () => {
    for (const r of TEMPLE_ROWS) expect(r.length).toBe(24);
  });
  it("던전마다 고유한 맵을 가진다 — 사원과 요새의 레이아웃·맵 객체가 서로 다르다", () => {
    expect(templeMap).not.toBe(fortressMap);
    expect([...TEMPLE_ROWS]).not.toEqual([...FORTRESS_ROWS]);
  });
});
