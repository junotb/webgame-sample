/* =====================================================================
 * town/crossvale.ts — 크로스베일 마을 정의
 *  남문 — 중앙 분수 광장 — 북단 신전의 대로를 축으로 좌우 거리에 건물 배치.
 *  '#'벽(건물) '.'바닥(거리) '+'문(시설·성문 — 통과 불가, 정면에서 [Z]) '~'개울(차단·장식)
 *
 *  구역: 북서 개울 / 북단 신전 / NW 영혼 길드 · NE 원소 길드
 *        W 현상금 길드 · E 무기점 / W 도구점 · E 방어구점
 *        SE 여관·마굿간 / SW 우물 / 남단 성문(고블린 계곡길)
 *
 *  크로스베일은 대스승 헤르만의 편지를 에버모어 성에 전하러 온 제자들이
 *  가장 먼저 닿는 변경 마을. 마굿간의 역마차로 에버모어 성과 오간다.
 * ===================================================================== */
import { parseMap } from "../grid";
import { attachDialogue, type TownFacilityShellDef } from "./dialogue";
import type { TownData, TownDecoDef, TownFacilityDef, TownGateDef, TownSpawnPos } from "./types";

export const CROSSVALE_ROWS = [
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
  "+..........................+",
  "#..........................#",
  "#.######............######.#",
  "#.#####+............+#####.#",
  "#.######............######.#",
  "#..........................#",
  "#...............##+#.##+##.#",
  "#...............####.#####.#",
  "#...............####.#####.#",
  "#############+##############",
] as const;

export const CROSSVALE_MAP = parseMap([...CROSSVALE_ROWS]);

/* ---- 진입 지점 ----
 *  fountain: 프롤로그 직후 — 중앙 분수 앞(북향, 분수와 장로 카엘이 시야에)
 *  gate: 던전 귀환·전멸 복귀 — 남문 안쪽(북향)
 *  carriage: 에버모어 성에서 역마차로 귀환 — 남동 마굿간 앞(북향) */
export const CROSSVALE_STARTS: Record<"fountain" | "gate" | "carriage" | "westGate" | "eastGate", TownSpawnPos> = {
  fountain: { x: 13, y: 11, facing: 0 },
  gate: { x: 13, y: 21, facing: 0 },
  carriage: { x: 18, y: 19, facing: 0 },
  westGate: { x: 2, y: 14, facing: 1 },
  eastGate: { x: 25, y: 14, facing: 3 },
};

/* ---- 시설 (문 칸 기준 — 정면/문 위에서 [Z]) ----
 *  trains: 이 건물에서 구매(수련) 가능한 기술
 *  classes: 이 건물에서 상담 가능한 전직 트리
 *  quests: 이 시설에서 수주·보고하는 의뢰
 *  title: 시설 오버레이 제목(생략 시 name)
 *  담당자·대화 텍스트는 content/town-dialogue.json에서 결합한다. */
const CROSSVALE_FACILITY_SHELLS: TownFacilityShellDef[] = [
  { id: "temple", name: "신전", title: "신전 — 여명의 성소", x: 13, y: 4,
    description: "촛불과 약초 향이 고요한 성소를 채운다." },
  {
    id: "spiritGuild", name: "자아 길드", x: 7, y: 7,
    trains: ["spirit", "mind", "body"],
    classes: ["acolyte", "priest", "monk"],
  },
  {
    id: "elementsGuild", name: "원소 길드", x: 20, y: 7,
    trains: ["fire", "water", "earth", "wind"],
    classes: ["mage", "archmage", "druid"],
  },
  { id: "bountyGuild", name: "현상금 길드", x: 7, y: 12 },
  {
    id: "weapon", name: "무기점", x: 20, y: 12,
    trains: ["blade", "cudgel", "spear", "martial", "unarmed", "bow", "thrown"],
    classes: ["swordman", "swordmaster", "assassin"],
  },
  { id: "item", name: "도구점", title: "도구점 — 여행자의 벗", x: 7, y: 17 },
  {
    id: "armor", name: "방어구점", x: 20, y: 17,
    trains: ["armor", "dodge", "shield"],
    classes: ["spellsword", "paladin", "ranger"],
  },
  /* 남동쪽 길가의 독립 건물 — 가운데 한 칸은 두 시설을 가르는 골목이다. */
  { id: "inn", name: "여관 '잿불'", x: 23, y: 20,
    description: "난롯불과 수프 냄새가 여행객을 맞는다." },
  { id: "stable", name: "마굿간", x: 18, y: 20,
    description: "건초 냄새 사이로 에버모어행 역마차가 출발을 기다린다." },
];

export const CROSSVALE_FACILITIES: TownFacilityDef[] = attachDialogue("crossvale", CROSSVALE_FACILITY_SHELLS);

/* ---- 장식 — 분수·우물만 조사 가능, 나머지는 풍경용 ---- */
export const CROSSVALE_DECOS: TownDecoDef[] = [
  {
    id: "fountain", name: "분수", x: 13, y: 10,
    text: "둥근 돌 테를 두른 분수. 계곡 개울에서 끌어온 맑은 물이 찰랑이며 달빛을 튕겨낸다. 광장의 심장 — 크로스베일은 오늘도 나그네를 맞는다.",
    blocking: true,
  },
  {
    id: "well", name: "우물", x: 4, y: 21,
    text: "두레박이 삐걱인다. 바닥 저 아래, 동전 몇 닢이 소원과 함께 잠들어 있다.",
    blocking: true,
  },
  {
    id: "barrel", name: "술통", x: 8, y: 18,
    text: "도구점 앞에 부려 놓은 술통. 로칸의 필체로 '외상 사절'이라 적혀 있다.",
    interactive: false,
  },
  {
    id: "crate", name: "짐짝", x: 19, y: 11,
    text: "무기점으로 들일 강철 자재. 못이 단단히 박혀 있어 열리지 않는다.",
    interactive: false,
  },
  { id: "tree", name: "느릅나무", x: 3, y: 5, text: "마을의 오래된 느릅나무. 잎 사이로 햇빛이 부서진다.", interactive: false, blocking: true },
  { id: "tree", name: "물푸레나무", x: 24, y: 5, text: "물푸레나무 가지에 작은 새가 내려앉았다.", interactive: false, blocking: true },
  { id: "tree", name: "정원수", x: 3, y: 15, text: "누군가 정성껏 다듬은 정원수다.", interactive: false, blocking: true },
  { id: "tree", name: "사과나무", x: 24, y: 15, text: "사과나무에 아직 덜 익은 열매가 달려 있다.", interactive: false, blocking: true },
  { id: "tree", name: "개울가 버드나무", x: 2, y: 5, text: "물가로 늘어진 가지 끝에서 물방울이 떨어진다.", interactive: false, blocking: true },
  { id: "tree", name: "마을 끝 느릅나무", x: 25, y: 10, text: "대로 끝을 지키듯 서 있는 오래된 느릅나무다.", interactive: false, blocking: true },
  { id: "tree", name: "어린 물푸레나무", x: 2, y: 19, text: "새로 돋은 잎이 계곡바람에 가볍게 흔들린다.", interactive: false, blocking: true },
  { id: "bush", name: "덤불", x: 6, y: 5, text: "연둣빛 덤불에서 풀 냄새가 난다.", interactive: false, blocking: true },
  { id: "bush", name: "덤불", x: 22, y: 15, text: "연둣빛 덤불에서 풀 냄새가 난다.", interactive: false, blocking: true },
  { id: "bush", name: "개울가 관목", x: 5, y: 5, text: "축축한 흙을 따라 작은 관목이 무성하게 자랐다.", interactive: false, blocking: true },
  { id: "bush", name: "산울타리", x: 5, y: 9, text: "낮게 다듬은 산울타리가 건물과 거리를 구분한다.", interactive: false, blocking: true },
  { id: "flower", name: "들꽃", x: 11, y: 9, text: "분수 곁 들꽃이 바람에 흔들린다.", interactive: false },
  { id: "flower", name: "들꽃", x: 16, y: 11, text: "분수 곁 들꽃이 바람에 흔들린다.", interactive: false },
  { id: "flower", name: "개울가 들꽃", x: 4, y: 5, text: "개울가의 촉촉한 풀밭에 작은 꽃이 피었다.", interactive: false },
  { id: "flower", name: "광장 화단", x: 10, y: 10, text: "회백색 포석 틈으로 소박한 들꽃이 고개를 내민다.", interactive: false },
  { id: "flower", name: "광장 화단", x: 17, y: 14, text: "여행자들의 발길 옆에서 노란 꽃잎이 흔들린다.", interactive: false },
  { id: "mushroom", name: "버섯", x: 5, y: 20, text: "비 온 뒤 돌틈에서 고개를 내민 버섯이다.", interactive: false },
  { id: "mushroom", name: "물가버섯", x: 4, y: 4, text: "개울의 물안개를 머금은 작은 버섯이다.", interactive: false },
];

/* ---- 마을 외곽길 성문 (외벽에 박힌 문 칸 — 통과 불가, 정면에서 [Z] → 주변 필드) ---- */
export const CROSSVALE_GATES: TownGateDef[] = [
  { id: "west", x: 0, y: 14, label: "서문 — 서녘 해안길", prompt: "[Z] 서쪽으로 — 해안길", target: "coastRoad" },
  { id: "south", x: 13, y: 23, label: "남문 — 고블린 계곡길", prompt: "[Z] 남쪽으로 — 고블린 계곡길", target: "goblinValley" },
  { id: "east", x: 27, y: 14, label: "동문 — 헤르만의 은둔림", prompt: "[Z] 동쪽으로 — 헤르만의 숲", target: "hermanForest" },
];

/** 레지스트리에 바로 등록할 수 있는 완전한 크로스베일 정의. */
export const CROSSVALE_TOWN: TownData = {
  id: "crossvale",
  name: "크로스베일",
  badge: "마을 모드 — 크로스베일",
  map: CROSSVALE_MAP,
  starts: CROSSVALE_STARTS,
  facilities: CROSSVALE_FACILITIES,
  decos: CROSSVALE_DECOS,
  gates: CROSSVALE_GATES,
  districts: [
    { id: "north", name: "북부 길드 거리", x1: 1, y1: 1, x2: 26, y2: 8 },
    { id: "square", name: "중앙 분수 광장", x1: 1, y1: 9, x2: 26, y2: 15 },
    { id: "south", name: "남부 상업 거리", x1: 1, y1: 16, x2: 26, y2: 22 },
  ],
};
