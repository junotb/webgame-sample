/* =====================================================================
 * core/quests.ts — 퀘스트 로직 (순수, PIXI 비의존)
 * 씬은 사실(GameEvent)만 보고하고, 판정·진행은 전부 여기서 한다.
 * 메인은 자동 수주(체인), 서브/반복은 길드에서 수주, 보상은 길드 보고 시.
 * ===================================================================== */
import { CONSUMABLES, QUESTS, QuestDef, QuestObjectiveDef } from "../defs";
import { QuestProgress, gainExpParty, gameStore, partyLevel } from "../state";

const game = () => gameStore.get();

/** 씬이 보고하는 게임 이벤트 */
export type GameEvent =
  | { t: "kill"; defId: string }
  | { t: "clear"; symbol: string }
  | { t: "reach"; poi: string }
  | { t: "talk"; npc: string }
  | { t: "collect"; item: string }
  | { t: "rescue"; group: string };

export type QuestStatus = "locked" | "available" | "active" | "done" | "rewarded";

/** 목표 진행 갱신 알림 — 씬이 토스트/패널 문구로 사용 */
export interface QuestUpdate {
  quest: QuestDef;
  objective: QuestObjectiveDef;
  count: number;
  /** 이 갱신으로 퀘스트 전체가 완료(보고 대기)됨 */
  questDone: boolean;
}

export function questDef(id: string): QuestDef {
  const q = QUESTS.find((x) => x.id === id);
  if (!q) throw new Error(`unknown quest: ${id}`);
  return q;
}

function objectiveMet(q: QuestDef, p: QuestProgress): boolean {
  return q.objectives.every((o) => (p.counts[o.id] ?? 0) >= o.count);
}

/** 수주 조건 충족 여부 (진행 여부와 무관한 순수 조건) */
function requirementsMet(q: QuestDef): boolean {
  const r = q.requires;
  if (!r) return true;
  if (r.level && partyLevel() < r.level) return false;
  if (r.quests && !r.quests.every((id) => game().quests[id]?.status === "rewarded")) return false;
  return true;
}

export function questStatus(id: string): QuestStatus {
  const q = questDef(id);
  const p = game().quests[id];
  if (p) {
    if (p.status === "rewarded" && q.kind === "repeat") {
      const day = game().townWorld?.day ?? 1;
      return day >= (p.availableAtDay ?? day) && requirementsMet(q) ? "available" : "locked";
    }
    return p.status;
  }
  return requirementsMet(q) ? "available" : "locked";
}

/** 길드 게시판용 목록 (메인 자동 수주 동기화 포함) */
export function questList(): { def: QuestDef; status: QuestStatus; progress?: QuestProgress }[] {
  syncMainQuests();
  return QUESTS.map((def) => ({ def, status: questStatus(def.id), progress: game().quests[def.id] }));
}

/** clear형 목표는 수주 시점의 defeated 플래그를 소급 인정 (메인 체인 잠김 방지) */
function retroCredit(q: QuestDef, p: QuestProgress): void {
  for (const o of q.objectives) {
    let completed = false;
    if (o.type === "clear") {
      if (o.target === "fallen_bishop")
        completed = !!game().flags.bishopDefeated || !!game().temple.defeated[o.target];
      else if (o.target === "valley_bandits") completed = !!game().flags.banditsDefeated;
      else if (o.target === "orc") completed = !!game().explore.defeated.orc;
      else if (o.target === "lord")
        completed = !!game().basement.defeated.lord || !!game().explore.defeated.lord;
    } else if (o.type === "collect" && o.target === "goblin_orders") {
      completed = !!game().flags.goblinOrders || game().explore.chestOpened.c1;
    } else if (o.type === "rescue" && o.target === "valley_hostages") {
      completed = !!game().flags.hostagesRescued;
    } else if (o.type === "talk" && o.target === "crossvale_stable") {
      completed = !!game().flags.stableBriefed;
    } else if (o.type === "talk" && o.target === "federal_lord") {
      completed = !!game().flags.letter;
    } else if (o.type === "talk" && o.target === "lost_prince") {
      completed = !!game().flags.princeFound;
    }
    if (completed) p.counts[o.id] = o.count;
  }
  if (objectiveMet(q, p)) p.status = "done";
}

export function acceptQuest(id: string): boolean {
  const q = questDef(id);
  if (questStatus(id) !== "available") return false;
  const prev = game().quests[id];
  const p: QuestProgress = {
    status: "active",
    counts: {},
    times: prev?.times ?? 0, // 반복 재수주 시 완료 횟수 유지
  };
  retroCredit(q, p);
  game().quests[id] = p;
  return true;
}

/** 수주 조건을 충족한 메인 퀘스트를 자동 수주. 새로 받은 정의를 반환 */
export function syncMainQuests(): QuestDef[] {
  const added: QuestDef[] = [];
  for (const q of QUESTS) {
    if (q.kind !== "main" || game().quests[q.id]) continue;
    if (!requirementsMet(q)) continue;
    const p: QuestProgress = { status: "active", counts: {}, times: 0 };
    retroCredit(q, p);
    game().quests[q.id] = p;
    added.push(q);
  }
  return added;
}

/** 게임 이벤트 → 활성 퀘스트 목표 매칭. 갱신된 목표 목록 반환 */
export function questNotify(ev: GameEvent): QuestUpdate[] {
  syncMainQuests();
  const updates: QuestUpdate[] = [];
  for (const q of QUESTS) {
    const p = game().quests[q.id];
    if (!p || p.status !== "active") continue;
    for (const o of q.objectives) {
      const cur = p.counts[o.id] ?? 0;
      if (cur >= o.count) continue;
      const hit =
        (ev.t === "kill" && o.type === "kill" && o.target === ev.defId) ||
        (ev.t === "clear" && o.type === "clear" && o.target === ev.symbol) ||
        (ev.t === "reach" && o.type === "reach" && o.target === ev.poi) ||
        (ev.t === "talk" && o.type === "talk" && o.target === ev.npc) ||
        (ev.t === "collect" && o.type === "collect" && o.target === ev.item) ||
        (ev.t === "rescue" && o.type === "rescue" && o.target === ev.group);
      if (!hit) continue;
      p.counts[o.id] = cur + 1;
      const done = objectiveMet(q, p);
      if (done) p.status = "done";
      updates.push({ quest: q, objective: o, count: cur + 1, questDone: done });
    }
  }
  return updates;
}

/** 길드 보고 — 보상 지급. 레벨업한 멤버 이름을 함께 반환 */
export function reportQuest(id: string): { gold: number; exp: number; items: string[]; ups: string[] } | null {
  const q = questDef(id);
  const p = game().quests[id];
  if (!p || p.status !== "done") return null;
  const r = q.rewards;
  const itemNames: string[] = [];
  if (r.gold) game().gold += r.gold;
  for (const it of r.items ?? []) {
    game().items[it.id] += it.n;
    itemNames.push(`${CONSUMABLES[it.id].name} ×${it.n}`);
  }
  const ups = r.exp ? gainExpParty(r.exp) : [];
  p.status = "rewarded";
  p.times += 1;
  if (q.kind === "repeat")
    p.availableAtDay = (game().townWorld?.day ?? 1) + (q.repeatEveryDays ?? 1);
  syncMainQuests(); // 메인 체인 다음 단계 자동 수주
  return { gold: r.gold ?? 0, exp: r.exp ?? 0, items: itemNames, ups };
}

/** 탐험 HUD 트래커용 — 진행 중 퀘스트의 목표 요약 (완료 대기 포함) */
export function trackerLines(max = 3): { text: string; done: boolean }[] {
  syncMainQuests();
  const out: { text: string; done: boolean }[] = [];
  for (const q of QUESTS) {
    const p = game().quests[q.id];
    if (!p || (p.status !== "active" && p.status !== "done")) continue;
    if (p.status === "done") {
      out.push({ text: `${q.name} — 완료! 길드에 보고`, done: true });
    } else {
      const o = q.objectives.find((x) => (p.counts[x.id] ?? 0) < x.count) ?? q.objectives[0];
      out.push({ text: `${q.name} — ${o.desc} ${p.counts[o.id] ?? 0}/${o.count}`, done: false });
    }
    if (out.length >= max) break;
  }
  return out;
}

/** 진행 문구 헬퍼 — "퀘스트: 고블린 처치 3/5" / "퀘스트 완료!" */
export function updateText(u: QuestUpdate): string {
  return u.questDone
    ? `퀘스트 완료: ${u.quest.name} — 길드에 보고할 것!`
    : `퀘스트: ${u.objective.desc} ${u.count}/${u.objective.count}`;
}

/** 반복 의뢰가 다시 게시되기까지 남은 일수. 대기 중이 아니면 0. */
export function repeatCooldownDays(id: string): number {
  const q = questDef(id);
  const p = game().quests[id];
  if (q.kind !== "repeat" || p?.status !== "rewarded") return 0;
  return Math.max(0, (p.availableAtDay ?? 0) - (game().townWorld?.day ?? 1));
}

/** 산적 소탕을 길드에 보고하면 계곡 서쪽 길과 에버모어행 역마차가 열린다. */
export function carriageUnlocked(): boolean {
  const route = game().quests.main_clear_evermore_road;
  /* 신규 메인 체인이 없던 구 세이브는 기존 산적 처치 기록을 그대로 인정한다. */
  return route?.status === "rewarded"
    || !!game().flags.letter
    || (!!game().flags.banditsDefeated && !route);
}
