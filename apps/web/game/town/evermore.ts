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
  { id: "throne", name: "알현실", title: "알현실 — 연방 군주", x: 13, y: 4 },
  { id: "temple", name: "대성당", title: "대성당 — 연방 대성소", x: 6, y: 8 },
  { id: "item", name: "왕도 시장", title: "왕도 시장 — 만물상", x: 21, y: 8 },
  { id: "inn", name: "여관 '왕관과 방패'", x: 6, y: 14 },
  { id: "stable", name: "마굿간", x: 21, y: 14 },
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
