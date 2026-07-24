/* =====================================================================
 * ui/task-journal.ts — 들은 소문(대화 주제) 기록.
 *  마을 대화에서 들은 이야기를 세션 동안 모아 두는 저장소.
 *  세이브에는 넣지 않는다 — 다시 들으면 다시 기록되는 가벼운 메모다.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import { C, H, W, button, openOverlay, panel, txt } from "../core";
import { questList, repeatCooldownDays } from "../core/quests";

export interface GossipEntry {
  speaker: string;
  label: string;
  text: string;
}

const gossip: GossipEntry[] = [];

/** 같은 화자·주제는 최신 내용으로 갱신한다. */
export function recordGossip(speaker: string, label: string, text: string): void {
  const existing = gossip.find((g) => g.speaker === speaker && g.label === label);
  if (existing) existing.text = text;
  else gossip.push({ speaker, label, text });
}

export function listGossip(): readonly GossipEntry[] {
  return gossip;
}

/* =====================================================================
 * 임무 수첩 오버레이 — HUD '임무' 버튼.
 *  의뢰: 진행·보고 대기 퀘스트 요약 (수주·보고는 길드·NPC에서)
 *  소문: 대화에서 들은 이야기 기록
 * ===================================================================== */
const PW = 860, PH = 620;
const NAV_W = 150;
const NAV_X = PW - NAV_W - 28;

type JournalTab = "quests" | "gossip";

export function openTaskJournal(onClose?: () => void): void {
  const ov = openOverlay({ onClose }); const root = ov.root;
  const p = panel(PW, PH); p.x = (W - PW) / 2; p.y = (H - PH) / 2; root.addChild(p);
  const title = txt("임무 수첩", 26, C.border, { serif: true });
  title.x = p.x + 28; title.y = p.y + 16; root.addChild(title);
  const content = new PIXI.Container(); root.addChild(content);

  /* 우측 내비게이션 */
  let tab: JournalTab = "quests";
  const navBtns = {} as Record<JournalTab, ReturnType<typeof button>>;
  const navBtn = (label: string, y: number, onTap: () => void) => {
    const b = button(label, NAV_W, 44, onTap, { size: 15 });
    b.x = p.x + NAV_X; b.y = y; root.addChild(b);
    return b;
  };
  navBtns.quests = navBtn("의뢰", p.y + 64, () => setTab("quests"));
  navBtns.gossip = navBtn("소문", p.y + 118, () => setTab("gossip"));
  navBtn("닫기", p.y + PH - 60, () => ov.close());

  function setTab(next: JournalTab): void {
    tab = next;
    (Object.keys(navBtns) as JournalTab[]).forEach((k) => { navBtns[k].alpha = k === tab ? 1 : 0.55; });
    content.removeChildren().forEach((c) => c.destroy({ children: true }));
    if (tab === "quests") questsPage(); else gossipPage();
  }

  function questsPage(): void {
    const entries = questList().filter((e) => e.status === "active" || e.status === "done");
    if (!entries.length) {
      const t = txt("진행 중인 의뢰가 없다. 현상금 길드 게시판이나 마을 사람들에게서 일을 받아 보자.", 14, C.dim, { wrap: NAV_X - 56 });
      t.x = p.x + 28; t.y = p.y + 70; content.addChild(t);
      return;
    }
    let y = p.y + 66;
    for (const e of entries) {
      const q = e.def;
      const marker = q.kind === "main" ? "★" : q.kind === "side" ? "◆" : q.kind === "job" ? "▲" : "↻";
      const head = txt(`${marker} ${q.name}${e.status === "done" ? "  — 보고 가능!" : ""}`,
        15, e.status === "done" ? C.border : C.text, { weight: "700" });
      head.x = p.x + 28; head.y = y; content.addChild(head);
      const pr = e.progress!;
      const lines = q.objectives
        .map((o) => `${o.desc} ${Math.min(pr.counts[o.id] ?? 0, o.count)}/${o.count}`)
        .join(" · ");
      const sub = txt(lines, 12, C.dim, { wrap: NAV_X - 74 });
      sub.x = p.x + 46; sub.y = y + 24; content.addChild(sub);
      y += 30 + Math.max(20, sub.height);
      if (y > p.y + PH - 96) break;
    }
    const rewarded = questList().filter((e) => (e.progress?.times ?? 0) > 0 || e.status === "rewarded");
    const cooldowns = rewarded
      .map((e) => ({ name: e.def.name, days: repeatCooldownDays(e.def.id) }))
      .filter((x) => x.days > 0)
      .map((x) => `${x.name} (${x.days}일 후 갱신)`);
    const note = txt(
      `완수한 의뢰 ${rewarded.length}건${cooldowns.length ? `   ·   대기: ${cooldowns.join(" · ")}` : ""}`,
      12, C.dim, { wrap: NAV_X - 56 });
    note.x = p.x + 28; note.y = p.y + PH - 66; content.addChild(note);
  }

  function gossipPage(): void {
    const list = listGossip();
    if (!list.length) {
      const t = txt("아직 들은 소문이 없다. 여관 주인이나 마을 사람들과 이야기해 보자.", 14, C.dim, { wrap: NAV_X - 56 });
      t.x = p.x + 28; t.y = p.y + 70; content.addChild(t);
      return;
    }
    let y = p.y + 66;
    /* 최근에 들은 이야기부터 */
    for (const g of [...list].reverse()) {
      const head = txt(`${g.label} — ${g.speaker}`, 14, C.text, { weight: "700" });
      head.x = p.x + 28; head.y = y; content.addChild(head);
      const body = txt(g.text, 12, C.dim, { wrap: NAV_X - 74, lh: 17 });
      body.x = p.x + 46; body.y = y + 22; content.addChild(body);
      y += 28 + Math.max(18, body.height);
      if (y > p.y + PH - 60) break;
    }
  }

  setTab("quests");
}
