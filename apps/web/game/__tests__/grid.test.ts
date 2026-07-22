import { describe, expect, it } from "vitest";
import {
  DIR, Facing, adjacent, backOf, cellAt, chebyshev, enemyStep, hasLOS,
  leftOf, moveTarget, parseMap, passable, rightOf, rotateFacing,
} from "../grid";
import { FORTRESS_ROWS, NORMAL_SPAWNS, POIS, START, SYMBOL_SPAWNS, fortressMap } from "../goblin-fortress";

describe("방향 수학", () => {
  it("좌/우/뒤 회전", () => {
    expect(leftOf(0)).toBe(3);
    expect(rightOf(0)).toBe(1);
    expect(backOf(0)).toBe(2);
    expect(leftOf(3)).toBe(2);
    expect(rightOf(3)).toBe(0);
  });
  it("전방 벡터 — 북은 y 감소", () => {
    expect(DIR[0]).toEqual({ dx: 0, dy: -1 });
    expect(DIR[1]).toEqual({ dx: 1, dy: 0 });
    expect(DIR[2]).toEqual({ dx: 0, dy: 1 });
    expect(DIR[3]).toEqual({ dx: -1, dy: 0 });
  });
  it("90도 4회 회전 = 제자리", () => {
    let f: Facing = 0;
    for (let i = 0; i < 4; i++) f = rightOf(f);
    expect(f).toBe(0);
  });
  it("상대 이동 입력을 현재 방향 기준 좌표로 변환", () => {
    const east = { x: 5, y: 5, facing: 1 as Facing };
    expect(moveTarget(east, "fwd")).toEqual({ x: 6, y: 5 });
    expect(moveTarget(east, "back")).toEqual({ x: 4, y: 5 });
    expect(moveTarget(east, "sl")).toEqual({ x: 5, y: 4 });
    expect(moveTarget(east, "sr")).toEqual({ x: 5, y: 6 });
    expect(rotateFacing(0, -1)).toBe(3);
    expect(rotateFacing(3, 1)).toBe(0);
  });
});

describe("parseMap / 통행", () => {
  const m = parseMap([
    "#####",
    "#.+~#",
    "#.#>#",
    "#####",
  ]);
  it("셀 종류", () => {
    expect(cellAt(m, 1, 1)).toBe("floor");
    expect(cellAt(m, 2, 1)).toBe("door");
    expect(cellAt(m, 3, 1)).toBe("water");
    expect(cellAt(m, 3, 2)).toBe("stairs");
  });
  it("바닥·계단만 통행, 문·물·벽은 차단", () => {
    expect(passable(m, 1, 1)).toBe(true);
    expect(passable(m, 2, 1)).toBe(false);
    expect(passable(m, 3, 2)).toBe(true);
    expect(passable(m, 3, 1)).toBe(false);
    expect(passable(m, 2, 2)).toBe(false);
  });
  it("맵 밖은 벽", () => {
    expect(cellAt(m, -1, 0)).toBe("wall");
    expect(cellAt(m, 99, 0)).toBe("wall");
    expect(passable(m, -1, -1)).toBe(false);
  });
  it("행 길이 불일치·미지 문자에 예외", () => {
    expect(() => parseMap(["##", "#"])).toThrow();
    expect(() => parseMap(["#X"])).toThrow();
  });
});

describe("시야 (LOS)", () => {
  const m = parseMap([
    "#######",
    "#.....#",
    "#.###.#",
    "#.....#",
    "#######",
  ]);
  it("직선 개방 통로는 보인다", () => {
    expect(hasLOS(m, 1, 1, 5, 1)).toBe(true);
    expect(hasLOS(m, 1, 1, 1, 3)).toBe(true);
  });
  it("벽 너머는 보이지 않는다", () => {
    expect(hasLOS(m, 1, 1, 3, 3)).toBe(false); // (2,2)/(3,2) 벽 통과 필요한 대각
    expect(hasLOS(m, 3, 1, 3, 3)).toBe(false); // (3,2) 벽
  });
  it("닫힌 문(+)은 벽처럼 시야를 막는다", () => {
    const md = parseMap(["#####", "#.+.#", "#####"]);
    expect(hasLOS(md, 1, 1, 3, 1)).toBe(false);
  });
  it("자기 자신은 항상 보인다", () => {
    expect(hasLOS(m, 1, 1, 1, 1)).toBe(true);
  });
});

describe("적 AI 스텝", () => {
  const m = parseMap([
    "#######",
    "#.....#",
    "#.###.#",
    "#.....#",
    "#######",
  ]);
  const noOcc = () => false;
  it("상하좌우 인접이면 공격", () => {
    expect(enemyStep(m, 2, 1, 1, 1, noOcc)).toBe("attack");
    expect(enemyStep(m, 1, 2, 1, 1, noOcc)).toBe("attack");
  });
  it("대각 인접은 공격이 아니라 이동", () => {
    const r = enemyStep(m, 2, 3, 1, 2, noOcc);
    expect(r).not.toBe("attack");
    expect(r).not.toBeNull();
  });
  it("파티를 향해 축 거리 큰 쪽으로 1칸", () => {
    expect(enemyStep(m, 5, 1, 1, 1, noOcc)).toEqual({ x: 4, y: 1 });
    expect(enemyStep(m, 1, 3, 1, 1, noOcc)).toEqual({ x: 1, y: 2 });
  });
  it("벽에 막히면 우회 후보로 이동", () => {
    // (3,1)에서 (3,3)으로: 아래는 벽 — 좌우로 우회
    const r = enemyStep(m, 3, 1, 3, 3, noOcc);
    expect(r).toEqual({ x: 4, y: 1 });
  });
  it("점유 칸은 피하고, 파티 칸으로는 진입하지 않는다", () => {
    const occ = (x: number, y: number) => x === 4 && y === 1;
    const r = enemyStep(m, 5, 1, 1, 1, occ);
    expect(r).not.toEqual({ x: 4, y: 1 });
  });
  it("완전히 막히면 null", () => {
    const mm = parseMap(["#####", "#.#.#", "#####"]);
    expect(enemyStep(mm, 3, 1, 1, 1, noOcc)).toBeNull();
  });
});

describe("던전 데이터 무결성", () => {
  it("24×24, 시작 지점은 통행 가능", () => {
    expect(fortressMap.w).toBe(24);
    expect(fortressMap.h).toBe(24);
    expect(passable(fortressMap, START.x, START.y)).toBe(true);
  });
  it("모든 통행 칸이 시작 지점에서 도달 가능", () => {
    const seen = new Set<number>([START.y * fortressMap.w + START.x]);
    const q = [[START.x, START.y]];
    while (q.length) {
      const [x, y] = q.pop()!;
      for (const d of DIR) {
        const nx = x + d.dx, ny = y + d.dy;
        const idx = ny * fortressMap.w + nx;
        if (passable(fortressMap, nx, ny) && !seen.has(idx)) { seen.add(idx); q.push([nx, ny]); }
      }
    }
    for (let y = 0; y < fortressMap.h; y++)
      for (let x = 0; x < fortressMap.w; x++)
        if (passable(fortressMap, x, y))
          expect(seen.has(y * fortressMap.w + x), `(${x},${y}) 도달 불가`).toBe(true);
  });
  it("POI·스폰이 전부 통행 가능한 칸 위에 있다", () => {
    for (const p of POIS) expect(passable(fortressMap, p.x, p.y), p.id).toBe(true);
    for (const s of [...NORMAL_SPAWNS, ...SYMBOL_SPAWNS])
      expect(passable(fortressMap, s.x, s.y), s.id).toBe(true);
  });
  it("스폰 좌표가 서로 겹치지 않는다", () => {
    const all = [...NORMAL_SPAWNS, ...SYMBOL_SPAWNS, ...POIS.filter((p) => p.blocking)];
    const keys = all.map((s) => `${s.x},${s.y}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("ASCII 행이 전부 같은 길이", () => {
    for (const r of FORTRESS_ROWS) expect(r.length).toBe(24);
  });
});

describe("거리/인접", () => {
  it("체비쇼프 거리", () => {
    expect(chebyshev(0, 0, 3, 1)).toBe(3);
    expect(chebyshev(2, 2, 2, 2)).toBe(0);
  });
  it("근접 사거리는 상하좌우만", () => {
    expect(adjacent(1, 1, 2, 1)).toBe(true);
    expect(adjacent(1, 1, 2, 2)).toBe(false);
    expect(adjacent(1, 1, 1, 1)).toBe(false);
  });
});
