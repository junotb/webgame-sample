/* =====================================================================
 * town/evermore.ts — 에버모어 성 정의
 *  연방(3성·1탑·1신전·2숲)의 수도. 북단 알현실에 연방 군주가 있고,
 *  남단 마굿간의 역마차로 크로스베일과 오간다.
 *  중앙 대분수 광장을 축으로 대성당·왕도 시장·여관이 좌우에 늘어선다.
 *
 *  구역: 북단 알현실(연방 군주) / W 대성당 · E 왕도 시장
 *        W 여관 · E 시장 창고 / 중앙 대분수 / 남단 마차 광장(마굿간·석상·우물)
 *        동문 — 고블린 계곡길(크로스베일과 잇는 옛길)
 * ===================================================================== */
import { parseMap } from "../grid";
import { attachDialogue, type TownFacilityShellDef } from "./dialogue";
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
  "#..........................+",
  "#.#####..............#####.#",
  "#.####+..............#####.#",
  "#.#####..............#####.#",
  "#.#####..............#####.#",
  "#..........................#",
  "#..........................#",
  "#...................######.#",
  "#...................+#####.#",
  "#...................######.#",
  "#..........................#",
  "#############+##############",
] as const;

export const EVERMORE_MAP = parseMap([...EVERMORE_ROWS]);

/* ---- 진입 지점 ----
 *  carriage: 크로스베일에서 역마차로 도착 — 남단 마차 광장, 마굿간 앞(북향)
 *  throne: 알현실 편지 전달 이벤트 후 복귀 — 알현실 문 앞(북향)
 *  gate: 고블린 계곡길에서 동문으로 도보 입성 — 동문 안쪽(서향)
 *  southGate: 근교 필드에서 남문으로 귀환 — 남문 안쪽(북향) */
export const EVERMORE_STARTS: Record<"carriage" | "throne" | "gate" | "southGate", TownSpawnPos> = {
  carriage: { x: 17, y: 20, facing: 0 },
  throne: { x: 13, y: 6, facing: 0 },
  gate: { x: 26, y: 12, facing: 3 },
  southGate: { x: 13, y: 22, facing: 0 },
};

/* 담당자·대화 텍스트는 content/town-dialogue.json에서 결합한다. */
const EVERMORE_FACILITY_SHELLS: TownFacilityShellDef[] = [
  { id: "throne", name: "알현실", title: "알현실 — 연방 군주", x: 13, y: 4 },
  { id: "temple", name: "대성당", title: "대성당 — 연방 대성소", x: 6, y: 8,
    description: "높은 천장 아래 연방 각지에서 온 순례자의 기도가 울린다." },
  { id: "item", name: "왕도 시장", title: "왕도 시장 — 만물상", x: 21, y: 8,
    description: "향신료와 가죽, 갓 구운 빵 냄새가 뒤섞인 왕도 제일의 장터." },
  { id: "inn", name: "여관 '왕관과 방패'", x: 6, y: 14,
    description: "왕도 여행객들의 이야기와 따뜻한 빵 냄새가 홀을 채운다." },
  /* 남단 마차 광장의 마굿간 — 크로스베일행 역마차의 종점이자 출발점. */
  { id: "stable", name: "마굿간", x: 20, y: 20,
    description: "연방 각지의 문장이 달린 마차들이 가지런히 늘어서 있다." },
];

export const EVERMORE_FACILITIES: TownFacilityDef[] = attachDialogue("evermore", EVERMORE_FACILITY_SHELLS);

export const EVERMORE_DECOS: TownDecoDef[] = [
  {
    id: "fountain", name: "대분수", x: 13, y: 11,
    text: "에버모어의 대분수 — 세 성과 두 숲의 문장이 물결 위에 새겨져 있다.",
    blocking: true,
  },
  {
    id: "statue", name: "군주상", x: 10, y: 18,
    text: "초대 연방 군주의 석상. 손에 든 저울은 세 성의 균형을 뜻한다 전한다.",
    blocking: true,
  },
  {
    id: "statue", name: "사자상", x: 16, y: 18,
    text: "이름 없는 사자(使者)의 석상. 편지 한 통이 나라를 이었다는 옛 이야기가 새겨져 있다.",
    blocking: true,
  },
  {
    id: "well", name: "마차 광장 우물", x: 4, y: 20,
    text: "마부와 말이 함께 목을 축이는 넓은 돌우물. 두레박 줄이 반질반질 닳아 있다.",
    blocking: true,
  },
  /* --- 남단 마차 광장 — 마굿간 앞 짐과 그늘 --- */
  { id: "crate", name: "역마차 짐짝", x: 18, y: 21, text: "크로스베일행 마차에 실릴 짐짝. 연방 세 성의 봉인이 나란히 찍혀 있다.", interactive: false },
  { id: "barrel", name: "여물통", x: 22, y: 22, text: "말들의 여물이 담긴 커다란 통. 건초 냄새가 물씬 난다.", interactive: false },
  { id: "tree", name: "광장 느티나무", x: 5, y: 18, text: "마차를 기다리는 이들이 그늘을 빌리는 오래된 느티나무다.", interactive: false, blocking: true },
  { id: "tree", name: "성벽 아래 참나무", x: 8, y: 21, text: "남쪽 성벽에 기대듯 자란 참나무. 가지에 낡은 등롱이 걸려 있다.", interactive: false, blocking: true },
  { id: "bush", name: "성벽 관목", x: 3, y: 18, text: "성벽을 따라 낮게 다듬은 관목이 줄지어 있다.", interactive: false, blocking: true },
  { id: "mushroom", name: "돌틈 버섯", x: 2, y: 21, text: "성벽 그늘의 돌틈에서 버섯이 고개를 내밀었다.", interactive: false },
  /* --- 왕도 대로 — 가로수와 화단 --- */
  { id: "tree", name: "대로 가로수", x: 9, y: 5, text: "알현실로 이어지는 대로를 따라 심은 왕도 가로수다.", interactive: false, blocking: true },
  { id: "tree", name: "대로 가로수", x: 18, y: 5, text: "알현실로 이어지는 대로를 따라 심은 왕도 가로수다.", interactive: false, blocking: true },
  { id: "tree", name: "서편 물푸레나무", x: 2, y: 11, text: "대성당 담을 따라 물푸레나무가 늘어서 있다.", interactive: false, blocking: true },
  { id: "tree", name: "동편 물푸레나무", x: 25, y: 11, text: "동문 길목을 지키듯 선 물푸레나무다.", interactive: false, blocking: true },
  { id: "tree", name: "여관 앞 벚나무", x: 2, y: 17, text: "여관 창가에 가지를 드리운 벚나무. 꽃잎이 창턱에 쌓인다.", interactive: false, blocking: true },
  { id: "bush", name: "산울타리", x: 8, y: 17, text: "여관 뜰을 두른 낮은 산울타리다.", interactive: false, blocking: true },
  { id: "bush", name: "산울타리", x: 19, y: 17, text: "창고 담을 따라 다듬은 산울타리다.", interactive: false, blocking: true },
  { id: "flower", name: "광장 화단", x: 11, y: 10, text: "대분수 곁 화단 — 연방 문장의 일곱 색을 맞춘 꽃이 피어 있다.", interactive: false },
  { id: "flower", name: "광장 화단", x: 16, y: 12, text: "분수 물보라를 맞은 꽃잎이 촉촉하게 빛난다.", interactive: false },
  { id: "flower", name: "대로변 들꽃", x: 10, y: 12, text: "포석 틈에 뿌리내린 들꽃이 마차 바람에 흔들린다.", interactive: false },
  /* --- 왕도 시장 앞 — 부려 놓은 상단 짐 --- */
  { id: "crate", name: "상단 짐짝", x: 23, y: 11, text: "동부 상단이 부려 놓은 짐짝. '취급 주의 — 유리' 낙인이 찍혀 있다.", interactive: false },
  { id: "barrel", name: "향신료 통", x: 24, y: 17, text: "시장 창고 앞의 향신료 통. 뚜껑 틈으로 매콤한 향이 샌다.", interactive: false },
];

/** 남문 — 근교 필드(강변·사냥터) / 동문 — 고블린 계곡길(크로스베일 방면 옛길) */
export const EVERMORE_GATES: TownGateDef[] = [
  { id: "south", x: 13, y: 23, label: "남문 — 에버모어 근교", prompt: "[Z] 남문 밖으로 — 에버모어 근교", target: "evermoreOutskirts" },
  { id: "east", x: 27, y: 12, label: "동문 — 고블린 계곡길", prompt: "[Z] 동쪽으로 — 고블린 계곡길", target: "goblinValley" },
];

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
