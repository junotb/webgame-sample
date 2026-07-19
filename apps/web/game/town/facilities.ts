import type { TownFacilityDef, TownFacilityId } from "./types";

export type TownFacilityHandlers = Record<TownFacilityId, (facility: TownFacilityDef) => void>;

/** 시설 id → UI 처리기의 결합을 town 씬 바깥에 둔다. */
export function openTownFacility(
  facility: TownFacilityDef,
  handlers: TownFacilityHandlers,
): void {
  handlers[facility.id](facility);
}
