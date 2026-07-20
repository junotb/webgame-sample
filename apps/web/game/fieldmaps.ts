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

/* 크게 보면 'f'자 모양의 계곡. 북단(크로스베일)에서 세로 협곡이 내려오고,
 * 중단에서 서쪽 좁은 계곡(산적·에버모어)과 동쪽 넓은 평야(바다·포로 우리)가 갈라진다.
 * 세로 협곡을 계속 남하하면 계곡 안쪽 고블린 요새로 들어간다. */
const goblinValleyMap = parseMap([
  "##############################",
  "##############..##############",
  "##############..##############",
  "##############..##############",
  "##############...............#",
  "##############...............#",
  "##############...............#",
  "##############.............~~#",
  "##############.............~~#",
  "#..........................~~#",
  "##############...............#",
  "##############..##############",
  "##############..##############",
  "##############..##############",
  "##############..##############",
  "##############..##############",
  "##############..##############",
  "##############..##############",
  "##############..##############",
  "##############..##############",
  "##############..##############",
  "##############################",
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
    floorTint: 0x829143, wallTint: 0x66584a,
  },
  goblinValley: {
    id: "goblinValley", name: "고블린 계곡길", badge: "남쪽 필드 — 고블린 계곡길",
    map: goblinValleyMap, start: { x: 14, y: 3, facing: 2 },
    exits: [
      { x: 14, y: 1, label: "북쪽 길 — 크로스베일", prompt: "[Z] 북쪽으로 — 크로스베일", target: { kind: "town", id: "crossvale", spawn: "gate" } },
      { x: 1, y: 9, label: "서쪽 좁은 계곡 — 에버모어 성", prompt: "[Z] 서쪽으로 — 에버모어 성", target: { kind: "town", id: "evermore", spawn: "gate" } },
      { x: 14, y: 20, label: "계곡 안쪽 — 고블린 요새", prompt: "[Z] 요새 안으로 — 고블린 요새", target: { kind: "explore" } },
    ],
    decos: [
      /* --- 서쪽 좁은 계곡: 산적 매복 --- */
      { id: "bandit_track", name: "수상한 발자국", x: 6, y: 9, tile: "bush_01",
        text: "좁은 계곡 그늘에 최근 오간 발자국이 어지럽다. 산적 무리가 여기 숨어 있다는 소문이 헛말은 아닌 모양이다." },
      { id: "bandit_hideout", name: "바위 그늘의 은신처", x: 10, y: 9, tile: "bush_02",
        text: "바위 그늘 아래 급히 꾸린 은신처 흔적. 안쪽에서 누군가 이쪽을 엿보는 기척이 스친다. 아직은 건드리지 않는 편이 낫겠다." },
      /* --- 동쪽 넓은 평야: 고블린 주둔지 · 포로 우리 · 바다 --- */
      { id: "gob_garrison", name: "고블린 주둔지", x: 20, y: 6, tile: "bush_02",
        text: "평야 한복판에 세운 말뚝과 모닥불. 창을 든 고블린들이 우리를 지키며 어슬렁거린다." },
      { id: "cage_full", name: "포로 우리", x: 24, y: 5, tile: "tree_03", blocking: true,
        text: "통나무를 얽어 만든 우리. 겁에 질린 마을 사람들이 갇힌 채 이쪽으로 소리 없이 손을 뻗는다." },
      { id: "cage_empty", name: "빈 우리", x: 25, y: 8, tile: "tree_03", blocking: true,
        text: "지푸라기와 빈 그릇만 나뒹구는 우리. 끌려간 이들은 대체 어디로 갔을까." },
      { id: "shore", name: "바다 끝자락", x: 26, y: 9, tile: "flower_01",
        text: "계곡 동편이 넓은 평야로 열리고, 그 끝에서 잿빛 바다가 넘실댄다. 물비린내가 바람을 타고 온다." },
      { id: "plain_tree", name: "외딴 참나무", x: 17, y: 4, tile: "tree_01", blocking: true,
        text: "평야에 홀로 선 참나무. 가지에 낡은 헝겊 조각들이 표식처럼 묶여 있다." },
      /* --- 남쪽 계곡 안쪽: 요새로 향하는 배회 고블린 --- */
      { id: "gob_patrol", name: "배회하는 고블린", x: 14, y: 15, tile: "bush_02",
        text: "창을 든 고블린 몇이 요새 어귀를 어슬렁거린다. 아직 이쪽을 눈치채지 못했다." },
      { id: "gob_totem", name: "고블린 토템", x: 15, y: 17, tile: "tree_02", blocking: true,
        text: "해골과 넝마를 얽어 세운 조잡한 토템. 요새가 코앞이라는 경고다." },
      { id: "valley_mushroom", name: "동굴버섯", x: 15, y: 19, tile: "mushroom_01",
        text: "요새 어귀 바위틈에 창백한 버섯이 돋았다. 안쪽 동굴에서 스며 나온 눅눅한 냉기가 감돈다." },
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
