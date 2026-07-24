/* =====================================================================
 * ui/save-menu.ts — 세이브 슬롯 선택 오버레이 (저장·불러오기 공용)
 *  로드 성공 시 상태가 교체되므로 호출측(onLoaded)에서 씬을 전환한다.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import { C, H, W, button, openOverlay, panel, toast, txt } from "../core";
import { SAVE_SLOT_COUNT, deleteSlot, listSlots, loadFromSlot, saveToSlot } from "../persistence";

export function openSlotMenu(
  mode: "save" | "load",
  opts: { onLoaded?: () => void; onClose?: () => void } = {},
): void {
  const ov = openOverlay({ onClose: opts.onClose }); const root = ov.root;
  const ph = 120 + SAVE_SLOT_COUNT * 66;
  const p = panel(680, ph); p.x = (W - 680) / 2; p.y = (H - ph) / 2; root.addChild(p);
  const title = txt(mode === "save" ? "기록한다 — 슬롯을 고른다" : "이어서 한다 — 슬롯을 고른다",
    24, C.border, { serif: true });
  title.x = p.x + 24; title.y = p.y + 16; root.addChild(title);

  const rows = new PIXI.Container(); root.addChild(rows);

  function close(): void { ov.close(); }

  function render(): void {
    rows.removeChildren().forEach((c) => c.destroy({ children: true }));
    listSlots().forEach((meta, i) => {
      const y = p.y + 64 + i * 66;
      const label = meta
        ? `슬롯 ${i + 1} — ${meta.summary}`
        : `슬롯 ${i + 1} — (비어 있음)`;
      const b = button(label, 500, 52, () => {
        if (mode === "save") {
          saveToSlot(i);
          toast(`슬롯 ${i + 1}에 기록했다.`, C.border);
          close();
        } else {
          if (!meta) return;
          if (loadFromSlot(i)) { close(); opts.onLoaded?.(); }
          else toast("이 슬롯의 기록을 읽을 수 없다.", C.dim);
        }
      }, { size: 15 });
      if (mode === "load" && !meta) b.setDisabled(true);
      b.x = p.x + 24; b.y = y; rows.addChild(b);
      if (meta) {
        const when = txt(new Date(meta.savedAt).toLocaleString(), 12, C.dim);
        when.x = p.x + 540; when.y = y + 4; rows.addChild(when);
        const del = button("지운다", 90, 30, () => { deleteSlot(i); render(); }, { size: 13 });
        del.x = p.x + 540; del.y = y + 22; rows.addChild(del);
      }
    });
  }
  render();

  const closeBtn = button("닫기", 100, 36, close, { size: 15 });
  closeBtn.x = p.x + 680 - 124; closeBtn.y = p.y + ph - 52; root.addChild(closeBtn);
}
