import { DIR, moveTarget, passable, rotateFacing } from "../grid";
import type { Facing, GridMap, RelativeMove } from "../grid";
import type { CompiledTown, TownNpcPosition } from "./compile";
import type { TownDecoDef, TownFacilityDef, TownGateDef, TownSpawnPos } from "./types";

export interface TownPose {
  x: number;
  y: number;
  facing: Facing;
}

export type TownInteraction<TNpc extends TownNpcPosition> =
  | { kind: "gate"; value: TownGateDef }
  | { kind: "facility"; value: TownFacilityDef }
  | { kind: "npc"; value: TNpc }
  | { kind: "deco"; value: TownDecoDef }
  | { kind: "none" };

/** 마을의 위치·방향과 이동/상호작용 우선순위를 소유하는 순수 런타임. */
export class TownNavigation<TNpc extends TownNpcPosition> {
  readonly pose: TownPose;

  constructor(
    private readonly map: GridMap,
    private readonly spatial: CompiledTown<TNpc>,
    start: TownSpawnPos,
  ) {
    this.pose = { ...start };
  }

  move(relative: RelativeMove): boolean {
    const target = moveTarget(this.pose, relative);
    if (!passable(this.map, target.x, target.y) || this.spatial.blockedAt(target.x, target.y)) return false;
    this.pose.x = target.x;
    this.pose.y = target.y;
    return true;
  }

  rotate(direction: -1 | 1): void {
    this.pose.facing = rotateFacing(this.pose.facing, direction);
  }

  interaction(): TownInteraction<TNpc> {
    const { x, y, facing } = this.pose;
    const ownGate = this.spatial.gateAt(x, y);
    if (ownGate) return { kind: "gate", value: ownGate };
    const ownFacility = this.spatial.facilityAt(x, y);
    if (ownFacility) return { kind: "facility", value: ownFacility };

    const frontX = x + DIR[facing].dx;
    const frontY = y + DIR[facing].dy;
    const gate = this.spatial.gateAt(frontX, frontY);
    if (gate) return { kind: "gate", value: gate };
    const npc = this.spatial.npcAt(frontX, frontY);
    if (npc) return { kind: "npc", value: npc };
    const facility = this.spatial.facilityAt(frontX, frontY);
    if (facility) return { kind: "facility", value: facility };
    const deco = this.spatial.decoAt(frontX, frontY);
    if (deco) return { kind: "deco", value: deco };
    return { kind: "none" };
  }
}
