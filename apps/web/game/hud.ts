/* =====================================================================
 * hud.ts — 파티 HUD, 모험 수첩, 필드 스킬 메뉴, 멤버 선택 오버레이
 * ===================================================================== */
import * as PIXI from "pixi.js";
import {
  ATTRS, ATTR_IDS, CLASSES, EquipSlot, RANK_NAME, SLOT_META, SKILLS, SkillId,
} from "./defs";
import { portraitTexture } from "./portraits";
import {
  C, H, W, button, overlayRoot, panel, toast, txt, ui,
} from "./core";
import {
  G, Member, PROF_BASE, equippedWeapon, expNeed, memberRanks, memberStats, partyFieldSkills,
} from "./state";
import { openGrowthMenu } from "./ui/growth-menu";
import { openBagMenu } from "./ui/inventory-menu";
export { pickMember } from "./ui/member-picker";

/** 장비 요약 — 슬롯별 아이템(공격/방어/능력치 태그). 빈 슬롯은 "—" */
function equipTag(m: Member, slot: EquipSlot): string {
  const g = m.equip[slot];
  const label = SLOT_META[slot].name;
  if (!g) return `${label} —`;
  let s = `${label} ${g.name}`;
  if (g.atk) s += `+${g.atk}${g.twoHanded ? "(양손)" : ""}`;
  else if (g.def) s += ` 방${g.def}`;
  if (g.attrs) {
    const parts = ATTR_IDS.filter((k) => g.attrs![k]).map((k) => `${ATTRS[k].abbr}+${g.attrs![k]}`);
    if (parts.length) s += ` (${parts.join(",")})`;
  }
  return s;
}
function equipSummary(m: Member): string {
  const l1 = (["mainHand", "offHand", "helmet", "body"] as EquipSlot[]).map((s) => equipTag(m, s)).join("    ");
  const l2 = (["boots", "cloak", "amulet", "ring1", "ring2"] as EquipSlot[]).map((s) => equipTag(m, s)).join("    ");
  return l1 + "\n" + l2;
}

export interface HudHandle { redraw: () => void; }
export type FieldHandlers = Partial<Record<"recall" | "bless" | "darkveil" | "seek", () => void>>;

export function buildPartyHUD(container: PIXI.Container, opts: { fieldHandlers?: FieldHandlers } = {}): HudHandle {
  const hud = new PIXI.Container(); hud.zIndex = 40;
  const PW = 340, PH = 26 + G.party.length * 30 + 30;
  const p = panel(PW, PH, { alpha: 0.9 });
  p.x = W - PW - 16; p.y = 12;
  hud.addChild(p);

  const rows: { name: PIXI.Text; bars: PIXI.Graphics; m: Member }[] = [];
  G.party.forEach((m, i) => {
    const y = p.y + 12 + i * 30;
    const dot = new PIXI.Graphics();
    dot.circle(0, 0, 5).fill(m.accent);
    dot.x = p.x + 18; dot.y = y + 9; hud.addChild(dot);
    const name = txt("", 13, C.text, { weight: "700" });
    name.x = p.x + 30; name.y = y; hud.addChild(name);
    const bars = new PIXI.Graphics(); hud.addChild(bars);
    rows.push({ name, bars, m });
  });
  const goldT = txt("", 13, C.border);
  goldT.x = p.x + 18; goldT.y = p.y + PH - 26; hud.addChild(goldT);

  function redraw(): void {
    rows.forEach((r, i) => {
      const m = r.m;
      r.name.text = `${m.back ? "후" : "전"}│${m.name} Lv.${m.level} ${CLASSES[m.classId].name}`;
      const y = p.y + 12 + i * 30;
      const bx = p.x + 178, bw = 144;
      r.bars.clear();
      r.bars.roundRect(bx, y + 3, bw, 7, 3).fill({ color: 0x000000, alpha: 0.6 });
      r.bars.roundRect(bx, y + 3, bw * Math.max(0, m.hp / m.maxHp), 7, 3).fill(m.hp > 0 ? C.hp : 0x553333);
      r.bars.roundRect(bx, y + 13, bw, 5, 2).fill({ color: 0x000000, alpha: 0.6 });
      r.bars.roundRect(bx, y + 13, bw * Math.max(0, m.mp / m.maxMp), 5, 2).fill(C.mp);
    });
    goldT.text = `${G.gold} G`;
  }
  redraw();

  const menuBtn = button("메뉴", 76, 34, () => openStatusMenu(redraw), { size: 15 });
  menuBtn.x = W - 92; menuBtn.y = p.y + PH + 8; hud.addChild(menuBtn);
  if (opts.fieldHandlers) {
    const fsBtn = button("필드 스킬", 110, 34, () => openFieldSkillMenu(opts.fieldHandlers!, redraw), { size: 15 });
    fsBtn.x = W - 212; fsBtn.y = p.y + PH + 8; hud.addChild(fsBtn);
  }
  container.addChild(hud);
  return { redraw };
}

/* ---------- 모험 수첩 (파티 상태) ---------- */
export function openStatusMenu(onClose?: () => void): void {
  if (ui.menuOpen) return; ui.menuOpen = true;
  const root = new PIXI.Container(); root.zIndex = 60; overlayRoot.addChild(root);
  const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
  dim.eventMode = "static"; root.addChild(dim);
  const p = panel(880, 620); p.x = (W - 880) / 2; p.y = (H - 620) / 2; root.addChild(p);
  const bx = p.x, by = p.y;
  const title = txt("모험 수첩", 26, C.border, { serif: true }); title.x = bx + 28; title.y = by + 16; root.addChild(title);
  const goldT = txt(`${G.gold} G   |   치유 물약 ×${G.items.potion}   마나 물약 ×${G.items.mpotion}`, 15, C.text);
  goldT.x = bx + 300; goldT.y = by + 26; root.addChild(goldT);

  /* 가방(인벤토리) — 미확인 장비가 있으면 강조 */
  const unidCount = G.bag.filter((o) => !o.identified).length;
  const bagBtn = button(`가방 (${G.bag.length})${unidCount ? ` · 미확인 ${unidCount}` : ""}`, 210, 34,
    () => openBagMenu(() => { goldT.text = `${G.gold} G   |   치유 물약 ×${G.items.potion}   마나 물약 ×${G.items.mpotion}`; renderDetail(); }),
    { size: 14, border: unidCount ? C.elite : undefined });
  bagBtn.x = bx + 640; bagBtn.y = by + 14; root.addChild(bagBtn);

  let selIdx = 0;
  const detail = new PIXI.Container(); root.addChild(detail);

  const tabs: ReturnType<typeof button>[] = [];
  G.party.forEach((m, i) => {
    const mark = (m.apUnspent > 0 || m.spUnspent > 0) ? " ▲" : "";
    const b = button(m.name + mark, 118, 38, () => { selIdx = i; refreshTabs(); renderDetail(); }, { size: 15 });
    b.x = bx + 28 + i * 128; b.y = by + 58; root.addChild(b); tabs.push(b);
  });
  function refreshTabs(): void {
    tabs.forEach((b, i) => { b.alpha = i === selIdx ? 1 : 0.55; });
  }

  function renderDetail(): void {
    detail.removeChildren().forEach((c) => c.destroy({ children: true }));
    const m = G.party[selIdx];
    const st = memberStats(m);
    const r = memberRanks(m);
    /* 초상화 */
    const tex = portraitTexture(m.portrait);
    if (tex) {
      const sp = new PIXI.Sprite(tex);
      sp.width = 96; sp.height = 96; sp.x = bx + 28; sp.y = by + 110;
      detail.addChild(sp);
      const frame = new PIXI.Graphics();
      frame.rect(bx + 28, by + 110, 96, 96).stroke({ width: 2, color: C.border, alpha: 0.8 });
      detail.addChild(frame);
    }
    const attrLine = ATTR_IDS
      .map((k) => `${ATTRS[k].name} ${m.attrs[k]}`).join("   ");
    const info = txt(
      `${m.name} — ${CLASSES[m.classId].name}${m.ld ? " (" + SKILLS[m.ld].name + "의 길)" : ""}   Lv.${m.level}   EXP ${m.exp}/${expNeed(m.level)}\n` +
      `HP ${m.hp}/${m.maxHp}    MP ${m.mp}/${m.maxMp}\n` +
      attrLine + "\n" +
      `공격 ${st.atk}   마법(법사 ${st.magInt}·사제 ${st.magWit})   방어 ${st.def}   속도 ${st.spd}   명중 +${PROF_BASE + st.mods.agi}   회피도 ${st.evAC}   치명타 ${Math.round(st.crit * 100)}%`,
      14, C.text, { lh: 22 });
    info.x = bx + 140; info.y = by + 104; detail.addChild(info);

    /* 장비 슬롯 요약 — 포트레이트 아래 전체 폭 (9슬롯) */
    const eqT = txt("— 장비 —", 15, C.border, { weight: "700" });
    eqT.x = bx + 28; eqT.y = by + 214; detail.addChild(eqT);
    const eqInfo = txt(equipSummary(m), 13, C.text, { lh: 20, wrap: 828 });
    eqInfo.x = bx + 28; eqInfo.y = by + 238; detail.addChild(eqInfo);

    /* 성장 포인트 배분 — 미배분이 있으면 강조 */
    const hasPts = m.apUnspent > 0 || m.spUnspent > 0;
    const growBtn = button(
      hasPts ? `▲ 성장 배분 (능력치 ${m.apUnspent} · 스킬 ${m.spUnspent})` : "성장 · 스킬 훈련",
      264, 38, () => openGrowthMenu(m, () => renderDetail()), { size: 14 });
    growBtn.x = bx + 588; growBtn.y = by + 58;
    if (hasPts) { const gl = new PIXI.Graphics(); gl.roundRect(bx + 586, by + 56, 268, 42, 8).stroke({ width: 2, color: C.elite }); detail.addChild(gl); }
    detail.addChild(growBtn);

    const sTitle = txt("— 스킬 숙련 —", 16, C.border, { weight: "700" });
    sTitle.x = bx + 28; sTitle.y = by + 320; detail.addChild(sTitle);
    let cy = by + 350;
    for (const cat of ["물리", "방어", "마법", "보조"]) {
      const line = (Object.keys(SKILLS) as SkillId[])
        .filter((k) => SKILLS[k].cat === cat)
        .map((k) => {
          const rk = r[k] ?? 0;
          return rk ? `${SKILLS[k].name} [${RANK_NAME[rk]}]` : null;
        })
        .filter(Boolean).join("   ");
      const lt = txt(`${cat} │ ${line || "—"}`, 14, line ? C.text : C.dim, { wrap: 800 });
      lt.x = bx + 28; lt.y = cy; detail.addChild(lt);
      cy += Math.max(26, lt.height + 8);
    }
    const note = txt("숙련 단계: 노비스 → 전문가 → 달인 (스킬 위력·효과 자동 강화)", 13, C.dim);
    note.x = bx + 28; note.y = by + 620 - 92; detail.addChild(note);

    const useP = button("치유 물약 사용", 160, 36, () => {
      if (G.items.potion <= 0) return toast("치유 물약이 없다.", C.dim);
      if (m.hp >= m.maxHp) return toast(`${m.name}(은)는 이미 건강하다.`, C.dim);
      G.items.potion--; m.hp = Math.min(m.maxHp, m.hp + 60);
      toast(`${m.name} HP 60 회복.`); close();
    }, { size: 14 });
    useP.x = bx + 28; useP.y = by + 620 - 52; detail.addChild(useP);

    /* 진형 토글 — 전열이 최소 한 명은 남아야 한다 */
    const reachLabel = equippedWeapon(m).reach === "ranged" ? "원거리" : "근접";
    const posT = txt(`진형: ${m.back ? "후열" : "전열"}  ·  무기 ${reachLabel}`, 14,
      m.back ? C.mp : C.elite, { weight: "700" });
    posT.x = bx + 210; posT.y = by + 620 - 46; detail.addChild(posT);
    const swap = button(m.back ? "→ 전열로" : "→ 후열로", 130, 36, () => {
      if (!m.back && G.party.filter((x) => !x.back).length <= 1) {
        return toast("전열이 최소 한 명은 있어야 한다.", C.dim);
      }
      m.back = !m.back;
      toast(`${m.name} — ${m.back ? "후열" : "전열"}로 이동. ${m.back ? "(근접 적에게 안 맞지만 근접 공격 불가)" : "(전열에서 파티를 지킨다)"}`, C.border);
      renderDetail();
    }, { size: 14 });
    swap.x = bx + 430; swap.y = by + 620 - 52; detail.addChild(swap);
  }
  refreshTabs(); renderDetail();

  const closeBtn = button("닫기", 100, 36, close, { size: 15 });
  closeBtn.x = bx + 880 - 128; closeBtn.y = by + 620 - 52; root.addChild(closeBtn);
  function close(): void { ui.menuOpen = false; root.destroy({ children: true }); onClose?.(); }
}

/* ---------- 필드 스킬 메뉴 ---------- */
export function openFieldSkillMenu(handlers: FieldHandlers, onClose?: () => void): void {
  if (ui.menuOpen) return; ui.menuOpen = true;
  const list = partyFieldSkills();
  const root = new PIXI.Container(); root.zIndex = 60; overlayRoot.addChild(root);
  const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.55 });
  dim.eventMode = "static"; root.addChild(dim);
  const ph = 120 + Math.max(1, list.length) * 58;
  const p = panel(640, ph); p.x = (W - 640) / 2; p.y = (H - ph) / 2; root.addChild(p);
  const title = txt("필드 스킬", 24, C.border, { serif: true }); title.x = p.x + 24; title.y = p.y + 16; root.addChild(title);
  if (!list.length) {
    const t = txt("탐험에서 쓸 수 있는 스킬이 아직 없다.\n(귀환·축복·어둠의 장막·탐색은 해당 스킬 습득 멤버가 있어야 사용 가능)", 15, C.dim, { lh: 24 });
    t.x = p.x + 24; t.y = p.y + 62; root.addChild(t);
  }
  list.forEach((entry, i) => {
    const f = entry.def;
    const b = button(`${f.name}  (${entry.caster.name} · MP ${f.mp})`, 280, 44, () => {
      if (entry.caster.mp < f.mp) return toast(`${entry.caster.name}의 MP가 부족하다.`, C.dim);
      close();
      entry.caster.mp -= f.mp;
      handlers[f.id]?.();
    }, { size: 15 });
    b.x = p.x + 24; b.y = p.y + 62 + i * 58; root.addChild(b);
    const d = txt(f.desc, 14, C.dim); d.x = p.x + 320; d.y = p.y + 62 + i * 58 + 12; root.addChild(d);
  });
  const closeBtn = button("닫기", 90, 34, close, { size: 14 });
  closeBtn.x = p.x + 640 - 114; closeBtn.y = p.y + ph - 48; root.addChild(closeBtn);
  function close(): void { ui.menuOpen = false; root.destroy({ children: true }); onClose?.(); }
}
