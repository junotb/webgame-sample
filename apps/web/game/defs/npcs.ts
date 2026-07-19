/* =====================================================================
 * defs/npcs.ts — NPC·대화 주제 정의
 * ===================================================================== */
import type { TownId } from "../towns";

/* ---- NPC ----
 * 울티마식 주제 대화: 말을 걸면 [의뢰]/[보고](퀘스트) · 대화하기(주제 선택).
 * 초상화는 characters 폴더 1-based 인덱스 (portraits.ts와 동일 규칙). */
export interface NpcTopicDef {
  id: string;
  /** 주제 선택지에 뜨는 키워드 */
  label: string;
  text: string;
  /** 명시된 퀘스트를 완료(보고)해야 열리는 주제 */
  requires?: { quests?: string[] };
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
  /** 거리 스프라이트 외투/포인트 색 */
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
    gx: 14, gy: 9, color: 0x4a4458, accent: 0xd8cba0,
    topics: [
      {
        id: "town", label: "크로스베일",
        text: "크로스베일은 에버모어 성으로 드는 관문 마을일세. 무기점·방어구점·도구점이 거리에 늘어서 있고, 여관에서 쉬어갈 수 있지. 현상금 길드에는 의뢰 게시판이 있다네.",
      },
      {
        id: "letter", label: "헤르만의 편지",
        text: "그 편지는 연방 군주에게 곧장 전하게. 남동쪽 마굿간에서 역마차를 타면 에버모어 성까지 눈 깜짝할 새라네. 삯은 좀 들지만, 계곡을 걸어 넘는 것보단 백번 낫지.",
      },
      {
        id: "valley", label: "할로우베일",
        text: "성문 밖 지하로 이어지는 계곡이 할로우베일일세. 마차가 다니는 큰길 아래로 옛 길이 뒤엉켜 있지. 갈림길에서 위아래 길을 살피게 — 안쪽엔 보물이, 바깥엔 어둠이 숨어 있으니.",
      },
      {
        id: "job", label: "전직",
        text: "경험을 쌓으면(레벨 3) 길드에서 첫 갈림길을 고를 수 있네. 파이터는 소드맨·스펠소드로, 스콜라는 메이지·애콜라이트로. 그 끝(레벨 6)에는 여덟 개의 최종 클래스가 기다리지.",
      },
      {
        id: "lord", label: "숲의 군주",
        text: "그림바크… 할로우베일 심부와 하나가 된 존재일세. 북동쪽 깊은 문 너머에 잠들어 있네. 놈을 베어야 계곡이 마을을 놓아줄 걸세.",
        requires: { quests: ["m2"] },
      },
      {
        id: "after", label: "그 후의 계곡",
        text: "군주가 쓰러진 뒤, 물의 방에서 더 오래된 기척이 깨어났다더군. 고대 정령 아스테리온 — 연방보다도 오래된 존재라네. 부디 조심하게.",
        requires: { quests: ["m3"] },
      },
    ],
  },
  {
    id: "lokan", name: "떠돌이 상인 로칸", portrait: 19, town: "crossvale",
    desc: "거리 한켠에 짐을 푼 행상. 소문에 밝다.",
    greeting: "어이, 새 얼굴이군! 물건은 도구점에 다 넘겼지만… 이야기라면 아직 팔 게 남았지.",
    gx: 9, gy: 16, color: 0x5a3a2a, accent: 0xc9a227,
    quests: ["s1"],
    topics: [
      {
        id: "trade", label: "장사",
        text: "이 마을 도구점 물약은 내가 대준 거야. 치유 물약은 쓰러진 동료도 일으키니, 계곡에 들어가기 전엔 꼭 챙기라고.",
      },
      {
        id: "treasure", label: "보물",
        text: "할로우베일 최북단 막다른 길 말이야… 벽처럼 보이는 곳에 상자가 숨겨져 있다더군. 인지(Seek)에 밝은 동료가 있다면 '탐색'으로 찾아낼 수 있을 거야.",
      },
      {
        id: "trap", label: "함정",
        text: "숨겨진 상자엔 십중팔구 함정이 걸려 있어. 함정 스킬이 있는 동료가 있으면 해체할 수 있지. 없으면… 뭐, 몸으로 때우는 수밖에.",
      },
    ],
  },
  {
    id: "martha", name: "여관주인 마르타", portrait: 47, town: "crossvale",
    desc: "여관 '잿불' 의 주인. 나그네들의 어머니.",
    greeting: "어서 오렴. 따뜻한 수프라도 내줄까? 요즘 손님들이 뜸해서 말이야.",
    gx: 21, gy: 19, color: 0x6a4a5a, accent: 0xe8dcc0,
    quests: ["s2"],
    topics: [
      {
        id: "inn", label: "여관",
        text: "30 G면 전원 푹 재워주지. HP도 MP도 아침이면 가득할 거야. 무리하지 말고 자주 들르렴.",
      },
      {
        id: "rumor", label: "소문",
        text: "할로우베일 심부의 옛길에 백골들이 걸어다닌다는구나. 마차꾼들이 발길을 끊어서… 우리 여관도 파리만 날리지.",
      },
      {
        id: "guest", label: "손님",
        text: "옛날엔 에버모어의 기사단도 묵어갔단다. 지금 그 방엔 먼지뿐이지만… 너희 넷을 보니 그 시절 생각이 나는구나.",
      },
    ],
  },

  /* =========================== 에버모어 성 =========================== */
  {
    id: "chamberlain", name: "시종장 오르윈", portrait: 21, town: "evermore",
    desc: "에버모어 성의 시종장. 연방 군주의 곁을 지킨다.",
    greeting: "먼 길 오셨습니다. 대스승의 사자(使者)라 하셨지요 — 알현실은 북쪽 대로 끝입니다.",
    gx: 11, gy: 6, color: 0x3a4a6a, accent: 0xd8cba0,
    topics: [
      {
        id: "audience", label: "알현",
        text: "북쪽 대로 끝의 알현실로 드시면 군주를 뵐 수 있습니다. 헤르만의 편지는 직접 전하시는 것이 예의지요.",
      },
      {
        id: "federation", label: "연방",
        text: "에버모어는 세 성과 하나의 탑, 하나의 신전, 두 숲으로 이룬 연방의 수도입니다. 군주는 그 균형을 지키는 저울이시지요.",
      },
    ],
  },
  {
    id: "eldwin", name: "시장 상인 엘드윈", portrait: 12, town: "evermore",
    desc: "왕도 시장의 만물상. 세 성을 잇는 물류에 밝다.",
    greeting: "왕도 시장에 오신 걸 환영합니다! 크로스베일에서 오셨다면, 오는 길이 험하진 않으셨는지요.",
    gx: 18, gy: 9, color: 0x5a4a2a, accent: 0xc9a227,
    topics: [
      {
        id: "market", label: "시장",
        text: "동쪽 만물상에서 여독을 풀 물약을 갖추십시오. 역마차 삯이 아깝잖아 걸어오시는 분들도 있는데, 할로우베일은 그럴 곳이 못 됩니다.",
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
    gx: 9, gy: 9, color: 0x4a4470, accent: 0xe8dcc0,
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
