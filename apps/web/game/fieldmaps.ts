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
  tile?: TileName;
  visual?:
    | { kind: "monster"; defId: "goblin" | "wolf" }
    | { kind: "building"; style: "bandit_hideout" | "goblin_camp" | "cage_full" | "cage_empty" | "goblin_totem" | "campfire" | "shore_boat" | "shore_dock" | "valley_rock" };
  text: string;
  blocking?: boolean;
}

export interface FieldTheme {
  background: {
    sky: number;
    horizon: number;
    ridge: number;
    texture?: TileName;
    layers?: TileName[];
    tint?: number;
  };
  floor: TileName;
  floorDecal?: TileName;
  wall: TileName;
  wallDecal?: TileName;
  ceiling: TileName | null;
  water: TileName;
  floorTint: number;
  wallTint: number;
  waterTint?: number;
  viewDistance?: number;
}

export interface FieldData {
  id: FieldId;
  name: string;
  badge: string;
  map: GridMap;
  start: { x: number; y: number; facing: Facing };
  exits: FieldExit[];
  decos: FieldDeco[];
  theme: FieldTheme;
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

/* 북·서·남쪽 길은 암벽 사이를 여러 번 꺾어 가는 협곡 미로다.
 * 중앙 문턱을 동쪽으로 넘으면 시야가 단숨에 열리는 해안 평야가 나오고,
 * 평야의 동쪽 끝 세 열은 걸어서 건널 수 없는 바다로 이어진다. */
const goblinValleyMap = parseMap([
  "########################################",
  "##############..########################",
  "##############..########################",
  "##############.......###################",
  "##############.......#...............~~~",
  "###################..#...............~~~",
  "################.....#...............~~~",
  "#######..#######.....#...............~~~",
  "#######..#######..####...............~~~",
  "##.........#......####...............~~~",
  "##.........#......####...............~~~",
  "####..##......##.....................~~~",
  "#.....##.............................~~~",
  "#.....######.........................~~~",
  "##############..######...............~~~",
  "#########.......######...............~~~",
  "#########............#...............~~~",
  "##############.......#...............~~~",
  "###################..###################",
  "##################.......###############",
  "###########..............###############",
  "###########..........###################",
  "########.....###########################",
  "########..........######################",
  "###########.......######################",
  "################.......#################",
  "##############.........#################",
  "##############....######################",
  "##############..########################",
  "########################################",
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
      { id: "bishop_altar", name: "검게 물든 제단", x: 13, y: 6, tile: "mushroom_01",
        text: "갈라진 제단 아래에서 불길한 기도 소리가 새어 나온다." },
    ],
    theme: {
      background: { sky: 0x7f9b9b, horizon: 0xb7b98e, ridge: 0x586849 },
      floor: "floor", floorDecal: "pave_decal", wall: "wall", wallDecal: "wall_worn_decal",
      ceiling: "ceiling", water: "water", floorTint: 0x829143, wallTint: 0x66584a,
    },
  },
  goblinValley: {
    id: "goblinValley", name: "고블린 계곡길", badge: "남쪽 필드 — 고블린 계곡길",
    map: goblinValleyMap, start: { x: 14, y: 3, facing: 2 },
    exits: [
      { x: 14, y: 1, label: "북쪽 길 — 크로스베일", prompt: "[Z] 북쪽으로 — 크로스베일", target: { kind: "town", id: "crossvale", spawn: "gate" } },
      { x: 1, y: 12, label: "서쪽 좁은 계곡 — 에버모어 성", prompt: "[Z] 서쪽으로 — 에버모어 성", target: { kind: "town", id: "evermore", spawn: "gate" } },
      { x: 14, y: 28, label: "계곡 안쪽 — 고블린 요새", prompt: "[Z] 요새 안으로 — 고블린 요새", target: { kind: "explore" } },
    ],
    decos: [
      /* --- 서쪽 좁은 계곡: 산적 매복 --- */
      { id: "bandit_track", name: "수상한 발자국", x: 7, y: 9, tile: "bush_01",
        text: "좁은 계곡 그늘에 최근 오간 발자국이 어지럽다. 산적 무리가 여기 숨어 있다는 소문이 헛말은 아닌 모양이다." },
      { id: "bandit_hideout", name: "바위 그늘의 은신처", x: 9, y: 11, visual: { kind: "building", style: "bandit_hideout" }, blocking: true,
        text: "바위 그늘 아래 급히 꾸린 은신처 흔적. 안쪽에서 누군가 이쪽을 엿보는 기척이 스친다. 아직은 건드리지 않는 편이 낫겠다." },
      /* --- 동쪽 넓은 평야: 고블린 주둔지 · 포로 우리 · 바다 --- */
      { id: "gob_garrison", name: "고블린 주둔지", x: 25, y: 7, visual: { kind: "building", style: "goblin_camp" }, blocking: true,
        text: "평야 한복판에 세운 말뚝과 모닥불. 창을 든 고블린들이 우리를 지키며 어슬렁거린다." },
      { id: "garrison_fire", name: "주둔지 모닥불", x: 26, y: 9, visual: { kind: "building", style: "campfire" },
        text: "덜 마른 장작과 부서진 방패를 태운 불길이다. 매캐한 연기가 해풍에 낮게 깔린다." },
      { id: "garrison_guard", name: "주둔지 경비병", x: 28, y: 8, visual: { kind: "monster", defId: "goblin" }, blocking: true,
        text: "창과 방패로 무장한 고블린 전사가 포로 우리와 해안 쪽을 번갈아 감시한다." },
      { id: "wolf_scout", name: "고블린 늑대기수", x: 29, y: 14, visual: { kind: "monster", defId: "wolf" }, blocking: true,
        text: "굶주린 굴늑대가 바닷바람의 냄새를 맡는다. 등에 탄 고블린 정찰병은 계곡 입구를 노려보고 있다." },
      { id: "cage_full", name: "포로 우리", x: 32, y: 7, visual: { kind: "building", style: "cage_full" }, blocking: true,
        text: "통나무를 얽어 만든 우리. 겁에 질린 마을 사람들이 갇힌 채 이쪽으로 소리 없이 손을 뻗는다." },
      { id: "cage_empty", name: "빈 우리", x: 33, y: 12, visual: { kind: "building", style: "cage_empty" }, blocking: true,
        text: "지푸라기와 빈 그릇만 나뒹구는 우리. 끌려간 이들은 대체 어디로 갔을까." },
      { id: "shore", name: "바다 끝자락", x: 36, y: 10, tile: "flower_01",
        text: "계곡 동편이 넓은 평야로 열리고, 그 끝에서 잿빛 바다가 넘실댄다. 물비린내가 바람을 타고 온다." },
      { id: "shore_boat", name: "고블린 나룻배", x: 35, y: 15, visual: { kind: "building", style: "shore_boat" }, blocking: true,
        text: "엉성하게 수리한 나룻배. 뱃전에 고블린들의 붉은 손자국이 어지럽게 찍혀 있다." },
      { id: "shore_dock", name: "낡은 선착장", x: 36, y: 16, visual: { kind: "building", style: "shore_dock" }, blocking: true,
        text: "파도에 삭은 통나무 선착장이 바다로 뻗어 있다. 포로와 약탈품을 실어 나른 흔적이 남아 있다." },
      { id: "plain_tree", name: "외딴 참나무", x: 24, y: 5, tile: "tree_01", blocking: true,
        text: "평야에 홀로 선 참나무. 가지에 낡은 헝겊 조각들이 표식처럼 묶여 있다." },
      /* --- 협곡 표식: 갈색 거석이 좁은 길의 굴곡을 강조한다. --- */
      { id: "north_boulder", name: "갈라진 계곡바위", x: 16, y: 8, visual: { kind: "building", style: "valley_rock" }, blocking: true,
        text: "오래된 균열이 번개처럼 퍼진 갈색 바위다. 북쪽 협곡의 바람이 틈 사이로 울린다." },
      { id: "west_boulder", name: "매복로 바위", x: 3, y: 10, visual: { kind: "building", style: "valley_rock" }, blocking: true,
        text: "사람 하나쯤은 넉넉히 숨을 수 있는 거석이다. 뒤편에 잘린 밧줄과 화살촉이 흩어져 있다." },
      { id: "south_boulder", name: "요새길 경계석", x: 23, y: 19, visual: { kind: "building", style: "valley_rock" }, blocking: true,
        text: "붉은 안료로 비뚤어진 고블린 문양을 그린 바위다. 이 너머부터 요새의 영역이라는 뜻이다." },
      /* --- 남쪽 계곡 안쪽: 요새로 향하는 배회 고블린 --- */
      { id: "gob_patrol", name: "배회하는 고블린", x: 19, y: 20, visual: { kind: "monster", defId: "goblin" }, blocking: true,
        text: "창을 든 고블린 몇이 요새 어귀를 어슬렁거린다. 아직 이쪽을 눈치채지 못했다." },
      { id: "gob_totem", name: "고블린 토템", x: 12, y: 23, visual: { kind: "building", style: "goblin_totem" }, blocking: true,
        text: "해골과 넝마를 얽어 세운 조잡한 토템. 요새가 코앞이라는 경고다." },
      { id: "valley_mushroom", name: "동굴버섯", x: 15, y: 27, tile: "mushroom_01",
        text: "요새 어귀 바위틈에 창백한 버섯이 돋았다. 안쪽 동굴에서 스며 나온 눅눅한 냉기가 감돈다." },
    ],
    theme: {
      background: {
        sky: 0x65777b, horizon: 0xaaa17f, ridge: 0x4a4437,
        texture: "goblin_sky_base",
        layers: ["goblin_sky_cloud_back", "goblin_sky_cloud_near"],
        tint: 0x9aa7a5,
      },
      floor: "village_grass", floorDecal: "pave2_decal", wall: "cave_wall", wallDecal: "wall_worn_decal",
      ceiling: null, water: "village_water",
      floorTint: 0xa18c52, wallTint: 0x80654b, waterTint: 0x577581, viewDistance: 7,
    },
  },
  hermanForest: {
    id: "hermanForest", name: "헤르만의 은둔림", badge: "동쪽 필드 — 은둔림",
    map: hermanForestMap, start: { x: 2, y: 12, facing: 1 },
    exits: [{ x: 1, y: 12, label: "서쪽 길 — 크로스베일", prompt: "[Z] 서쪽으로 — 크로스베일", target: { kind: "town", id: "crossvale", spawn: "eastGate" } }],
    decos: [
      ...forestDecos,
      { id: "oldOak", name: "늙은 떡갈나무", x: 12, y: 8, tile: "tree_04", text: "나무껍질에 희미한 마도 문양이 새겨져 있다. 헤르만의 숲임이 틀림없다.", blocking: true },
    ],
    theme: {
      background: { sky: 0x668c8d, horizon: 0xa9bd92, ridge: 0x3d5c3d },
      floor: "floor", floorDecal: "pave_decal", wall: "wall", wallDecal: "wall_worn_decal",
      ceiling: "ceiling", water: "water", floorTint: 0x617f42, wallTint: 0x46603c,
    },
  },
};
