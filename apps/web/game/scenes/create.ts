/* =====================================================================
 * scenes/create.ts — 캐릭터 생성 (초상화·직업·추가 기술·능력치 분배)
 *  M&M풍: 우측 4인 슬롯, 좌측 상세 편집. 완료 시 newGame(configs) → 인트로.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import {
  ATTRS, ATTR_BASE, ATTR_IDS, ATTR_MAX, ATTR_MIN, Attrs, BASE_CLASSES,
  CLASSES, CREATE_POINTS, CREATE_SKILL_PICKS, ClassId, PartySlot,
  PARTY_SLOTS, SKILLS, SkillId,
} from "../data";
import {
  C, H, SceneHandle, W, button, fullFlash, nav, panel, sceneRoot,
  setModeBadge, toast, txt,
} from "../core";
import { CreationConfig, maxHpOf, maxMpOf, newGame } from "../state";
import { PORTRAIT_COUNT, PORTRAITS, portraitTexture } from "../portraits";

interface Draft {
  slot: PartySlot;
  portrait: number;
  classId: ClassId;
  skills: SkillId[];
  attrs: Attrs;
}

/** 빈 슬롯에서 시작 — 초상화·기술·능력치 분배는 전부 플레이어의 몫 */
function makeDraft(slot: PartySlot, idx: number): Draft {
  return {
    slot,
    portrait: idx * 12 + 1, // 겹치지 않게 시작 위치만 분산
    classId: BASE_CLASSES[0],
    skills: [],
    attrs: {
      might: ATTR_BASE, int: ATTR_BASE, wit: ATTR_BASE,
      vital: ATTR_BASE, agi: ATTR_BASE, fortune: ATTR_BASE,
    },
  };
}

function spent(d: Draft): number {
  return ATTR_IDS.reduce((s, k) => s + d.attrs[k], 0) - ATTR_IDS.length * ATTR_BASE;
}
function remaining(d: Draft): number { return CREATE_POINTS - spent(d); }

/** 클래스 기본 기술과 빛/어둠(각성 전용)을 제외한 선택 풀 */
function skillPool(cls: ClassId): SkillId[] {
  const base = CLASSES[cls].ranks ?? {};
  return (Object.keys(SKILLS) as SkillId[])
    .filter((k) => k !== "light" && k !== "dark" && !(k in base));
}

function draftReady(d: Draft): boolean {
  return d.skills.length === CREATE_SKILL_PICKS && remaining(d) === 0;
}

export function createScene(): SceneHandle {
  setModeBadge("모험단 결성", C.border);
  const root = new PIXI.Container(); sceneRoot.addChild(root);

  /* 배경 */
  const bg = new PIXI.Graphics();
  bg.rect(0, 0, W, H).fill(0x100d1e);
  for (let i = 0; i < 90; i++)
    bg.circle(Math.random() * W, Math.random() * H, Math.random() * 1.5)
      .fill({ color: 0xffffff, alpha: 0.1 + Math.random() * 0.4 });
  root.addChild(bg);

  const title = txt("모험단 결성", 34, C.border, { serif: true, shadow: true });
  title.x = 44; title.y = 26; root.addChild(title);
  const sub = txt("네 명의 모험가를 준비하세요 — 초상화 · 직업 · 추가 기술 · 능력치", 14, C.dim);
  sub.x = 46; sub.y = 74; root.addChild(sub);

  const drafts: Draft[] = PARTY_SLOTS.map(makeDraft);
  let sel = 0;

  /* 메인 패널 + 동적 컨테이너 */
  const P = { x: 40, y: 100, w: 1010, h: 540 };
  const mainP = panel(P.w, P.h); mainP.x = P.x; mainP.y = P.y; root.addChild(mainP);
  const dyn = new PIXI.Container(); root.addChild(dyn);
  const slots = new PIXI.Container(); root.addChild(slots);

  /* 출발 버튼 */
  const startBtn = button("모험을 떠난다", 280, 50, confirm, { size: 18, border: C.border });
  startBtn.x = P.x + P.w - 290; startBtn.y = H - 66; root.addChild(startBtn);
  const hintT = txt("", 13, C.dim, { wrap: 640 });
  hintT.x = P.x + 8; hintT.y = H - 52; root.addChild(hintT);

  function refreshStart(): void {
    const ok = drafts.every(draftReady);
    startBtn.setDisabled(!ok);
    hintT.text = ok
      ? "준비 완료 — 황혼의 숲이 기다린다."
      : "모든 멤버의 추가 기술 2개 선택과 능력치 분배(남은 포인트 0)를 마치면 출발할 수 있다.";
  }

  /* ---- 우측 멤버 슬롯 ---- */
  function renderSlots(): void {
    slots.removeChildren().forEach((c) => c.destroy({ children: true }));
    drafts.forEach((d, i) => {
      const c = new PIXI.Container();
      const active = i === sel;
      const g = panel(150, 122, {
        fill: active ? C.panelHi : C.panel,
        border: active ? C.border : 0x555068,
        borderAlpha: active ? 1 : 0.6,
      });
      c.addChild(g);
      const tex = portraitTexture(d.portrait);
      if (tex) {
        const sp = new PIXI.Sprite(tex);
        sp.width = 72; sp.height = 72; sp.x = (150 - 72) / 2; sp.y = 8;
        c.addChild(sp);
        const fr = new PIXI.Graphics();
        fr.rect(sp.x, sp.y, 72, 72).stroke({ width: 2, color: active ? C.border : 0x555068, alpha: 0.9 });
        c.addChild(fr);
      }
      const ready = draftReady(d);
      const nm = txt(`${d.slot.name} ${ready ? "✓" : ""}`, 14, ready ? C.text : C.dim, { weight: "700" });
      nm.anchor.set(0.5, 0); nm.x = 75; nm.y = 84; c.addChild(nm);
      const cl = txt(CLASSES[d.classId].name, 12, active ? C.border : C.dim);
      cl.anchor.set(0.5, 0); cl.x = 75; cl.y = 102; c.addChild(cl);
      c.x = W - 170; c.y = 100 + i * 134;
      c.alpha = active ? 1 : 0.75;
      c.eventMode = "static"; c.cursor = "pointer";
      c.on("pointertap", () => { sel = i; refreshAll(); });
      slots.addChild(c);
    });
  }

  /* ---- 메인 편집 영역 ---- */
  function renderMain(): void {
    dyn.removeChildren().forEach((c) => c.destroy({ children: true }));
    const d = drafts[sel];
    const bx = P.x + 30, by = P.y + 20;

    /* 이름 */
    const nameT = txt(d.slot.name, 24, C.border, { serif: true });
    nameT.x = bx; nameT.y = by; dyn.addChild(nameT);

    /* -- 초상화 -- */
    const pY = by + 52;
    const tex = portraitTexture(d.portrait);
    if (tex) {
      const sp = new PIXI.Sprite(tex);
      sp.width = 144; sp.height = 144; sp.x = bx + 32; sp.y = pY;
      dyn.addChild(sp);
      const fr = new PIXI.Graphics();
      fr.rect(sp.x - 3, sp.y - 3, 150, 150).stroke({ width: 3, color: C.border, alpha: 0.85 });
      dyn.addChild(fr);
    }
    const cyc = (dir: number) => {
      d.portrait = ((d.portrait - 1 + dir + PORTRAIT_COUNT) % PORTRAIT_COUNT) + 1;
      refreshAll();
    };
    const prev = button("◀", 44, 34, () => cyc(-1), { size: 15 });
    prev.x = bx + 32; prev.y = pY + 156; dyn.addChild(prev);
    const next = button("▶", 44, 34, () => cyc(+1), { size: 15 });
    next.x = bx + 132; next.y = pY + 156; dyn.addChild(next);
    const cnt = txt(`${PORTRAITS[d.portrait - 1]} (${d.portrait}/${PORTRAIT_COUNT})`, 12, C.dim, { align: "center" });
    cnt.anchor.set(0.5); cnt.x = bx + 104; cnt.y = pY + 173; dyn.addChild(cnt);

    /* -- 직업 -- */
    const cTitle = txt("직 업", 16, C.border, { weight: "700" });
    cTitle.x = bx; cTitle.y = pY + 210; dyn.addChild(cTitle);
    BASE_CLASSES.forEach((cid, i) => {
      const active = d.classId === cid;
      const b = button(CLASSES[cid].name, 100, 40, () => {
        if (d.classId === cid) return;
        d.classId = cid;
        /* 새 직업의 기본 기술과 겹치는 선택은 해제 */
        const base = CLASSES[cid].ranks ?? {};
        d.skills = d.skills.filter((s) => !(s in base));
        refreshAll();
      }, {
        size: 15,
        fill: active ? C.panelHi : 0x181428,
        border: active ? C.border : 0x555068,
        color: active ? C.text : C.dim,
      });
      b.x = bx + i * 110; b.y = pY + 240; dyn.addChild(b);
    });
    const cd = CLASSES[d.classId];
    const baseSkills = Object.keys(cd.ranks ?? {})
      .map((k) => SKILLS[k as SkillId].name).join(" · ");
    const cDesc = txt(`${cd.desc}\n기본 기술: ${baseSkills}`, 12, C.dim, { wrap: 230, lh: 18 });
    cDesc.x = bx; cDesc.y = pY + 290; dyn.addChild(cDesc);

    /* -- 추가 기술 -- */
    const sx = P.x + 330;
    const sTitle = txt(`추가 기술  (${d.skills.length}/${CREATE_SKILL_PICKS} 선택)`, 16, C.border, { weight: "700" });
    sTitle.x = sx; sTitle.y = by + 46; dyn.addChild(sTitle);
    const pool = skillPool(d.classId);
    pool.forEach((k, i) => {
      const on = d.skills.includes(k);
      const col = i % 2, row = (i / 2) | 0;
      const b = button(`${SKILLS[k].name}`, 148, 36, () => {
        if (on) d.skills = d.skills.filter((s) => s !== k);
        else if (d.skills.length >= CREATE_SKILL_PICKS) {
          toast(`추가 기술은 ${CREATE_SKILL_PICKS}개까지만 고를 수 있다.`, C.dim);
          return;
        } else d.skills.push(k);
        refreshAll();
      }, {
        size: 14,
        fill: on ? 0x2f4630 : 0x181428,
        border: on ? C.green : 0x555068,
        color: on ? C.text : C.dim,
      });
      b.x = sx + col * 158; b.y = by + 82 + row * 44; dyn.addChild(b);
      const cat = txt(SKILLS[k].cat, 10, C.dim);
      cat.x = b.x + 118; cat.y = b.y + 3; cat.alpha = 0.7; dyn.addChild(cat);
    });

    /* -- 능력치 -- */
    const ax = P.x + 690;
    const rem = remaining(d);
    const aTitle = txt(`능력치  (남은 포인트 ${rem})`, 16, rem > 0 ? C.elite : C.border, { weight: "700" });
    aTitle.x = ax; aTitle.y = by + 46; dyn.addChild(aTitle);
    ATTR_IDS.forEach((k, i) => {
      const y = by + 84 + i * 56;
      const nm = txt(`${ATTRS[k].name}`, 15, C.text, { weight: "700" });
      nm.x = ax; nm.y = y; dyn.addChild(nm);
      const ab = txt(ATTRS[k].abbr, 11, C.dim);
      ab.x = ax + 52; ab.y = y + 4; dyn.addChild(ab);
      const de = txt(ATTRS[k].desc, 11, C.dim, { wrap: 190 });
      de.x = ax; de.y = y + 22; de.alpha = 0.8; dyn.addChild(de);
      const val = txt(String(d.attrs[k]), 18, C.border, { weight: "900", align: "center" });
      val.anchor.set(0.5, 0); val.x = ax + 218; val.y = y; dyn.addChild(val);
      const minus = button("−", 32, 32, () => {
        if (d.attrs[k] <= ATTR_MIN) return;
        d.attrs[k]--; refreshAll();
      }, { size: 16 });
      minus.x = ax + 244; minus.y = y - 3; dyn.addChild(minus);
      if (d.attrs[k] <= ATTR_MIN) minus.setDisabled(true);
      const plus = button("+", 32, 32, () => {
        if (remaining(d) <= 0 || d.attrs[k] >= ATTR_MAX) return;
        d.attrs[k]++; refreshAll();
      }, { size: 16 });
      plus.x = ax + 282; plus.y = y - 3; dyn.addChild(plus);
      if (remaining(d) <= 0 || d.attrs[k] >= ATTR_MAX) plus.setDisabled(true);
    });
    const prev2 = txt(
      `→ 시작 시  HP ${maxHpOf(d.attrs)}   MP ${maxMpOf(d.attrs)}`,
      13, C.text);
    prev2.x = ax; prev2.y = by + 84 + 6 * 56; dyn.addChild(prev2);
  }

  function refreshAll(): void {
    renderSlots(); renderMain(); refreshStart();
  }
  refreshAll();

  /* ---- 완료 ---- */
  let started = false;
  function confirm(): void {
    if (started || !drafts.every(draftReady)) return;
    started = true;
    const configs: CreationConfig[] = drafts.map((d) => ({
      slotId: d.slot.id,
      portrait: d.portrait,
      classId: d.classId,
      bonusSkills: d.skills,
      attrs: { ...d.attrs },
    }));
    newGame(configs);
    fullFlash(0x000000, 600, () => nav.intro());
  }

  return {
    onKey: (k) => {
      if (k === "ArrowLeft") { drafts[sel].portrait = ((drafts[sel].portrait - 2 + PORTRAIT_COUNT) % PORTRAIT_COUNT) + 1; refreshAll(); }
      if (k === "ArrowRight") { drafts[sel].portrait = (drafts[sel].portrait % PORTRAIT_COUNT) + 1; refreshAll(); }
      if (k === "ArrowUp") { sel = (sel + drafts.length - 1) % drafts.length; refreshAll(); }
      if (k === "ArrowDown") { sel = (sel + 1) % drafts.length; refreshAll(); }
      if (k === "Enter") confirm();
    },
  };
}
