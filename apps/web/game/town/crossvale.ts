/* =====================================================================
 * town/crossvale.ts — 크로스베일 마을 정의
 *  남문 — 중앙 분수 광장 — 북단 신전의 대로를 축으로 좌우 거리에 건물 배치.
 *  '#'벽(건물) '.'바닥(거리) '+'문(시설 입구, 막다른 칸) '~'개울(차단·장식)
 *
 *  구역: 북서 개울 / 북단 신전 / NW 영혼 길드 · NE 원소 길드
 *        W 현상금 길드 · E 무기점 / W 도구점 · E 방어구점
 *        SE 여관·마굿간 / SW 우물 / 남단 성문(할로우베일 계곡)
 *
 *  크로스베일은 대스승 헤르만의 편지를 에버모어 성에 전하러 온 제자들이
 *  가장 먼저 닿는 변경 마을. 마굿간의 역마차로 에버모어 성과 오간다.
 * ===================================================================== */
import { parseMap } from "../grid";
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
  "#..........................#",
  "#..........................#",
  "#.######............######.#",
  "#.#####+............+#####.#",
  "#.######............######.#",
  "#..........................#",
  "#...............##+#.##+##.#",
  "#...............####.#####.#",
  "#...............####.#####.#",
  "############################",
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
 *  title: 시설 오버레이 제목(생략 시 name) */
export const CROSSVALE_FACILITIES: TownFacilityDef[] = [
  { id: "temple", name: "신전", title: "신전 — 여명의 성소", x: 13, y: 4,
    description: "촛불과 약초 향이 고요한 성소를 채운다.",
    keeper: { name: "수녀 메리엘", role: "여명의 사제", portrait: 31,
      greeting: "어서 와요. 다친 데가 있으면 숨기지 말고 보여 줘요. 몸도 마음도 여기선 쉬어도 괜찮아요." } },
  {
    id: "spiritGuild", name: "영혼 길드", x: 7, y: 7,
    trains: ["spirit"],
    classes: ["acolyte", "priest", "monk"],
    keeper: { name: "에다", role: "영혼술 교관", portrait: 37,
      greeting: "기척이 꽤 또렷하네요. 영혼의 소리에 귀 기울일 준비가 됐다면, 제가 첫걸음을 봐 드리죠." },
  },
  {
    id: "elementsGuild", name: "원소 길드", x: 20, y: 7,
    trains: ["elemental"],
    classes: ["mage", "archmage", "druid"],
    keeper: { name: "아르벤", role: "원소학 강사", portrait: 8,
      greeting: "불꽃부터 만지려 들진 마세요. 물과 바람을 먼저 이해해야 손가락을 덜 데니까요." },
  },
  { id: "bountyGuild", name: "현상금 길드", x: 7, y: 12,
    keeper: { name: "브란", role: "의뢰 게시판 관리인", portrait: 6,
      greeting: "일거리를 찾소? 벽에 붙은 종이는 많아도 목숨은 하나뿐이니, 감당할 만한 것만 고르시오." } },
  {
    id: "weapon", name: "무기점", x: 20, y: 12,
    trains: ["blade", "cudgel", "spear", "martial", "unarmed", "bow", "thrown"],
    classes: ["swordman", "swordmaster", "assassin"],
    keeper: { name: "토렌", role: "대장장이", portrait: 4,
      greeting: "칼은 번쩍이는 맛보다 손에 맞는 게 먼저야. 들어 보고, 마음에 들면 값 얘길 하지." },
  },
  { id: "item", name: "도구점", title: "도구점 — 여행자의 벗", x: 7, y: 17,
    keeper: { name: "미리", role: "도구점 주인", portrait: 29,
      greeting: "어서 와요! 물약은 가볍고 후회는 무거워요. 길 떠나기 전에 몇 병 챙겨 둬요." } },
  {
    id: "armor", name: "방어구점", x: 20, y: 17,
    trains: ["armor", "dodge", "shield"],
    classes: ["spellsword", "paladin", "ranger"],
    keeper: { name: "힐다", role: "갑주 제작자", portrait: 35,
      greeting: "갑옷은 멋으로 입는 게 아니야. 어디를 얻어맞을지 말해 봐, 거기에 맞춰 골라 줄 테니." },
  },
  /* 남동쪽 길가의 독립 건물 — 가운데 한 칸은 두 시설을 가르는 골목이다. */
  { id: "inn", name: "여관 '잿불'", x: 23, y: 20, quests: ["s2"],
    description: "난롯불과 수프 냄새가 여행객을 맞는다.",
    topics: [
      { id: "rumor", label: "소문", text: "할로우베일 심부의 옛길에 백골들이 걸어다닌다는 소문이 떠돈다." },
      { id: "veterans", label: "옛 손님", text: "옛날에는 에버모어의 기사단도 이곳에 묵어갔다." },
    ], keeper: { name: "로완", role: "여관 주인", portrait: 11,
      greeting: "어서들 와! 빈방도 있고 따뜻한 수프도 있어. 우선 앉아서 숨부터 돌리라고." } },
  { id: "stable", name: "마굿간", x: 18, y: 20,
    description: "건초 냄새 사이로 에버모어행 역마차가 출발을 기다린다.",
    keeper: { name: "벤", role: "마부", portrait: 15,
      greeting: "에버모어로 가나? 말들은 준비됐어. 삯만 치르면 흔들림 적게 모셔다주지." } },
];

/* ---- 장식 POI — 기능 없음, 조사 시 정취 텍스트. 칸을 점유(차단)한다 ---- */
export const CROSSVALE_DECOS: TownDecoDef[] = [
  {
    id: "fountain", name: "분수", x: 13, y: 10,
    text: "맑은 물줄기가 달빛을 튕겨낸다. 광장의 심장 — 크로스베일은 오늘도 나그네를 맞는다.",
  },
  {
    id: "well", name: "우물", x: 4, y: 21,
    text: "두레박이 삐걱인다. 바닥 저 아래, 동전 몇 닢이 소원과 함께 잠들어 있다.",
  },
  {
    id: "barrel", name: "술통", x: 8, y: 18,
    text: "도구점 앞에 부려 놓은 술통. 로칸의 필체로 '외상 사절'이라 적혀 있다.",
  },
  {
    id: "crate", name: "짐짝", x: 19, y: 11,
    text: "무기점으로 들일 강철 자재. 못이 단단히 박혀 있어 열리지 않는다.",
  },
  { id: "tree", name: "느릅나무", x: 3, y: 5, text: "마을의 오래된 느릅나무. 잎 사이로 햇빛이 부서진다.", blocking: true },
  { id: "tree", name: "물푸레나무", x: 24, y: 5, text: "물푸레나무 가지에 작은 새가 내려앉았다.", blocking: true },
  { id: "tree", name: "정원수", x: 3, y: 15, text: "누군가 정성껏 다듬은 정원수다.", blocking: true },
  { id: "tree", name: "사과나무", x: 24, y: 15, text: "사과나무에 아직 덜 익은 열매가 달려 있다.", blocking: true },
  { id: "bush", name: "덤불", x: 6, y: 5, text: "연둣빛 덤불에서 풀 냄새가 난다.", blocking: true },
  { id: "bush", name: "덤불", x: 22, y: 15, text: "연둣빛 덤불에서 풀 냄새가 난다.", blocking: true },
  { id: "flower", name: "들꽃", x: 11, y: 9, text: "분수 곁 들꽃이 바람에 흔들린다." },
  { id: "flower", name: "들꽃", x: 16, y: 11, text: "분수 곁 들꽃이 바람에 흔들린다." },
  { id: "mushroom", name: "버섯", x: 5, y: 20, text: "비 온 뒤 돌틈에서 고개를 내민 버섯이다." },
];

/* ---- 마을 외곽길 (밟고 [Z] → 주변 필드) ---- */
export const CROSSVALE_GATES: TownGateDef[] = [
  { id: "west", x: 1, y: 14, label: "서문 — 잊힌 사원의 길", prompt: "[Z] 서쪽으로 — 잊힌 사원", target: "ruinedTemple" },
  { id: "south", x: 13, y: 22, label: "남문 — 고블린 계곡길", prompt: "[Z] 남쪽으로 — 고블린 계곡길", target: "goblinValley" },
  { id: "east", x: 26, y: 14, label: "동문 — 헤르만의 은둔림", prompt: "[Z] 동쪽으로 — 헤르만의 숲", target: "hermanForest" },
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
