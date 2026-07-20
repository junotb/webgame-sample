/* =====================================================================
 * defs/quests.ts — 퀘스트 정의 (진행은 G.quests)
 * ===================================================================== */

export type QuestKind = "main" | "side" | "job" | "repeat";

export interface QuestObjectiveDef {
  id: string;
  /** kill: 적 / clear: 우두머리·조우 / reach: POI / talk: NPC / collect·rescue: 월드 대상 */
  type: "kill" | "clear" | "reach" | "talk" | "collect" | "rescue";
  target: string;
  count: number;
  desc: string;
}

export interface QuestDef {
  id: string;
  kind: QuestKind;
  name: string;
  desc: string;
  requires?: { quests?: string[]; level?: number };
  giver?: string;
  objectives: QuestObjectiveDef[];
  rewards: {
    gold?: number;
    exp?: number;
    items?: { id: "potion" | "mpotion"; n: number }[];
  };
  /** 반복 의뢰를 보고한 날부터 다시 열릴 때까지 필요한 월드 일수 */
  repeatEveryDays?: number;
}

export const QUESTS: QuestDef[] = [
  /* ---- 메인 — 편지를 들고 에버모어 성으로 ---- */
  {
    id: "main_hermans_letter",
    kind: "main",
    name: "대스승 헤르만의 편지",
    desc: "대스승 헤르만의 봉인된 편지를 에버모어 성으로 전달해야 한다. 먼저 크로스베일 마구간에서 이동편을 알아보자.",
    objectives: [
      {
        id: "ask_stable",
        type: "talk",
        target: "crossvale_stable",
        count: 1,
        desc: "크로스베일 마구간에서 에버모어행 이동편 확인",
      },
    ],
    rewards: {},
  },
  {
    id: "main_clear_evermore_road",
    kind: "main",
    name: "에버모어로 가는 길",
    desc: "남쪽 계곡길 서쪽의 좁은 길을 봉쇄한 산적들을 소탕하고 현상금 길드에 보고하자.",
    requires: { quests: ["main_hermans_letter"] },
    objectives: [
      {
        id: "clear_bandits",
        type: "clear",
        target: "valley_bandits",
        count: 1,
        desc: "서쪽 좁은 계곡길의 산적 무리 소탕",
      },
    ],
    rewards: { gold: 250, exp: 120 },
  },
  {
    id: "main_deliver_hermans_letter",
    kind: "main",
    name: "에버모어 성으로",
    desc: "열린 계곡길이나 역마차를 이용해 에버모어 성으로 가서 연방 군주에게 헤르만의 편지를 전달하자.",
    requires: { quests: ["main_clear_evermore_road"] },
    objectives: [
      {
        id: "deliver_letter",
        type: "talk",
        target: "federal_lord",
        count: 1,
        desc: "에버모어 성의 연방 군주에게 편지 전달",
      },
    ],
    rewards: { exp: 100 },
  },

  /* ---- 서브 ---- */
  {
    id: "side_ruined_temple",
    kind: "side",
    name: "버려진 사원의 진상 조사",
    desc: "버려진 사원 깊은 곳에서 알 수 없는 힘으로 되살아난 사악한 교단의 주교를 조사하고, 확인한 진상을 에버모어 성에 보고하자.",
    giver: "chamberlain",
    objectives: [
      {
        id: "defeat_bishop",
        type: "clear",
        target: "fallen_bishop",
        count: 1,
        desc: "되살아난 사악한 교단의 주교 퇴치 및 진상 확인",
      },
    ],
    rewards: { gold: 280, exp: 140, items: [{ id: "mpotion", n: 1 }] },
  },
  {
    id: "side_goblin_orders",
    kind: "side",
    name: "고블린 작전 문서",
    desc: "남쪽 계곡길 남쪽의 고블린 요새를 탐색하고, 북서쪽 방에서 약탈 계획이 담긴 작전 문서를 가져오자.",
    giver: "kael",
    objectives: [
      {
        id: "collect_orders",
        type: "collect",
        target: "goblin_orders",
        count: 1,
        desc: "고블린 작전 문서 회수",
      },
    ],
    rewards: { gold: 180, exp: 90 },
  },
  {
    id: "side_rescue_hostages",
    kind: "side",
    name: "고블린 주둔지의 인질들",
    desc: "남쪽 계곡길 오른쪽의 넓은 평야에 자리 잡은 고블린 주둔지에서 우리에 갇힌 인질들을 구출하자.",
    giver: "kael",
    objectives: [
      {
        id: "rescue_hostages",
        type: "rescue",
        target: "valley_hostages",
        count: 1,
        desc: "인간 우리의 인질 구출",
      },
    ],
    rewards: { gold: 220, exp: 110, items: [{ id: "potion", n: 2 }] },
  },
  /* ---- 직업(승급) — 파티가 자격을 공유하며 각 구성원은 개별 전직한다 ---- */
  {
    id: "job_first_promotion",
    kind: "job",
    name: "첫 번째 승급 심사",
    desc: "파티 Lv3을 달성하고 고블린 요새의 광신도를 쓰러뜨려 상위 직업으로 나아갈 자격을 증명하자.",
    requires: { level: 3 },
    objectives: [
      {
        id: "defeat_fanatic",
        type: "clear",
        target: "orc",
        count: 1,
        desc: "고블린 광신도 토벌",
      },
    ],
    rewards: { exp: 100 },
  },
  {
    id: "job_final_promotion",
    kind: "job",
    name: "최종 승급 심사",
    desc: "파티 Lv6을 달성하고 고블린 로드를 쓰러뜨려 최종 직업의 자격을 증명하자.",
    requires: { quests: ["job_first_promotion"], level: 6 },
    objectives: [
      {
        id: "defeat_goblin_lord",
        type: "clear",
        target: "lord",
        count: 1,
        desc: "고블린 로드 그름바크 토벌",
      },
    ],
    rewards: { exp: 250 },
  },

  /* ---- 반복 — 현상금 길드에서 보고 후 하루마다 재수주 ---- */
  {
    id: "repeat_slimes",
    kind: "repeat",
    name: "핏눈 슬라임 현상금",
    desc: "고블린 요새의 핏눈 슬라임 5마리를 소탕하자. 보고 후 다음 날 새 의뢰가 게시된다.",
    objectives: [
      {
        id: "kill_slime",
        type: "kill",
        target: "slime",
        count: 5,
        desc: "핏눈 슬라임 처치",
      },
    ],
    rewards: { gold: 60, exp: 25 },
    repeatEveryDays: 1,
  },
  {
    id: "repeat_goblins",
    kind: "repeat",
    name: "고블린 전사 현상금",
    desc: "고블린 요새의 전사 4마리를 소탕하자. 보고 후 다음 날 새 의뢰가 게시된다.",
    objectives: [
      {
        id: "kill_goblin",
        type: "kill",
        target: "goblin",
        count: 4,
        desc: "고블린 전사 처치",
      },
    ],
    rewards: { gold: 100, exp: 40 },
    repeatEveryDays: 1,
  },
  {
    id: "repeat_wolfriders",
    kind: "repeat",
    name: "늑대기수 현상금",
    desc: "고블린 늑대기수 4마리를 소탕하자. 숙련된 파티를 위한 정기 현상금이다.",
    requires: { level: 3 },
    objectives: [
      {
        id: "kill_wolf",
        type: "kill",
        target: "wolf",
        count: 4,
        desc: "고블린 늑대기수 처치",
      },
    ],
    rewards: { gold: 130, exp: 55 },
    repeatEveryDays: 1,
  },
];
