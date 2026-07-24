import * as PIXI from "pixi.js";
import { ATTRS, ATTR_IDS, CLASSES, MAGIC_TRADITIONS, RANK_NAME, SKILLS, SkillId, skillLabel } from "../defs";
import { C, H, W, button, openOverlay, panel, txt } from "../core";
import {
  Member, memberRanks, spendAttrPoint, spendSkillPoint, trainableNext,
} from "../state";

export function openGrowthMenu(m: Member, onClose?: () => void): void {
  const ov = openOverlay({ onClose }); const root = ov.root;
  const PW = 960, PH = 680;
  const p = panel(PW, PH); p.x = (W - PW) / 2; p.y = (H - PH) / 2; root.addChild(p);
  const bx = p.x, by = p.y;
  const content = new PIXI.Container(); root.addChild(content);

  function render(): void {
    content.removeChildren().forEach((c) => c.destroy({ children: true }));
    const title = txt(`성장 — ${m.name}  (Lv.${m.level} ${CLASSES[m.classId].name})`, 23, C.border, { serif: true });
    title.x = bx + 28; title.y = by + 18; content.addChild(title);
    const hot = m.apUnspent > 0 || m.spUnspent > 0;
    const pts = txt(`능력치 포인트 ${m.apUnspent}      스킬 포인트 ${m.spUnspent}`, 16, hot ? C.elite : C.dim, { weight: "700" });
    pts.x = bx + 28; pts.y = by + 54; content.addChild(pts);

    const aT = txt("— 능력치 (1점씩 배분) —", 15, C.border, { weight: "700" });
    aT.x = bx + 28; aT.y = by + 92; content.addChild(aT);
    ATTR_IDS.forEach((k, i) => {
      const y = by + 122 + i * 44;
      const t = txt(`${ATTRS[k].name}  ${m.attrs[k]}`, 15, C.text); t.x = bx + 28; t.y = y + 8; content.addChild(t);
      const eff = k === "vital" ? "HP +3" : (k === "int" || k === "wit") ? "MP +1" : "";
      if (eff) { const e = txt(eff, 12, C.dim); e.x = bx + 140; e.y = y + 11; content.addChild(e); }
      const plus = button("+", 42, 34, () => { if (spendAttrPoint(m, k)) render(); }, { size: 18 });
      plus.x = bx + 220; plus.y = y; if (m.apUnspent <= 0) plus.setDisabled(true); content.addChild(plus);
    });

    const sT = txt("— 스킬 훈련 (전문가까지 · 달인은 클래스 전용) —", 15, C.border, { weight: "700" });
    sT.x = bx + 320; sT.y = by + 92; content.addChild(sT);
    const ranks = memberRanks(m);
    const col = (groups: { label: string; skills: SkillId[] }[], colX: number) => {
      let y = by + 122;
      for (const group of groups) {
        const ct = txt(group.label, 13, C.dim); ct.x = colX; ct.y = y; content.addChild(ct); y += 22;
        for (const k of group.skills) {
          const cur = ranks[k] ?? 0;
          const lt = txt(`${skillLabel(k)} [${RANK_NAME[cur]}]`, 14, cur ? (SKILLS[k].color ?? C.text) : C.dim);
          lt.x = colX + 8; lt.y = y + 6; content.addChild(lt);
          const nxt = trainableNext(m, k);
          if (nxt) {
            const b = button(`배우기 (${nxt.cost})`, 108, 30, () => { if (spendSkillPoint(m, k)) render(); }, { size: 12 });
            b.x = colX + 168; b.y = y; if (m.spUnspent < nxt.cost) b.setDisabled(true); content.addChild(b);
          }
          y += 34;
        }
        y += 8;
      }
    };
    const byCat = (cat: string) => (Object.keys(SKILLS) as SkillId[]).filter((s) => SKILLS[s].cat === cat);
    col([
      { label: "물리", skills: byCat("물리") },
      { label: "방어", skills: byCat("방어") },
    ], bx + 320);
    col([
      { label: "원소 마법", skills: MAGIC_TRADITIONS.elemental.schools },
      { label: "자아 마법", skills: MAGIC_TRADITIONS.self.schools },
      { label: "신성 마법", skills: MAGIC_TRADITIONS.divine.schools },
      { label: "보조", skills: byCat("보조") },
    ], bx + 620);
  }

  render();
  const closeBtn = button("닫기", 100, 36, () => ov.close(), { size: 15 });
  closeBtn.x = bx + PW - 128; closeBtn.y = by + 18; root.addChild(closeBtn);
}
