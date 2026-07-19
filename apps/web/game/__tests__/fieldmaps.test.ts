import { describe, expect, it } from "vitest";
import { FIELDS, FieldId } from "../fieldmaps";
import { passable } from "../grid";

describe.each(Object.keys(FIELDS) as FieldId[])("주변 필드 맵 — %s", (id) => {
  const field = FIELDS[id];

  it("시작 지점과 모든 출구가 통행 가능한 칸에 있다", () => {
    expect(passable(field.map, field.start.x, field.start.y)).toBe(true);
    for (const exit of field.exits) expect(passable(field.map, exit.x, exit.y), exit.label).toBe(true);
  });
});
