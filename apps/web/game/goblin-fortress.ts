/* =====================================================================
 * goblin-fortress.ts — 고블린 요새 맵 데이터 (지상 24×24 + 지하 24×15)
 *  계곡 안쪽으로 파고든 고블린들의 소굴. 지상은 동굴 몬스터와 고블린 무리가
 *  뒤엉킨 미궁, 북동쪽 계단 아래 지하층에 주술사 그름바크의 알현실이 있다.
 *  '#'벽(암반) '.'바닥 '+'잠긴 문(차단·장식) '~'물(차단·장식) '>'계단
 *  scripts 없이 정적 데이터 — 생성기(시드42)로 만들어 연결성 검증 완료:
 *  모든 바닥 칸이 입구에서 도달 가능, 차단형 POI 배치 후에도 고립 칸 0
 * ===================================================================== */
import { Facing, GridMap, parseMap } from "./grid";

export const FORTRESS_ROWS = [
  "########################",
  "#######.......##########",
  "##....#######.##......##",
  "##........#.#........>##",
  "##....#.#.#.##.+......##",
  "##....#.#.#....#......##",
  "##.####.#.###.####+##.##",
  "#...#.......#...#...#.##",
  "#.#########.###.#...#.##",
  "#.....#..##.###...#.#.##",
  "####..#.##....#####.#.##",
  "#.....#.............#.##",
  "#.#####.##....#.#####.##",
  "#.#.#...###.###.#.....##",
  "#.#...#####.#.#.###.#.##",
  "#.#.+####.....#.......##",
  "#.#....##.###.#######.##",
  "#.#.~~......#...#.....##",
  "#.#.~~.#.##...###.######",
  "#.#....#..#.#...#...#.##",
  "#####.##..#.#.#.###.#.##",
  "#.....#...#.#.#.......##",
  "########################",
  "########################",
] as const;

export const fortressMap: GridMap = parseMap([...FORTRESS_ROWS]);

/** 파티 시작 위치 (남쪽 입구, 북향) */
export const START = { x: 11, y: 21, facing: 0 as Facing };

/* ---- POI ----
 *  walkable: 밟고 지나갈 수 있고 그 칸 위에서 상호작용 (portal)
 *  blocking: 칸을 점유 — 정면에서 상호작용 (sign, chest) */
export interface PoiDef {
  id: string;
  kind: "portal" | "sign" | "chest";
  x: number;
  y: number;
  blocking: boolean;
  /** 인지(Seek) 숙련으로 발견해야 드러나는 숨김 POI */
  hidden?: boolean;
}
export const POIS: PoiDef[] = [
  { id: "portal", kind: "portal", x: 11, y: 21, blocking: false },
  { id: "sign", kind: "sign", x: 13, y: 21, blocking: true },
  { id: "c1", kind: "chest", x: 3, y: 3, blocking: true },   // 북서 상자방
  { id: "hidden", kind: "chest", x: 7, y: 1, blocking: true, hidden: true }, // 최북단 막다른 길 (seek 필요)
];

/* ---- 적 스폰 ---- */
export interface SpawnDef {
  id: string;
  defId: string;
  x: number;
  y: number;
  /** 심볼(정예/보스/에픽)은 defeated 플래그로 영구 처치 */
  symbol?: string;
  /** 이 심볼이 처치된 뒤에만 등장 (예: 로드 처치 후 깨어나는 고대 정령) */
  requires?: string;
}
/** 일반 몹 — 마을에서 재진입 시 리스폰. 남쪽 어귀 동굴 슬라임·고블린 전사,
 *  북쪽 심부로 갈수록 고블린 늑대기수와 동굴 망령이 배회한다 */
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
/** 심볼 몹 — 고블린 광신도(중앙 홀 길목). 그름바크는 지하층 알현실에 있다 */
export const SYMBOL_SPAWNS: SpawnDef[] = [
  { id: "orc", defId: "orc", x: 12, y: 11, symbol: "orc" },
  { id: "sentry", defId: "goblin", x: 18, y: 3, symbol: "sentry" }, // 지하 계단을 지키는 파수병
];

/* =====================================================================
 * 지하층 (fortressB1) — 그름바크의 알현실
 *  북동쪽 계단(지상 >와 같은 자리)으로 내려온다. 통로가 서·남으로 갈라지고,
 *  서쪽 끝 넓은 알현실에 그름바크가, 그 앞을 친위대 둘이 막아선다.
 * ===================================================================== */
export const BASEMENT_ROWS = [
  "########################",
  "##...........##.....####",
  "##.#######.#.##.###.>###",
  "##.#.....#.#........####",
  "##.#.....#.#######.#####",
  "##.#...........#.....###",
  "##.#######.###.#.##..###",
  "##.........#...#.##.####",
  "##.####.####.###.#...###",
  "##.#~~#.#..#.....#.#.###",
  "##.#~~....##.###.#.#.###",
  "##.#...#..#..#...#.#..##",
  "##.#####..#.##.###.##.##",
  "##........#........##.##",
  "########################",
] as const;
/* 연결성 검증: 통행 147칸 전부 계단(20,2)에서 도달, 차단 POI 배치 후 고립 0 */

export const basementMap: GridMap = parseMap([...BASEMENT_ROWS]);

/** 지하층 시작 위치 — 내려온 계단 위 (서향) */
export const BASEMENT_START = { x: 20, y: 2, facing: 3 as Facing };

export const BASEMENT_POIS: PoiDef[] = [
  /* 계단 칸이 곧 지상으로 돌아가는 출구 */
  { id: "portal", kind: "portal", x: 20, y: 2, blocking: false },
  { id: "sign", kind: "sign", x: 19, y: 1, blocking: true },
  { id: "b1", kind: "chest", x: 4, y: 5, blocking: true },   // 알현실 안쪽 공물 상자
  { id: "vault", kind: "chest", x: 3, y: 13, blocking: true, hidden: true }, // 남서 구석 밀실 (seek 필요)
];

/** 지하 일반 몹 — 경비 고블린과 지하 냉기의 망령이 통로를 순찰한다 */
export const BASEMENT_NORMAL_SPAWNS: SpawnDef[] = [
  { id: "b_n1", defId: "goblin", x: 16, y: 3 },
  { id: "b_n2", defId: "skeleton", x: 8, y: 7 },
  { id: "b_n3", defId: "wolf", x: 12, y: 10 },
  { id: "b_n4", defId: "goblin", x: 15, y: 13 },
  { id: "b_n5", defId: "skeleton", x: 20, y: 11 },
];
/** 지하 심볼 몹 — 서쪽 알현실: 입구(9,5) 안쪽을 친위대 둘이 전위로 막고,
 *  그름바크는 방 안쪽(후위)에서 불·어둠 주술을 퍼붓는다.
 *  (심볼 키 "lord"는 세이브·퀘스트 호환을 위해 유지) */
export const BASEMENT_SYMBOL_SPAWNS: SpawnDef[] = [
  { id: "guard1", defId: "guard", x: 8, y: 4, symbol: "guard1" },
  { id: "guard2", defId: "guard", x: 8, y: 5, symbol: "guard2" },
  { id: "lord", defId: "lord", x: 5, y: 4, symbol: "lord" },
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
