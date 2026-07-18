/* =====================================================================
 * townmap.ts — 리븐홀드 마을 맵 데이터 (28×24 그리드, New Sorpigal풍)
 *  남문 — 중앙 분수 광장 — 북단 신전의 대로를 축으로 좌우 거리에 건물 배치.
 *  '#'벽(건물) '.'바닥(거리) '+'문(시설 입구, 막다른 칸) '~'개울(차단·장식)
 *
 *  구역: 북서 개울 / 북단 신전 / NW 영혼 길드 · NE 원소 길드
 *        W 현상금 길드 · E 무기점 / W 도구점 · E 방어구점
 *        SE 여관 / SW 우물 / 남단 성문(황혼의 숲)
 * ===================================================================== */
import { ClassId, SkillId } from "./defs";
import { Facing, GridMap, parseMap } from "./grid";

export const TOWN_ROWS = [
  "############################",
  "#~~~......########.........#",
  "#~~~......########.........#",
  "#~~~......########.........#",
  "#~~~......###+####.........#",
  "#..........................#",
  "#.######............######.#",
  "#.#####+............+#####.#",
  "#.######............######.#",
  "#..........................#",
  "#..........................#",
  "#.######............######.#",
  "#.#####+............+#####.#",
  "#.######............######.#",
  "#..........................#",
  "#..........................#",
  "#.######............######.#",
  "#.#####+............+#####.#",
  "#.######............######.#",
  "#..........................#",
  "#...................##+###.#",
  "#...................######.#",
  "#...................######.#",
  "############################",
] as const;

export const townMap: GridMap = parseMap([...TOWN_ROWS]);

/* ---- 진입 지점 ----
 *  fountain: 모험단 결성 직후 — 중앙 분수 앞(북향, 분수와 장로 카엘이 시야에)
 *  gate: 던전 귀환·전멸 복귀 — 남문 안쪽(북향) */
export type TownSpawn = "fountain" | "gate";
export const TOWN_STARTS: Record<TownSpawn, { x: number; y: number; facing: Facing }> = {
  fountain: { x: 13, y: 11, facing: 0 },
  gate: { x: 13, y: 21, facing: 0 },
};

/* ---- 시설 (문 칸 기준 — 정면/문 위에서 [Z]) ----
 *  trains: 이 건물에서 구매(수련) 가능한 기술
 *  classes: 이 건물에서 상담 가능한 전직 트리 */
export type TownFacilityId =
  | "temple" | "spiritGuild" | "elementsGuild" | "bountyGuild"
  | "weapon" | "armor" | "item" | "inn";

export interface TownFacilityDef {
  id: TownFacilityId;
  name: string;
  /** 문(+) 칸 좌표 */
  x: number;
  y: number;
  trains?: SkillId[];
  classes?: ClassId[];
}

export const TOWN_FACILITIES: TownFacilityDef[] = [
  { id: "temple", name: "신전", x: 13, y: 4 },
  {
    id: "spiritGuild", name: "영혼 길드", x: 7, y: 7,
    trains: ["spirit"],
    classes: ["acolyte", "priest", "monk"],
  },
  {
    id: "elementsGuild", name: "원소 길드", x: 20, y: 7,
    trains: ["elemental"],
    classes: ["mage", "archmage", "druid"],
  },
  { id: "bountyGuild", name: "현상금 길드", x: 7, y: 12 },
  {
    id: "weapon", name: "무기점", x: 20, y: 12,
    trains: ["blade", "cudgel", "spear", "martial", "unarmed", "bow", "thrown"],
    classes: ["swordman", "swordmaster", "assassin"],
  },
  { id: "item", name: "도구점", x: 7, y: 17 },
  {
    id: "armor", name: "방어구점", x: 20, y: 17,
    trains: ["armor", "dodge", "shield"],
    classes: ["spellsword", "paladin", "ranger"],
  },
  { id: "inn", name: "여관 '잿불'", x: 22, y: 20 },
];

/** 기술 수련 비용 (모든 건물 공통) */
export const SKILL_PRICE = 250;

/* ---- 장식 POI — 기능 없음, 조사 시 정취 텍스트. 칸을 점유(차단)한다 ---- */
export interface TownDecoDef {
  id: "fountain" | "well" | "barrel" | "crate";
  name: string;
  x: number;
  y: number;
  text: string;
}
export const TOWN_DECOS: TownDecoDef[] = [
  {
    id: "fountain", name: "분수", x: 13, y: 10,
    text: "맑은 물줄기가 달빛을 튕겨낸다. 광장의 심장 — 리븐홀드는 아직 살아 있다.",
  },
  {
    id: "well", name: "우물", x: 4, y: 21,
    text: "두레박이 삐걱인다. 바닥 저 아래, 동전 몇 닢이 소원과 함께 잠들어 있다.",
  },
  {
    id: "barrel", name: "술통", x: 8, y: 18,
    text: "도구점 앞에 부려 놓은 술통. 로칸의 필체로 '외상 사절'이라 적혀 있다.",
  },
  {
    id: "crate", name: "짐짝", x: 19, y: 11,
    text: "무기점으로 들일 강철 자재. 못이 단단히 박혀 있어 열리지 않는다.",
  },
];

/* ---- 남문 (밟고 [Z] → 황혼의 숲) ---- */
export const TOWN_GATES: { x: number; y: number }[] = [
  { x: 13, y: 22 },
  { x: 14, y: 22 },
];
