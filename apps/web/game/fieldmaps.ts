/* =====================================================================
 * fieldmaps.ts — 크로스베일 주변 필드 맵과 연결점
 * ===================================================================== */
import type { TownId, TownSpawn } from "./town/types";
import { Facing, GridMap, parseMap } from "./grid";
import type { TileName } from "./tiles";

export type FieldId = "ruinedTemple" | "goblinValley" | "hermanForest";

export type FieldTarget =
  | { kind: "field"; id: FieldId }
  | { kind: "town"; id: TownId; spawn: TownSpawn }
  | { kind: "explore" };

export interface FieldExit {
  x: number;
  y: number;
  label: string;
  prompt: string;
  target: FieldTarget;
}

export interface FieldDeco {
  id: string;
  name: string;
  x: number;
  y: number;
  tile: TileName;
  text: string;
  blocking?: boolean;
}

export interface FieldData {
  id: FieldId;
  name: string;
  badge: string;
  map: GridMap;
  start: { x: number; y: number; facing: Facing };
  exits: FieldExit[];
  decos: FieldDeco[];
  floorTint: number;
  wallTint: number;
}

const ruinedTempleMap = parseMap([
  "########################",
  "#......................#",
  "#..####....~~~~........#",
  "#..#..#....~~~~........#",
  "#..#..#................#",
  "#..#..######..######...#",
  "#......................#",
  "#....~~~~..............#",
  "#....~~~~....######....#",
  "#............#....#....#",
  "#............#....#....#",
  "#....######..######....#",
  "#......................#",
  "#......................#",
  "#......................#",
  "#......................#",
  "#......................#",
  "########################",
]);

const goblinValleyMap = parseMap([
  "########################",
  "#......................#",
  "#....~~~~..............#",
  "#....~~~~....######....#",
  "#...........#....#.....#",
  "#..######...#....#.....#",
  "#..#....#...######.....#",
  "#..#....#..............#",
  "#..######....~~~~......#",
  "#............~~~~......#",
  "#......................#",
  "#....######............#",
  "#....#....#............#",
  "#....#....#............#",
  "#....######............#",
  "#......................#",
  "#......................#",
  "########################",
]);

const hermanForestMap = parseMap([
  "########################",
  "#......................#",
  "#....~~~~..............#",
  "#....~~~~....######....#",
  "#...........#....#.....#",
  "#..######...#....#.....#",
  "#..#....#...######.....#",
  "#..#....#..............#",
  "#..######....~~~~......#",
  "#............~~~~......#",
  "#......................#",
  "#....######............#",
  "#....#....#............#",
  "#....#....#............#",
  "#....######............#",
  "#......................#",
  "#......................#",
  "########################",
]);

const forestDecos: FieldDeco[] = [
  { id: "oak", name: "참나무", x: 5, y: 4, tile: "tree_01", text: "햇볕을 가득 머금은 참나무가 길을 굽어본다.", blocking: true },
  { id: "pine", name: "전나무", x: 16, y: 5, tile: "tree_03", text: "짙은 전나무 향이 바람을 타고 흐른다.", blocking: true },
  { id: "bush", name: "덤불", x: 9, y: 10, tile: "bush_01", text: "작은 새들이 덤불 속에서 재잘거린다.", blocking: true },
  { id: "flower", name: "들꽃", x: 13, y: 12, tile: "flower_01", text: "이름 모를 들꽃이 길가를 밝힌다." },
  { id: "mushroom", name: "버섯", x: 18, y: 14, tile: "mushroom_01", text: "이끼 곁에 붉은 버섯이 돋아 있다." },
];

export const FIELDS: Record<FieldId, FieldData> = {
  ruinedTemple: {
    id: "ruinedTemple", name: "잊힌 사원의 길", badge: "서쪽 필드 — 잊힌 사원",
    map: ruinedTempleMap, start: { x: 21, y: 12, facing: 3 },
    exits: [{ x: 22, y: 12, label: "동쪽 길 — 크로스베일", prompt: "[Z] 동쪽으로 — 크로스베일", target: { kind: "town", id: "crossvale", spawn: "westGate" } }],
    decos: [
      ...forestDecos,
      { id: "ruin", name: "무너진 석주", x: 12, y: 7, tile: "tree_02", text: "검게 그을린 석주. 오래전 이곳에서 무언가가 무너졌다.", blocking: true },
    ],
    floorTint: 0x829143, wallTint: 0x66584a,
  },
  goblinValley: {
    id: "goblinValley", name: "고블린 계곡길", badge: "남쪽 필드 — 고블린 계곡길",
    map: goblinValleyMap, start: { x: 12, y: 2, facing: 2 },
    exits: [
      { x: 12, y: 1, label: "북쪽 길 — 크로스베일", prompt: "[Z] 북쪽으로 — 크로스베일", target: { kind: "town", id: "crossvale", spawn: "gate" } },
      { x: 1, y: 11, label: "서쪽 길 — 에버모어 성", prompt: "[Z] 서쪽으로 — 에버모어 성", target: { kind: "town", id: "evermore", spawn: "gate" } },
      { x: 22, y: 11, label: "동굴 입구 — 할로우베일", prompt: "[Z] 동굴 안으로 — 할로우베일", target: { kind: "explore" } },
    ],
    decos: [
      ...forestDecos,
      { id: "camp", name: "버려진 야영지", x: 10, y: 7, tile: "bush_02", text: "고블린들이 남긴 조잡한 야영 흔적. 불씨는 아직 따뜻하다.", blocking: true },
    ],
    floorTint: 0x8a8040, wallTint: 0x6b5842,
  },
  hermanForest: {
    id: "hermanForest", name: "헤르만의 은둔림", badge: "동쪽 필드 — 은둔림",
    map: hermanForestMap, start: { x: 2, y: 12, facing: 1 },
    exits: [{ x: 1, y: 12, label: "서쪽 길 — 크로스베일", prompt: "[Z] 서쪽으로 — 크로스베일", target: { kind: "town", id: "crossvale", spawn: "eastGate" } }],
    decos: [
      ...forestDecos,
      { id: "oldOak", name: "늙은 떡갈나무", x: 12, y: 8, tile: "tree_04", text: "나무껍질에 희미한 마도 문양이 새겨져 있다. 헤르만의 숲임이 틀림없다.", blocking: true },
    ],
    floorTint: 0x617f42, wallTint: 0x46603c,
  },
};
