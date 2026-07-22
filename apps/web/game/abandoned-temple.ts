/* =====================================================================
 * abandoned-temple.ts — 버려진 사원(몰락한 교단의 성소) 맵 데이터 (24×24 그리드)
 *  해안길 서쪽 곶 위의 옛 신전. 열주가 늘어선 대회랑을 지나 북쪽으로
 *  오를수록 교단의 흔적이 짙어지고, 서쪽 회랑은 바닷물에 잠겨 있다.
 *  최심부 제단에는 알 수 없는 힘으로 되살아난 주교가 도사린다.
 *  '#'벽(석조) '.'바닥 '+'잠긴 문(차단·장식) '~'물(차단·장식)
 *  정적 데이터 — 모든 바닥 칸이 남쪽 입구에서 도달 가능(연결성 검증 완료),
 *  차단형 POI 배치 후에도 고립 칸 0
 * ===================================================================== */
import { Facing, GridMap, parseMap } from "./grid";
import type { PoiDef, SpawnDef } from "./goblin-fortress";
import type { TileName } from "./tiles";

/** 장식 소품 — 칸을 점유하는 빌보드 (던전 씬이 배치·조사 처리) */
export interface TemplePropDef {
  id: string;
  name: string;
  x: number;
  y: number;
  tile: TileName;
  frames?: TileName[];
  scale: number;
  worldH: number;
  baseH: number;
  text: string;
}

export const TEMPLE_ROWS = [
  "########################",
  "########.....###########",
  "###......#.#.....#######",
  "###.####.#.#.###.....###",
  "###.#..#.#.#.#.#####.###",
  "###.#....#...#....+..###",
  "###.####.###.#.#####.###",
  "###......###.#.#...#.###",
  "###.#.######.#.#.#.#.###",
  "###.#.#....#.#...#...###",
  "###.#.#.##.#.#######.###",
  "###.#.#.##...........###",
  "###.#.#.##.#######.#####",
  "###.#....#.#~~~~.#.#####",
  "###.####.#.#~~~~.#.#####",
  "###....#.#.#.....#.#####",
  "#####..#.#.#.#####.#####",
  "####...#.#...#.....#####",
  "####.#.#.####.####.#####",
  "####.#.#....#....#.#####",
  "####.#.####.####.#.#####",
  "####.#......####...#####",
  "####.###########.#######",
  "########################",
] as const;

export const templeMap: GridMap = parseMap([...TEMPLE_ROWS]);

/** 파티 시작 위치 (남쪽 무너진 정문, 북향) */
export const TEMPLE_START = { x: 11, y: 21, facing: 0 as Facing };

/* ---- POI ---- */
export const TEMPLE_POIS: PoiDef[] = [
  { id: "portal", kind: "portal", x: 11, y: 21, blocking: false },
  { id: "sign", kind: "sign", x: 10, y: 21, blocking: true },
  /* 침수 회랑 곁 성물고 — 물의 방 동쪽 막다른 벽감 */
  { id: "reliquary", kind: "chest", x: 16, y: 13, blocking: true },
  /* 북동 예배실 숨김 상자 (seek 필요) */
  { id: "crypt_cache", kind: "chest", x: 19, y: 3, blocking: true, hidden: true },
];

/* ---- 적 스폰 ----
 *  남쪽 대회랑엔 송장버섯과 어둠박쥐, 침수 회랑엔 냉기 망령,
 *  북쪽 성소로 갈수록 교단의 잔재(눈알덩이)가 짙어진다 */
export const TEMPLE_NORMAL_SPAWNS: SpawnDef[] = [
  { id: "t1", defId: "husk", x: 5, y: 17 },
  { id: "t2", defId: "husk", x: 6, y: 13 },
  { id: "t3", defId: "husk", x: 6, y: 7 },
  { id: "t4", defId: "duskbat", x: 8, y: 9 },
  { id: "t5", defId: "duskbat", x: 13, y: 2 },
  { id: "t6", defId: "duskbat", x: 10, y: 5 },
  { id: "t7", defId: "skeleton", x: 18, y: 12 },
  { id: "t8", defId: "skeleton", x: 9, y: 19 },
  { id: "t9", defId: "eyeblob", x: 17, y: 11 },
  { id: "t10", defId: "eyeblob", x: 16, y: 17 },
];
/** 심볼 몹 — 제단의 촉수꽃(중앙 회랑 길목), 되살아난 주교(북서 제단실) */
export const TEMPLE_SYMBOL_SPAWNS: SpawnDef[] = [
  { id: "warden", defId: "tendril", x: 14, y: 11, symbol: "warden" },
  { id: "bishop", defId: "bishop", x: 5, y: 4, symbol: "fallen_bishop" },
];

/* ---- 장식 소품 — 교단의 흔적을 회랑 곳곳에 남긴다 ---- */
export const TEMPLE_PROPS: TemplePropDef[] = [
  {
    id: "altar", name: "뱀 문양 제단", x: 6, y: 4,
    tile: "temple_altar_obj", scale: 1.1, worldH: 1.0, baseH: 150,
    text: "뱀이 휘감은 옥좌 모양의 제단. 검게 마른 핏자국 위에 갓 피운 향의 재가 떨어져 있다.",
  },
  {
    id: "tomb", name: "뿔 달린 석관", x: 4, y: 22,
    tile: "crypt_tomb_obj", scale: 1.15, worldH: 0.55, baseH: 78,
    text: "짐승 뿔로 장식한 석관이다. 뚜껑이 안쪽에서 밀린 듯 비스듬히 어긋나 있다.",
  },
  {
    id: "soulflame", name: "혼불 성화", x: 16, y: 22,
    tile: "soulflame_obj_0", frames: ["soulflame_obj_0", "soulflame_obj_1", "soulflame_obj_2"],
    scale: 1.6, worldH: 0.72, baseH: 98,
    text: "기름도 없이 타는 푸른 불꽃. 성화라 부르기엔… 온기가 조금도 느껴지지 않는다.",
  },
  {
    id: "pillar", name: "홈 파인 석주", x: 6, y: 15,
    tile: "temple_pillar_obj", scale: 1.2, worldH: 1.0, baseH: 205,
    text: "회랑을 받치던 석주다. 순례자들이 만져 반들반들해진 자리에 소금꽃이 피었다.",
  },
  {
    id: "relic", name: "떨어진 성물", x: 3, y: 2,
    tile: "temple_relic_obj", scale: 0.8, worldH: 0.5, baseH: 78,
    text: "벽감에서 굴러떨어진 둥근 문장 성물. 새겨진 신의 이름이 정으로 지워져 있다.",
  },
];

/** 벽 칸의 성화 배치 — 결정적 의사난수 (요새보다 드물어 어둑하다) */
export function templeTorchAt(x: number, y: number): boolean {
  const s = Math.sin(x * 93.9 + y * 271.3) * 39713.2231;
  return s - Math.floor(s) < 0.11;
}
/** 그리스 문양 벽 변형 — 결정적 (회랑 곳곳의 옛 장식 벽) */
export function templeOrnateAt(x: number, y: number): boolean {
  const s = Math.sin(x * 53.7 + y * 151.1) * 18211.7345;
  return s - Math.floor(s) < 0.22;
}
/** 바닥 변형(갈라진 판석) — 결정적 */
export function templeFloorVariant(x: number, y: number): "temple_floor" | "temple_floor_crack" {
  const s = Math.sin(x * 17.3 + y * 89.7) * 51731.9457;
  return s - Math.floor(s) < 0.18 ? "temple_floor_crack" : "temple_floor";
}
