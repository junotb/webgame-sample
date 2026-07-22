/* =====================================================================
 * ui/battle-log.ts — 전투 기록 로그
 * 한 줄 덮어쓰기 대신 히스토리를 쌓아 최근 몇 줄을 보여주고,
 * 패널 클릭이나 L 키로 펼쳐 지난 기록(데미지·회복·상태이상)을 훑는다.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import { C, panel, txt } from "../core";

const KEEP = 150;    // 보관 한도 — 넘치면 오래된 기록부터 버린다
const COMPACT = 3;   // 접힌 상태에서 보이는 줄 수
const EXPANDED = 14; // 펼친 상태에서 보이는 줄 수

export interface BattleLog {
  node: PIXI.Container;
  push(text: string): void;
  toggle(): void;
}

export function createBattleLog(width: number): BattleLog {
  const node = new PIXI.Container();
  const history: string[] = [];
  let expanded = false;

  function render(): void {
    node.removeChildren().forEach((c) => c.destroy({ children: true }));
    if (!history.length) return;
    const shown = history.slice(-(expanded ? EXPANDED : COMPACT));
    const texts = shown.map((s) => txt(s, 13, C.text, { wrap: width - 32, lh: 17 }));
    let y = (expanded ? 30 : 0) + 9;
    for (const t of texts) { t.x = 16; t.y = y; y += Math.max(17, t.height); }
    const bg = panel(width, y + 9, { alpha: expanded ? 0.94 : 0.82 });
    bg.eventMode = "static"; bg.cursor = "pointer";
    bg.on("pointertap", toggle);
    node.addChild(bg);
    if (expanded) {
      const head = txt(`전투 기록 — 최근 ${shown.length}줄 (L·클릭으로 접기)`, 13, C.border, { weight: "700" });
      head.x = 16; head.y = 9; node.addChild(head);
    }
    /* 오래된 줄일수록 흐리게 — 맨 아랫줄이 방금 벌어진 일 */
    texts.forEach((t, i) => {
      t.alpha = expanded ? 1 : 0.55 + 0.45 * ((i + 1) / texts.length);
      node.addChild(t);
    });
  }

  function toggle(): void { expanded = !expanded; render(); }

  return {
    node,
    push(text: string): void {
      history.push(text);
      if (history.length > KEEP) history.splice(0, history.length - KEEP);
      render();
    },
    toggle,
  };
}
