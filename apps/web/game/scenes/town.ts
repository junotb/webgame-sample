/* =====================================================================
 * scenes/town.ts — 마을 모드 (Farland Tactics식 시설 선택)
 * ===================================================================== */
import * as PIXI from "pixi.js";
import {
  CLASSES, ClassId, GearDef, SHOP_ARMORS, SHOP_ITEMS, SHOP_WEAPONS, SKILLS,
} from "../data";
import {
  C, H, SceneHandle, W, button, fullFlash, nav, overlayRoot, panel,
  sceneRoot, setModeBadge, toast, tween, txt, ui,
} from "../core";
import {
  G, Member, canClassChange, classOptions, doClassChange,
} from "../state";
import { buildPartyHUD, pickMember } from "../hud";

export function townScene(): SceneHandle {
  setModeBadge("마을 모드 — 리븐홀드", C.border);
  const root = new PIXI.Container(); sceneRoot.addChild(root);

  /* --- 배경 --- */
  const sky = new PIXI.Graphics();
  sky.rect(0, 0, W, H * 0.62).fill(0x171230);
  sky.rect(0, H * 0.62, W, H * 0.38).fill(0x0f0c1e);
  sky.circle(1080, 110, 44).fill({ color: 0xe8dcc0, alpha: 0.9 });
  sky.circle(1062, 98, 38).fill(0x171230);
  for (let i = 0; i < 70; i++) {
    sky.circle(Math.random() * W, Math.random() * H * 0.5, Math.random() * 1.6)
      .fill({ color: 0xffffff, alpha: 0.25 + Math.random() * 0.5 });
  }
  root.addChild(sky);
  const ground = new PIXI.Graphics();
  ground.rect(0, H * 0.62, W, H * 0.38).fill(0x241d38);
  for (let i = 0; i < 26; i++) ground.ellipse(60 + i * 50, H * 0.62 + 8 + (i % 3) * 4, 26, 5);
  ground.fill({ color: 0x2e2648, alpha: 0.6 });
  root.addChild(ground);

  const title = txt("변경 마을  리븐홀드", 34, C.border, { serif: true, shadow: true });
  title.x = 60; title.y = 56; root.addChild(title);
  const sub = txt("부서진 왕국의 마지막 등불. 시설을 선택하세요.", 15, C.dim);
  sub.x = 62; sub.y = 104; root.addChild(sub);

  /* --- 시설 건물 --- */
  const facilities = [
    { id: "weapon", label: "무기점",      x: 120, color: 0x6a4a3a, icon: "sword" },
    { id: "armorS", label: "방어구점",    x: 330, color: 0x4a5a6a, icon: "shield" },
    { id: "item",   label: "도구점",      x: 540, color: 0x5a6a4a, icon: "flask" },
    { id: "inn",    label: "여관",        x: 750, color: 0x6a5a3a, icon: "bed" },
    { id: "guild",  label: "모험가 길드", x: 960, color: 0x4a3a5a, icon: "flag" },
  ] as const;
  facilities.forEach((f) => {
    const c = new PIXI.Container();
    const g = new PIXI.Graphics();
    g.roundRect(0, 60, 180, 150, 6).fill(f.color);
    g.moveTo(-14, 64).lineTo(90, 0).lineTo(194, 64).closePath().fill(0x14101f);
    g.roundRect(0, 60, 180, 150, 6).stroke({ width: 2, color: C.border, alpha: 0.35 });
    g.roundRect(70, 140, 44, 70, 4).fill(0x0d0a16);
    g.rect(24, 96, 28, 26).rect(130, 96, 28, 26).fill({ color: 0xe8b84a, alpha: 0.8 });
    c.addChild(g);
    const ic = new PIXI.Graphics();
    if (f.icon === "sword") { ic.rect(-3, -26, 6, 40).fill(C.text); ic.rect(-12, 10, 24, 6).fill(C.border); }
    if (f.icon === "shield") { ic.roundRect(-14, -18, 28, 34, 10).fill(C.text); ic.roundRect(-9, -13, 18, 24, 7).fill(f.color); }
    if (f.icon === "flask") {
      ic.moveTo(-4, -20).lineTo(4, -20).lineTo(4, -6).lineTo(14, 16).lineTo(-14, 16).lineTo(-4, -6).closePath().fill({ color: C.text, alpha: 0.9 });
      ic.moveTo(-9, 6).lineTo(9, 6).lineTo(14, 16).lineTo(-14, 16).closePath().fill(0x8f5fd0);
    }
    if (f.icon === "bed") { ic.roundRect(-16, -2, 32, 14, 4).fill(C.text); ic.circle(-9, -6, 6).fill(C.border); }
    if (f.icon === "flag") { ic.rect(-2, -24, 4, 44).fill(C.text); ic.moveTo(2, -24).lineTo(26, -16).lineTo(2, -8).closePath().fill(C.boss); }
    ic.x = 90; ic.y = 36; c.addChild(ic);
    const lb = txt(f.label, 17, C.text, { weight: "700", shadow: true });
    lb.anchor.set(0.5, 0); lb.x = 90; lb.y = 216; c.addChild(lb);
    c.x = f.x; c.y = 300;
    c.eventMode = "static"; c.cursor = "pointer";
    c.on("pointerover", () => tween(c, { y: 292 }, 120));
    c.on("pointerout", () => tween(c, { y: 300 }, 120));
    c.on("pointertap", () => openFacility(f.id));
    root.addChild(c);
  });

  const gate = button("성문 밖으로 — 황혼의 숲 (탐험)", 320, 52,
    () => fullFlash(0x000000, 500, () => nav.explore()),
    { size: 17, border: C.green });
  gate.x = W / 2 - 160; gate.y = H - 84; root.addChild(gate);

  const hud = buildPartyHUD(root);

  /* ---------- 시설 ---------- */
  let shopOpen = false;
  function openFacility(id: string): void {
    if (shopOpen || ui.menuOpen) return;
    if (id === "weapon") openShop("무기점 — 담금질한 강철", SHOP_WEAPONS, "weapon");
    if (id === "armorS") openShop("방어구점 — 견고한 수호", SHOP_ARMORS, "armor");
    if (id === "item") openShop("도구점 — 여행자의 벗", SHOP_ITEMS, "item");
    if (id === "inn") inn();
    if (id === "guild") openGuild();
  }

  function openShop(shopTitle: string, goods: GearDef[], kind: "weapon" | "armor" | "item"): void {
    shopOpen = true;
    const rootS = new PIXI.Container(); rootS.zIndex = 60; overlayRoot.addChild(rootS);
    const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
    dim.eventMode = "static"; rootS.addChild(dim);
    const ph = 160 + goods.length * 64;
    const p = panel(660, ph); p.x = (W - 660) / 2; p.y = (H - ph) / 2; rootS.addChild(p);
    const tt = txt(shopTitle, 24, C.border, { serif: true }); tt.x = p.x + 26; tt.y = p.y + 18; rootS.addChild(tt);
    const goldT = txt("", 15, C.text); goldT.x = p.x + 26; goldT.y = p.y + 56; rootS.addChild(goldT);
    function refresh(): void { goldT.text = `소지금 ${G.gold} G`; hud.redraw(); }
    refresh();
    goods.forEach((it, i) => {
      const y = p.y + 92 + i * 64;
      const desc = kind === "weapon" ? `공격 +${it.atk}` : kind === "armor" ? `방어 +${it.def}` : it.desc ?? "";
      const nameT = txt(`${it.name}  —  ${desc}`, 15, C.text, { wrap: 430 });
      nameT.x = p.x + 26; nameT.y = y + 10; rootS.addChild(nameT);
      const b = button(`${it.price} G`, 130, 42, () => {
        if (G.gold < it.price) return toast("골드가 부족하다.", C.dim);
        if (kind === "item") {
          G.gold -= it.price;
          if (it.id === "potion") G.items.potion++;
          else G.items.mpotion++;
          toast(`${it.name} 구입.`); refresh();
          return;
        }
        // 장비: 장착할 멤버 선택
        pickMember(`${it.name} — 누구에게 장착할까?`, (m) => {
          G.gold -= it.price;
          if (kind === "weapon") m.weapon = { name: it.name, atk: it.atk ?? 0 };
          else m.armor = { name: it.name, def: it.def ?? 0 };
          toast(`${m.name}에게 ${it.name} 장착!`); refresh();
        }, { note: (m) => kind === "weapon" ? `(${m.weapon.name})` : `(${m.armor.name})` });
      }, { size: 15 });
      b.x = p.x + 660 - 160; b.y = y; rootS.addChild(b);
    });
    const closeBtn = button("나가기", 110, 40, () => { shopOpen = false; rootS.destroy({ children: true }); }, { size: 15 });
    closeBtn.x = p.x + 660 - 136; closeBtn.y = p.y + ph - 56; rootS.addChild(closeBtn);
  }

  function inn(): void {
    if (G.gold < 30) return toast("숙박비 30 G가 부족하다.", C.dim);
    G.gold -= 30;
    G.party.forEach((m) => { m.hp = m.maxHp; m.mp = m.maxMp; });
    hud.redraw();
    fullFlash(0x000000, 900, () => toast("파티가 푹 쉬었다. 전원 HP/MP 회복!", C.text));
  }

  /* ---------- 길드: 퀘스트 + 멤버별 전직 ---------- */
  function openGuild(): void {
    shopOpen = true;
    const rootS = new PIXI.Container(); rootS.zIndex = 60; overlayRoot.addChild(rootS);
    const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
    dim.eventMode = "static"; rootS.addChild(dim);
    const p = panel(860, 560); p.x = (W - 860) / 2; p.y = (H - 560) / 2; rootS.addChild(p);
    const content = new PIXI.Container(); rootS.addChild(content);
    const closeBtn = button("나가기", 110, 40, close, { size: 15 });
    closeBtn.x = p.x + 860 - 136; closeBtn.y = p.y + 560 - 56; rootS.addChild(closeBtn);

    function clear(): void { content.removeChildren().forEach((c) => c.destroy({ children: true })); }
    function header(t: string): void {
      const tt = txt(t, 24, C.border, { serif: true }); tt.x = p.x + 28; tt.y = p.y + 18; content.addChild(tt);
    }

    function main(): void {
      clear(); header("모험가 길드");
      let quest: string;
      if (!G.explore.defeated.lord)
        quest = "의뢰: 황혼의 숲 깊은 곳, [숲의 군주 그림바크]를 토벌하라.\n(1차 전직 Lv3 / 2차 전직 Lv6 — 멤버별로 진행)";
      else if (!G.explore.defeated.ancient)
        quest = "숲의 군주는 쓰러졌다… 하지만 숲 안쪽에서 고대의 기척이 깨어났다.\n[에픽] 고대 정령 아스테리온이 기다린다.";
      else
        quest = "모든 의뢰 완수. 네 사람의 이름은 이 프로토타입의 전설이다.";
      const q = txt(quest, 16, C.text, { lh: 26, wrap: 800 });
      q.x = p.x + 28; q.y = p.y + 64; content.addChild(q);

      const st = txt("— 전직 상담 (멤버 선택) —", 16, C.border, { weight: "700" });
      st.x = p.x + 28; st.y = p.y + 150; content.addChild(st);
      G.party.forEach((m, i) => {
        const cc = canClassChange(m);
        const tier = CLASSES[m.classId].tier;
        const label = `${m.name} — ${CLASSES[m.classId].name} Lv.${m.level}` +
          (cc ? (cc === "t1" ? "  ▶ 1차 전직 가능" : "  ▶ 2차 전직 가능")
            : tier === 2 ? "  (최종 클래스)" : tier === 0 ? "  (Lv3 필요)" : "  (Lv6 필요)");
        const b = button(label, 560, 48, () => memberPage(m), { size: 15 });
        if (!cc) b.setDisabled(true);
        b.x = p.x + 28; b.y = p.y + 186 + i * 58; content.addChild(b);
      });
      const note = txt("달인의 경지는 되돌릴 수 없다. 신중히 고르게.", 13, C.dim);
      note.x = p.x + 28; note.y = p.y + 560 - 52; content.addChild(note);
    }

    function memberPage(m: Member): void {
      clear(); header(`${m.name}의 갈림길`);
      const opts = classOptions(m);
      const intro = txt(
        CLASSES[m.classId].tier === 0
          ? "물리의 길인가, 마법의 길인가 — 1차 전직은 네 갈래일세."
          : `${CLASSES[m.classId].name}의 길 끝에 두 개의 문이 있네.`,
        15, C.text);
      intro.x = p.x + 28; intro.y = p.y + 62; content.addChild(intro);
      opts.forEach((cid, i) => {
        const c = CLASSES[cid];
        const mTag = c.masters
          ? c.masters.map((s) => (s === "LD" ? "빛or어둠" : SKILLS[s].name)).join("·") + " 달인"
          : c.desc;
        const b = button(`${c.name} — ${mTag}`, 560, 48, () => {
          if (c.ld) ldPage(m, cid);
          else { doClassChange(m, cid); done(m, cid); }
        }, { size: 15 });
        b.x = p.x + 28; b.y = p.y + 104 + i * 58; content.addChild(b);
        const d = txt(c.desc, 13, C.dim, { wrap: 780 });
        d.x = p.x + 620; d.y = p.y + 104 + i * 58 + 14; content.addChild(d);
      });
      const back = button("← 돌아가기", 130, 40, main, { size: 14 });
      back.x = p.x + 28; back.y = p.y + 560 - 60; content.addChild(back);
    }

    function ldPage(m: Member, cid: ClassId): void {
      clear(); header("빛과 어둠의 기로");
      const t = txt(
        `${CLASSES[cid].name}의 길은 신앙의 선택을 요구하네.\n선택한 계열이 달인/숙련의 경지로 각성한다.`,
        16, C.text, { lh: 26 });
      t.x = p.x + 28; t.y = p.y + 64; content.addChild(t);
      const bl = button("빛의 길 — 성광과 축복", 340, 52, () => { doClassChange(m, cid, "light"); done(m, cid); }, { size: 16 });
      bl.x = p.x + 28; bl.y = p.y + 150; content.addChild(bl);
      const bd = button("어둠의 길 — 암흑과 흡수", 340, 52, () => { doClassChange(m, cid, "dark"); done(m, cid); }, { size: 16 });
      bd.x = p.x + 28; bd.y = p.y + 214; content.addChild(bd);
      const back = button("← 돌아가기", 130, 40, () => memberPage(m), { size: 14 });
      back.x = p.x + 28; back.y = p.y + 560 - 60; content.addChild(back);
    }

    function done(m: Member, cid: ClassId): void {
      toast(`${m.name}, [${CLASSES[cid].name}] (으)로 전직!`, C.border);
      hud.redraw();
      main();
    }
    main();
    function close(): void { shopOpen = false; rootS.destroy({ children: true }); }
  }

  return {};
}
