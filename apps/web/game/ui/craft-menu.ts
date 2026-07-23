/* =====================================================================
 * ui/craft-menu.ts — 도구점 조합대. 몬스터 재료 + 빈 플라스크 → 소모품.
 * 재료는 여기서 낱개 판매도 할 수 있다.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import {
  CONSUMABLES, CRAFT_RECIPES, MATERIALS, MATERIAL_IDS, MaterialId, canCraft,
} from "../defs";
import { C, H, W, button, overlayRoot, panel, toast, txt } from "../core";
import { G, craftItem, sellMaterial } from "../state";

export function openCraftMenu(onChange: () => void, onClose?: () => void): void {
  const root = new PIXI.Container(); root.zIndex = 66; overlayRoot.addChild(root);
  const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.62 });
  dim.eventMode = "static"; root.addChild(dim);
  const PW = 880, PH = 170 + CRAFT_RECIPES.length * 54;
  const p = panel(PW, PH); p.x = (W - PW) / 2; p.y = (H - PH) / 2; root.addChild(p);
  const bx = p.x, by = p.y;
  const content = new PIXI.Container(); root.addChild(content);

  function matsLine(): string {
    const owned = MATERIAL_IDS.filter((id) => G.mats[id] > 0)
      .map((id) => `${MATERIALS[id].name} ×${G.mats[id]}`);
    return owned.length ? owned.join("   ") : "보유한 재료가 없다 — 몬스터가 종족별 재료를 떨어뜨린다.";
  }

  function render(): void {
    content.removeChildren().forEach((c) => c.destroy({ children: true }));
    const title = txt("조합대 — 재료로 물약 만들기", 24, C.border, { serif: true });
    title.x = bx + 28; title.y = by + 18; content.addChild(title);
    const mt = txt(matsLine(), 13, C.text, { wrap: PW - 56 });
    mt.x = bx + 28; mt.y = by + 56; content.addChild(mt);

    CRAFT_RECIPES.forEach((r, i) => {
      const y = by + 108 + i * 54;
      const out = CONSUMABLES[r.out];
      const need = (Object.keys(r.mats) as MaterialId[])
        .map((k) => `${MATERIALS[k].name} ${G.mats[k]}/${r.mats[k]}`)
        .join(" · ");
      const ok = canCraft(r, G.mats);
      const nameT = txt(`${out.name}  (보유 ×${G.items[r.out]})`, 15, ok ? C.text : C.dim, { weight: "700" });
      nameT.x = bx + 28; nameT.y = y; content.addChild(nameT);
      const needT = txt(need, 12, ok ? C.border : C.dim);
      needT.x = bx + 28; needT.y = y + 22; content.addChild(needT);
      const b = button("조합", 96, 40, () => {
        if (craftItem(r)) { toast(`${out.name} 완성!`, C.border); onChange(); render(); }
        else toast("재료가 부족하다.", C.dim);
      }, { size: 14, border: ok ? C.elite : undefined });
      if (!ok) b.setDisabled(true);
      b.x = bx + PW - 260; b.y = y; content.addChild(b);
    });

    /* 재료 낱개 판매 — 남는 재료 처분 */
    const sellable = MATERIAL_IDS.filter((id) => G.mats[id] > 0);
    if (sellable.length) {
      const sb = button(`재료 전부 팔기 (+${sellable.reduce((s, id) => s + MATERIALS[id].sell * G.mats[id], 0)} G)`,
        250, 40, () => {
          let gold = 0;
          for (const id of sellable) gold += sellMaterial(id, G.mats[id]);
          toast(`재료를 팔아 ${gold} G를 벌었다.`, C.border); onChange(); render();
        }, { size: 13 });
      sb.x = bx + 28; sb.y = by + PH - 56; content.addChild(sb);
    }
  }

  render();
  const closeBtn = button("닫기", 100, 40, () => { root.destroy({ children: true }); onClose?.(); }, { size: 15 });
  closeBtn.x = bx + PW - 128; closeBtn.y = by + PH - 56; root.addChild(closeBtn);
}
