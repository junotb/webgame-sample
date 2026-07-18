/* =====================================================================
 * defs/npcs.ts — NPC·대화 주제 정의
 * ===================================================================== */

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
  {
    id: "kael", name: "장로 카엘", portrait: 18,
    desc: "리븐홀드의 장로. 부서진 왕국의 마지막 기록자.",
    greeting: "오, 젊은 발걸음들. 광장은 오랜만에 활기가 도는군. 무엇이 궁금한가?",
    /* 분수(13,10) 우측 뒤 — 분수 앞 스폰(13,11 북향) 시야에 함께 들어온다 */
    gx: 14, gy: 9, color: 0x4a4458, accent: 0xd8cba0,
    topics: [
      {
        id: "town", label: "마을",
        text: "리븐홀드는 왕국이 부서진 뒤에도 버틴 마지막 등불일세. 무기점·방어구점·도구점이 거리에 늘어서 있고, 여관에서 쉬어갈 수 있지. 모험가 길드에는 의뢰 게시판이 있다네.",
      },
      {
        id: "forest", label: "황혼의 숲",
        text: "성문 밖 지하미궁은 황혼의 숲의 뿌리라네. 갈림길에서 위아래 길을 살피게 — 안쪽 길엔 보물이, 바깥 길엔 어둠이 숨어 있으니.",
      },
      {
        id: "job", label: "전직",
        text: "경험을 쌓으면(레벨 3) 길드에서 첫 갈림길을 고를 수 있네. 파이터는 소드맨·스펠소드로, 스콜라는 메이지·애콜라이트로. 그 끝(레벨 6)에는 여덟 개의 최종 클래스가 기다리지.",
      },
      {
        id: "lord", label: "숲의 군주",
        text: "그림바크… 왕국이 부서지던 밤, 숲과 하나가 된 존재일세. 북동쪽 심부의 문 너머에 잠들어 있네. 놈을 베어야 숲이 마을을 놓아줄 걸세.",
        requires: { quests: ["m2"] },
      },
      {
        id: "after", label: "그 후의 숲",
        text: "군주가 쓰러진 뒤, 물의 방에서 더 오래된 기척이 깨어났다더군. 고대 정령 아스테리온 — 왕국보다도 오래된 존재라네. 부디 조심하게.",
        requires: { quests: ["m3"] },
      },
    ],
  },
  {
    id: "lokan", name: "떠돌이 상인 로칸", portrait: 19,
    desc: "거리 한켠에 짐을 푼 행상. 소문에 밝다.",
    greeting: "어이, 새 얼굴이군! 물건은 도구점에 다 넘겼지만… 이야기라면 아직 팔 게 남았지.",
    gx: 9, gy: 16, color: 0x5a3a2a, accent: 0xc9a227,
    quests: ["s1"],
    topics: [
      {
        id: "trade", label: "장사",
        text: "이 마을 도구점 물약은 내가 대준 거야. 치유 물약은 쓰러진 동료도 일으키니, 던전에 들어가기 전엔 꼭 챙기라고.",
      },
      {
        id: "treasure", label: "보물",
        text: "숲 최북단 막다른 길 말이야… 벽처럼 보이는 곳에 상자가 숨겨져 있다더군. 인지(Seek)에 밝은 동료가 있다면 '탐색'으로 찾아낼 수 있을 거야.",
      },
      {
        id: "trap", label: "함정",
        text: "숨겨진 상자엔 십중팔구 함정이 걸려 있어. 함정 스킬이 있는 동료가 있으면 해체할 수 있지. 없으면… 뭐, 몸으로 때우는 수밖에.",
      },
    ],
  },
  {
    id: "martha", name: "여관주인 마르타", portrait: 47,
    desc: "여관 '잿불' 의 주인. 순례자들의 어머니.",
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
        text: "숲 심부의 순례길에 백골들이 걸어다닌다는구나. 순례자들이 발길을 끊어서… 우리 여관도 파리만 날리지.",
      },
      {
        id: "guest", label: "손님",
        text: "옛날엔 왕국 기사단도 묵어갔단다. 지금 그 방엔 먼지뿐이지만… 너희 넷을 보니 그 시절 생각이 나는구나.",
      },
    ],
  },
];
