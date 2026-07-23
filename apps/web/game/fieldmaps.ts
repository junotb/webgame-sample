/* =====================================================================
 * fieldmaps.ts — 크로스베일 주변 필드 맵과 연결점
 * ===================================================================== */
import type { TownId, TownSpawn } from "./town/types";
import type { DungeonId } from "./dungeons";
import { Facing, GridMap, parseMap } from "./grid";
import type { TileName } from "./tiles";

export type FieldId = "coastRoad" | "goblinValley" | "hermanForest" | "evermoreOutskirts" | "mistmarsh" | "gleamwood";

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
    | { kind: "monster"; defId: "goblin" | "wolf" | "slime" | "husk" | "duskbat" | "orc" | "tendril" | "boar" | "hare" }
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

/* 에버모어 성 남문 밖의 강변 사냥터. 동서로 가로지르는 강은 서쪽 바다로
 * 흘러들고, 중앙의 얕은 여울로만 건널 수 있다. 강 남안 동쪽 언덕에
 * 왕실 묘소의 묘도 입구가 있다. */
const evermoreOutskirtsMap = parseMap([
  "##############################",
  "#............................#",
  "#...###..........###.........#",
  "#............................#",
  "#.....#.....................##",
  "#..........####..............#",
  "#............................#",
  "#.###........................#",
  "#............................#",
  "~~~~~~~~~~~~~...~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~...~~~~~~~~~~~~~~",
  "#............................#",
  "#.....##.............##......#",
  "#............................#",
  "#..#.....####................#",
  "#............................#",
  "#....##..............###.....#",
  "#............................#",
  "#............................#",
  "##############################",
]);

/* 강 하류의 안개늪. 동쪽 어귀에서 서쪽으로 들어갈수록 수렁과 물웅덩이가
 * 늘어나고, 버드나무 이끼가 시야를 가린다. 안개 탓에 멀리 보이지 않는다. */
const mistmarshMap = parseMap([
  "########################",
  "#..........#####.......#",
  "#.~~~..................#",
  "#.~~~....#....~~~~.....#",
  "#........#....~~~~...###",
  "#..###...#....~~~~.....#",
  "#....#.................#",
  "#....#....##......###..#",
  "#.~~.......#...........#",
  "#.~~.......#....~~~....#",
  "#..........#....~~~....#",
  "#...####........~~~..###",
  "#......................#",
  "#..##......~~....##....#",
  "#......................#",
  "########################",
]);

/* 은둔림 동쪽 심부의 밤빛 숲. 등불 열매 나무와 발광 수정이 어둠 속에서
 * 길을 밝힌다. 헤르만의 결계가 가장 짙게 남은 곳이다. */
const gleamwoodMap = parseMap([
  "####################",
  "#........#.........#",
  "#..####..#..~~~....#",
  "#.....#.....~~~....#",
  "#..#..#............#",
  "#..#.....####..#####",
  "#..#............#..#",
  "#..######..........#",
  "#.......#..####....#",
  "#..~~...#.....#....#",
  "#..~~..........#...#",
  "#..........#.......#",
  "#..........#.......#",
  "####################",
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
    exits: [
      { x: 1, y: 12, label: "서쪽 길 — 크로스베일", prompt: "[Z] 서쪽으로 — 크로스베일", target: { kind: "town", id: "crossvale", spawn: "eastGate" } },
      { x: 22, y: 8, label: "동쪽 심부 — 반딧불 빛숲", prompt: "[Z] 동쪽 심부로 — 반딧불 빛숲", target: { kind: "field", id: "gleamwood" } },
    ],
    decos: [
      ...forestDecos,
      { id: "gleam_shard", name: "발광 수정 조각", x: 21, y: 7, tile: "glow_crystal_blue_obj",
        text: "동쪽 심부 쪽 땅에 푸른 수정 조각이 박혀 은은히 빛난다. 숲 깊은 곳에서 굴러 나온 듯하다." },
      { id: "pond_lily", name: "연못 수련", x: 12, y: 9, tile: "swamp_lilypad_obj",
        text: "연못 가장자리에 넓은 수련잎이 떠 있다. 개구리 한 마리가 잎 위에서 볕을 쬔다." },
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
      /* 가을빛 숲 원경 + 짙은 숲그늘 풀바닥 + 나무줄기 벽 — 지붕 덮인 던전이 아니라 하늘 열린 숲길 */
      background: { sky: 0x668c8d, horizon: 0xa9bd92, ridge: 0x3d5c3d, texture: "herman_forest_bg", tint: 0xe8ddc8 },
      floor: "forest_grass_floor", wall: "trunk_wall",
      ceiling: null, water: "water", floorTint: 0xb9cf96, wallTint: 0xc9a878, waterTint: 0x77a08a,
    },
  },
  evermoreOutskirts: {
    id: "evermoreOutskirts", name: "에버모어 근교", badge: "남쪽 필드 — 에버모어 근교",
    map: evermoreOutskirtsMap, start: { x: 14, y: 2, facing: 2 },
    exits: [
      { x: 14, y: 1, label: "북쪽 남문 — 에버모어 성", prompt: "[Z] 북쪽으로 — 에버모어 성", target: { kind: "town", id: "evermore", spawn: "southGate" } },
      { x: 28, y: 15, label: "동쪽 언덕 묘도 — 왕실 묘소", prompt: "[Z] 묘도 안으로 — 왕실 묘소", target: { kind: "explore", dungeon: "royalTomb" } },
      { x: 1, y: 17, label: "서쪽 하류 — 안개늪", prompt: "[Z] 하류로 — 안개늪", target: { kind: "field", id: "mistmarsh" } },
    ],
    decos: [
      /* --- 강 하류: 늪지대의 전조 --- */
      { id: "river_willow", name: "강가 버드나무", x: 3, y: 12, tile: "swamp_willow2_obj", blocking: true,
        text: "가지를 강물에 드리운 버드나무다. 하류로 갈수록 이런 나무가 늘고 물비린내가 짙어진다." },
      { id: "ford_lily", name: "여울 수련", x: 13, y: 11, tile: "swamp_lilypad_obj",
        text: "여울 아래 잔잔한 물목에 수련잎이 몇 장 떠 있다. 하류 늪에서 씨가 떠내려온 것이리라." },
      /* --- 북안: 성벽 아래의 강변 생활권 --- */
      { id: "river_dock", name: "빨래터 좌대", x: 5, y: 8, visual: { kind: "building", style: "shore_dock" }, blocking: true,
        text: "성 사람들이 쓰는 낮은 빨래터 좌대다. 두들긴 빨랫감의 물비린내가 강바람에 실려 온다." },
      { id: "hunter_fire", name: "사냥꾼의 모닥불", x: 20, y: 5, visual: { kind: "building", style: "campfire" },
        text: "근교 사냥꾼이 피워 둔 모닥불. \"요즘 묘소 쪽 언덕엔 얼씬도 안 하오. 밤마다 푸른 불빛이 오르내린단 말이지…\"" },
      { id: "old_oak", name: "강가 참나무", x: 10, y: 4, tile: "tree_01", blocking: true,
        text: "강을 굽어보는 오래된 참나무. 사냥꾼들이 활줄을 걸어 말리던 자국이 남아 있다." },
      { id: "north_bush", name: "찔레 덤불", x: 17, y: 6, tile: "bush_02", blocking: true,
        text: "산토끼가 드나드는 찔레 덤불이다. 올가미 흔적이 여럿 흩어져 있다." },
      { id: "ford_slime", name: "여울가의 슬라임", x: 8, y: 11, visual: { kind: "monster", defId: "slime" }, blocking: true,
        fight: { enemies: ["slime", "slime"], respawnDays: 1 },
        text: "여울 가까운 물풀 사이에 슬라임이 웅크리고 있다. 강을 타고 상류에서 떠내려온 잡것이다." },
      /* --- 남안: 사냥터와 묘소로 오르는 언덕길 --- */
      { id: "south_flower", name: "강변 들꽃", x: 12, y: 12,
        tile: "flower_01", text: "남안 초지를 수놓은 들꽃. 조문객들이 꺾어 가는지 길가 쪽만 듬성하다." },
      { id: "hunt_bats", name: "사냥터의 어둠박쥐", x: 23, y: 12, visual: { kind: "monster", defId: "duskbat" }, blocking: true,
        fight: { enemies: ["duskbat", "duskbat", "duskbat"], respawnDays: 1 },
        text: "해질녘 사냥터 위를 어둠박쥐 떼가 낮게 맴돈다. 근래 부쩍 수가 늘었다고 사냥꾼들이 투덜댔다." },
      { id: "road_column", name: "옛 가도 이정표", x: 25, y: 13, visual: { kind: "building", style: "ruin_column" }, blocking: true,
        text: "왕실 장례 행렬이 오르던 옛 가도의 석주 이정표다. 「동쪽 언덕 — 왕가의 영면처」" },
      { id: "tomb_husk", name: "묘도 어귀의 송장버섯", x: 26, y: 14, visual: { kind: "monster", defId: "husk" }, blocking: true,
        fight: { enemies: ["husk", "husk"], respawnDays: 1 },
        text: "묘도로 오르는 언덕 초입에 창백한 송장버섯이 부풀어 있다. 묘역의 흙에서 이런 것이 자랄 리 없는데." },
      { id: "hill_mushroom", name: "언덕 버섯", x: 26, y: 16, tile: "mushroom_01",
        text: "언덕 그늘에 돋은 잿빛 버섯. 묘소 쪽에서 스며 나온 서늘한 기운이 감돈다." },
      { id: "hunt_boar", name: "사냥터의 어금니멧돼지", x: 19, y: 16, visual: { kind: "monster", defId: "boar" }, blocking: true,
        fight: { enemies: ["boar"], respawnDays: 1 },
        text: "덤불을 헤집던 멧돼지가 콧김을 뿜으며 이쪽을 노려본다. 사냥꾼들이 겨울 양식으로 노리는 놈이다." },
      /* --- 남안 서쪽 구석: 성을 빠져나간 어린 군주의 은신처 (1장) --- */
      { id: "lost_prince", name: "덤불 뒤의 모닥불", x: 5, y: 15, visual: { kind: "building", style: "campfire" },
        text: "강 하류 덤불 뒤에 서투르게 피운 작은 모닥불이다. 곁에 값비싼 자수가 놓인 외투가 아무렇게나 개켜져 있다." },
    ],
    encounters: {
      chance: 0.06,
      groups: [["hare"], ["hare", "hare"], ["slime"], ["duskbat", "duskbat"], ["boar"], ["slime", "duskbat"]],
    },
    theme: {
      background: {
        sky: 0x8fb0c9, horizon: 0xc9cfa0, ridge: 0x55684f,
        texture: "coast_sky_base",
        layers: ["coast_sky_cloud_back", "coast_sky_cloud_near"],
        tint: 0xdfeadf,
      },
      floor: "village_grass", floorDecal: "pave2_decal", wall: "cave_wall", wallDecal: "wall_worn_decal",
      ceiling: null, water: "village_water",
      floorTint: 0x7f9c4e, wallTint: 0x6e7f55, waterTint: 0x5b8fae, viewDistance: 7,
    },
  },
  mistmarsh: {
    id: "mistmarsh", name: "하류 안개늪", badge: "서쪽 필드 — 하류 안개늪",
    map: mistmarshMap, start: { x: 21, y: 12, facing: 3 },
    exits: [
      { x: 22, y: 12, label: "동쪽 강길 — 에버모어 근교", prompt: "[Z] 동쪽으로 — 에버모어 근교", target: { kind: "field", id: "evermoreOutskirts" } },
    ],
    decos: [
      /* --- 동쪽 어귀: 늪의 문턱 --- */
      { id: "gate_willow", name: "어귀의 버드나무", x: 19, y: 10, tile: "swamp_willow_obj", blocking: true,
        text: "이끼를 발처럼 늘어뜨린 버드나무가 늪 어귀를 지킨다. 가지 사이로 안개가 느리게 흘러나온다." },
      { id: "marsh_shroom", name: "장대버섯", x: 20, y: 6, tile: "swamp_shroom_tall_obj", blocking: true,
        text: "사람 키를 넘는 장대버섯이다. 망사 같은 갓자락이 안개에 젖어 늘어져 있다." },
      /* --- 중부: 물웅덩이 사이의 좁은 길 --- */
      { id: "drowned_snag", name: "물에 잠긴 옹이나무", x: 13, y: 7, tile: "swamp_snag_obj", blocking: true,
        text: "뿌리를 드러낸 옹이나무가 수렁에 반쯤 잠겨 있다. 뿌리 틈에 물새 둥지가 비어 있다." },
      { id: "pool_lily", name: "늪 수련", x: 15, y: 6, tile: "swamp_lilypad_obj",
        text: "탁한 웅덩이 위에 수련잎이 넓게 떠 있다. 잎 밑에서 무언가 물살을 가르고 지나갔다." },
      { id: "marsh_slime", name: "수렁 슬라임", x: 8, y: 6, visual: { kind: "monster", defId: "slime" }, blocking: true,
        fight: { enemies: ["slime", "slime", "slime"], respawnDays: 1 },
        text: "진흙을 뒤집어쓴 슬라임 무리가 수렁 속에서 몸을 부풀린다. 늪물에 몸이 불어 여느 놈들보다 크다." },
      { id: "marsh_bloom", name: "늪의 촉수꽃", x: 6, y: 9, visual: { kind: "monster", defId: "tendril" }, blocking: true,
        fight: { enemies: ["tendril"], respawnDays: 2 },
        text: "썩은 물을 빨아올린 촉수꽃이 웅덩이 가에 뿌리내렸다. 꽃잎 안쪽에서 삼킨 잔뼈가 비친다." },
      /* --- 서부 깊은 늪: 고사목 군락 --- */
      { id: "dead_grove", name: "고사목", x: 4, y: 4, tile: "swamp_deadtree_obj", blocking: true,
        text: "잎을 모두 떨군 고사목이 잿빛 하늘을 할퀸다. 늪이 숲이었던 시절의 마지막 증인이다." },
      { id: "violet_caps", name: "보랏빛 삿갓버섯", x: 3, y: 12, tile: "swamp_shroom_violet_obj",
        text: "고사목 그늘에 보랏빛 삿갓버섯이 무리 지어 돋았다. 갓 밑에서 희미한 단내가 난다." },
      { id: "marsh_husk", name: "늪가의 송장버섯", x: 7, y: 13, visual: { kind: "monster", defId: "husk" }, blocking: true,
        fight: { enemies: ["husk", "husk"], respawnDays: 1 },
        text: "가라앉은 짐승의 잔해 위로 송장버섯이 창백하게 부풀었다. 안개가 포자를 멀리 실어 나른다." },
      { id: "marsh_boar", name: "진창의 어금니멧돼지", x: 9, y: 2, visual: { kind: "monster", defId: "boar" }, blocking: true,
        fight: { enemies: ["boar"], respawnDays: 1 },
        text: "진창에 몸을 굴리던 멧돼지가 흙탕물을 튀기며 일어선다. 진흙 갑옷을 두른 셈이라 성질이 더 사납다." },
    ],
    encounters: {
      chance: 0.08,
      groups: [["slime"], ["slime", "slime"], ["husk"], ["husk", "duskbat"], ["slime", "husk"]],
    },
    theme: {
      background: { sky: 0x76837a, horizon: 0x99987b, ridge: 0x39432f },
      floor: "swamp_mud_floor", wall: "trunk_wall",
      ceiling: null, water: "swamp_water",
      floorTint: 0xa8a08a, wallTint: 0x6f7a5f, waterTint: 0x8fa080, viewDistance: 5,
    },
  },
  gleamwood: {
    id: "gleamwood", name: "반딧불 빛숲", badge: "동쪽 필드 — 반딧불 빛숲",
    map: gleamwoodMap, start: { x: 2, y: 11, facing: 1 },
    exits: [
      { x: 1, y: 11, label: "서쪽 숲길 — 헤르만의 은둔림", prompt: "[Z] 서쪽으로 — 은둔림", target: { kind: "field", id: "hermanForest" } },
    ],
    decos: [
      /* --- 서쪽 어귀: 등불나무 가로수 --- */
      { id: "lantern_gate", name: "등불나무", x: 4, y: 12, tile: "glow_tree_small_obj", blocking: true,
        text: "가지 끝마다 등불 열매가 맺힌 작은 나무다. 밤이 깊을수록 열매가 밝아진다." },
      { id: "glow_meadow", name: "발광 풀숲", x: 6, y: 10, tile: "glow_grass_obj",
        text: "오색으로 빛나는 풀이 융단처럼 깔렸다. 발을 디디면 빛가루가 신발 위로 떠오른다." },
      { id: "gleam_bloom", name: "빛숲의 촉수꽃", x: 8, y: 11, visual: { kind: "monster", defId: "tendril" }, blocking: true,
        fight: { enemies: ["tendril"], respawnDays: 2 },
        text: "발광 풀의 빛을 탐한 촉수꽃이 길가에 뿌리내렸다. 꽃잎이 반딧불 흉내로 깜빡이며 벌레를 꾄다." },
      /* --- 중부: 수정 골짜기 --- */
      { id: "crystal_purple", name: "자수정 기둥", x: 8, y: 4, tile: "glow_crystal_purple_obj", blocking: true,
        text: "사람 키만 한 자수정이 흙을 뚫고 솟았다. 표면에 헤르만의 결계 문양이 어른거린다." },
      { id: "crystal_green", name: "취록 수정", x: 13, y: 6, tile: "glow_crystal_green_obj", blocking: true,
        text: "초록빛 수정 다발이다. 가까이 서면 낮은 공명음이 뼛속까지 울린다." },
      { id: "gleam_slime", name: "빛을 삼킨 슬라임", x: 15, y: 4, visual: { kind: "monster", defId: "slime" }, blocking: true,
        fight: { enemies: ["slime", "slime"], respawnDays: 1 },
        text: "수정 곁에서 빛가루를 삼킨 슬라임이 몸속에 별처럼 반짝이는 알갱이를 띄운 채 일렁인다." },
      /* --- 북동부: 거대 버섯 그늘 --- */
      { id: "giant_cap", name: "거대 버섯", x: 16, y: 2, tile: "giant_mushroom_obj", blocking: true,
        text: "지붕만 한 갓을 펼친 거대 버섯이다. 갓 아래는 비를 피할 만큼 넓고, 포자가 눈처럼 내린다." },
      { id: "blue_stool", name: "푸른 갓 버섯", x: 14, y: 1, tile: "mush_stool_blue_obj", blocking: true,
        text: "걸터앉기 좋은 높이의 푸른 버섯. 갓 위에 누군가 오래 앉았던 자국이 남아 있다." },
      { id: "gleam_husk", name: "버섯 그늘의 송장버섯", x: 18, y: 3, visual: { kind: "monster", defId: "husk" }, blocking: true,
        fight: { enemies: ["husk", "husk"], respawnDays: 1 },
        text: "거대 버섯의 그늘에 송장버섯이 몰래 끼어 자랐다. 겉모습만 닮았을 뿐, 갓 밑의 살기는 숨기지 못한다." },
      /* --- 남동부: 달빛 연못 --- */
      { id: "moon_lily", name: "달빛 수련", x: 15, y: 11, tile: "swamp_lilypad_obj",
        text: "연못 위 수련잎이 별하늘을 받아 은은히 빛난다. 잎 가장자리에 이슬이 구슬처럼 맺혔다." },
      { id: "lantern_elder", name: "큰 등불나무", x: 18, y: 8, tile: "glow_tree_big_obj", blocking: true,
        text: "숲에서 가장 오래된 등불나무다. 수백 개의 열매가 일제히 숨 쉬듯 밝아졌다 어두워진다." },
      { id: "bare_lantern", name: "맨가지 등불나무", x: 10, y: 7, tile: "glow_tree_lantern_obj", blocking: true,
        text: "잎을 떨군 가지 끝에 등불 열매만 매달렸다. 바람이 지나면 열매들이 풍경처럼 흔들린다." },
      { id: "gleam_bats", name: "빛숲의 어둠박쥐", x: 17, y: 12, visual: { kind: "monster", defId: "duskbat" }, blocking: true,
        fight: { enemies: ["duskbat", "duskbat", "duskbat"], respawnDays: 1 },
        text: "등불 열매에 꾀는 벌레를 노리고 어둠박쥐 떼가 낮게 맴돈다. 빛을 등진 날개 그림자가 어지럽다." },
    ],
    encounters: {
      chance: 0.06,
      groups: [["slime"], ["slime", "slime"], ["duskbat", "duskbat"]],
    },
    theme: {
      /* 푸른 달밤 별하늘 아래 발광 숲 — 밤빛에 맞춰 바닥·벽을 차게 가라앉힌다 */
      background: {
        sky: 0x2c3a5e, horizon: 0x44507a, ridge: 0x1e2a44,
        texture: "title_sky_base", layers: ["title_sky_clouds"], tint: 0xaebadd,
      },
      floor: "forest_grass_floor", wall: "trunk_wall",
      ceiling: null, water: "village_water",
      floorTint: 0x6c86a0, wallTint: 0x5c6c92, waterTint: 0x3f6a9a, viewDistance: 6,
    },
  },
};
