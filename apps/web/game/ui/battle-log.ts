/* =====================================================================
 * ui/battle-log.ts — 전투 기록 로그
 * 한 줄 덮어쓰기 대신 히스토리를 쌓아 최근 몇 줄을 보여주고,
 * 패널 클릭이나 L 키로 펼쳐 지난 기록(데미지·회복·상태이상)을 훑는다.
 * 펼친 상태에서는 휠로 더 오래된 기록까지 스크롤할 수 있다.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import { C, panel, txt } from "../core";

const KEEP = 150;      // 보관 한도 — 넘치면 오래된 기록부터 버린다
const COMPACT = 3;     // 접힌 상태에서 보이는 줄 수
const EXPANDED = 14;   // 펼친 상태에서 보이는 줄 수
const WHEEL_STEP = 3;  // 휠 1노치당 이동 줄 수

/* 기록 라인 색 — 공격 라인은 DAMAGE_META의 속성색을 쓴다 */
export const LOG_HURT = 0xe08a8a; // 아군 피격·전투불능
export const LOG_HEAL = 0x9fd08a; // 회복·흡수

interface Entry { text: string; color: number; }

export interface BattleLog {
  node: PIXI.Container;
  push(text: string, color?: number): void;
  toggle(): void;
}

export function createBattleLog(width: number): BattleLog {
  const node = new PIXI.Container();
  const history: Entry[] = [];
  let expanded = false;
  let offset = 0; // 펼친 상태에서 최신으로부터 몇 줄 과거를 보는지

  const maxOffset = () => Math.max(0, history.length - EXPANDED);

  function scroll(dir: 1 | -1): void {
    const next = Math.min(maxOffset(), Math.max(0, offset + dir * WHEEL_STEP));
    if (next === offset) return;
    offset = next;
    render();
  }

  function render(): void {
    node.removeChildren().forEach((c) => c.destroy({ children: true }));
    if (!history.length) return;
    const end = history.length - (expanded ? offset : 0);
    const shown = history.slice(Math.max(0, end - (expanded ? EXPANDED : COMPACT)), end);
    const texts = shown.map((e) => txt(e.text, 13, e.color, { wrap: width - 32, lh: 17 }));
    let y = (expanded ? 30 : 0) + 9;
    for (const t of texts) { t.x = 16; t.y = y; y += Math.max(17, t.height); }
    const bg = panel(width, y + 9, { alpha: expanded ? 0.94 : 0.82 });
    bg.eventMode = "static"; bg.cursor = "pointer";
    bg.on("pointertap", toggle);
    node.addChild(bg);
    if (expanded) {
      bg.on("wheel", (ev: PIXI.FederatedWheelEvent) => scroll(ev.deltaY < 0 ? 1 : -1));
      const tail = offset > 0 ? ` · 최신에서 ${offset}줄 과거` : "";
      const head = txt(`전투 기록 — 휠 스크롤 · L/클릭 접기${tail}`, 13, C.border, { weight: "700" });
      head.x = 16; head.y = 9; node.addChild(head);
    }
    /* 오래된 줄일수록 흐리게 — 맨 아랫줄이 방금 벌어진 일 */
    texts.forEach((t, i) => {
      t.alpha = expanded ? 1 : 0.55 + 0.45 * ((i + 1) / texts.length);
      node.addChild(t);
    });
  }

  function toggle(): void { expanded = !expanded; offset = 0; render(); }

  return {
    node,
    push(text: string, color: number = C.text): void {
      history.push({ text, color });
      if (history.length > KEEP) history.splice(0, history.length - KEEP);
      /* 과거를 훑는 중이면 새 기록에 화면이 밀리지 않게 창을 고정한다 */
      if (expanded && offset > 0) offset = Math.min(offset + 1, maxOffset());
      render();
    },
    toggle,
  };
}
