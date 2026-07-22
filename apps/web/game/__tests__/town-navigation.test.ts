import { describe, expect, it, vi } from "vitest";
import { NPCS } from "../defs";
import { compileTown } from "../town/compile";
import { openTownFacility, type TownFacilityHandlers } from "../town/facilities";
import { TownNavigation } from "../town/navigation";
import { TOWNS } from "../towns";

const town = TOWNS.crossvale;
const npcs = NPCS.filter((npc) => (npc.town ?? "crossvale") === "crossvale");
const spatial = compileTown(town, npcs);

describe("TownNavigation", () => {
  it("통행 가능한 칸으로 이동하고 점유 칸에서는 멈춘다", () => {
    const movement = new TownNavigation(town.map, spatial, { x: 13, y: 5, facing: 2 });

    expect(movement.move("fwd")).toBe(true);
    expect(movement.pose).toMatchObject({ x: 13, y: 6 });
    movement.pose.x = 13;
    movement.pose.y = 5;
    movement.pose.facing = 0;
    expect(movement.move("fwd")).toBe(false); // 신전 문
    expect(movement.pose).toMatchObject({ x: 13, y: 5 });
  });

  it("정면의 시설·NPC·장식·성문을 구분한다", () => {
    expect(new TownNavigation(town.map, spatial, { x: 13, y: 5, facing: 0 }).interaction().kind)
      .toBe("facility");
    expect(new TownNavigation(town.map, spatial, { x: 14, y: 10, facing: 0 }).interaction().kind)
      .toBe("npc");
    expect(new TownNavigation(town.map, spatial, { x: 13, y: 11, facing: 0 }).interaction().kind)
      .toBe("deco");
    expect(new TownNavigation(town.map, spatial, { x: 13, y: 22, facing: 2 }).interaction().kind)
      .toBe("gate");
  });

  it("작은 바닥 장식은 조사와 이동을 방해하지 않는다", () => {
    const movement = new TownNavigation(town.map, spatial, { x: 11, y: 10, facing: 0 });

    expect(movement.interaction().kind).toBe("none");
    expect(movement.move("fwd")).toBe(true);
    expect(movement.pose).toMatchObject({ x: 11, y: 9 });
  });
});

describe("openTownFacility", () => {
  it("시설 id에 대응하는 처리기만 호출한다", () => {
    const handler = vi.fn();
    const handlers = Object.fromEntries(
      ["temple", "spiritGuild", "elementsGuild", "bountyGuild", "weapon", "armor", "item", "inn", "stable", "throne"]
        .map((id) => [id, handler]),
    ) as unknown as TownFacilityHandlers;
    const facility = town.facilities.find((entry) => entry.id === "weapon")!;

    openTownFacility(facility, handlers);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(facility);
  });
});
