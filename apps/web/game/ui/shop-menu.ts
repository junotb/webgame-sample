import {
  ATTRS, AttrId, ConsumableId, DAMAGE_META, DamageType, EquipSlot, GearDef, SLOT_META,
} from "../defs";
import { openCraftMenu } from "./craft-menu";
import { C, H, W, button, openOverlay, panel, toast, txt } from "../core";
import { G, Member, equipGear } from "../state";
import { pickMember } from "./member-picker";
import { keeperSays } from "../town/content";
import type { TownKeeperDef } from "../town/types";
import { gearIcon, itemIcon } from "../item-icons";

export type ShopKind = "weapon" | "armor" | "item";

function gearResSummary(it: GearDef): string {
  const res = it.res;
  if (!res) return "";
  const entries = Object.entries(res) as [DamageType, number][];
  const elems: DamageType[] = ["earth", "fire", "wind", "water"];
  const uniformElem = entries.length === 4
    && elems.every((e) => res[e] !== undefined)
    && new Set(elems.map((e) => res[e])).size === 1;
  if (uniformElem) return `원소 피해 ${Math.round((1 - (res.fire ?? 1)) * 100)}% 경감`;
  return entries.map(([t, m]) => `${DAMAGE_META[t].name} ${Math.round((1 - m) * 100)}% 경감`).join(" ");
}

function slotLabel(it: GearDef): string {
  if (it.slot === "ring") return "반지";
  if (it.slot && it.slot in SLOT_META) return SLOT_META[it.slot as EquipSlot].name;
  return "장비";
}

function gearDesc(it: GearDef): string {
  const parts: string[] = [];
  if (it.atk !== undefined) {
    let head = `공격 +${it.atk} · ${DAMAGE_META[it.wtype ?? "slash"].name}`;
    head += it.reach === "ranged" ? " · 원거리(후열)" : " · 근접";
    if (it.twoHanded) head += " · 양손";
    else if (it.slot === "offHand") head += " · 왼손";
    parts.push(head);
  } else {
    parts.push(`${slotLabel(it)}${it.def ? ` · 방어 +${it.def}` : ""}`);
  }
  if (it.attrs) {
    const attrs = (Object.keys(it.attrs) as AttrId[])
      .filter((k) => it.attrs![k])
      .map((k) => `${ATTRS[k].name}+${it.attrs![k]}`);
    if (attrs.length) parts.push(attrs.join(" "));
  }
  const resistance = gearResSummary(it);
  if (resistance) parts.push(resistance);
  return parts.join(" · ");
}

export function openShopMenu(opts: {
  title: string;
  goods: GearDef[];
  kind: ShopKind;
  onChange: () => void;
  onClose: () => void;
  keeper: TownKeeperDef;
  /** 같은 건물의 다른 용무(수련·전직 등) — 이 오버레이를 닫고 전환한다 */
  extras?: { label: string; onTap: () => void }[];
}): void {
  const { title, goods, kind, onChange, onClose, keeper } = opts;
  const ov = openOverlay({ onClose }); const root = ov.root;
  const twoCol = goods.length > 6;
  const cols = twoCol ? 2 : 1;
  const rows = Math.ceil(goods.length / cols);
  const panelWidth = twoCol ? 944 : 660;
  const colWidth = twoCol ? 452 : 610;
  const panelHeight = 196 + rows * 64;
  const p = panel(panelWidth, panelHeight);
  p.x = (W - panelWidth) / 2; p.y = (H - panelHeight) / 2; root.addChild(p);
  const heading = txt(title, 24, C.border, { serif: true });
  heading.x = p.x + 26; heading.y = p.y + 18; root.addChild(heading);
  const speech = txt(keeperSays(keeper, "천천히 둘러봐요. 필요한 건 가격표 옆에 다 적어 뒀어요."), 13, C.dim);
  speech.x = p.x + 26; speech.y = p.y + 54; root.addChild(speech);
  const goldText = txt("", 15, C.text); goldText.x = p.x + 26; goldText.y = p.y + 78; root.addChild(goldText);
  function refreshGold(): void { goldText.text = keeperSays(keeper, `지금 가진 돈은 ${G.gold} G네요.`); onChange(); }
  refreshGold();

  function slotNote(it: GearDef, m: Member): string {
    if (it.slot === "ring") return `반지 ${m.equip.ring1?.name ?? "—"} / ${m.equip.ring2?.name ?? "—"}`;
    const slot = (it.slot ?? (it.atk !== undefined ? "mainHand" : "body")) as EquipSlot;
    return `${slotLabel(it)} ${m.equip[slot]?.name ?? "—"}`;
  }

  goods.forEach((it, i) => {
    const col = twoCol ? i % 2 : 0;
    const row = twoCol ? Math.floor(i / 2) : i;
    const colX = p.x + 26 + col * (colWidth + 8);
    const y = p.y + 116 + row * 64;
    const desc = kind === "item" ? (it.desc ?? "") : gearDesc(it);
    const icon = kind === "item" ? itemIcon(it.id as ConsumableId, 42) : gearIcon(it.name, 42);
    const nameText = txt(`${it.name}  —  ${desc}`, 14, C.text, {
      wrap: colWidth - (icon ? 178 : 128),
    });
    if (icon) { icon.x = colX; icon.y = y; root.addChild(icon); }
    nameText.x = colX + (icon ? 50 : 0); nameText.y = y + 8; root.addChild(nameText);
    const buy = button(`${it.price} G`, 110, 42, () => {
      if (G.gold < it.price) return toast(keeperSays(keeper, "그 물건을 사기엔 돈이 조금 모자라요."), C.dim);
      if (kind === "item") {
        G.gold -= it.price;
        G.items[it.id as ConsumableId]++;
        toast(`${it.name} 구입.`); refreshGold();
        return;
      }
      pickMember(`${it.name} — 누구에게 장착할까?`, (m) => {
        G.gold -= it.price;
        const slot = equipGear(m, it);
        toast(`${m.name}에게 ${it.name} 장착! (${SLOT_META[slot].name})`); refreshGold();
      }, { note: (m) => `(${slotNote(it, m)})` });
    }, { size: 15 });
    buy.x = colX + colWidth - 116; buy.y = y; root.addChild(buy);
  });

  if (kind === "item") {
    const craft = button("조합대", 110, 40, () => openCraftMenu(refreshGold), { size: 15 });
    craft.x = p.x + 26; craft.y = p.y + panelHeight - 56; root.addChild(craft);
  }
  (opts.extras ?? []).forEach((extra, i) => {
    const b = button(extra.label, 150, 40, () => { ov.close({ silent: true }); extra.onTap(); }, { size: 15 });
    b.x = p.x + 26 + i * 160; b.y = p.y + panelHeight - 56; root.addChild(b);
  });
  const close = button("나가기", 110, 40, () => ov.close(), { size: 15 });
  close.x = p.x + panelWidth - 136; close.y = p.y + panelHeight - 56; root.addChild(close);
}
