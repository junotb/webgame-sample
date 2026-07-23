/* =====================================================================
 * royal-tomb.ts — 왕실 묘소(연방 왕가의 언덕 묘역) 맵 데이터 (22×20 그리드)
 *  에버모어 근교 필드의 동쪽 언덕에서 진입하는 역대 연방 군주들의 지하 묘역.
 *  남쪽 묘도를 지나 오르면 좌우로 배장묘 익랑이 갈라지고, 최북단 중앙에
 *  선대 군주들이 잠든 왕가 석실이 있다. 급사한 선대 군주의 새 석관이
 *  안치된 뒤로 묘지기들의 발길이 끊겼고, 진혼불만 홀로 타고 있다.
 *  '#'벽(석조) '.'바닥 — 정적 데이터, 모든 바닥 칸이 남쪽 입구에서
 *  도달 가능(연결성 검증 완료), 차단형 POI·프롭 배치 후에도 고립 칸 0
 * ===================================================================== */
import { Facing, GridMap, parseMap } from "./grid";
import type { PoiDef, SpawnDef } from "./goblin-fortress";
import type { TemplePropDef } from "./abandoned-temple";

export const TOMB_ROWS = [
  "######################",
  "#....................#",
  "#.####.########.####.#",
  "#.#..#.#......#.#..#.#",
  "#....#.#......#.#....#",
  "#.#..#.#......#.#..#.#",
  "#.####.###..###.####.#",
  "#....................#",
  "####.####.##.####.####",
  "#....#..#....#..#....#",
  "#.##.#..#....#..#.##.#",
  "#.##.#..........#.##.#",
  "#....####....####....#",
  "###.....#....#.....###",
  "#...##..........##...#",
  "#.#....########....#.#",
  "#....................#",
  "#########....#########",
  "#########....#########",
  "######################",
] as const;

export const tombMap: GridMap = parseMap([...TOMB_ROWS]);

/** 파티 시작 위치 (남쪽 묘도 입구, 북향) */
export const TOMB_START = { x: 10, y: 18, facing: 0 as Facing };

/* ---- POI ---- */
export const TOMB_POIS: PoiDef[] = [
  { id: "portal", kind: "portal", x: 10, y: 18, blocking: false },
  { id: "sign", kind: "sign", x: 12, y: 18, blocking: true },
  /* 서쪽 배장묘 — 참배객이 두고 간 봉헌 궤 */
  { id: "offering", kind: "chest", x: 3, y: 3, blocking: true },
  /* 동쪽 배장묘 숨김 상자 (seek 필요) */
  { id: "royal_cache", kind: "chest", x: 17, y: 3, blocking: true, hidden: true },
];

/* ---- 적 스폰 ----
 *  묘도와 익랑엔 송장버섯과 어둠박쥐, 석실에 가까워질수록
 *  냉기 망령과 눈알덩이가 짙어진다 */
export const TOMB_NORMAL_SPAWNS: SpawnDef[] = [
  { id: "r1", defId: "husk", x: 5, y: 7 },
  { id: "r2", defId: "husk", x: 15, y: 14 },
  { id: "r3", defId: "duskbat", x: 16, y: 7 },
  { id: "r4", defId: "duskbat", x: 3, y: 13 },
  { id: "r5", defId: "skeleton", x: 1, y: 10 },
  { id: "r6", defId: "skeleton", x: 20, y: 10 },
  { id: "r7", defId: "eyeblob", x: 10, y: 10 },
];
/** 심볼 몹 — 왕가 석실을 지키는 파수 망령 */
export const TOMB_SYMBOL_SPAWNS: SpawnDef[] = [
  { id: "warden", defId: "skeleton", x: 11, y: 4, symbol: "tombWarden" },
];

/* ---- 장식 소품 — 왕가의 영면과 최근의 이변을 함께 이야기한다 ---- */
export const TOMB_PROPS: TemplePropDef[] = [
  {
    id: "royal_coffin", name: "선대 군주의 석관", x: 10, y: 3,
    tile: "crypt_tomb_obj", scale: 1.2, worldH: 0.55, baseH: 78,
    text: "갓 다듬은 흰 석관 — 급사한 선대 군주의 것이다. 헌화가 채 마르지도 않았는데, 관 뚜껑의 문장 위에 낯선 긁힘 자국이 어지럽다.",
  },
  {
    id: "soulflame_w", name: "진혼불", x: 8, y: 5,
    tile: "soulflame_obj_0", frames: ["soulflame_obj_0", "soulflame_obj_1", "soulflame_obj_2"],
    scale: 1.5, worldH: 0.72, baseH: 98,
    text: "군주의 영면을 지키는 진혼불. 기름 없이 타는 푸른 불꽃이 석실의 냉기에 흔들린다.",
  },
  {
    id: "soulflame_e", name: "진혼불", x: 13, y: 5,
    tile: "soulflame_obj_0", frames: ["soulflame_obj_0", "soulflame_obj_1", "soulflame_obj_2"],
    scale: 1.5, worldH: 0.72, baseH: 98,
    text: "짝을 이루는 동쪽 진혼불. 두 불꽃이 함께 꺼지면 왕가의 대가 끊긴다는 전승이 있다.",
  },
  {
    id: "aisle_pillar", name: "묘도 석주", x: 3, y: 14,
    tile: "temple_pillar_obj", scale: 1.2, worldH: 1.0, baseH: 205,
    text: "역대 군주의 이름을 새겨 올린 석주다. 가장 아래 칸의 이름은 아직 정으로 새기다 만 채다.",
  },
  {
    id: "epitaph", name: "떨어진 조전 명판", x: 17, y: 12,
    tile: "temple_relic_obj", scale: 0.8, worldH: 0.5, baseH: 78,
    text: "벽감에서 떨어진 청동 조전 명판. 「빛이 지키고 어둠이 재운다」— 낡은 장례 기도문의 한 구절이다.",
  },
];

/** 벽 칸의 진혼 등불 배치 — 결정적 의사난수 (사원보다 드물어 더 어둡다) */
export function tombTorchAt(x: number, y: number): boolean {
  const s = Math.sin(x * 71.3 + y * 193.7) * 27431.5519;
  return s - Math.floor(s) < 0.09;
}
/** 문장 장식 벽 변형 — 결정적 (왕가 문장이 새겨진 옛 벽) */
export function tombOrnateAt(x: number, y: number): boolean {
  const s = Math.sin(x * 41.9 + y * 113.3) * 33127.6173;
  return s - Math.floor(s) < 0.2;
}
/** 바닥 변형(갈라진 판석) — 결정적 */
export function tombFloorVariant(x: number, y: number): "temple_floor" | "temple_floor_crack" {
  const s = Math.sin(x * 23.1 + y * 67.9) * 45911.3357;
  return s - Math.floor(s) < 0.14 ? "temple_floor_crack" : "temple_floor";
}
