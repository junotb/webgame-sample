/* =====================================================================
 * defs/npcs.ts — NPC·대화 주제 정의
 * ===================================================================== */
import type { TownId } from "../towns";
import type { TownContentRequirement } from "../town/types";

/* ---- NPC ----
 * 울티마식 주제 대화: 말을 걸면 [의뢰]/[보고](퀘스트) · 대화하기(주제 선택).
 * 초상화는 portraits 폴더 1-based 인덱스 (portraits.ts와 동일 규칙). */
export interface NpcTopicDef {
  id: string;
  /** 주제 선택지에 뜨는 키워드 */
  label: string;
  text: string;
  /** 명시된 퀘스트를 완료(보고)해야 열리는 주제 */
  requires?: TownContentRequirement;
}

export interface NpcDef {
  id: string;
  name: string;
  portrait: number;
  desc: string;
  greeting: string;
  /** 소속 마을 (생략 시 크로스베일) */
  town?: TownId;
  /** 마을 그리드 좌표 (칸을 점유 — 정면에서 대화) */
  gx: number;
  gy: number;
  /** 거리 스프라이트 이름 (assets/npcs) — 없으면 절차적 그리기 폴백. */
  sprite?: string;
  /** 거리 스프라이트 외투/포인트 색 (미니맵 점·폴백 그리기) */
  color: number;
  accent: number;
  /** 이 NPC가 주는 퀘스트 (수주·보고 모두 이 NPC에게) */
  quests?: string[];
  topics: NpcTopicDef[];
}

export const NPCS: NpcDef[] = [
  /* ============================ 크로스베일 ============================ */
  {
    id: "kael", name: "장로 카엘", portrait: 18, town: "crossvale",
    desc: "크로스베일의 장로. 젊은 시절 대스승 헤르만과 함께 배웠다 한다.",
    greeting: "오, 헤르만의 제자들이로군. 그 노인의 편지를 들고 여기까지 오다니. 무엇이 궁금한가?",
    /* 분수(13,10) 우측 뒤 — 분수 앞 스폰(13,11 북향) 시야에 함께 들어온다 */
    gx: 14, gy: 9, sprite: "kael", color: 0x4a4458, accent: 0xd8cba0,
    quests: ["side_goblin_orders", "side_rescue_hostages"],
    topics: [
      {
        id: "town", label: "크로스베일",
        text: "크로스베일은 에버모어 성으로 드는 관문 마을일세. 무기점·방어구점·도구점이 거리에 늘어서 있고, 여관에서 쉬어갈 수 있지. 현상금 길드에는 의뢰 게시판이 있다네.",
      },
      {
        id: "letter", label: "헤르만의 편지",
        text: "그 편지는 연방 군주에게 곧장 전하게. 우선 남동쪽 마구간에서 에버모어로 갈 방법부터 알아보게.",
      },
      {
        id: "valley", label: "고블린 요새",
        text: "남쪽 계곡길을 따라 안쪽으로 파고들면 고블린들이 눌러앉은 요새가 나오네. 지상 미궁엔 동굴 몬스터와 고블린 무리가 뒤엉켜 있고, 북동쪽 계단 아래 지하가 또 있다더군. 갈림길을 잘 살피게 — 안쪽엔 보물이, 지하엔 놈들의 우두머리가 도사리고 있으니.",
      },
      {
        id: "job", label: "전직",
        text: "경험을 쌓으면(레벨 3) 길드에서 첫 갈림길을 고를 수 있네. 파이터는 소드맨·스펠소드로, 스콜라는 메이지·애콜라이트로. 그 끝(레벨 6)에는 여덟 개의 최종 클래스가 기다리지.",
      },
      {
        id: "lord", label: "주술사 그름바크",
        text: "그름바크… 요새와 계곡길 동쪽 평야의 고블린들을 지휘하는 주술사일세. 크로스베일을 통째로 노리고 있지. 북동쪽 계단 아래 지하 알현실에서 친위대를 곁에 두고 있다더군. 현상금 길드에 놈의 목에 걸린 의뢰가 붙었네.",
        requires: { quests: ["job_first_promotion"] },
      },
      {
        id: "after", label: "문서의 인장",
        text: "작전 문서의 그 인장 말인가… 연방 어느 문장고에도 없는 문양일세. 고블린 따위가 스스로 마을을 '점령'할 궁리를 했을 리 없지. 누군가 계곡 너머에서 놈들을 부리고 있어 — 부디 조심하게.",
        requires: { quests: ["side_goblin_orders"] },
      },
    ],
  },
  {
    id: "lokan", name: "떠돌이 상인 로칸", portrait: 19, town: "crossvale",
    desc: "거리 한켠에 짐을 푼 행상. 소문에 밝다.",
    greeting: "어이, 새 얼굴이군! 물건은 도구점에 다 넘겼지만… 이야기라면 아직 팔 게 남았지.",
    gx: 9, gy: 16, sprite: "lokan", color: 0x5a3a2a, accent: 0xc9a227,
    topics: [
      {
        id: "trade", label: "장사",
        text: "이 마을 도구점 물약은 내가 대준 거야. 치유 물약은 쓰러진 동료도 일으키니, 계곡에 들어가기 전엔 꼭 챙기라고.",
      },
      {
        id: "treasure", label: "보물",
        text: "고블린 요새 최북단 막다른 길 말이야… 벽처럼 보이는 곳에 상자가 숨겨져 있다더군. 인지(Seek)에 밝은 동료가 있다면 '탐색'으로 찾아낼 수 있을 거야.",
      },
      {
        id: "trap", label: "함정",
        text: "숨겨진 상자엔 십중팔구 함정이 걸려 있어. 함정 스킬이 있는 동료가 있으면 해체할 수 있지. 없으면… 뭐, 몸으로 때우는 수밖에.",
      },
    ],
  },
  /* =========================== 에버모어 성 =========================== */
  {
    id: "chamberlain", name: "시종장 오르윈", portrait: 21, town: "evermore",
    desc: "에버모어 성의 시종장. 연방 군주의 곁을 지킨다.",
    greeting: "먼 길 오셨습니다. 대스승의 사자(使者)라 하셨지요 — 알현실은 북쪽 대로 끝입니다.",
    gx: 11, gy: 6, sprite: "chamberlain", color: 0x3a4a6a, accent: 0xd8cba0,
    quests: ["main_ch1_wavering_crown", "side_ruined_temple"],
    topics: [
      {
        id: "audience", label: "알현",
        text: "북쪽 대로 끝의 알현실로 드시면 군주를 뵐 수 있습니다. 헤르만의 편지는 직접 전하시는 것이 예의지요.",
      },
      {
        id: "federation", label: "연방",
        text: "에버모어는 세 성과 하나의 탑, 하나의 신전, 두 숲으로 이룬 연방의 수도입니다. 군주는 그 균형을 지키는 저울이시지요.",
      },
      {
        id: "young_lord", label: "어린 군주",
        text: "선대께서 그리 급히 가실 줄은… 귀족들은 혼란을 막겠다며 서둘러 왕자님을 옥좌에 앉혔습니다. 아직 어깨가 왕관의 무게를 배우지 못하신 것뿐입니다 — 부디 너그러이 보아 주십시오.",
        requires: { quests: ["main_deliver_hermans_letter"] },
      },
      {
        id: "south_gate", label: "남문",
        text: "이번에 남쪽 성벽에 새 문을 냈습니다. 문밖 강변은 사냥터로 쓰이는 근교지요. 동쪽 언덕에는 왕가의 묘소가 있으니, 묘역만은 함부로 들지 마시길.",
        requires: { quests: ["main_deliver_hermans_letter"] },
      },
    ],
  },
  {
    id: "eldwin", name: "시장 상인 엘드윈", portrait: 12, town: "evermore",
    desc: "왕도 시장의 만물상. 세 성을 잇는 물류에 밝다.",
    greeting: "왕도 시장에 오신 걸 환영합니다! 크로스베일에서 오셨다면, 오는 길이 험하진 않으셨는지요.",
    gx: 18, gy: 9, sprite: "eldwin", color: 0x5a4a2a, accent: 0xc9a227,
    topics: [
      {
        id: "market", label: "시장",
        text: "동쪽 만물상에서 여독을 풀 물약을 갖추십시오. 역마차 삯이 아깝잖아 걸어오시는 분들도 있는데, 고블린이 들끓는 남쪽 계곡길은 그럴 곳이 못 됩니다.",
      },
      {
        id: "routes", label: "교역로",
        text: "세 성 사이는 역마차가 잇습니다. 마굿간에서 삯만 치르면 어디든 하루거리지요. 다만 계곡 밑 옛길은… 마차꾼도 마다합니다.",
      },
    ],
  },
  {
    id: "sister", name: "성직자 리아", portrait: 44, town: "evermore",
    desc: "대성당의 성직자. 순례자와 사자를 축복한다.",
    greeting: "여명이 그대들과 함께하기를. 대성당은 지친 이의 상처를 씻는 곳이랍니다.",
    gx: 9, gy: 9, sprite: "sister_lia", color: 0x4a4470, accent: 0xe8dcc0,
    topics: [
      {
        id: "cathedral", label: "대성당",
        text: "서쪽 대성당에서 몸에 깃든 나쁜 것을 정화해 드립니다. 계곡을 넘나드는 이들이라면 자주 들르셔야지요.",
      },
      {
        id: "blessing", label: "축복",
        text: "옛 사자들도 편지를 품고 이 성당에서 무사를 빌었답니다. 그대들의 걸음에도 여명이 함께하기를.",
      },
    ],
  },
];
