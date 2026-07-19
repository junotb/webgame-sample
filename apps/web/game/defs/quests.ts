/* =====================================================================
 * defs/quests.ts — 퀘스트 정의 (진행은 G.quests)
 * ===================================================================== */

/* ---- 퀘스트 ----
 * 정의(여기)와 진행(G.quests)을 분리 — 진행에는 카운트만 저장한다.
 * 반복(repeat) 퀘스트의 kill 대상은 재생성 몬스터(NORMAL_SPAWNS)만 허용. */
export type QuestKind = "main" | "side" | "repeat";

export interface QuestObjectiveDef {
  id: string;
  /** kill: 적 defId / clear: 심볼 / reach: POI id / talk: npc id */
  type: "kill" | "clear" | "reach" | "talk";
  target: string;
  count: number;
  desc: string;
}

export interface QuestDef {
  id: string;
  kind: QuestKind;
  name: string;
  desc: string;
  /** 수주 조건 — 명시된 퀘스트 완료(보고) + 파티 최고 레벨 */
  requires?: { quests?: string[]; level?: number };
  /** 지정 시 이 NPC(NpcDef.id)에게서 수주·보고 (게시판에는 안내만) */
  giver?: string;
  objectives: QuestObjectiveDef[];
  rewards: { gold?: number; exp?: number; items?: { id: "potion" | "mpotion"; n: number }[] };
}

export const QUESTS: QuestDef[] = [
  /* ---- 메인 체인 (자동 수주) ---- */
  {
    id: "m1", kind: "main", name: "계곡의 이변",
    desc: "할로우베일 어귀에 칼잡이 난쟁이가 들끓는다. 길드가 정찰 겸 소탕을 의뢰했다.",
    objectives: [{ id: "kill_goblin", type: "kill", target: "goblin", count: 3, desc: "칼잡이 난쟁이 처치" }],
    rewards: { gold: 80, exp: 30 },
  },
  {
    id: "m2", kind: "main", name: "정예의 그림자",
    desc: "중앙 홀 길목을 집게버섯 우두머리가 막아섰다. 놈을 쓰러뜨려 길을 열어라.",
    requires: { quests: ["m1"] },
    objectives: [{ id: "clear_orc", type: "clear", target: "orc", count: 1, desc: "집게버섯 우두머리 토벌" }],
    rewards: { gold: 250, exp: 120, items: [{ id: "potion", n: 2 }] },
  },
  {
    id: "m3", kind: "main", name: "숲의 군주",
    desc: "계곡 깊은 곳, 군주 그림바크가 잠에서 깨어났다. 크로스베일을 위한 최후의 의뢰다.",
    requires: { quests: ["m2"] },
    objectives: [{ id: "clear_lord", type: "clear", target: "lord", count: 1, desc: "숲의 군주 그림바크 토벌" }],
    rewards: { gold: 600, exp: 300 },
  },
  {
    id: "m4", kind: "main", name: "고대의 잔향",
    desc: "군주가 쓰러지자 물의 방에서 고대의 기척이 깨어났다. 마지막 시험이다.",
    requires: { quests: ["m3"] },
    objectives: [{ id: "clear_ancient", type: "clear", target: "ancient", count: 1, desc: "고대 정령 아스테리온 토벌" }],
    rewards: { gold: 1500, exp: 500 },
  },
  /* ---- 서브 (선택 수주) ---- */
  {
    id: "s1", kind: "side", name: "숨겨진 것",
    desc: "할로우베일 최북단 막다른 길에 무언가 숨겨져 있다는 소문. 탐색(Seek)이 필요할 것이다.",
    requires: { quests: ["m1"] },
    giver: "lokan",
    objectives: [{ id: "reach_hidden", type: "reach", target: "hidden", count: 1, desc: "숨겨진 보물 회수" }],
    rewards: { gold: 120, items: [{ id: "mpotion", n: 1 }] },
  },
  {
    id: "s2", kind: "side", name: "옛길의 망령",
    desc: "심부의 냉기 망령이 계곡 옛길을 위협한다. 넷이면 충분히 조용해질 것이다.",
    requires: { level: 2 },
    objectives: [{ id: "kill_skel", type: "kill", target: "skeleton", count: 4, desc: "냉기 망령 처치" }],
    rewards: { gold: 150, exp: 60 },
  },
  /* ---- 반복 (재생성 몬스터만 — 보고 후 재수주 가능) ---- */
  {
    id: "r1", kind: "repeat", name: "슬라임 청소",
    desc: "얕은 구역의 슬라임은 아무리 치워도 다시 샘솟는다. 꾸준한 일감.",
    objectives: [{ id: "kill_slime", type: "kill", target: "slime", count: 5, desc: "핏눈 슬라임 처치" }],
    rewards: { gold: 60, exp: 25 },
  },
  {
    id: "r2", kind: "repeat", name: "멧돼지 사냥",
    desc: "어금니 멧돼지 무리가 사냥꾼을 덮친다. 가죽은 길드가 사들인다.",
    requires: { level: 3 },
    objectives: [{ id: "kill_wolf", type: "kill", target: "wolf", count: 4, desc: "어금니 멧돼지 처치" }],
    rewards: { gold: 110, exp: 45 },
  },
];
