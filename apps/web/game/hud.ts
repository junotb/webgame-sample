/* =====================================================================
 * hud.ts — 파티 HUD, 모험 수첩, 필드 스킬 메뉴, 멤버 선택 오버레이
 * ===================================================================== */
import * as PIXI from "pixi.js";
import { ATTRS, ATTR_IDS, CLASSES, RANK_NAME, SKILLS, SkillId } from "./defs";
import { portraitTexture } from "./portraits";
import {
  C, H, W, button, overlayRoot, panel, toast, tween, txt, ui, wait,
} from "./core";
import {
  G, Member, PROF_BASE, expNeed, memberRanks, memberStats, partyFieldSkills,
} from "./state";

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
      r.name.text = `${m.name} Lv.${m.level} ${CLASSES[m.classId].name}`;
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

/* ---------- 멤버 선택 오버레이 ---------- */
export function pickMember(title: string, cb: (m: Member) => void,
  opts: { filter?: (m: Member) => boolean; note?: (m: Member) => string } = {}): void {
  const root = new PIXI.Container(); root.zIndex = 70; overlayRoot.addChild(root);
  const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.55 });
  dim.eventMode = "static"; root.addChild(dim);
  const ph = 96 + G.party.length * 56;
  const p = panel(520, ph); p.x = (W - 520) / 2; p.y = (H - ph) / 2; root.addChild(p);
  const tt = txt(title, 20, C.border, { serif: true }); tt.x = p.x + 22; tt.y = p.y + 14; root.addChild(tt);
  G.party.forEach((m, i) => {
    const ok = !opts.filter || opts.filter(m);
    const label = `${m.name} — ${CLASSES[m.classId].name} Lv.${m.level}` + (opts.note ? `  ${opts.note(m)}` : "");
    const b = button(label, 380, 44, () => { close(); cb(m); }, { size: 14 });
    if (!ok) b.setDisabled(true);
    b.x = p.x + 22; b.y = p.y + 52 + i * 56; root.addChild(b);
  });
  const cancel = button("취소", 84, 40, close, { size: 14 });
  cancel.x = p.x + 520 - 106; cancel.y = p.y + ph - 54; root.addChild(cancel);
  function close(): void { root.destroy({ children: true }); }
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

  let selIdx = 0;
  const detail = new PIXI.Container(); root.addChild(detail);

  const tabs: ReturnType<typeof button>[] = [];
  G.party.forEach((m, i) => {
    const b = button(m.name, 118, 38, () => { selIdx = i; refreshTabs(); renderDetail(); }, { size: 15 });
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
      `공격 ${st.atk}   마법(법사 ${st.magInt}·사제 ${st.magWit})   방어 ${st.def}   속도 ${st.spd}   명중 +${PROF_BASE + st.mods.agi}   회피도 ${st.evAC}   치명타 ${Math.round(st.crit * 100)}%\n` +
      `무기: ${m.weapon.name} (+${m.weapon.atk})   방어구: ${m.armor.name} (+${m.armor.def})`,
      14, C.text, { lh: 22 });
    info.x = bx + 140; info.y = by + 104; detail.addChild(info);

    const sTitle = txt("— 스킬 숙련 —", 16, C.border, { weight: "700" });
    sTitle.x = bx + 28; sTitle.y = by + 226; detail.addChild(sTitle);
    let cy = by + 256;
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
