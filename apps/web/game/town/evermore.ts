/* =====================================================================
 * town/evermore.ts — 에버모어 성 정의
 *  연방(3성·1탑·1신전·2숲)의 수도. 북단 알현실에 연방 군주가 있고,
 *  남단 마굿간의 역마차로 크로스베일과 오간다.
 *  중앙 대분수 광장을 축으로 대성당·왕도 시장·여관이 좌우에 늘어선다.
 *
 *  구역: 북단 알현실(연방 군주) / W 대성당 · E 왕도 시장
 *        W 여관 · E 마굿간 / 중앙 대분수 · 석상 / 남단 마차 광장
 * ===================================================================== */
import { parseMap } from "../grid";
import type { TownData, TownDecoDef, TownFacilityDef, TownGateDef, TownSpawnPos } from "./types";

export const EVERMORE_ROWS = [
  "############################",
  "#........##########........#",
  "#........##########........#",
  "#........##########........#",
  "#........####+#####........#",
  "#..........................#",
  "#..........................#",
  "#.#####..............#####.#",
  "#.####+..............+####.#",
  "#.#####..............#####.#",
  "#.#####..............#####.#",
  "#..........................#",
  "#..........................#",
  "#.#####..............#####.#",
  "#.####+..............+####.#",
  "#.#####..............#####.#",
  "#.#####..............#####.#",
  "#..........................#",
  "#..........................#",
  "#..........................#",
  "#..........................#",
  "#..........................#",
  "#..........................#",
  "############################",
] as const;

export const EVERMORE_MAP = parseMap([...EVERMORE_ROWS]);

/* ---- 진입 지점 ----
 *  carriage: 크로스베일에서 역마차로 도착 — 남단 마차 광장(북향)
 *  throne: 알현실 편지 전달 이벤트 후 복귀 — 알현실 문 앞(북향) */
export const EVERMORE_STARTS: Record<"carriage" | "throne" | "gate", TownSpawnPos> = {
  carriage: { x: 13, y: 20, facing: 0 },
  throne: { x: 13, y: 6, facing: 0 },
  gate: { x: 1, y: 20, facing: 1 },
};

export const EVERMORE_FACILITIES: TownFacilityDef[] = [
  { id: "throne", name: "알현실", title: "알현실 — 연방 군주", x: 13, y: 4,
    keeper: { name: "시종장 펠릭", role: "알현 안내관", portrait: 20,
      greeting: "알현! 군주 앞에서는 진실한 말이 화려한 예법보다 중요하지요. 절차는 제가 안내하겠습니다." } },
  { id: "temple", name: "대성당", title: "대성당 — 연방 대성소", x: 6, y: 8,
    description: "높은 천장 아래 연방 각지에서 온 순례자의 기도가 울린다.",
    keeper: { name: "성직자 리네", role: "대성당 치유사", portrait: 44,
      greeting: "축복! 작은 기도 하나도 먼 길을 버티는 힘이 되지요. 상처와 근심을 잠시 내려놓으세요." } },
  { id: "item", name: "왕도 시장", title: "왕도 시장 — 만물상", x: 21, y: 8,
    keeper: { name: "셀윈", role: "왕도 상인", portrait: 12,
      greeting: "거래! 왕도에서는 없는 물건보다 못 찾는 상인이 더 드물지요. 필요한 걸 말씀만 하세요." } },
  { id: "inn", name: "여관 '왕관과 방패'", x: 6, y: 14,
    description: "왕도 여행객들의 이야기와 따뜻한 빵 냄새가 홀을 채운다.",
    topics: [
      { id: "federation", label: "연방의 소문", text: "세 성의 사절들이 다음 회의를 위해 속속 왕도에 도착하고 있다." },
      { id: "letter", label: "헤르만의 사자", text: "대스승의 편지를 든 젊은 모험가들이 왔다는 이야기가 벌써 퍼졌다.", requires: { flags: ["letter"] } },
    ], keeper: { name: "마르타", role: "여관 주인", portrait: 32,
      greeting: "이야기! 왕도의 밤은 침대보다 소문이 먼저 데워 주지. 방과 식사, 재미난 이야기까지 준비됐어." } },
  { id: "stable", name: "마굿간", x: 21, y: 14,
    description: "연방 각지의 문장이 달린 마차들이 가지런히 늘어서 있다.",
    keeper: { name: "가레스", role: "왕도 마차 조합원", portrait: 17,
      greeting: "속도! 왕도의 역마차는 해가 지기 전에 목적지에 닿습니다. 크로스베일행도 곧 출발해요." } },
];

export const EVERMORE_DECOS: TownDecoDef[] = [
  {
    id: "fountain", name: "대분수", x: 13, y: 11,
    text: "에버모어의 대분수 — 세 성과 두 숲의 문장이 물결 위에 새겨져 있다.",
  },
  {
    id: "statue", name: "군주상", x: 10, y: 18,
    text: "초대 연방 군주의 석상. 손에 든 저울은 세 성의 균형을 뜻한다 전한다.",
  },
  {
    id: "statue", name: "사자상", x: 16, y: 18,
    text: "이름 없는 사자(使者)의 석상. 편지 한 통이 나라를 이었다는 옛 이야기가 새겨져 있다.",
  },
];

/** 에버모어 성에는 던전으로 나가는 성문이 없다 */
export const EVERMORE_GATES: TownGateDef[] = [];

/** 레지스트리에 바로 등록할 수 있는 완전한 에버모어 정의. */
export const EVERMORE_TOWN: TownData = {
  id: "evermore",
  name: "에버모어 성",
  badge: "성 안 — 에버모어",
  map: EVERMORE_MAP,
  starts: EVERMORE_STARTS,
  facilities: EVERMORE_FACILITIES,
  decos: EVERMORE_DECOS,
  gates: EVERMORE_GATES,
  districts: [
    { id: "court", name: "북부 궁정 거리", x1: 1, y1: 1, x2: 26, y2: 8 },
    { id: "fountain", name: "왕도 대분수 광장", x1: 1, y1: 9, x2: 26, y2: 16 },
    { id: "carriage", name: "남부 마차 광장", x1: 1, y1: 17, x2: 26, y2: 22 },
  ],
};
