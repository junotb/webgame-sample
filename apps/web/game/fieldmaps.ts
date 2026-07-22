/* =====================================================================
 * fieldmaps.ts — 크로스베일 주변 필드 맵과 연결점
 * ===================================================================== */
import type { TownId, TownSpawn } from "./town/types";
import type { DungeonId } from "./dungeons";
import { Facing, GridMap, parseMap } from "./grid";
import type { TileName } from "./tiles";

export type FieldId = "coastRoad" | "goblinValley" | "hermanForest";

export type FieldTarget =
  | { kind: "field"; id: FieldId }
  | { kind: "town"; id: TownId; spawn: TownSpawn }
  | { kind: "explore"; dungeon: DungeonId };

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
    | { kind: "monster"; defId: "goblin" | "wolf" | "slime" | "husk" | "duskbat" | "orc" | "tendril" }
    | { kind: "building"; style: "bandit_hideout" | "goblin_camp" | "cage_full" | "cage_empty" | "goblin_totem" | "campfire" | "shore_boat" | "shore_dock" | "valley_rock" | "shore_netline" | "shore_net" | "broken_cross" | "ruin_column" };
  text: string;
  blocking?: boolean;
  /** 조사 시 전투 — 승리하면 respawnDays 만큼 필드에서 사라졌다 재등장 */
  fight?: { enemies: string[]; respawnDays: number };
}

/** 걷다가 마주치는 랜덤 인카운터 — 잡몹은 지도에 보이지 않는다 */
export interface FieldEncounterDef {
  /** 한 걸음당 조우 확률 (0~1) */
  chance: number;
  /** 조우 시 무작위로 뽑는 적 무리 */
  groups: string[][];
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
  /** 랜덤 인카운터 정의 — 생략 시 조우 없음 */
  encounters?: FieldEncounterDef;
  theme: FieldTheme;
}

/* 동쪽 초지가 서쪽으로 갈수록 모래사장으로 바뀌고, 서쪽 끝은 걸어서
 * 건널 수 없는 바다다. 북서쪽 곶 위에 버려진 사원의 정문이 서 있고,
 * 남쪽 물가에는 버려진 어촌의 선착장·나룻배 흔적이 남아 있다. */
const coastRoadMap = parseMap([
  "##############################",
  "#~~~~~.......................#",
  "#~~~~~..###...........###....#",
  "#~~~~....#.............#.....#",
  "#~~~......................#..#",
  "#~~~..........####...........#",
  "#~~........................###",
  "#~~..........................#",
  "#~~..........~~~.............#",
  "#~~..........~~~.............#",
  "#~~........................###",
  "#~~~.....####................#",
  "#~~~.........................#",
  "#~~~~....#..........###......#",
  "#~~~~~...#...................#",
  "#~~~~~~......................#",
  "#~~~~~~~.....................#",
  "##############################",
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
  coastRoad: {
    id: "coastRoad", name: "서녘 해안길", badge: "서쪽 필드 — 해안길",
    map: coastRoadMap, start: { x: 27, y: 8, facing: 3 },
    exits: [
      { x: 28, y: 8, label: "동쪽 길 — 크로스베일", prompt: "[Z] 동쪽으로 — 크로스베일", target: { kind: "town", id: "crossvale", spawn: "westGate" } },
      { x: 4, y: 4, label: "곶 위의 정문 — 버려진 사원", prompt: "[Z] 사원 안으로 — 버려진 사원", target: { kind: "explore", dungeon: "temple" } },
    ],
    decos: [
      /* --- 동쪽 초지: 크로스베일을 등진 완만한 길 --- */
      { id: "bent_pine", name: "바람에 굽은 소나무", x: 25, y: 5, tile: "tree_03", blocking: true,
        text: "바닷바람에 한쪽으로 휘어 자란 소나무다. 가지가 전부 뭍 쪽을 가리킨다." },
      { id: "salt_bush", name: "소금기 먹은 관목", x: 17, y: 7, tile: "bush_02", blocking: true,
        text: "잎끝이 하얗게 마른 관목. 씹어 보면 짭짤하다고 로칸이 말했었다." },
      { id: "coast_flower", name: "갯메꽃", x: 24, y: 10, tile: "flower_01",
        text: "모래땅을 기며 피는 연분홍 갯메꽃이 길가를 수놓는다." },
      /* --- 중부: 버려진 어촌의 흔적 --- */
      { id: "netline", name: "생선 건조줄", x: 10, y: 3, visual: { kind: "building", style: "shore_netline" }, blocking: true,
        text: "말리다 만 생선이 그대로 줄에 매달려 바싹 말라 있다. 어부들은 급히 떠난 모양이다." },
      { id: "net_fence", name: "그물 울짱", x: 19, y: 12, visual: { kind: "building", style: "shore_net" }, blocking: true,
        text: "그물을 걸어 두던 낮은 울짱. 찢긴 그물코 사이로 바람이 휘파람을 분다." },
      { id: "old_boat", name: "뒤집힌 나룻배", x: 8, y: 14, visual: { kind: "building", style: "shore_boat" }, blocking: true,
        text: "밑바닥이 하늘을 보는 나룻배. 널빤지 틈에 따개비가 하얗게 앉았다." },
      { id: "old_dock", name: "삭은 선착장", x: 5, y: 15, visual: { kind: "building", style: "shore_dock" }, blocking: true,
        text: "파도에 삭은 선착장이 바다로 뻗어 있다. 어촌 사람들은 이 다리로 다시 돌아오지 않았다." },
      { id: "refuge_fire", name: "피난 어부의 모닥불", x: 21, y: 8, visual: { kind: "building", style: "campfire" },
        text: "마을 쪽 길목에 어부 하나가 피운 모닥불이다. \"사원 쪽으론 가지 마시오… 밤마다 곶에서 검은 날개가 쏟아진다오.\" 그는 바다를 등지고 앉아 있다." },
      { id: "tide_pool", name: "물웅덩이", x: 16, y: 9, tile: "flower_02",
        text: "썰물이 남긴 웅덩이에 작은 게들이 종종거린다. 수면에 잿빛 하늘이 비친다." },
      { id: "reef_rock", name: "갯바위", x: 12, y: 6, visual: { kind: "building", style: "valley_rock" }, blocking: true,
        text: "미역 줄기가 늘어붙은 갯바위다. 소금꽃이 표면에 하얗게 피었다." },
      { id: "dune_rock", name: "모래언덕 바위", x: 22, y: 4, visual: { kind: "building", style: "valley_rock" }, blocking: true,
        text: "모래에 반쯤 파묻힌 둥근 바위. 뭍새들이 앉았다 간 흔적이 어지럽다." },
      /* --- 서쪽 곶: 사원으로 오르는 참배로 --- */
      { id: "salt_column", name: "소금에 삭은 석주", x: 6, y: 5, visual: { kind: "building", style: "ruin_column" }, blocking: true,
        text: "옛 참배로의 석주다. 바다 쪽 면만 소금에 하얗게 삭아 있다." },
      { id: "broken_cross", name: "부서진 성상", x: 7, y: 11, visual: { kind: "building", style: "broken_cross" }, blocking: true,
        text: "쓰러진 성상의 얼굴이 정으로 지워져 있다. 사원이 버려진 게 아니라… 버림받은 것처럼." },
      { id: "cold_shrine", name: "검게 물든 제단", x: 5, y: 6, tile: "mushroom_01",
        text: "곶으로 오르는 길목의 작은 제단이 검게 그을려 있다. 사원 쪽에서 낮은 기도 소리가 흘러온다." },
      { id: "grave_husk", name: "참배로의 송장버섯", x: 8, y: 6, visual: { kind: "monster", defId: "husk" }, blocking: true,
        fight: { enemies: ["husk", "husk"], respawnDays: 1 },
        text: "묻힌 참배객의 것이었을 흙무덤 위로 창백한 송장버섯이 부풀어 있다. 포자가 사원 쪽 바람을 타고 흩날린다." },
      { id: "cape_bat", name: "곶의 어둠박쥐", x: 6, y: 9, visual: { kind: "monster", defId: "duskbat" }, blocking: true,
        fight: { enemies: ["duskbat", "duskbat", "duskbat"], respawnDays: 1 },
        text: "부서진 성상 주위를 어둠박쥐가 낮게 맴돈다. 사원 회랑에서 빠져나온 무리의 척후인 듯하다." },
      { id: "cape_tendril", name: "참배로의 촉수꽃", x: 6, y: 8, visual: { kind: "monster", defId: "tendril" }, blocking: true,
        fight: { enemies: ["tendril"], respawnDays: 2 },
        text: "검게 물든 제단의 피를 빨아올린 덩굴이 참배로에 뿌리내렸다. 사원의 것과 같은 종이다." },
    ],
    theme: {
      background: {
        sky: 0x9db8c6, horizon: 0xd8c9a3, ridge: 0x5a6a72,
        texture: "coast_sky_base",
        layers: ["coast_sky_cloud_back", "coast_sky_cloud_near"],
        tint: 0xeef3f5,
      },
      floor: "sand_floor", wall: "cave_wall", wallDecal: "wall_worn_decal",
      ceiling: null, water: "village_water",
      floorTint: 0xd9c894, wallTint: 0x9aa0a6, waterTint: 0x6f9db4, viewDistance: 7,
    },
    encounters: {
      chance: 0.08,
      groups: [["husk"], ["duskbat", "duskbat"], ["husk", "duskbat"], ["husk", "husk"]],
    },
  },
  goblinValley: {
    id: "goblinValley", name: "고블린 계곡길", badge: "남쪽 필드 — 고블린 계곡길",
    map: goblinValleyMap, start: { x: 14, y: 3, facing: 2 },
    exits: [
      { x: 14, y: 1, label: "북쪽 길 — 크로스베일", prompt: "[Z] 북쪽으로 — 크로스베일", target: { kind: "town", id: "crossvale", spawn: "gate" } },
      { x: 1, y: 12, label: "서쪽 좁은 계곡 — 에버모어 성", prompt: "[Z] 서쪽으로 — 에버모어 성", target: { kind: "town", id: "evermore", spawn: "gate" } },
      { x: 14, y: 28, label: "계곡 안쪽 — 고블린 요새", prompt: "[Z] 요새 안으로 — 고블린 요새", target: { kind: "explore", dungeon: "fortress" } },
    ],
    decos: [
      /* --- 서쪽 좁은 계곡: 산적 매복 --- */
      { id: "bandit_track", name: "수상한 발자국", x: 7, y: 9, tile: "bush_01",
        text: "좁은 계곡 그늘에 최근 오간 발자국이 어지럽다. 산적 무리가 여기 숨어 있다는 소문이 헛말은 아닌 모양이다." },
      { id: "bandit_hideout", name: "바위 그늘의 은신처", x: 9, y: 11, visual: { kind: "building", style: "bandit_hideout" }, blocking: true,
        text: "바위 그늘 아래 급히 꾸린 은신처 흔적. 안쪽에서 누군가 일행을 엿보는 기척이 스친다. 아직은 건드리지 않는 편이 안전하다." },
      /* --- 동쪽 넓은 평야: 고블린 주둔지 · 포로 우리 · 바다 --- */
      { id: "gob_garrison", name: "고블린 주둔지", x: 25, y: 7, visual: { kind: "building", style: "goblin_camp" }, blocking: true,
        text: "평야 한복판에 세운 말뚝과 모닥불. 창을 든 고블린들이 우리를 지키며 어슬렁거린다." },
      { id: "garrison_fire", name: "주둔지 모닥불", x: 26, y: 9, visual: { kind: "building", style: "campfire" },
        text: "덜 마른 장작과 부서진 방패를 태운 불길이다. 매캐한 연기가 해풍에 낮게 깔린다." },
      { id: "garrison_guard", name: "주둔지 경비병", x: 28, y: 8, visual: { kind: "monster", defId: "goblin" }, blocking: true,
        fight: { enemies: ["goblin", "goblin"], respawnDays: 1 },
        text: "창과 방패로 무장한 고블린 전사가 포로 우리와 해안 쪽을 번갈아 감시한다." },
      { id: "wolf_scout", name: "고블린 늑대기수", x: 29, y: 14, visual: { kind: "monster", defId: "wolf" }, blocking: true,
        fight: { enemies: ["wolf", "wolf"], respawnDays: 1 },
        text: "굶주린 굴늑대가 바닷바람의 냄새를 맡는다. 등에 탄 고블린 정찰병은 계곡 입구를 노려보고 있다." },
      { id: "garrison_fanatic", name: "주둔지의 광신도", x: 27, y: 11, visual: { kind: "monster", defId: "orc" }, blocking: true,
        fight: { enemies: ["orc"], respawnDays: 2 },
        text: "제례용 곡도를 늘어뜨린 상위 고블린이 주둔지를 감독한다. 그름바크가 평야에 심어 둔 감시자다." },
      { id: "cage_full", name: "포로 우리", x: 32, y: 7, visual: { kind: "building", style: "cage_full" }, blocking: true,
        text: "통나무를 얽어 만든 우리. 겁에 질린 마을 사람들이 갇힌 채 일행 쪽으로 소리 없이 손을 뻗는다." },
      { id: "cage_empty", name: "빈 우리", x: 33, y: 12, visual: { kind: "building", style: "cage_empty" }, blocking: true,
        text: "지푸라기와 빈 그릇만 나뒹구는 우리. 끌려간 이들의 행방은 알 수 없다." },
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
        fight: { enemies: ["goblin", "goblin", "goblin"], respawnDays: 1 },
        text: "창을 든 고블린 몇이 요새 어귀를 어슬렁거린다. 아직 일행을 눈치채지 못했다." },
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
    encounters: {
      chance: 0.09,
      groups: [["goblin"], ["goblin", "goblin"], ["wolf"], ["goblin", "wolf"], ["slime", "slime"]],
    },
  },
  hermanForest: {
    id: "hermanForest", name: "헤르만의 은둔림", badge: "동쪽 필드 — 은둔림",
    map: hermanForestMap, start: { x: 2, y: 12, facing: 1 },
    exits: [{ x: 1, y: 12, label: "서쪽 길 — 크로스베일", prompt: "[Z] 서쪽으로 — 크로스베일", target: { kind: "town", id: "crossvale", spawn: "eastGate" } }],
    decos: [
      ...forestDecos,
      { id: "oldOak", name: "늙은 떡갈나무", x: 12, y: 8, tile: "tree_04", text: "나무껍질에 희미한 마도 문양이 새겨져 있다. 헤르만의 숲임이 틀림없다.", blocking: true },
      /* --- 헤르만의 흔적: 표석·식지 않은 화덕이 은둔자의 부재를 이야기한다 --- */
      { id: "herman_stone", name: "헤르만의 표석", x: 10, y: 3, visual: { kind: "building", style: "valley_rock" }, blocking: true,
        text: "이끼 낀 표석에 마도 문양이 촘촘히 새겨져 있다. 손을 대자 희미한 온기가 남아 있다 — 숲을 지키는 결계의 초석이다." },
      { id: "herman_fire", name: "식지 않은 화덕", x: 19, y: 8, visual: { kind: "building", style: "campfire" },
        text: "오두막 곁 돌화덕에 아직 불씨가 남아 있다. 헤르만은 멀리 가지 않았거나… 급히 떠난 것이다. 약초 다발이 걸쇠에 그대로 매달려 있다." },
      { id: "wood_slime_1", name: "숲그늘 슬라임", x: 11, y: 10, visual: { kind: "monster", defId: "slime" }, blocking: true,
        fight: { enemies: ["slime"], respawnDays: 1 },
        text: "축축한 나무 그늘에 슬라임이 웅크리고 있다. 결계가 약해진 틈으로 스며든 잡것이다." },
      { id: "wood_slime_2", name: "물가의 슬라임", x: 17, y: 10, visual: { kind: "monster", defId: "slime" }, blocking: true,
        fight: { enemies: ["slime", "slime"], respawnDays: 1 },
        text: "연못가에서 슬라임이 물비늘처럼 몸을 일렁인다. 마을의 토벌 의뢰가 떠오른다." },
    ],
    encounters: {
      chance: 0.05,
      groups: [["slime"], ["slime", "slime"]],
    },
    theme: {
      background: { sky: 0x668c8d, horizon: 0xa9bd92, ridge: 0x3d5c3d },
      floor: "floor", floorDecal: "pave_decal", wall: "wall", wallDecal: "wall_worn_decal",
      ceiling: "ceiling", water: "water", floorTint: 0x617f42, wallTint: 0x46603c,
    },
  },
};
