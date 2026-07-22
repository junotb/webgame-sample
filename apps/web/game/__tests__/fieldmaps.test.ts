import { describe, expect, it } from "vitest";
import { ENEMY_DEFS } from "../defs";
import { FIELDS, FieldId } from "../fieldmaps";
import { cellAt, passable } from "../grid";

function reachable(field: (typeof FIELDS)[FieldId], tx: number, ty: number): boolean {
  const blocked = new Set(field.decos.filter((d) => d.blocking).map((d) => `${d.x},${d.y}`));
  const seen = new Set([`${field.start.x},${field.start.y}`]);
  const queue = [{ x: field.start.x, y: field.start.y }];
  for (let i = 0; i < queue.length; i++) {
    const here = queue[i];
    if (here.x === tx && here.y === ty) return true;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const x = here.x + dx, y = here.y + dy;
      const key = `${x},${y}`;
      if (!seen.has(key) && !blocked.has(key) && passable(field.map, x, y)) {
        seen.add(key);
        queue.push({ x, y });
      }
    }
  }
  return false;
}

describe.each(Object.keys(FIELDS) as FieldId[])("주변 필드 맵 — %s", (id) => {
  const field = FIELDS[id];

  it("시작 지점과 모든 출구가 통행 가능한 칸에 있다", () => {
    expect(passable(field.map, field.start.x, field.start.y)).toBe(true);
    for (const exit of field.exits) expect(passable(field.map, exit.x, exit.y), exit.label).toBe(true);
  });

  it("장애물을 피해 시작 지점에서 모든 출구까지 이동할 수 있다", () => {
    for (const exit of field.exits) expect(reachable(field, exit.x, exit.y), exit.label).toBe(true);
  });

  it("배치 전투(fight)는 몬스터 비주얼을 갖고, 적·리스폰 정의가 유효하다", () => {
    for (const d of field.decos.filter((d) => d.fight)) {
      expect(d.visual?.kind, d.id).toBe("monster");
      expect(d.blocking, d.id).toBe(true);
      expect(d.fight!.enemies.length, d.id).toBeGreaterThan(0);
      expect(d.fight!.respawnDays, d.id).toBeGreaterThan(0);
      for (const e of d.fight!.enemies) expect(ENEMY_DEFS[e], `${d.id}: ${e}`).toBeDefined();
    }
  });

  it("랜덤 인카운터 무리는 전부 실재하는 적으로 구성된다", () => {
    if (!field.encounters) return;
    expect(field.encounters.chance).toBeGreaterThan(0);
    expect(field.encounters.chance).toBeLessThanOrEqual(0.25); // 걷기 방해 수준 방지
    expect(field.encounters.groups.length).toBeGreaterThan(0);
    for (const group of field.encounters.groups) {
      expect(group.length).toBeGreaterThan(0);
      for (const e of group) expect(ENEMY_DEFS[e], e).toBeDefined();
      /* 잡몹 조우는 도주 가능해야 한다 — 일반 티어만 */
      for (const e of group) expect(ENEMY_DEFS[e].tier, e).toBe("일반");
    }
  });
});

describe("고블린 계곡길 지형 콘셉트", () => {
  const field = FIELDS.goblinValley;

  it("동쪽 평야는 넓게 열려 있다", () => {
    for (let y = 4; y <= 17; y++) {
      for (let x = 22; x <= 36; x++) expect(cellAt(field.map, x, y), `${x},${y}`).toBe("floor");
    }
  });

  it("동쪽 끝은 연속된 바다 타일로 막혀 있다", () => {
    for (let y = 4; y <= 17; y++) {
      for (let x = 37; x < field.map.w; x++) expect(cellAt(field.map, x, y), `${x},${y}`).toBe("water");
    }
  });
});
