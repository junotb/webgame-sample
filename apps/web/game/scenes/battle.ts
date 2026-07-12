/* =====================================================================
 * scenes/battle.ts — 전투 모드 (4인 파티, 이동 없는 순수 턴제 커맨드 배틀)
 * ===================================================================== */
import * as PIXI from "pixi.js";
import { CLASSES, ENEMY_DEFS, EnemyDef, RANK_NAME, Tier } from "../data";
import {
  C, H, SceneHandle, W, button, fullFlash, nav, panel, sceneRoot,
  setModeBadge, toast, tween, txt, wait,
} from "../core";
import {
  BattleAbility, G, Member, gainExpParty, memberAbilities, memberStats,
  partyRank, rankMult,
} from "../state";
import { drawAdventurer, drawMonster } from "../monsters";

export interface BattleOpts { symbol?: "orc" | "lord" | "ancient"; }

interface EnemyUnit {
  kind: "enemy"; id: string; def: EnemyDef; name: string;
  hp: number; maxHp: number; atk: number; defv: number; spd: number;
  alive: boolean;
  node: PIXI.Container & { baseX?: number; baseY?: number };
  ring: PIXI.Graphics; redraw: () => void;
}
interface AllyUnit {
  kind: "ally"; m: Member; guarding: boolean;
  node: PIXI.Container & { baseX?: number; baseY?: number };
  ring: PIXI.Graphics; turnMark: PIXI.Graphics;
}
type Unit = EnemyUnit | AllyUnit;

const BASIC_ATTACK: BattleAbility = {
  id: "", skill: "blade", min: 1, name: "공격", mp: 0, pow: 1.0, hits: 1,
  kind: "phys", desc: "기본 공격", rank: 1,
};

export function battleScene(groupIds: string[], opts: BattleOpts = {}): SceneHandle {
  setModeBadge("전투 모드", C.blood);
  const root = new PIXI.Container(); sceneRoot.addChild(root);
  const tierOf: Tier = ENEMY_DEFS[groupIds[0]].tier;
  const showEnemyHp = partyRank("identify") >= 1;
  const blessMult = G.blessedNext ? 1.25 : 1.0;
  G.blessedNext = false;

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

  /* ---- 적 유닛 ---- */
  const enemies: EnemyUnit[] = groupIds.map((id, i) => {
    const d = ENEMY_DEFS[id];
    const node = new PIXI.Container() as EnemyUnit["node"];
    const m = drawMonster(d, d.big ?? 1);
    node.addChild(m);
    const n = groupIds.length;
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
    const u: EnemyUnit = {
      kind: "enemy", id, def: d, name: d.name, hp: d.hp, maxHp: d.hp,
      atk: d.atk, defv: d.def, spd: d.spd, alive: true, node, ring,
      redraw: () => {
        barBG.clear();
        barBG.roundRect(-46, 42, 92, 9, 4).fill({ color: 0x000000, alpha: 0.6 });
        barBG.roundRect(-46, 42, 92 * Math.max(0, u.hp / u.maxHp), 9, 4)
          .fill(d.tier === "일반" ? C.hp : tierCol);
        hpT.text = showEnemyHp ? `${u.hp} / ${u.maxHp}` : "";
      },
    };
    node.eventMode = "static"; node.cursor = "pointer";
    node.on("pointertap", () => onEnemyTap(u));
    root.addChild(node);
    return u;
  });

  /* 몬스터 식별 보유 시 적 HP 수치 표시 (showEnemyHp) */
  enemies.forEach((e) => e.redraw());

  /* ---- 파티 유닛 (좌측 4열 대형) ---- */
  const ALLY_POS = [
    { x: 292, y: 356 }, { x: 236, y: 442 }, { x: 300, y: 528 }, { x: 244, y: 614 },
  ];
  const allies: AllyUnit[] = G.party.map((m, i) => {
    const node = new PIXI.Container() as AllyUnit["node"];
    node.addChild(drawAdventurer(m.color, m.accent, 1.7));
    node.x = ALLY_POS[i].x; node.y = ALLY_POS[i].y;
    node.baseX = node.x; node.baseY = node.y;
    const ring = new PIXI.Graphics();
    ring.ellipse(0, 4, 34, 12).stroke({ width: 3, color: C.green, alpha: 0.9 });
    ring.visible = false; node.addChildAt(ring, 0);
    const turnMark = new PIXI.Graphics();
    turnMark.moveTo(-8, -104).lineTo(8, -104).lineTo(0, -90).closePath().fill(C.border);
    turnMark.visible = false; node.addChild(turnMark);
    const u: AllyUnit = { kind: "ally", m, guarding: false, node, ring, turnMark };
    node.eventMode = "static"; node.cursor = "pointer";
    node.on("pointertap", () => onAllyTap(u));
    root.addChild(node);
    if (m.hp <= 0) node.alpha = 0.35;
    return u;
  });
  const isDown = (u: AllyUnit) => u.m.hp <= 0;

  /* ---- 파티 상태 패널 ---- */
  const pp = panel(330, 150, { alpha: 0.94 }); pp.x = 20; pp.y = H - 168; root.addChild(pp);
  const rowsG = new PIXI.Graphics(); root.addChild(rowsG);
  const rowTs = allies.map((u, i) => {
    const t = txt("", 13, C.text, { weight: "700" });
    t.x = 38; t.y = H - 158 + i * 34; root.addChild(t);
    return t;
  });
  function redrawParty(): void {
    rowsG.clear();
    allies.forEach((u, i) => {
      const m = u.m;
      const y = H - 158 + i * 34;
      rowTs[i].text = `${m.name}${u.guarding ? " [방어]" : ""}`;
      rowTs[i].style.fill = m.hp > 0 ? C.text : C.dim;
      const bx = 150, bw = 180;
      rowsG.roundRect(bx, y + 3, bw, 8, 4).fill({ color: 0x000000, alpha: 0.6 });
      rowsG.roundRect(bx, y + 3, bw * Math.max(0, m.hp / m.maxHp), 8, 4)
        .fill(m.hp > 0 ? C.hp : 0x553333);
      rowsG.roundRect(bx, y + 14, bw, 6, 3).fill({ color: 0x000000, alpha: 0.6 });
      rowsG.roundRect(bx, y + 14, bw * Math.max(0, m.mp / m.maxMp), 6, 3).fill(C.mp);
      if (u.node && !u.node.destroyed) u.node.alpha = m.hp > 0 ? 1 : 0.35;
    });
  }
  redrawParty();

  /* 턴 순서 바 */
  const orderT = txt("", 14, C.dim); orderT.x = 24; orderT.y = 70; root.addChild(orderT);

  /* ---- 커맨드 UI ---- */
  const cmdRoot = new PIXI.Container(); root.addChild(cmdRoot);
  let subRoot: PIXI.Container | null = null;
  let actUnit: AllyUnit | null = null;
  let state: "idle" | "player" | "target" | "allytarget" | "anim" | "end" = "idle";

  const cmdName = txt("", 16, C.border, { weight: "700" });
  cmdName.x = 380; cmdName.y = H - 108; cmdRoot.addChild(cmdName);
  const CMDS: { label: string; fn: () => void }[] = [
    { label: "공격", fn: () => pickTarget(BASIC_ATTACK) },
    { label: "스킬", fn: () => openSkillMenu() },
    {
      label: "방어", fn: () => {
        if (!actUnit) return;
        actUnit.guarding = true;
        actUnit.m.mp = Math.min(actUnit.m.maxMp, actUnit.m.mp + 3);
        log(`${actUnit.m.name}, 방어 태세. (받는 피해 감소, MP 소량 회복)`);
        redrawParty(); endAllyTurn();
      },
    },
    { label: "아이템", fn: () => openItemMenu() },
    { label: "도망", fn: () => tryFlee() },
  ];
  const cmdBtns = CMDS.map((c, i) => {
    const b = button(c.label, 150, 48, () => { if (state === "player") c.fn(); }, { size: 17 });
    b.x = 380 + i * 160; b.y = H - 72; cmdRoot.addChild(b);
    if (c.label === "도망" && tierOf !== "일반") b.setDisabled(true);
    return b;
  });
  void cmdBtns;
  function showCmds(v: boolean): void { cmdRoot.visible = v; }
  function closeSub(): void { if (subRoot) { subRoot.destroy({ children: true }); subRoot = null; } }

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
        if (!actUnit) return;
        if (actUnit.m.mp < a.mp) { toast("MP 부족!", C.dim); return; }
        closeSub();
        if (a.kind === "heal") pickAlly(a);
        else if (a.all) {
          actUnit.m.mp -= a.mp; redrawParty();
          execAllyAttack(a, enemies.filter((e) => e.alive));
        } else pickTarget(a);
      }, { size: 14 });
      b.x = p.x + 16; b.y = y; subRoot!.addChild(b);
      const d = txt(`MP ${a.mp} · ${a.desc}`, 13, C.dim); d.x = p.x + 250; d.y = y + 11; subRoot!.addChild(d);
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
    const mk = (label: string, cnt: number, y: number, use: (t: AllyUnit) => void) => {
      const b = button(`${label} ×${cnt}`, 220, 40, () => {
        closeSub();
        pendingItem = use; state = "allytarget";
        allies.forEach((u) => { u.ring.visible = true; });
        log("아이템 — 대상을 선택하세요. (전투불능 포함)");
      }, { size: 14 });
      if (cnt <= 0) b.setDisabled(true);
      b.x = p.x + 18; b.y = y; subRoot!.addChild(b);
    };
    mk("치유 물약 (HP 60)", G.items.potion, p.y + 46, (t) => {
      G.items.potion--;
      const revived = t.m.hp <= 0;
      t.m.hp = Math.min(t.m.maxHp, Math.max(0, t.m.hp) + 60);
      redrawParty();
      log(revived ? `${t.m.name}(이)가 일어났다! HP 60 회복.` : `${t.m.name} HP 60 회복.`);
      popDmg(t.node.x, t.node.y - 110, "+60", C.green);
    });
    mk("마나 물약 (MP 25)", G.items.mpotion, p.y + 96, (t) => {
      G.items.mpotion--;
      t.m.mp = Math.min(t.m.maxMp, t.m.mp + 25);
      redrawParty();
      log(`${t.m.name} MP 25 회복.`);
      popDmg(t.node.x, t.node.y - 110, "+25", C.mp);
    });
    const cb = button("닫기", 80, 34, closeSub, { size: 13 });
    cb.x = p.x + 460 - 96; cb.y = p.y + 10; subRoot.addChild(cb);
  }

  function tryFlee(): void {
    if (tierOf !== "일반") return;
    if (Math.random() < 0.6) {
      log("파티는 무사히 도망쳤다!"); showCmds(false); state = "anim";
      wait(700, () => fullFlash(0x000000, 400, () => nav.explore()));
    } else { log("도망칠 수 없다!"); endAllyTurn(); }
  }

  /* ---- 대상 선택 ---- */
  let pendingAbility: BattleAbility | null = null;
  let pendingHeal: BattleAbility | null = null;
  let pendingItem: ((t: AllyUnit) => void) | null = null;

  function pickTarget(a: BattleAbility): void {
    if (!actUnit) return;
    const alive = enemies.filter((e) => e.alive);
    if (alive.length === 1) {
      actUnit.m.mp -= a.mp; redrawParty();
      execAllyAttack(a, alive);
      return;
    }
    pendingAbility = a;
    log(`${a.name} — 대상을 선택하세요.`);
    enemies.forEach((e) => { if (e.alive) e.ring.visible = true; });
    state = "target";
  }
  function onEnemyTap(e: EnemyUnit): void {
    if (state !== "target" || !e.alive || !actUnit) return;
    enemies.forEach((x) => { x.ring.visible = false; });
    const a = pendingAbility!; pendingAbility = null;
    actUnit.m.mp -= a.mp; redrawParty();
    execAllyAttack(a, [e]);
  }
  function pickAlly(a: BattleAbility): void {
    pendingHeal = a; state = "allytarget";
    allies.forEach((u) => { u.ring.visible = true; });
    log(`${a.name} — 회복할 아군을 선택하세요.`);
  }
  function onAllyTap(t: AllyUnit): void {
    if (state !== "allytarget" || !actUnit) return;
    allies.forEach((u) => { u.ring.visible = false; });
    if (pendingItem) {
      const use = pendingItem; pendingItem = null;
      state = "anim"; showCmds(false);
      use(t);
      wait(600, endAllyTurn0);
      return;
    }
    if (pendingHeal) {
      const a = pendingHeal; pendingHeal = null;
      if (t.m.hp <= 0) { toast("전투불능 상태에는 치유가 닿지 않는다. (물약 필요)", C.dim); state = "player"; return; }
      state = "anim"; showCmds(false);
      actUnit.m.mp -= a.mp;
      const amt = Math.round(memberStats(actUnit.m).mag * 1.8 * rankMult(a.rank) * a.pow);
      t.m.hp = Math.min(t.m.maxHp, t.m.hp + amt);
      redrawParty();
      log(`${actUnit.m.name}의 치유! ${t.m.name} HP ${amt} 회복.`);
      popDmg(t.node.x, t.node.y - 110, "+" + amt, C.green);
      flash(t.node, 0x7fdc7f);
      wait(600, endAllyTurn0);
    }
  }
  const endAllyTurn0 = () => endAllyTurn();

  /* ---- 연출 ---- */
  function popDmg(x: number, y: number, s: string | number, color = 0xffffff): void {
    const t = txt(String(s), 26, color, { weight: "900", shadow: true });
    t.anchor.set(0.5); t.x = x; t.y = y; root.addChild(t);
    tween(t, { y: y - 46, alpha: 0 }, 800, { onDone: () => t.destroy() });
  }
  function flash(node: PIXI.Container, color = 0xffffff): void {
    const gs = node.children.filter((ch) => ch instanceof PIXI.Graphics) as PIXI.Graphics[];
    gs.forEach((g) => { g.tint = color; });
    wait(120, () => gs.forEach((g) => { if (!g.destroyed) g.tint = 0xffffff; }));
  }
  function shake(node: PIXI.Container & { baseX?: number }): void {
    const bx = node.baseX ?? node.x;
    tween(node, { x: bx + 12 }, 60, {
      onDone: () => tween(node, { x: bx - 10 }, 60, { onDone: () => tween(node, { x: bx }, 80) }),
    });
  }

  function execAllyAttack(a: BattleAbility, targets: EnemyUnit[]): void {
    if (!actUnit) return;
    const actor = actUnit;
    state = "anim"; showCmds(false); closeSub();
    const s = memberStats(actor.m);
    const mult = a.id ? rankMult(a.rank) : 1;
    tween(actor.node, { x: (actor.node.baseX ?? actor.node.x) + 70 }, 160, {
      onDone: () => {
        let hitIdx = 0;
        const doHit = () => {
          if (hitIdx >= a.hits) {
            tween(actor.node, { x: actor.node.baseX ?? actor.node.x }, 200, {
              onDone: () => wait(250, afterAllyAction),
            });
            return;
          }
          hitIdx++;
          let totalDealt = 0;
          targets.forEach((e) => {
            if (!e.alive) return;
            const base = a.kind === "mag" ? s.mag : s.atk;
            let dmg = Math.round(base * a.pow * mult * blessMult * (0.9 + Math.random() * 0.2));
            const defv = a.pierce ? Math.floor(e.defv / 2) : e.defv;
            dmg = Math.max(1, dmg - defv);
            if (a.crit && Math.random() < a.crit) {
              dmg = Math.round(dmg * 1.7);
              popDmg(e.node.x, e.node.y - 150, "치명타!", C.border);
            }
            e.hp -= dmg; totalDealt += dmg;
            popDmg(e.node.x + (Math.random() * 30 - 15), e.node.y - 110, dmg, a.kind === "mag" ? 0xb99cff : 0xffffff);
            flash(e.node, 0xff6666); shake(e.node);
            if (e.hp <= 0) { e.hp = 0; e.alive = false; kill(e); }
            e.redraw();
          });
          if (a.drain && totalDealt > 0) {
            const back = Math.round(totalDealt * a.drain);
            actor.m.hp = Math.min(actor.m.maxHp, actor.m.hp + back);
            redrawParty();
            popDmg(actor.node.x, actor.node.y - 120, "+" + back, C.epic);
          }
          wait(220, doHit);
        };
        log(`${actor.m.name}의 ${a.name}!${a.id ? ` [${RANK_NAME[a.rank]}]` : ""}`);
        doHit();
      },
    });
  }
  function kill(e: EnemyUnit): void {
    tween(e.node, { alpha: 0, y: (e.node.baseY ?? e.node.y) + 20 }, 450);
    log(`${e.name}을(를) 쓰러뜨렸다!`);
  }
  function afterAllyAction(): void {
    if (checkEnd()) return;
    endAllyTurn();
  }

  /* ---- 턴 시스템 ---- */
  let queue: Unit[] = [];
  let qi = 0;
  function buildRound(): void {
    const all: { u: Unit; spd: number }[] = [
      ...allies.filter((u) => !isDown(u)).map((u) => ({ u: u as Unit, spd: memberStats(u.m).spd })),
      ...enemies.filter((e) => e.alive).map((e) => ({ u: e as Unit, spd: e.spd })),
    ];
    all.sort((a, b) => b.spd - a.spd || (a.u.kind === "ally" ? -1 : 1));
    queue = all.map((x) => x.u); qi = 0;
    orderT.text = "턴 순서: " + queue
      .map((u) => (u.kind === "ally" ? u.m.name : u.name.slice(0, 6)))
      .join(" → ");
    nextTurn();
  }
  function nextTurn(): void {
    if (checkEnd()) return;
    if (qi >= queue.length) { buildRound(); return; }
    const actor = queue[qi++];
    allies.forEach((u) => { u.turnMark.visible = false; });
    if (actor.kind === "ally") {
      if (isDown(actor)) { nextTurn(); return; }
      actor.guarding = false;
      actUnit = actor;
      actor.turnMark.visible = true;
      redrawParty();
      state = "player"; showCmds(true);
      cmdName.text = `▶ ${actor.m.name}의 턴 — ${CLASSES[actor.m.classId].name}`;
      log(`${actor.m.name}의 턴. 행동을 선택하세요.`);
    } else {
      if (!actor.alive) { nextTurn(); return; }
      state = "anim"; showCmds(false);
      enemyAct(actor);
    }
  }
  function endAllyTurn(): void {
    state = "anim"; showCmds(false);
    if (actUnit) actUnit.turnMark.visible = false;
    wait(350, nextTurn);
  }

  function enemyAct(e: EnemyUnit): void {
    const targetsAll = allies.filter((u) => !isDown(u));
    if (!targetsAll.length) { checkEnd(); return; }
    const aoe = (e.def.tier === "보스" || e.def.tier === "에픽") && Math.random() < 0.35;
    log(aoe ? `${e.name}의 광역 공격!` : `${e.name}의 공격!`);
    tween(e.node, { x: (e.node.baseX ?? e.node.x) - 60 }, 170, {
      onDone: () => {
        const victims = aoe ? targetsAll : [targetsAll[(Math.random() * targetsAll.length) | 0]];
        victims.forEach((t) => {
          const s = memberStats(t.m);
          let dmg = Math.round(e.atk * (aoe ? 0.65 : 1) * (0.9 + Math.random() * 0.25));
          dmg = Math.max(1, dmg - s.def);
          if (t.guarding) dmg = Math.max(1, Math.round(dmg * 0.45));
          dmg = Math.max(1, Math.round(dmg * (1 - s.guardCut)));
          if (Math.random() < s.evade) {
            popDmg(t.node.x, t.node.y - 110, "회피!", C.green);
          } else {
            t.m.hp = Math.max(0, t.m.hp - dmg);
            popDmg(t.node.x, t.node.y - 110, dmg, 0xff9090);
            flash(t.node, 0xff6666); shake(t.node);
            if (t.m.hp <= 0) log(`${t.m.name}(이)가 쓰러졌다!`);
          }
        });
        redrawParty();
        tween(e.node, { x: e.node.baseX ?? e.node.x }, 200, {
          onDone: () => {
            if (allies.every(isDown)) { defeat(); return; }
            wait(280, nextTurn);
          },
        });
      },
    });
  }

  function checkEnd(): boolean {
    if (allies.every(isDown)) { defeat(); return true; }
    if (enemies.every((e) => !e.alive)) { victory(); return true; }
    return false;
  }

  /* ---- 승리/패배 ---- */
  let ended = false;
  function victory(): void {
    if (ended) return; ended = true;
    state = "end"; showCmds(false); closeSub();
    let exp = 0, gold = 0;
    enemies.forEach((e) => { exp += e.def.exp; gold += e.def.gold; });
    G.gold += gold;
    const ups = gainExpParty(exp);
    /* 쓰러진 멤버는 HP 1로 일어난다 */
    const revived = G.party.filter((m) => m.hp <= 0);
    revived.forEach((m) => { m.hp = 1; });
    if (opts.symbol) G.explore.defeated[opts.symbol] = true;

    const p = panel(600, 260); p.x = (W - 600) / 2; p.y = 190; p.alpha = 0; root.addChild(p);
    const tt = txt("승 리", 34, C.border, { serif: true });
    tt.anchor.set(0.5, 0); tt.x = W / 2; tt.y = 212; tt.alpha = 0; root.addChild(tt);
    const lines = [
      `파티 전원 경험치 +${exp}    ${gold} G 획득`,
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
    if (ended) return; ended = true;
    state = "end"; showCmds(false); closeSub();
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
  tween(introT, { alpha: 1 }, 300, {
    onDone: () => wait(800, () => {
      tween(introT, { alpha: 0 }, 300, { onDone: () => introT.destroy() });
      buildRound();
    }),
  });
  showCmds(false);
  if (blessMult > 1) toast("축복의 가호! 이번 전투 파티 공격력 +25%", C.border);

  return {};
}
