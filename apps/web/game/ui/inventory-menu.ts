import * as PIXI from "pixi.js";
import {
  ATTRS, ATTR_IDS, DAMAGE_META, DamageType, MATERIALS, MATERIAL_IDS, OwnedGear,
  RANK_NAME, RARITY_META, SLOT_META, gearDisplayName,
} from "../defs";
import { C, H, W, backdrop, button, overlayRoot, panel, toast, txt } from "../core";
import {
  G, equipFromBag, identifyGear, partyIdentifyRank, sellGear, sellPrice,
} from "../state";
import { pickMember } from "./member-picker";
import { gearIcon } from "../item-icons";

function ownedSlotName(o: OwnedGear): string {
  return o.slot === "ring" ? "반지" : SLOT_META[o.slot].name;
}

function ownedResTags(res?: OwnedGear["res"]): string {
  if (!res) return "";
  return (Object.entries(res) as [DamageType, number][])
    .map(([t, m]) => `${DAMAGE_META[t].name} ${Math.round((1 - m) * 100)}% 경감`).join(" ");
}

function ownedDesc(o: OwnedGear): string {
  if (!o.identified) return `미확인 ${ownedSlotName(o)} — 감정 필요 (식별 ${RANK_NAME[RARITY_META[o.rarity].idReq]})`;
  const parts: string[] = [];
  if (o.atk !== undefined) {
    let h = `공격 +${o.atk}${o.twoHanded ? "(양손)" : ""} · ${DAMAGE_META[o.wtype ?? "slash"].name}`;
    if (o.reach === "ranged") h += " · 원거리";
    parts.push(h);
  } else {
    parts.push(`${ownedSlotName(o)}${o.def ? ` · 방어 +${o.def}` : ""}`);
  }
  if (o.attrs) {
    const ap = ATTR_IDS.filter((k) => o.attrs![k]).map((k) => `${ATTRS[k].abbr}+${o.attrs![k]}`);
    if (ap.length) parts.push(ap.join(" "));
  }
  const rt = ownedResTags(o.res);
  if (rt) parts.push(rt);
  return parts.join(" · ");
}

export function openBagMenu(onClose?: () => void): void {
  const root = new PIXI.Container(); root.zIndex = 66; overlayRoot.addChild(root);
  root.addChild(backdrop());
  const PW = 940, PH = 620;
  const p = panel(PW, PH); p.x = (W - PW) / 2; p.y = (H - PH) / 2; root.addChild(p);
  const bx = p.x, by = p.y;
  const content = new PIXI.Container(); root.addChild(content);
  let page = 0;
  const PER_PAGE = 7;

  function render(): void {
    content.removeChildren().forEach((c) => c.destroy({ children: true }));
    const title = txt("가방 — 장비 보관함", 24, C.border, { serif: true });
    title.x = bx + 28; title.y = by + 18; content.addChild(title);
    const info = txt(`소지금 ${G.gold} G     ·     파티 식별 ${RANK_NAME[partyIdentifyRank()]}     ·     ${G.bag.length}점`, 14, C.text);
    info.x = bx + 28; info.y = by + 54; content.addChild(info);
    const ownedMats = MATERIAL_IDS.filter((id) => G.mats[id] > 0)
      .map((id) => `${MATERIALS[id].name} ×${G.mats[id]}`);
    if (ownedMats.length) {
      const matT = txt(`조합 재료: ${ownedMats.join("  ")}  (도구점 조합대에서 물약으로)`, 12, C.dim, { wrap: PW - 56 });
      matT.x = bx + 28; matT.y = by + 74; content.addChild(matT);
    }
    if (!G.bag.length) {
      const empty = txt("가방이 비어 있다. 적을 처치하면 확률로 장비가 드랍된다.", 15, C.dim);
      empty.x = bx + 28; empty.y = by + 100; content.addChild(empty);
    }
    const pages = Math.max(1, Math.ceil(G.bag.length / PER_PAGE));
    if (page >= pages) page = pages - 1;
    const rows = G.bag.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
    rows.forEach((o, i) => {
      const y = by + 92 + i * 62;
      const rm = RARITY_META[o.rarity];
      /* 미확인이어도 기반 이름은 드러나 있으므로 아이콘은 그대로 보여준다 */
      const icon = gearIcon(o.base, 44);
      if (icon) { icon.x = bx + 28; icon.y = y + 4; content.addChild(icon); }
      const tx = bx + 28 + (icon ? 54 : 0);
      const nameT = txt(`${gearDisplayName(o)}  [${rm.name}]`, 16, o.identified ? rm.color : C.dim, { weight: "700" });
      nameT.x = tx; nameT.y = y; content.addChild(nameT);
      const d = txt(ownedDesc(o), 13, C.text, { wrap: 560 - (icon ? 54 : 0) });
      d.x = tx; d.y = y + 24; content.addChild(d);
      let btnX = bx + 616;
      if (!o.identified) {
        const canId = partyIdentifyRank() >= rm.idReq;
        const idb = button("감정", 84, 40, () => {
          if (identifyGear(o.uid)) { toast(`감정 완료 — ${o.name}!`, rm.color); render(); }
          else toast(`식별 랭크가 부족하다 (필요: ${RANK_NAME[rm.idReq]}).`, C.dim);
        }, { size: 14, border: canId ? C.elite : undefined });
        if (!canId) idb.setDisabled(true);
        idb.x = btnX; idb.y = y; content.addChild(idb); btnX += 96;
      } else {
        const eqb = button("장착", 84, 40, () => {
          pickMember(`${o.name} — 누구에게 장착할까?`, (m) => {
            if (equipFromBag(m, o.uid)) { toast(`${m.name}에게 ${o.name} 장착! (교체품은 가방으로)`, rm.color); render(); }
          }, {
            note: (m) => {
              const slot = o.slot === "ring" ? (!m.equip.ring1 ? "ring1" : "ring2") : o.slot;
              return `(${SLOT_META[slot].name}: ${m.equip[slot]?.name ?? "—"})`;
            },
          });
        }, { size: 14 });
        eqb.x = btnX; eqb.y = y; content.addChild(eqb); btnX += 96;
      }
      const sell = sellPrice(o);
      const sb = button(`팔기 ${sell}G`, 120, 40, () => {
        const gold = sellGear(o.uid);
        if (gold) { toast(`${gearDisplayName(o)} 판매 — ${gold} G.`, C.border); render(); }
      }, { size: 13 });
      sb.x = btnX; sb.y = y; content.addChild(sb);
    });
    if (pages > 1) {
      const prev = button("◀", 48, 34, () => { if (page > 0) { page--; render(); } }, { size: 15 });
      prev.x = bx + 28; prev.y = by + PH - 96; content.addChild(prev);
      const pg = txt(`${page + 1} / ${pages}`, 14, C.text); pg.x = bx + 88; pg.y = by + PH - 88; content.addChild(pg);
      const next = button("▶", 48, 34, () => { if (page < pages - 1) { page++; render(); } }, { size: 15 });
      next.x = bx + 152; next.y = by + PH - 96; content.addChild(next);
    }
  }

  render();
  const closeBtn = button("닫기", 100, 36, () => { root.destroy({ children: true }); onClose?.(); }, { size: 15 });
  closeBtn.x = bx + PW - 128; closeBtn.y = by + PH - 52; root.addChild(closeBtn);
}
