/* =====================================================================
 * dungeon.ts — 할로우베일 계곡 지하미궁 맵 데이터 (24×24 그리드)
 *  '#'벽 '.'바닥 '+'문 '~'물(차단·장식) '>'계단
 *  scripts 없이 정적 데이터 — 생성기(시드42)로 만들어 연결성 검증 완료:
 *  모든 바닥 칸이 입구에서 도달 가능, 차단형 POI 배치 후에도 고립 칸 0
 * ===================================================================== */
import { Facing, GridMap, parseMap } from "./grid";

export const DUNGEON_ROWS = [
  "########################",
  "#######.......##########",
  "##....#######.##......##",
  "##....+...#.#........>##",
  "##....#.#.#.##.+......##",
  "##....#.#.#....#......##",
  "##.####.#.###.####+##.##",
  "#...#.......#...#...#.##",
  "#.#########.###.#...#.##",
  "#.....#..##.###...#.#.##",
  "####..#.##....#####.#.##",
  "#.....#..+....+.....#.##",
  "#.#####.##....#.#####.##",
  "#.#.#...###+###.#.....##",
  "#.#...#####.#.#.###.#.##",
  "#.#.+####.....#.......##",
  "#.#....##.###.#######.##",
  "#.#.~~.+....#...#.....##",
  "#.#.~~.#.##...###.######",
  "#.#....#..#.#...#...#.##",
  "#####.##..#.#.#.###.#.##",
  "#.....#...#.#.#.......##",
  "########################",
  "########################",
] as const;

export const dungeonMap: GridMap = parseMap([...DUNGEON_ROWS]);

/** 파티 시작 위치 (남쪽 입구, 북향) */
export const START = { x: 11, y: 21, facing: 0 as Facing };

/* ---- POI ----
 *  walkable: 밟고 지나갈 수 있고 그 칸 위에서 상호작용 (portal)
 *  blocking: 칸을 점유 — 정면에서 상호작용 (sign, chest) */
export interface PoiDef {
  id: "portal" | "sign" | "c1" | "hidden";
  kind: "portal" | "sign" | "chest";
  x: number;
  y: number;
  blocking: boolean;
}
export const POIS: PoiDef[] = [
  { id: "portal", kind: "portal", x: 11, y: 21, blocking: false },
  { id: "sign", kind: "sign", x: 13, y: 21, blocking: true },
  { id: "c1", kind: "chest", x: 3, y: 3, blocking: true },   // 북서 상자방
  { id: "hidden", kind: "chest", x: 7, y: 1, blocking: true }, // 최북단 막다른 길 (seek 필요)
];

/* ---- 적 스폰 ---- */
export interface SpawnDef {
  id: string;
  defId: string;
  x: number;
  y: number;
  /** 심볼(정예/보스/에픽)은 defeated 플래그로 영구 처치 */
  symbol?: "orc" | "lord" | "ancient";
}
/** 일반 몹 — 마을에서 재진입 시 리스폰. 남쪽 얕은 구역 slime/goblin, 북쪽 심부 wolf/skeleton */
export const NORMAL_SPAWNS: SpawnDef[] = [
  { id: "n1", defId: "goblin", x: 5, y: 13 },
  { id: "n2", defId: "wolf", x: 14, y: 7 },
  { id: "n3", defId: "slime", x: 17, y: 19 },
  { id: "n4", defId: "skeleton", x: 19, y: 8 },
  { id: "n5", defId: "slime", x: 13, y: 17 },
  { id: "n6", defId: "wolf", x: 9, y: 5 },
  { id: "n7", defId: "wolf", x: 15, y: 11 },
  { id: "n8", defId: "skeleton", x: 5, y: 10 },
  { id: "n9", defId: "goblin", x: 8, y: 7 },
  { id: "n10", defId: "skeleton", x: 3, y: 7 },
  { id: "n11", defId: "wolf", x: 21, y: 10 },
];
/** 심볼 몹 — 오크(중앙 홀 길목), 군주(북동 보스방), 고대 정령(물의 방 — 군주 처치 후 등장) */
export const SYMBOL_SPAWNS: SpawnDef[] = [
  { id: "orc", defId: "orc", x: 12, y: 11, symbol: "orc" },
  { id: "lord", defId: "lord", x: 18, y: 3, symbol: "lord" },
  { id: "ancient", defId: "ancient", x: 5, y: 16, symbol: "ancient" },
];

/** 벽 칸의 횃불 배치 — 결정적 의사난수 (칸 좌표 기반) */
export function torchAt(x: number, y: number): boolean {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s) < 0.16;
}
/** 벽 변형(이끼) — 결정적 */
export function mossAt(x: number, y: number): boolean {
  const s = Math.sin(x * 61.3 + y * 197.9) * 24634.6345;
  return s - Math.floor(s) < 0.2;
}
/** 바닥 변형(균열/부서진 판석) — 결정적 */
export function floorVariant(x: number, y: number): "floor" | "floor_crack" | "floor_rubble" {
  const s = Math.sin(x * 13.7 + y * 101.3) * 43758.5453;
  const v = s - Math.floor(s);
  return v < 0.1 ? "floor_crack" : v > 0.94 ? "floor_rubble" : "floor";
}
