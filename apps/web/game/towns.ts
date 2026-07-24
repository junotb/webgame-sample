/* =====================================================================
 * towns.ts — 마을 레지스트리 (크로스베일 · 에버모어 성)
 *  townScene은 G.town으로 이 레지스트리에서 맵/시설/데코/스폰을 읽는다.
 *  마굿간(stable)의 역마차로 두 마을을 오간다.
 * ===================================================================== */
import { CROSSVALE_TOWN } from "./town/crossvale";
import { EVERMORE_TOWN } from "./town/evermore";
import type { TownData, TownId } from "./town/types";

export type { TownData, TownId } from "./town/types";

export const TOWNS: Record<TownId, TownData> = {
  crossvale: CROSSVALE_TOWN,
  evermore: EVERMORE_TOWN,
};

/** 마굿간 역마차 삯 (편도 고정) */
export const CARRIAGE_FARE = 40;
/** 기술 수련 비용 (모든 시설 공통) */
export const SKILL_PRICE = 250;
/** 주문 습득 비용 — 티어(요구 랭크)별. starter 주문은 무료라 목록에 없다 */
export const SPELL_PRICE: Record<1 | 2 | 3, number> = { 1: 120, 2: 400, 3: 1200 };
/** 역마차의 반대편 목적지 */
export const otherTown = (t: TownId): TownId => (t === "crossvale" ? "evermore" : "crossvale");
