/* =====================================================================
 * towns.ts — 마을 레지스트리 (크로스베일 · 에버모어 성)
 *  townScene은 G.town으로 이 레지스트리에서 맵/시설/데코/스폰을 읽는다.
 *  마굿간(stable)의 역마차로 두 마을을 오간다.
 * ===================================================================== */
import { GridMap } from "./grid";
import {
  TOWN_DECOS, TOWN_FACILITIES, TOWN_GATES, TOWN_STARTS,
  TownDecoDef, TownFacilityDef, TownSpawn, TownSpawnPos, townMap,
} from "./townmap";
import {
  EVERMORE_DECOS, EVERMORE_FACILITIES, EVERMORE_GATES, EVERMORE_STARTS, evermoreMap,
} from "./evermoremap";

export type TownId = "crossvale" | "evermore";

export interface TownData {
  id: TownId;
  /** 표시명 (로그·안내문에 사용) */
  name: string;
  /** 상단 모드 뱃지 문구 */
  badge: string;
  map: GridMap;
  starts: Partial<Record<TownSpawn, TownSpawnPos>>;
  facilities: TownFacilityDef[];
  decos: TownDecoDef[];
  gates: { x: number; y: number }[];
  /** 성문 목적지 — "explore"면 [Z]로 던전 진입 (없으면 성문 없음) */
  gateTo?: "explore";
  /** 성문 간판 라벨 */
  gateLabel?: string;
  /** 성문 위 프롬프트 */
  gatePrompt?: string;
}

export const TOWNS: Record<TownId, TownData> = {
  crossvale: {
    id: "crossvale",
    name: "크로스베일",
    badge: "마을 모드 — 크로스베일",
    map: townMap,
    starts: TOWN_STARTS,
    facilities: TOWN_FACILITIES,
    decos: TOWN_DECOS,
    gates: TOWN_GATES,
    gateTo: "explore",
    gateLabel: "성문 — 할로우베일 계곡",
    gatePrompt: "[Z] 성문 밖으로 — 할로우베일 계곡",
  },
  evermore: {
    id: "evermore",
    name: "에버모어 성",
    badge: "성 안 — 에버모어",
    map: evermoreMap,
    starts: EVERMORE_STARTS,
    facilities: EVERMORE_FACILITIES,
    decos: EVERMORE_DECOS,
    gates: EVERMORE_GATES,
  },
};

/** 마굿간 역마차 삯 (편도 고정) */
export const CARRIAGE_FARE = 40;
/** 역마차의 반대편 목적지 */
export const otherTown = (t: TownId): TownId => (t === "crossvale" ? "evermore" : "crossvale");
