/* =====================================================================
 * town/crossvale.ts — 크로스베일 마을 정의
 *  남문 — 중앙 분수 광장 — 북단 신전의 대로를 축으로 좌우 거리에 건물 배치.
 *  '#'벽(건물) '.'바닥(거리) '+'문(시설 입구, 막다른 칸) '~'개울(차단·장식)
 *
 *  구역: 북서 개울 / 북단 신전 / NW 영혼 길드 · NE 원소 길드
 *        W 현상금 길드 · E 무기점 / W 도구점 · E 방어구점
 *        SE 여관·마굿간 / SW 우물 / 남단 성문(고블린 계곡길)
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
        "어서 와요. 다친 데가 있으면 숨기지 말고 보여 줘요. 몸도 마음도 여기선 쉬어도 괜찮아요.",
        "촛불 가까이 앉으세요. 상처부터 살펴보고, 따뜻한 차도 한 잔 내어 드릴게요.",
        "발걸음이 많이 무거워 보이네요. 여명의 빛 아래에서는 잠시 긴장을 풀어도 괜찮답니다.",
      ] } },
  {
    id: "spiritGuild", name: "자아 길드", x: 7, y: 7,
    trains: ["spirit", "mind", "body"],
    classes: ["acolyte", "priest", "monk"],
    keeper: { name: "에다", role: "영혼술 교관", portrait: 37,
      greetings: [
        "기척이 꽤 또렷하네요. 영혼의 소리에 귀 기울일 준비가 됐다면, 제가 첫걸음을 봐 드리죠.",
        "잠깐 눈을 감아 보세요. 방금 스친 바람이 정말 바람이었는지, 함께 확인해 볼까요?",
        "문턱을 넘기 전보다 주위가 조용하게 느껴지죠? 이제 그 고요 속에서 무엇이 들리는지 말해 봐요.",
      ] },
  },
  {
    id: "elementsGuild", name: "원소 길드", x: 20, y: 7,
    trains: ["fire", "water", "earth", "wind"],
    classes: ["mage", "archmage", "druid"],
    keeper: { name: "아르벤", role: "원소학 강사", portrait: 8,
      greetings: [
        "불꽃부터 만지려 들진 마세요. 물과 바람을 먼저 이해해야 손가락을 덜 데니까요.",
        "바람이 먼저 인사를 건네는군요. 원소 쪽에 재능이 있는지는 기초부터 천천히 살펴보죠.",
        "오늘은 어느 쪽이 끌립니까? 성급한 불, 느긋한 물, 자유로운 바람, 묵직한 대지 중에서요.",
      ] },
  },
  { id: "bountyGuild", name: "현상금 길드", x: 7, y: 12,
    keeper: { name: "브란", role: "의뢰 게시판 관리인", portrait: 6,
      greetings: [
        "일거리를 찾소? 벽에 붙은 종이는 많아도 목숨은 하나뿐이니, 감당할 만한 것만 고르시오.",
        "새로 들어온 의뢰가 몇 건 있소. 보수만 보지 말고 작은 글씨까지 읽은 뒤에 결정하시오.",
        "게시판 앞에서 오래 고민하는 건 흉이 아니오. 무사히 돌아와 보수를 받는 쪽이 훨씬 중요하니까.",
      ] } },
  {
    id: "weapon", name: "무기점", x: 20, y: 12,
    trains: ["blade", "cudgel", "spear", "martial", "unarmed", "bow", "thrown"],
    classes: ["swordman", "swordmaster", "assassin"],
    keeper: { name: "토렌", role: "대장장이", portrait: 4,
      greetings: [
        "칼은 번쩍이는 맛보다 손에 맞는 게 먼저야. 들어 보고, 마음에 들면 값 얘길 하지.",
        "손에 굳은살이 제법 잡혔군. 평소 어떻게 싸우는지 보여 주면 어울리는 녀석을 골라 주지.",
        "벽에 걸린 건 마음껏 들어 봐도 돼. 다만 칼날끼리 부딪치면 수리비도 함께 받을 거야.",
      ] },
  },
  { id: "item", name: "도구점", title: "도구점 — 여행자의 벗", x: 7, y: 17,
    keeper: { name: "미리", role: "도구점 주인", portrait: 29,
      greetings: [
        "어서 와요! 물약은 가볍고 후회는 무거워요. 길 떠나기 전에 몇 병 챙겨 둬요.",
        "가방에 빈자리가 좀 있나요? 붕대와 해독제 정도는 넣어 둬야 제가 덜 걱정되죠.",
        "어디로 떠나는 길이에요? 목적지를 말해 주면 꼭 필요한 것만 골라 드릴게요.",
      ] } },
  {
    id: "armor", name: "방어구점", x: 20, y: 17,
    trains: ["armor", "dodge", "shield"],
    classes: ["spellsword", "paladin", "ranger"],
    keeper: { name: "힐다", role: "갑주 제작자", portrait: 35,
      greetings: [
        "갑옷은 멋으로 입는 게 아니야. 어디를 얻어맞을지 말해 봐, 거기에 맞춰 골라 줄 테니.",
        "어깨를 한번 돌려 봐. 제대로 된 갑주는 단단하면서도 움직임을 방해하지 않아야 하거든.",
        "방패 자국이 꽤 깊네. 다음에도 운에 맡길 셈이 아니라면, 이번엔 튼튼한 걸로 바꿔 가.",
      ] },
  },
  /* 남동쪽 길가의 독립 건물 — 가운데 한 칸은 두 시설을 가르는 골목이다. */
  { id: "inn", name: "여관 '잿불'", x: 23, y: 20,
    description: "난롯불과 수프 냄새가 여행객을 맞는다.",
    topics: [
      { id: "rumor", label: "소문", text: "고블린 요새 깊은 동굴에 백골 같은 망령이 떠돈다는 소문이 돈다." },
      { id: "veterans", label: "옛 손님", text: "옛날에는 에버모어의 기사단도 이곳에 묵어갔다." },
    ], keeper: { name: "로완", role: "여관 주인", portrait: 11,
      greetings: [
        "어서들 와! 빈방도 있고 따뜻한 수프도 있어. 우선 앉아서 숨부터 돌리라고.",
        "밖이 제법 쌀쌀하지? 난롯가 자리를 비워 뒀으니 젖은 장화부터 말리고 얘기하자고.",
        "배가 고프면 수프부터, 궁금한 게 있으면 소문부터 골라. 이 집엔 둘 다 넉넉하니까.",
      ] } },
  { id: "stable", name: "마굿간", x: 18, y: 20,
    description: "건초 냄새 사이로 에버모어행 역마차가 출발을 기다린다.",
    keeper: { name: "벤", role: "마부", portrait: 15,
      greetings: [
        "에버모어로 가나? 서쪽 마차로의 산적들만 정리되면 바로 말을 내주지.",
        "왕도행 마차는 길이 안전해지는 대로 떠나. 현상금 길드에서 산적 소탕 건을 확인해 봐.",
        "말들은 준비됐지만 마부 목숨도 하나뿐이야. 계곡의 산적들이 사라지기 전엔 운행할 수 없어.",
      ] } },
];

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
