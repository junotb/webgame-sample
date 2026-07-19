import type { ClassId, SkillId } from "../defs";
import type { FieldId } from "../fieldmaps";
import type { Facing, GridMap } from "../grid";

export type TownId = "crossvale" | "evermore";
export type TownSpawn = "fountain" | "gate" | "carriage" | "throne" | "westGate" | "eastGate";

export interface TownSpawnPos {
  x: number;
  y: number;
  facing: Facing;
}

export type TownFacilityId =
  | "temple" | "spiritGuild" | "elementsGuild" | "bountyGuild"
  | "weapon" | "armor" | "item" | "inn" | "stable" | "throne";

export interface TownFacilityDef {
  id: TownFacilityId;
  name: string;
  /** 시설 오버레이 제목(생략 시 name) */
  title?: string;
  /** 문(+) 칸 좌표 */
  x: number;
  y: number;
  trains?: SkillId[];
  classes?: ClassId[];
  /** 이 시설에서 수주·보고하는 의뢰 id */
  quests?: string[];
  /** 시설에 들어왔을 때 표시할 마을별 분위기 문구 */
  description?: string;
  /** 여관·길드 등에서 제공할 데이터 기반 대화 항목 */
  topics?: TownContentEntry[];
  /** 시설 입구에서 파티를 맞는 담당 NPC */
  keeper: TownKeeperDef;
}

export interface TownKeeperDef {
  name: string;
  role: string;
  portrait: number;
  greeting: string;
}

export interface TownContentRequirement {
  quests?: string[];
  flags?: Array<"intro" | "ending" | "letter">;
  minLevel?: number;
}

export interface TownContentEntry {
  id: string;
  label: string;
  text: string;
  requires?: TownContentRequirement;
}

export interface TownDecoDef {
  id: "fountain" | "well" | "barrel" | "crate" | "statue" | "tree" | "bush" | "flower" | "mushroom";
  name: string;
  x: number;
  y: number;
  text: string;
  /** 나무·덤불만 통행을 막고, 꽃·버섯은 지나갈 수 있다. */
  blocking?: boolean;
}

export interface TownGateDef {
  id: "west" | "south" | "east";
  x: number;
  y: number;
  label: string;
  prompt: string;
  target: FieldId;
}

export interface TownDistrictDef {
  id: string;
  name: string;
  /** 구역을 이루는 직사각형 범위(양 끝 포함) */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** 렌더링과 상호작용에 필요한 한 마을의 완전한 정적 정의. */
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
  gates: TownGateDef[];
  districts: TownDistrictDef[];
}
