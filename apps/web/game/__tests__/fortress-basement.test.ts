import { describe, expect, it } from "vitest";
import { DIR, cellAt, passable } from "../grid";
import {
  BASEMENT_NORMAL_SPAWNS, BASEMENT_POIS, BASEMENT_ROWS, BASEMENT_START, BASEMENT_SYMBOL_SPAWNS,
  FORTRESS_ROWS, basementMap, fortressMap,
} from "../goblin-fortress";
import { ENEMY_DEFS } from "../defs";

describe("고블린 요새 지하 데이터 무결성", () => {
  it("ASCII 행이 전부 같은 길이, 시작 지점(계단)은 통행 가능", () => {
    for (const r of BASEMENT_ROWS) expect(r.length).toBe(24);
    expect(passable(basementMap, BASEMENT_START.x, BASEMENT_START.y)).toBe(true);
    expect(cellAt(basementMap, BASEMENT_START.x, BASEMENT_START.y)).toBe("stairs");
  });
  it("모든 통행 칸이 계단에서 도달 가능", () => {
    const seen = new Set<number>([BASEMENT_START.y * basementMap.w + BASEMENT_START.x]);
    const q = [[BASEMENT_START.x, BASEMENT_START.y]];
    while (q.length) {
      const [x, y] = q.pop()!;
      for (const d of DIR) {
        const nx = x + d.dx, ny = y + d.dy;
        const idx = ny * basementMap.w + nx;
        if (passable(basementMap, nx, ny) && !seen.has(idx)) { seen.add(idx); q.push([nx, ny]); }
      }
    }
    for (let y = 0; y < basementMap.h; y++)
      for (let x = 0; x < basementMap.w; x++)
        if (passable(basementMap, x, y))
          expect(seen.has(y * basementMap.w + x), `(${x},${y}) 도달 불가`).toBe(true);
  });
  it("POI·스폰이 전부 통행 가능한 칸 위에 있고 서로 겹치지 않는다", () => {
    for (const p of BASEMENT_POIS) expect(passable(basementMap, p.x, p.y), p.id).toBe(true);
    for (const s of [...BASEMENT_NORMAL_SPAWNS, ...BASEMENT_SYMBOL_SPAWNS])
      expect(passable(basementMap, s.x, s.y), s.id).toBe(true);
    const all = [
      ...BASEMENT_NORMAL_SPAWNS, ...BASEMENT_SYMBOL_SPAWNS,
      ...BASEMENT_POIS.filter((p) => p.blocking),
    ];
    const keys = all.map((s) => `${s.x},${s.y}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("차단형 POI·심볼을 벽으로 쳐도 고립 칸이 없다", () => {
    const blocked = new Set(BASEMENT_POIS.filter((p) => p.blocking).map((p) => `${p.x},${p.y}`));
    const open = (x: number, y: number) => passable(basementMap, x, y) && !blocked.has(`${x},${y}`);
    const seen = new Set<string>([`${BASEMENT_START.x},${BASEMENT_START.y}`]);
    const q = [[BASEMENT_START.x, BASEMENT_START.y]];
    while (q.length) {
      const [x, y] = q.pop()!;
      for (const d of DIR) {
        const nx = x + d.dx, ny = y + d.dy, k = `${nx},${ny}`;
        if (open(nx, ny) && !seen.has(k)) { seen.add(k); q.push([nx, ny]); }
      }
    }
    for (let y = 0; y < basementMap.h; y++)
      for (let x = 0; x < basementMap.w; x++)
        if (open(x, y)) expect(seen.has(`${x},${y}`), `(${x},${y}) 고립`).toBe(true);
  });
  it("스폰 defId가 전부 적 정의에 존재하고, 그름바크(lord)와 친위대 둘이 배치되어 있다", () => {
    for (const s of [...BASEMENT_NORMAL_SPAWNS, ...BASEMENT_SYMBOL_SPAWNS])
      expect(ENEMY_DEFS[s.defId], s.defId).toBeDefined();
    expect(BASEMENT_SYMBOL_SPAWNS.filter((s) => s.defId === "guard")).toHaveLength(2);
    const lord = BASEMENT_SYMBOL_SPAWNS.find((s) => s.symbol === "lord");
    expect(lord?.defId).toBe("lord");
  });
  it("친위대는 알현실 문 쪽(전위)에, 그름바크는 그보다 안쪽(후위)에 있다", () => {
    const lord = BASEMENT_SYMBOL_SPAWNS.find((s) => s.symbol === "lord")!;
    for (const g of BASEMENT_SYMBOL_SPAWNS.filter((s) => s.defId === "guard"))
      expect(g.x).toBeGreaterThan(lord.x); // 문은 동쪽 — x가 클수록 문에 가깝다
  });
  it("지상층과 다른 맵 객체·레이아웃을 가진다", () => {
    expect(basementMap).not.toBe(fortressMap);
    expect([...BASEMENT_ROWS]).not.toEqual([...FORTRESS_ROWS]);
  });
});
