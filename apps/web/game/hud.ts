/* =====================================================================
 * hud.ts — 파티 HUD, 모험 수첩, 필드 스킬 메뉴, 멤버 선택 오버레이
 * ===================================================================== */
import * as PIXI from "pixi.js";
import {
  ATTRS, ATTR_IDS, CLASSES, CONSUMABLES, CONSUMABLE_IDS, EquipSlot, MAGIC_TRADITIONS,
  RANK_NAME, SLOT_META, SKILLS, SkillId,
} from "./defs";
import { portraitTexture } from "./portraits";
import {
  C, H, W, backdrop, button, overlayRoot, panel, toast, txt, ui,
} from "./core";
import {
  G, Member, PROF_BASE, canSwapRow, equippedWeapon, expNeed, fieldUsable, memberRanks,
  memberStats, partyFieldSkills, useFieldItem,
} from "./state";
import { openGrowthMenu } from "./ui/growth-menu";
import { openBagMenu } from "./ui/inventory-menu";
import { itemIcon } from "./item-icons";
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

  const rows: { dot: PIXI.Graphics; name: PIXI.Text; bars: PIXI.Graphics; m: Member }[] = [];
  G.party.forEach((m, i) => {
    const y = p.y + 12 + i * 30;
    const dot = new PIXI.Graphics();
    dot.circle(0, 0, 5).fill(m.accent);
    dot.x = p.x + 18; dot.y = y + 9; hud.addChild(dot);
    const name = txt("", 13, C.text, { weight: "700" });
    name.x = p.x + 30; name.y = y; hud.addChild(name);
    const bars = new PIXI.Graphics(); hud.addChild(bars);
    /* 이름 영역 클릭 → 진형 토글 (전투 중에는 '진형' 커맨드로만) */
    const hit = new PIXI.Graphics();
    hit.rect(p.x + 12, y - 3, 162, 28).fill({ color: 0xffffff, alpha: 0.001 });
    hit.eventMode = "static"; hit.cursor = "pointer";
    hit.on("pointertap", () => {
      if (ui.menuOpen) return;
      if (ui.inBattle) return toast("전투 중에는 자기 턴의 '진형' 커맨드로만 바꿀 수 있다.", C.dim);
      if (!canSwapRow(m)) return toast("전열이 최소 한 명은 있어야 한다.", C.dim);
      m.back = !m.back;
      toast(`${m.name} — ${m.back ? "후열" : "전열"}로 이동.`, C.border);
      redraw();
    });
    hud.addChild(hit);
    rows.push({ dot, name, bars, m });
  });
  const goldT = txt("", 13, C.border);
  goldT.x = p.x + 18; goldT.y = p.y + PH - 26; hud.addChild(goldT);

  function redraw(): void {
    rows.forEach((r, i) => {
      const m = r.m;
      /* 진형을 자리로 보여준다 — 후열은 한 칸 들여쓰고 푸른빛 (전/후 글자보다 배치가 먼저 읽힌다) */
      const indent = m.back ? 14 : 0;
      r.dot.x = p.x + 18 + indent;
      r.name.x = p.x + 30 + indent;
      r.name.style.fill = m.back ? C.mp : C.text;
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
  root.addChild(backdrop());
  const p = panel(880, 620); p.x = (W - 880) / 2; p.y = (H - 620) / 2; root.addChild(p);
  const bx = p.x, by = p.y;
  const title = txt("모험 수첩", 26, C.border, { serif: true }); title.x = bx + 28; title.y = by + 16; root.addChild(title);
  const itemSummary = () => {
    const owned = CONSUMABLE_IDS.filter((id) => G.items[id] > 0)
      .map((id) => `${CONSUMABLES[id].name} ×${G.items[id]}`);
    return `${G.gold} G   |   ${owned.length ? owned.join("   ") : "소모품 없음"}`;
  };
  const goldT = txt(itemSummary(), 13, C.text, { wrap: 330 });
  goldT.x = bx + 300; goldT.y = by + 22; root.addChild(goldT);

  /* 가방(인벤토리) — 미확인 장비가 있으면 강조 */
  const unidCount = G.bag.filter((o) => !o.identified).length;
  const bagBtn = button(`가방 (${G.bag.length})${unidCount ? ` · 미확인 ${unidCount}` : ""}`, 210, 34,
    () => openBagMenu(() => { goldT.text = itemSummary(); renderDetail(); }),
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
    const groups: { label: string; skills: SkillId[] }[] = [
      { label: "물리", skills: (Object.keys(SKILLS) as SkillId[]).filter((k) => SKILLS[k].cat === "물리") },
      { label: "방어", skills: (Object.keys(SKILLS) as SkillId[]).filter((k) => SKILLS[k].cat === "방어") },
      { label: "원소", skills: MAGIC_TRADITIONS.elemental.schools },
      { label: "자아", skills: MAGIC_TRADITIONS.self.schools },
      { label: "신성", skills: MAGIC_TRADITIONS.divine.schools },
      { label: "보조", skills: (Object.keys(SKILLS) as SkillId[]).filter((k) => SKILLS[k].cat === "보조") },
    ];
    for (const group of groups) {
      const line = group.skills
        .map((k) => {
          const rk = r[k] ?? 0;
          return rk ? `${SKILLS[k].icon ? `${SKILLS[k].icon} ` : ""}${SKILLS[k].name} [${RANK_NAME[rk]}]` : null;
        })
        .filter(Boolean).join("   ");
      const lt = txt(`${group.label} │ ${line || "—"}`, 14, line ? C.text : C.dim, { wrap: 800 });
      lt.x = bx + 28; lt.y = cy; detail.addChild(lt);
      cy += Math.max(26, lt.height + 8);
    }
    const note = txt("숙련 단계: 노비스 → 전문가 → 달인 (스킬 위력·효과 자동 강화)", 13, C.dim);
    note.x = bx + 28; note.y = by + 620 - 92; detail.addChild(note);

    const useP = button("아이템 사용", 160, 36, () => openFieldItemMenu(m, () => {
      goldT.text = itemSummary(); renderDetail();
    }), { size: 14 });
    useP.x = bx + 28; useP.y = by + 620 - 52; detail.addChild(useP);

    /* 진형 토글 — 전열이 최소 한 명은 남아야 한다 */
    const w = equippedWeapon(m);
    const reachLabel = w.reach === "ranged" ? "원거리" : w.reach === "reach" ? "리치(후열 근접 가능)" : "근접";
    const posT = txt(
      `진형: ${m.back ? "후열" : "전열"}  ·  무기 ${reachLabel}\n` +
      (m.back ? "근접 면제 · 광역 60% · 원거리 명중 +2, 치명 +8%" : "근접 적의 표적 — 후열을 지킨다"),
      13, m.back ? C.mp : C.elite, { weight: "700", lh: 18 });
    posT.x = bx + 210; posT.y = by + 620 - 50; detail.addChild(posT);
    const swap = button(m.back ? "→ 전열로" : "→ 후열로", 130, 36, () => {
      if (ui.inBattle) {
        return toast("전투 중에는 자기 턴의 '진형' 커맨드로만 바꿀 수 있다.", C.dim);
      }
      if (!canSwapRow(m)) {
        return toast("전열이 최소 한 명은 있어야 한다.", C.dim);
      }
      m.back = !m.back;
      toast(`${m.name} — ${m.back ? "후열" : "전열"}로 이동. ${m.back ? "(근접 면제·광역 감쇠, 원거리 조준 보너스 — 창은 후열에서도 찌른다)" : "(전열에서 일행을 지킨다)"}`, C.border);
      renderDetail();
    }, { size: 14 });
    swap.x = bx + 430; swap.y = by + 620 - 52; detail.addChild(swap);
  }
  refreshTabs(); renderDetail();

  const closeBtn = button("닫기", 100, 36, close, { size: 15 });
  closeBtn.x = bx + 880 - 128; closeBtn.y = by + 620 - 52; root.addChild(closeBtn);
  function close(): void { ui.menuOpen = false; root.destroy({ children: true }); onClose?.(); }
}

/* ---------- 소모품 사용 (전투 밖 — 모험 수첩에서) ---------- */
function openFieldItemMenu(m: Member, onUsed: () => void): void {
  const usable = CONSUMABLE_IDS.filter((id) => G.items[id] > 0 && fieldUsable(id));
  const root = new PIXI.Container(); root.zIndex = 70; overlayRoot.addChild(root);
  root.addChild(backdrop());
  const rows = Math.max(1, usable.length);
  const ph = 110 + rows * 52;
  const p = panel(620, ph); p.x = (W - 620) / 2; p.y = (H - ph) / 2; root.addChild(p);
  const tt = txt(`${m.name} — 아이템 사용 (HP ${m.hp}/${m.maxHp} · MP ${m.mp}/${m.maxMp})`, 18, C.border, { serif: true });
  tt.x = p.x + 24; tt.y = p.y + 16; root.addChild(tt);
  if (!usable.length) {
    const t = txt("여기서 쓸 수 있는 소모품이 없다. (비약·해독제는 전투 중 전용)", 14, C.dim);
    t.x = p.x + 24; t.y = p.y + 60; root.addChild(t);
  }
  usable.forEach((id, i) => {
    const def = CONSUMABLES[id];
    const icon = itemIcon(id, 40);
    icon.x = p.x + 24; icon.y = p.y + 57 + i * 52; root.addChild(icon);
    const b = button(`${def.name} ×${G.items[id]}`, 230, 42, () => {
      const line = useFieldItem(id, m);
      if (!line) return toast("지금은 쓸 수 없다.", C.dim);
      toast(line, C.border);
      close(); onUsed();
    }, { size: 14 });
    b.x = p.x + 70; b.y = p.y + 56 + i * 52; root.addChild(b);
    const d = txt(def.desc, 13, C.dim, { wrap: 280 });
    d.x = p.x + 312; d.y = p.y + 64 + i * 52; root.addChild(d);
  });
  const closeBtn = button("닫기", 90, 36, close, { size: 14 });
  closeBtn.x = p.x + 620 - 114; closeBtn.y = p.y + ph - 50; root.addChild(closeBtn);
  function close(): void { root.destroy({ children: true }); }
}

/* ---------- 필드 스킬 메뉴 ---------- */
export function openFieldSkillMenu(handlers: FieldHandlers, onClose?: () => void): void {
  if (ui.menuOpen) return; ui.menuOpen = true;
  const list = partyFieldSkills();
  const root = new PIXI.Container(); root.zIndex = 60; overlayRoot.addChild(root);
  root.addChild(backdrop());
  const ph = 120 + Math.max(1, list.length) * 58;
  const p = panel(640, ph); p.x = (W - 640) / 2; p.y = (H - ph) / 2; root.addChild(p);
  const title = txt("필드 스킬", 24, C.border, { serif: true }); title.x = p.x + 24; title.y = p.y + 16; root.addChild(title);
  if (!list.length) {
    const t = txt("탐험에서 쓸 수 있는 스킬이 아직 없다.\n(귀환·축복·어둠의 장막·탐색은 해당 스킬 습득 멤버가 있어야 사용 가능)", 15, C.dim, { lh: 24 });
    t.x = p.x + 24; t.y = p.y + 62; root.addChild(t);
  }
  list.forEach((entry, i) => {
    const f = entry.def;
    const school = SKILLS[f.skill];
    const b = button(`${school.icon ? `${school.icon} ` : ""}${f.name}  (${entry.caster.name} · MP ${f.mp})`, 280, 44, () => {
      if (entry.caster.mp < f.mp) return toast(`${entry.caster.name}의 MP가 부족하다.`, C.dim);
      close();
      entry.caster.mp -= f.mp;
      handlers[f.id]?.();
    }, { size: 15, border: school.color });
    b.x = p.x + 24; b.y = p.y + 62 + i * 58; root.addChild(b);
    const d = txt(f.desc, 14, C.dim); d.x = p.x + 320; d.y = p.y + 62 + i * 58 + 12; root.addChild(d);
  });
  const closeBtn = button("닫기", 90, 34, close, { size: 14 });
  closeBtn.x = p.x + 640 - 114; closeBtn.y = p.y + ph - 48; root.addChild(closeBtn);
  function close(): void { ui.menuOpen = false; root.destroy({ children: true }); onClose?.(); }
}
