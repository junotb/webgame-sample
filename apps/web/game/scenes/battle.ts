/* =====================================================================
 * scenes/battle.ts — 전투 연출/입력 (로직은 core/battle-engine.ts)
 * 엔진이 뱉는 BattleEvent를 순서대로 연출하고, 아군 턴에 입력을 받는다.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import { CLASSES, RANK_NAME } from "../defs";
import {
  C, H, SceneHandle, W, button, fullFlash, nav, panel, sceneRoot,
  setModeBadge, toast, tween, tweenP, txt, waitP,
} from "../core";
import { BattleAbility, G, gainExpParty, memberAbilities, partyFortune, partyRank } from "../state";
import {
  AllyAction, BASIC_ATTACK, BattleEngine, BattleEvent, BattleResult, EngineAlly, UnitId,
} from "../core/battle-engine";
import { questNotify, updateText } from "../core/quests";
import { drawAdventurer, drawMonster } from "../monsters";

export interface BattleOpts { symbol?: "orc" | "lord" | "ancient"; }

type BattleNode = PIXI.Container & { baseX?: number; baseY?: number };

/** 씬 진행 단계 — 판별 유니온으로 대기 중인 선택을 함께 담는다 */
type Phase =
  | { t: "idle" }
  | { t: "player" }
  | { t: "anim" }
  | { t: "end" }
  | { t: "target"; ability: BattleAbility }
  | {
      t: "allytarget";
      sel:
        | { kind: "heal" | "cover"; ability: BattleAbility }
        | { kind: "item"; item: "potion" | "mpotion" };
    };

export function battleScene(groupIds: string[], opts: BattleOpts = {}): SceneHandle {
  setModeBadge("전투 모드", C.blood);
  const root = new PIXI.Container(); sceneRoot.addChild(root);

  const engine = new BattleEngine(G.party, groupIds, { bless: G.blessedNext, items: G.items });
  G.blessedNext = false;
  const tierOf = engine.tier;
  const showEnemyHp = partyRank("identify") >= 1;

  /* 배경 */
  const bg = new PIXI.Graphics();
  bg.rect(0, 0, W, H).fill(0x120f22);
  bg.ellipse(W / 2, 470, 560, 130).fill(0x1c1636);
  bg.ellipse(W / 2, 470, 560, 130).ellipse(W / 2, 470, 440, 100).stroke({ width: 1, color: C.border, alpha: 0.15 });
  for (let i = 0; i < 40; i++)
    bg.circle(Math.random() * W, Math.random() * 260, 1.2)
      .fill({ color: 0xffffff, alpha: 0.15 + Math.random() * 0.3 });
  root.addChild(bg);

  /* 로그 */
  const logP = panel(W - 320, 46, { alpha: 0.85 }); logP.x = 20; logP.y = 14; root.addChild(logP);
  const logT = txt("", 16, C.text); logT.x = 36; logT.y = 26; root.addChild(logT);
  const log = (s: string) => { logT.text = s; };

  /* ---- 적 유닛 비주얼 ---- */
  interface EnemyVis { node: BattleNode; ring: PIXI.Graphics; redraw: () => void; }
  const enemyVis = new Map<UnitId, EnemyVis>();
  engine.enemies.forEach((u, i) => {
    const d = u.def;
    const node = new PIXI.Container() as BattleNode;
    node.addChild(drawMonster(d, d.big ?? 1));
    const n = engine.enemies.length;
    const cx = W * 0.66 + (i - (n - 1) / 2) * 170;
    const cy = 430 + (i % 2) * 40;
    node.x = cx; node.y = cy; node.baseX = cx; node.baseY = cy;
    const tierCol = d.tier === "정예" ? C.elite : d.tier === "보스" ? C.boss : d.tier === "에픽" ? C.epic : C.text;
    const nm = txt(d.name, 14, tierCol, { weight: "700", shadow: true });
    nm.anchor.set(0.5); nm.y = 26; node.addChild(nm);
    const barBG = new PIXI.Graphics(); node.addChild(barBG);
    const hpT = txt("", 12, C.dim, { shadow: true }); hpT.anchor.set(0.5); hpT.y = 58; node.addChild(hpT);
    const ring = new PIXI.Graphics();
    ring.ellipse(0, 10, 70 * (d.big ?? 1), 20).stroke({ width: 3, color: C.border, alpha: 0.9 });
    ring.visible = false; node.addChildAt(ring, 0);
    const redraw = () => {
      barBG.clear();
      barBG.roundRect(-46, 42, 92, 9, 4).fill({ color: 0x000000, alpha: 0.6 });
      barBG.roundRect(-46, 42, 92 * Math.max(0, u.hp / u.maxHp), 9, 4)
        .fill(d.tier === "일반" ? C.hp : tierCol);
      hpT.text = showEnemyHp ? `${u.hp} / ${u.maxHp}` : "";
    };
    node.eventMode = "static"; node.cursor = "pointer";
    node.on("pointertap", () => onEnemyTap(u.id));
    root.addChild(node);
    enemyVis.set(u.id, { node, ring, redraw });
    redraw();
  });

  /* ---- 파티 유닛 비주얼 (좌측 4열 대형) ---- */
  const ALLY_POS = [
    { x: 292, y: 356 }, { x: 236, y: 442 }, { x: 300, y: 528 }, { x: 244, y: 614 },
  ];
  interface AllyVis { node: BattleNode; ring: PIXI.Graphics; turnMark: PIXI.Graphics; }
  const allyVis = new Map<UnitId, AllyVis>();
  engine.allies.forEach((u, i) => {
    const node = new PIXI.Container() as BattleNode;
    node.addChild(drawAdventurer(u.m.color, u.m.accent, 1.7));
    node.x = ALLY_POS[i].x; node.y = ALLY_POS[i].y;
    node.baseX = node.x; node.baseY = node.y;
    const ring = new PIXI.Graphics();
    ring.ellipse(0, 4, 34, 12).stroke({ width: 3, color: C.green, alpha: 0.9 });
    ring.visible = false; node.addChildAt(ring, 0);
    const turnMark = new PIXI.Graphics();
    turnMark.moveTo(-8, -104).lineTo(8, -104).lineTo(0, -90).closePath().fill(C.border);
    turnMark.visible = false; node.addChild(turnMark);
    node.eventMode = "static"; node.cursor = "pointer";
    node.on("pointertap", () => onAllyTap(u.id));
    root.addChild(node);
    if (u.m.hp <= 0) node.alpha = 0.35;
    allyVis.set(u.id, { node, ring, turnMark });
  });

  const nodeOf = (id: UnitId): BattleNode | undefined =>
    enemyVis.get(id)?.node ?? allyVis.get(id)?.node;
  const isAllyId = (id: UnitId) => id.startsWith("ally");
  const nameOf = (id: UnitId): string => {
    const u = engine.unit(id);
    if (!u) return "?";
    return u.kind === "ally" ? u.m.name : u.def.name.slice(0, 6);
  };

  /* ---- 파티 상태 패널 ---- */
  const pp = panel(330, 150, { alpha: 0.94 }); pp.x = 20; pp.y = H - 168; root.addChild(pp);
  const rowsG = new PIXI.Graphics(); root.addChild(rowsG);
  const rowTs = engine.allies.map((_, i) => {
    const t = txt("", 13, C.text, { weight: "700" });
    t.x = 38; t.y = H - 158 + i * 34; root.addChild(t);
    return t;
  });
  function redrawParty(): void {
    rowsG.clear();
    engine.allies.forEach((u, i) => {
      const m = u.m;
      const y = H - 158 + i * 34;
      rowTs[i].text = `${m.name}${engine.hasStatus(u.id, "guard") ? " [방어]" : ""}`;
      rowTs[i].style.fill = m.hp > 0 ? C.text : C.dim;
      const bx = 150, bw = 180;
      rowsG.roundRect(bx, y + 3, bw, 8, 4).fill({ color: 0x000000, alpha: 0.6 });
      rowsG.roundRect(bx, y + 3, bw * Math.max(0, m.hp / m.maxHp), 8, 4)
        .fill(m.hp > 0 ? C.hp : 0x553333);
      rowsG.roundRect(bx, y + 14, bw, 6, 3).fill({ color: 0x000000, alpha: 0.6 });
      rowsG.roundRect(bx, y + 14, bw * Math.max(0, m.mp / m.maxMp), 6, 3).fill(C.mp);
      const v = allyVis.get(u.id);
      if (v && !v.node.destroyed) v.node.alpha = m.hp > 0 ? 1 : 0.35;
    });
  }
  redrawParty();

  /* 턴 순서 바 */
  const orderT = txt("", 14, C.dim); orderT.x = 24; orderT.y = 70; root.addChild(orderT);

  /* ---- 커맨드 UI ---- */
  const cmdRoot = new PIXI.Container(); root.addChild(cmdRoot);
  let subRoot: PIXI.Container | null = null;
  let actUnit: EngineAlly | null = null;
  let phase: Phase = { t: "idle" };

  const cmdName = txt("", 16, C.border, { weight: "700" });
  cmdName.x = 380; cmdName.y = H - 108; cmdRoot.addChild(cmdName);
  const CMDS: { label: string; fn: () => void }[] = [
    { label: "공격", fn: () => pickTarget(BASIC_ATTACK) },
    { label: "스킬", fn: () => openSkillMenu() },
    { label: "방어", fn: () => { void submit({ type: "guard" }); } },
    { label: "아이템", fn: () => openItemMenu() },
    { label: "도망", fn: () => { void submit({ type: "flee" }); } },
  ];
  const cmdBtns = CMDS.map((c, i) => {
    const b = button(c.label, 150, 48, () => { if (phase.t === "player") c.fn(); }, { size: 17 });
    b.x = 380 + i * 160; b.y = H - 72; cmdRoot.addChild(b);
    if (c.label === "도망" && !engine.canFlee) b.setDisabled(true);
    return b;
  });
  void cmdBtns;
  function showCmds(v: boolean): void { cmdRoot.visible = v; }
  function closeSub(): void { if (subRoot) { subRoot.destroy({ children: true }); subRoot = null; } }
  function backToPlayer(): void { phase = { t: "player" }; showCmds(true); }

  function openSkillMenu(): void {
    if (!actUnit) return;
    closeSub();
    const abs = memberAbilities(actUnit.m);
    subRoot = new PIXI.Container(); root.addChild(subRoot);
    const rows = Math.max(1, abs.length);
    const p = panel(580, 66 + rows * 50, { alpha: 0.97 });
    p.x = 380; p.y = H - 96 - (66 + rows * 50); subRoot.addChild(p);
    const tt = txt(`${actUnit.m.name}의 스킬 (숙련 단계에 따라 강화)`, 15, C.border, { weight: "700" });
    tt.x = p.x + 18; tt.y = p.y + 12; subRoot.addChild(tt);
    if (!abs.length) {
      const t = txt("사용할 수 있는 스킬이 없다.", 14, C.dim);
      t.x = p.x + 18; t.y = p.y + 46; subRoot.addChild(t);
    }
    abs.forEach((a, i) => {
      const y = p.y + 44 + i * 50;
      const b = button(`${a.name} [${RANK_NAME[a.rank]}]`, 220, 40, () => {
        if (!actUnit || phase.t !== "player") return;
        if (actUnit.m.mp < a.mp || (a.manaBurn && actUnit.m.mp <= 0)) { toast("MP 부족!", C.dim); return; }
        closeSub();
        if (a.cover) pickAllyTarget({ kind: "cover", ability: a });
        else if (a.kind === "heal") pickAllyTarget({ kind: "heal", ability: a });
        else if (a.all) void submit({ type: "ability", ability: a });
        else pickTarget(a);
      }, { size: 14 });
      b.x = p.x + 16; b.y = y; subRoot!.addChild(b);
      const d = txt(`${a.manaBurn ? "MP 전부" : `MP ${a.mp}`} · ${a.desc}`, 13, C.dim);
      d.x = p.x + 250; d.y = y + 11; subRoot!.addChild(d);
    });
    const cb = button("닫기", 80, 34, closeSub, { size: 13 });
    cb.x = p.x + 580 - 96; cb.y = p.y + 10; subRoot.addChild(cb);
  }

  function openItemMenu(): void {
    if (!actUnit) return;
    closeSub();
    subRoot = new PIXI.Container(); root.addChild(subRoot);
    const p = panel(460, 170, { alpha: 0.97 }); p.x = 410; p.y = H - 96 - 170; subRoot.addChild(p);
    const tt = txt("아이템 (사용 후 대상 선택)", 15, C.border, { weight: "700" });
    tt.x = p.x + 18; tt.y = p.y + 12; subRoot.addChild(tt);
    const mk = (label: string, cnt: number, y: number, item: "potion" | "mpotion") => {
      const b = button(`${label} ×${cnt}`, 220, 40, () => {
        closeSub();
        phase = { t: "allytarget", sel: { kind: "item", item } };
        allyVis.forEach((v) => { v.ring.visible = true; });
        log("아이템 — 대상을 선택하세요. (전투불능 포함)");
      }, { size: 14 });
      if (cnt <= 0) b.setDisabled(true);
      b.x = p.x + 18; b.y = y; subRoot!.addChild(b);
    };
    mk("치유 물약 (HP 60)", G.items.potion, p.y + 46, "potion");
    mk("마나 물약 (MP 25)", G.items.mpotion, p.y + 96, "mpotion");
    const cb = button("닫기", 80, 34, closeSub, { size: 13 });
    cb.x = p.x + 460 - 96; cb.y = p.y + 10; subRoot.addChild(cb);
  }

  /* ---- 대상 선택 ---- */
  function pickTarget(a: BattleAbility): void {
    const alive = engine.aliveEnemies();
    if (alive.length === 1) {
      void submit({ type: "ability", ability: a, target: alive[0].id });
      return;
    }
    phase = { t: "target", ability: a };
    log(`${a.name} — 대상을 선택하세요.`);
    engine.aliveEnemies().forEach((e) => { enemyVis.get(e.id)!.ring.visible = true; });
  }
  function pickAllyTarget(sel: { kind: "heal" | "cover"; ability: BattleAbility }): void {
    phase = { t: "allytarget", sel };
    if (sel.kind === "cover") {
      engine.allies.forEach((u) => {
        allyVis.get(u.id)!.ring.visible = u !== actUnit && u.m.hp > 0;
      });
      log(`${sel.ability.name} — 대신 막아줄 파티원을 선택하세요.`);
    } else {
      allyVis.forEach((v) => { v.ring.visible = true; });
      log(`${sel.ability.name} — 회복할 아군을 선택하세요.`);
    }
  }

  function onEnemyTap(id: UnitId): void {
    if (phase.t !== "target") return;
    const e = engine.unit(id);
    if (!e || e.kind !== "enemy" || !e.alive) return;
    const a = phase.ability;
    enemyVis.forEach((v) => { v.ring.visible = false; });
    void submit({ type: "ability", ability: a, target: id });
  }
  function onAllyTap(id: UnitId): void {
    if (phase.t !== "allytarget") return;
    const sel = phase.sel;
    const u = engine.unit(id);
    if (!u || u.kind !== "ally") return;
    allyVis.forEach((v) => { v.ring.visible = false; });
    if (sel.kind === "item") {
      void submit({ type: "item", item: sel.item, target: id });
      return;
    }
    if (sel.kind === "heal" && u.m.hp <= 0) {
      toast("전투불능 상태에는 치유가 닿지 않는다. (물약 필요)", C.dim);
      backToPlayer(); return;
    }
    if (sel.kind === "cover" && (u === actUnit || u.m.hp <= 0)) {
      toast("다른 파티원을 선택해야 한다.", C.dim);
      backToPlayer(); return;
    }
    void submit({ type: "ability", ability: sel.ability, target: id });
  }

  /* ---- 연출 ---- */
  function popDmg(x: number, y: number, s: string | number, color = 0xffffff): void {
    const t = txt(String(s), 26, color, { weight: "900", shadow: true });
    t.anchor.set(0.5); t.x = x; t.y = y; root.addChild(t);
    tween(t, { y: y - 46, alpha: 0 }, 800, { onDone: () => t.destroy() });
  }
  function flash(node: PIXI.Container, color = 0xffffff): void {
    /* Graphics(절차적)와 Sprite(이미지) 모두 틴트 — 몬스터 컨테이너 중첩 포함 */
    const gs: (PIXI.Graphics | PIXI.Sprite)[] = [];
    const walk = (c: PIXI.Container) => c.children.forEach((ch) => {
      if (ch instanceof PIXI.Graphics || ch instanceof PIXI.Sprite) gs.push(ch);
      else if (ch instanceof PIXI.Container) walk(ch);
    });
    walk(node);
    gs.forEach((g) => { g.tint = color; });
    void waitP(120).then(() => gs.forEach((g) => { if (!g.destroyed) g.tint = 0xffffff; }));
  }
  function shake(node: BattleNode): void {
    const bx = node.baseX ?? node.x;
    void tweenP(node, { x: bx + 12 }, 60)
      .then(() => tweenP(node, { x: bx - 10 }, 60))
      .then(() => tweenP(node, { x: bx }, 80));
  }

  /** 엔진 이벤트를 순서대로 연출 */
  async function playEvents(events: BattleEvent[]): Promise<void> {
    for (const ev of events) {
      switch (ev.t) {
        case "round":
          orderT.text = "턴 순서: " + ev.order.map(nameOf).join(" → ");
          break;
        case "turn": {
          allyVis.forEach((v) => { v.turnMark.visible = false; });
          const v = allyVis.get(ev.unit);
          if (v) v.turnMark.visible = true;
          redrawParty();
          break;
        }
        case "log":
          log(ev.text);
          break;
        case "lunge": {
          const n = nodeOf(ev.unit); if (!n) break;
          const ally = isAllyId(ev.unit);
          await tweenP(n, { x: (n.baseX ?? n.x) + (ally ? 70 : -60) }, ally ? 160 : 170);
          break;
        }
        case "return": {
          const n = nodeOf(ev.unit); if (!n) break;
          await tweenP(n, { x: n.baseX ?? n.x }, 200);
          break;
        }
        case "hit": {
          const n = nodeOf(ev.target); if (!n) break;
          if (ev.crit) popDmg(n.x, n.y - 150, "치명타!", C.border);
          const col = ev.mag ? 0xb99cff : isAllyId(ev.target) ? 0xff9090 : 0xffffff;
          popDmg(n.x + (Math.random() * 30 - 15), n.y - 110, ev.amount, col);
          flash(n, 0xff6666); shake(n);
          if (isAllyId(ev.target)) redrawParty();
          else enemyVis.get(ev.target)?.redraw();
          await waitP(200);
          break;
        }
        case "miss": {
          const n = nodeOf(ev.target);
          if (n) popDmg(n.x, n.y - 110, "빗나감!", C.dim);
          break;
        }
        case "save": {
          const n = nodeOf(ev.target);
          if (n) popDmg(n.x, n.y - 130, "저항!", C.epic);
          break;
        }
        case "healed": {
          const n = nodeOf(ev.target);
          if (n) {
            popDmg(n.x, n.y - 110, "+" + ev.amount, ev.resource === "mp" ? C.mp : C.green);
            if (ev.resource === "hp") flash(n, 0x7fdc7f);
          }
          redrawParty();
          await waitP(250);
          break;
        }
        case "drain": {
          const n = nodeOf(ev.unit);
          if (n) popDmg(n.x, n.y - 120, "+" + ev.amount, C.epic);
          redrawParty();
          break;
        }
        case "status": {
          const n = nodeOf(ev.target); if (!n) break;
          if (ev.status === "taunt") popDmg(n.x, n.y - 130, "도발!", C.border);
          else if (ev.status === "silence") popDmg(n.x, n.y - 130, "마법 봉인!", C.epic);
          else if (ev.status === "defdown") popDmg(n.x, n.y - 130, `방어 -${ev.power}!`, C.elite);
          else if (ev.status === "cover") flash(n, 0xffe08a);
          break;
        }
        case "cover": {
          const n = nodeOf(ev.guard);
          if (n) popDmg(n.x, n.y - 130, "가로막기!", C.border);
          break;
        }
        case "death": {
          if (isAllyId(ev.unit)) { redrawParty(); break; }
          const n = nodeOf(ev.unit);
          if (n) tween(n, { alpha: 0, y: (n.baseY ?? n.y) + 20 }, 450);
          /* 퀘스트 처치 카운트 — 도주하더라도 잡은 만큼 인정 */
          const u = engine.unit(ev.unit);
          if (u && u.kind === "enemy")
            questNotify({ t: "kill", defId: u.defId }).forEach((up) => toast(updateText(up), C.border));
          break;
        }
        case "guard":
          redrawParty();
          break;
        case "flee":
          if (ev.ok) await waitP(500);
          break;
        case "end":
          break; // finish()가 처리
      }
    }
  }

  /* ---- 진행 루프 ---- */
  async function advance(): Promise<void> {
    phase = { t: "anim" }; showCmds(false);
    const ts = engine.next();
    await playEvents(ts.events);
    if (ts.kind === "over") { finish(ts.result); return; }
    const u = engine.unit(ts.unit);
    if (!u || u.kind !== "ally") return;
    actUnit = u;
    phase = { t: "player" }; showCmds(true);
    cmdName.text = `▶ ${u.m.name}의 턴 — ${CLASSES[u.m.classId].name}`;
  }
  async function submit(action: AllyAction): Promise<void> {
    if (phase.t === "anim" || phase.t === "end") return;
    phase = { t: "anim" }; showCmds(false); closeSub();
    const res = engine.act(action);
    await playEvents(res.events);
    if (res.kind === "over") { finish(res.result); return; }
    allyVis.forEach((v) => { v.turnMark.visible = false; });
    redrawParty();
    await waitP(300);
    void advance();
  }

  /* ---- 종료 처리 ---- */
  let ended = false;
  function finish(result: BattleResult): void {
    if (ended) return; ended = true;
    phase = { t: "end" }; showCmds(false); closeSub();
    if (result === "fled") { fullFlash(0x000000, 400, () => nav.explore()); return; }
    if (result === "victory") victory();
    else defeat();
  }
  function victory(): void {
    let exp = 0, gold = 0;
    engine.enemies.forEach((e) => { exp += e.def.exp; gold += e.def.gold; });
    G.gold += gold;
    /* 운(Fortune) — 희귀 아이템 획득 판정 */
    let luckyLine = "";
    if (Math.random() < partyFortune() * 0.012) {
      if (Math.random() < 0.5) { G.items.potion++; luckyLine = "행운! 전리품에서 치유 물약을 발견했다."; }
      else { G.items.mpotion++; luckyLine = "행운! 전리품에서 마나 물약을 발견했다."; }
    }
    const ups = gainExpParty(exp);
    /* 쓰러진 멤버는 HP 1로 일어난다 */
    const revived = G.party.filter((m) => m.hp <= 0);
    revived.forEach((m) => { m.hp = 1; });
    let questLines: string[] = [];
    if (opts.symbol) {
      G.explore.defeated[opts.symbol] = true;
      questLines = questNotify({ t: "clear", symbol: opts.symbol }).map(updateText);
    }

    const p = panel(600, 260); p.x = (W - 600) / 2; p.y = 190; p.alpha = 0; root.addChild(p);
    const tt = txt("승 리", 34, C.border, { serif: true });
    tt.anchor.set(0.5, 0); tt.x = W / 2; tt.y = 212; tt.alpha = 0; root.addChild(tt);
    const lines = [
      `파티 전원 경험치 +${exp}    ${gold} G 획득`,
      luckyLine,
      ...questLines,
      ups.length ? `레벨 업!  ${ups.join(" · ")}  (HP/MP 전부 회복)` : "",
      revived.length ? `${revived.map((m) => m.name).join("·")}(이)가 정신을 차렸다. (HP 1)` : "",
    ].filter(Boolean).join("\n\n");
    const body = txt(lines, 17, C.text, { align: "center", lh: 28 });
    body.anchor.set(0.5, 0); body.x = W / 2; body.y = 268; body.alpha = 0; root.addChild(body);
    tween(p, { alpha: 1 }, 350); tween(tt, { alpha: 1 }, 350); tween(body, { alpha: 1 }, 450);
    const b = button("계속", 140, 46, () => {
      if (opts.symbol === "lord" && !G.flags.ending) { G.flags.ending = true; nav.ending(); return; }
      if (opts.symbol === "ancient") { nav.epicClear(); return; }
      fullFlash(0x000000, 400, () => nav.explore());
    }, { size: 17 });
    b.x = (W - 140) / 2; b.y = 372; b.alpha = 0; root.addChild(b);
    tween(b, { alpha: 1 }, 500);
    if (ups.length) toast("레벨 업! 길드에서 전직을 확인해보자. (1차 Lv3 / 2차 Lv6)", C.border);
  }
  function defeat(): void {
    log("파티가 전멸했다…");
    const dim = new PIXI.Graphics();
    dim.rect(0, 0, W, H).fill(0x000000);
    dim.alpha = 0; root.addChild(dim);
    tween(dim, { alpha: 0.75 }, 900, {
      onDone: () => {
        const tt = txt("전 멸", 40, C.blood, { serif: true });
        tt.anchor.set(0.5); tt.x = W / 2; tt.y = 300; root.addChild(tt);
        const b = button("마을에서 눈을 뜬다 (골드 절반 손실)", 380, 50, () => {
          G.gold = Math.floor(G.gold / 2);
          G.party.forEach((m) => { m.hp = m.maxHp; m.mp = m.maxMp; });
          nav.town();
        }, { size: 16 });
        b.x = (W - 380) / 2; b.y = 360; root.addChild(b);
      },
    });
  }

  /* 전투 개시 연출 */
  const introCol = tierOf === "일반" ? C.text : tierOf === "정예" ? C.elite : tierOf === "보스" ? C.boss : C.epic;
  const introT = txt(tierOf === "일반" ? "적과 조우했다!" : `[${tierOf}] 강대한 기척!`, 30, introCol, { serif: true, shadow: true });
  introT.anchor.set(0.5); introT.x = W / 2; introT.y = H / 2 - 40; introT.alpha = 0; root.addChild(introT);
  void (async () => {
    await tweenP(introT, { alpha: 1 }, 300);
    await waitP(800);
    await tweenP(introT, { alpha: 0 }, 300);
    introT.destroy();
    void advance();
  })();
  showCmds(false);
  if (engine.blessMult > 1) toast("축복의 가호! 이번 전투 파티 공격력 +25%", C.border);

  return {};
}
