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
      greetings: [
        "빛! 빛은 상처 난 몸과 지친 마음을 함께 보듬지요. 아픈 곳이 있다면 제게 보여 주세요.",
        "치유! 상처를 오래 품고 다니면 마음까지 무거워져요. 여기 앉아 천천히 살펴볼까요?",
        "안식! 여명의 성소에서는 누구든 잠시 쉬어 가도 괜찮아요. 숨부터 편히 고르세요.",
      ] } },
  {
    id: "spiritGuild", name: "영혼 길드", x: 7, y: 7,
    trains: ["spirit"],
    classes: ["acolyte", "priest", "monk"],
    keeper: { name: "에다", role: "영혼술 교관", portrait: 37,
      greetings: [
        "영혼! 눈에 보이지 않아도 우리 곁에서 끊임없이 속삭이지요. 그 목소리를 듣는 법부터 배워 볼까요?",
        "교감! 영혼에게 명령하기 전에 먼저 귀를 기울여야 해요. 오늘은 어떤 기척이 느껴지나요?",
        "고요! 마음이 잔잔해야 저편의 목소리가 선명해져요. 숨을 고르고 제 손짓을 따라오세요.",
      ] },
  },
  {
    id: "elementsGuild", name: "원소 길드", x: 20, y: 7,
    trains: ["elemental"],
    classes: ["mage", "archmage", "druid"],
    keeper: { name: "아르벤", role: "원소학 강사", portrait: 8,
      greetings: [
        "원소! 원소는 세상을 일구어 낼 수 있지. 불과 물, 바람과 대지 중 무엇부터 깨우고 싶나?",
        "조화! 하나의 원소만 좇으면 힘은 쉽게 흐트러지지. 서로 맞물리는 성질부터 익혀 보겠나?",
        "불꽃! 작게 피운 불씨 하나에도 세상을 바꿀 힘이 숨어 있네. 다룰 각오는 되어 있겠지?",
      ] },
  },
  { id: "bountyGuild", name: "현상금 길드", x: 7, y: 12,
    keeper: { name: "브란", role: "의뢰 게시판 관리인", portrait: 6,
      greetings: [
        "현상금! 위험한 일일수록 보상도 두둑하지. 게시판을 읽고, 목숨값에 맞는 의뢰를 고르시오.",
        "의뢰! 쉬운 심부름부터 괴물 토벌까지 붙어 있소. 실력에 맞는 종이를 떼어 가시오.",
        "각오! 계약서에 이름을 쓰는 순간 핑계는 통하지 않소. 준비가 됐다면 게시판을 보시오.",
      ] } },
  {
    id: "weapon", name: "무기점", x: 20, y: 12,
    trains: ["blade", "cudgel", "spear", "martial", "unarmed", "bow", "thrown"],
    classes: ["swordman", "swordmaster", "assassin"],
    keeper: { name: "토렌", role: "대장장이", portrait: 4,
      greetings: [
        "강철! 잘 벼린 칼 한 자루는 열 마디 허세보다 믿음직하지. 자네 손에 맞는 무기를 찾아보게.",
        "무기! 날카롭기만 한 칼은 좋은 칼이 아니야. 직접 들어 보고 균형을 느껴 보게.",
        "균형! 무게와 손잡이, 날의 길이가 한몸처럼 맞아야 하지. 자네 전투 방식부터 말해 보게.",
      ] },
  },
  { id: "item", name: "도구점", title: "도구점 — 여행자의 벗", x: 7, y: 17,
    keeper: { name: "미리", role: "도구점 주인", portrait: 29,
      greetings: [
        "준비! 모험의 절반은 떠나기 전에 끝나는 법이에요. 물약과 도구부터 빠짐없이 챙겨 봐요.",
        "물약! 필요해진 뒤에 찾으면 이미 늦어요. 가방 한쪽에 넉넉히 넣어 두는 게 어때요?",
        "도구! 작고 가벼운 물건 하나가 위험할 때 목숨을 살려요. 필요한 걸 함께 골라 봐요.",
      ] } },
  {
    id: "armor", name: "방어구점", x: 20, y: 17,
    trains: ["armor", "dodge", "shield"],
    classes: ["spellsword", "paladin", "ranger"],
    keeper: { name: "힐다", role: "갑주 제작자", portrait: 35,
      greetings: [
        "방어! 살아서 돌아온 모험가만 다음 승리를 말할 수 있지. 자네 몸을 지킬 갑주부터 골라 보게.",
        "갑주! 몸에 맞지 않으면 쇳덩이일 뿐이야. 움직여 보고 어디가 불편한지 말해 봐.",
        "생존! 한 번 제대로 막아 낸 방패가 백 번 휘두른 칼보다 값질 때가 있지. 단단한 걸 골라 줄게.",
      ] },
  },
  /* 남동쪽 길가의 독립 건물 — 가운데 한 칸은 두 시설을 가르는 골목이다. */
  { id: "inn", name: "여관 '잿불'", x: 23, y: 20, quests: ["s2"],
    description: "난롯불과 수프 냄새가 여행객을 맞는다.",
    topics: [
      { id: "rumor", label: "소문", text: "할로우베일 심부의 옛길에 백골들이 걸어다닌다는 소문이 떠돈다." },
      { id: "veterans", label: "옛 손님", text: "옛날에는 에버모어의 기사단도 이곳에 묵어갔다." },
    ], keeper: { name: "로완", role: "여관 주인", portrait: 11,
      greetings: [
        "휴식! 잘 먹고 푹 자는 것도 모험가의 실력이지. 따뜻한 방과 수프가 기다리고 있어.",
        "식사! 빈속으로 떠난 영웅은 있어도 빈속으로 돌아온 영웅은 드물지. 수프부터 한 그릇 들어.",
        "소문! 잿불 곁에 앉으면 술보다 이야기가 먼저 도는 법이야. 요즘 길 소식이 궁금한가?",
      ] } },
  { id: "stable", name: "마굿간", x: 18, y: 20,
    description: "건초 냄새 사이로 에버모어행 역마차가 출발을 기다린다.",
    keeper: { name: "벤", role: "마부", portrait: 15,
      greetings: [
        "여행! 먼 길도 좋은 말과 마차가 있으면 금세 가까워지지. 에버모어까지 편히 모셔다드리겠소.",
        "마차! 바퀴도 말발굽도 방금 손봤소. 왕도로 갈 거라면 짐부터 실어 두시오.",
        "출발! 에버모어행 자리가 아직 남았소. 길이 더 어두워지기 전에 올라타시오.",
      ] } },
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
