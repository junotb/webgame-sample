/* =====================================================================
 * scenes/explore.ts — 탐험 모드 (MMX식 그리드 블로버)
 *  - 1인칭 유사 3D 뷰(fpview) + 좌상단 미니맵(안개 걷힘)
 *  - 한 칸 이동/옆걸음 = 1턴, 90도 회전은 무료 (ROTATE_COSTS_TURN)
 *  - 전투는 그리드 위에서 턴제: 근접은 정면 칸, 마법은 시야(LOS) 내
 * ===================================================================== */
import * as PIXI from "pixi.js";
import { ENEMY_DEFS, RANK_NAME } from "../defs";
import {
  C, H, SceneHandle, W, app, button, fullFlash, nav, panel, sceneRoot,
  setModeBadge, switchScene, toast, tween, txt, ui, wait,
} from "../core";
import {
  BattleAbility, G, GridEnemy, Member, gainExpParty,
  memberAbilities, memberStats, partyFortune, partyRank, rankMult,
  respawnEnemies,
} from "../state";
import { BASIC_ATTACK } from "../core/battle-engine";
import { healAmount, rollAllyHit } from "../core/formulas";
import { questNotify, trackerLines, updateText } from "../core/quests";
import {
  DIR, FACING_NAME, Facing, cellAt, chebyshev, enemyStep, hasLOS,
  leftOf, passable, rightOf,
} from "../grid";
import { POIS, PoiDef, START, dungeonMap } from "../dungeon";
import { FPEntity, createFPView } from "../fpview";
import { tileSprite } from "../tiles";
import { drawMonster } from "../monsters";
import { buildPartyHUD, pickMember } from "../hud";
import { EventNode, eventScene } from "./event";

const ROTATE_COSTS_TURN = false; // 회전도 턴을 소모시키려면 true
const AGGRO_R = 6;               // 어그로 반경 (체비쇼프 + LOS)
const VEIL_R = 1;                // 어둠의 장막 중 어그로 반경
const MAG_RANGE = 6;             // 마법 사거리
const REVEAL_R = 4;              // 미니맵 안개 걷힘 반경
const VEIL_TURNS = 30;           // 어둠의 장막 지속 턴

/** 보스 대화 등 이벤트를 다녀올 때 일반 몹 리스폰을 건너뛴다 */
let suppressRespawn = false;

export function exploreScene(): SceneHandle {
  setModeBadge("탐험 모드 — 황혼의 숲 지하미궁", C.green);
  const root = new PIXI.Container(); sceneRoot.addChild(root);
  const map = dungeonMap;
  const E = G.explore;
  /* 마을·전멸 후 진입: 입구에서 시작 + 일반 몹 리스폰. 이벤트 복귀 시엔 유지 */
  if (!suppressRespawn) {
    respawnEnemies();
    E.x = START.x; E.y = START.y; E.facing = START.facing;
  }
  suppressRespawn = false;
  const idRank = partyRank("identify");
  const disarmRank = partyRank("trapfinding");

  /* ---- 배경 + 1인칭 뷰 ---- */
  const voidG = new PIXI.Graphics();
  voidG.rect(0, 0, W, H).fill(C.night);
  root.addChild(voidG);
  const fp = createFPView();
  root.addChild(fp.root);

  /* ---- 엔티티 노드 (씬 소유, fpview가 배치) ---- */
  interface EnemyVis { e: GridEnemy; node: PIXI.Container; info: PIXI.Text; hpT: PIXI.Text; }
  const enemyVis = new Map<string, EnemyVis>();
  for (const e of E.enemies) {
    if (!e.alive) continue;
    const def = ENEMY_DEFS[e.defId];
    const node = new PIXI.Container();
    node.addChild(drawMonster(def, def.big ?? 1));
    const tierCol = def.tier === "정예" ? C.elite : def.tier === "보스" ? C.boss
      : def.tier === "에픽" ? C.epic : C.text;
    const info = txt(
      def.tier === "일반" ? def.name : `◆ ${def.tier} — ${def.name}`,
      13, tierCol, { weight: "700", shadow: true });
    info.anchor.set(0.5); info.y = -118 * (def.big ?? 1); node.addChild(info);
    const hpT = txt("", 12, C.dim, { shadow: true });
    hpT.anchor.set(0.5); hpT.y = info.y + 16; node.addChild(hpT);
    node.eventMode = "static"; node.cursor = "pointer";
    node.on("pointertap", () => onEnemyTap(e));
    enemyVis.set(e.id, { e, node, info, hpT });
  }
  function redrawEnemyInfo(): void {
    for (const v of enemyVis.values()) {
      v.hpT.text = idRank >= 1 ? `HP ${v.e.hp} / ${ENEMY_DEFS[v.e.defId].hp}` : "???";
    }
  }
  redrawEnemyInfo();

  /* POI 노드 */
  const poiNodes = new Map<string, PIXI.Container>();
  for (const p of POIS) {
    const node = new PIXI.Container();
    if (p.kind === "chest") {
      const s = tileSprite("chest_obj", 2); s.anchor.set(0.5, 1); node.addChild(s);
      if (p.id === "hidden") {
        const g = new PIXI.Graphics();
        g.roundRect(-36, -68, 72, 72, 8).stroke({ width: 2, color: C.epic, alpha: 0.8 });
        node.addChild(g);
      }
    } else if (p.kind === "sign") {
      const g = new PIXI.Graphics();
      g.rect(-4, -66, 8, 66).fill(0x4a3a2a);
      g.roundRect(-42, -92, 84, 30, 4).fill(0x5a4a34);
      g.roundRect(-42, -92, 84, 30, 4).stroke({ width: 1, color: C.border, alpha: 0.5 });
      node.addChild(g);
    } else { // portal
      const s = tileSprite("door_obj", 4); s.anchor.set(0.5, 1); node.addChild(s);
      const g = new PIXI.Graphics();
      g.ellipse(0, -64, 44, 62).stroke({ width: 3, color: C.arcane, alpha: 0.6 });
      node.addChild(g);
    }
    poiNodes.set(p.id, node);
  }
  /* 문(+) 칸 장식 노드 — 열린 아치 */
  const doorNodes: FPEntity[] = [];
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    if (cellAt(map, x, y) !== "door") continue;
    const s = tileSprite("door_obj", 4); s.anchor.set(0.5, 1);
    const node = new PIXI.Container(); node.addChild(s);
    doorNodes.push({ id: `door:${x},${y}`, x, y, node, worldH: 0.92, baseH: 128 });
  }

  function poiVisible(p: PoiDef): boolean {
    if (p.id === "c1") return !E.chestOpened.c1;
    if (p.id === "hidden") return E.revealed.hidden && !E.chestOpened.hidden;
    return true;
  }
  function poiBlocking(x: number, y: number): PoiDef | null {
    for (const p of POIS) {
      if (p.x !== x || p.y !== y || !p.blocking) continue;
      if (p.kind === "chest") {
        const opened = p.id === "c1" ? E.chestOpened.c1 : E.chestOpened.hidden;
        if (opened) continue;
        if (p.id === "hidden" && !E.revealed.hidden) continue; // 미발견 상자는 통행 차단 안 함
      }
      return p;
    }
    return null;
  }
  function enemyAt(x: number, y: number): GridEnemy | undefined {
    return E.enemies.find((e) => e.alive && e.x === x && e.y === y);
  }

  function fpEntities(): FPEntity[] {
    const out: FPEntity[] = [...doorNodes];
    for (const p of POIS) {
      if (!poiVisible(p)) continue;
      const node = poiNodes.get(p.id)!;
      out.push({
        id: p.id, x: p.x, y: p.y, node,
        worldH: p.kind === "chest" ? 0.45 : p.kind === "sign" ? 0.6 : 0.95,
        baseH: p.kind === "chest" ? 64 : p.kind === "sign" ? 95 : 128,
      });
    }
    for (const e of E.enemies) {
      if (!e.alive) continue;
      const v = enemyVis.get(e.id); if (!v) continue;
      const big = ENEMY_DEFS[e.defId].big ?? 1;
      out.push({ id: e.id, x: e.x, y: e.y, node: v.node, worldH: 0.6 * big, baseH: 110 * big });
    }
    return out;
  }

  /* ---- 미니맵 (좌상단) ---- */
  const MM_CELL = 7;
  const mm = new PIXI.Container(); mm.x = 16; mm.y = 54; root.addChild(mm);
  const mmBg = panel(map.w * MM_CELL + 16, map.h * MM_CELL + 16, { alpha: 0.88 });
  mm.addChild(mmBg);
  const mmG = new PIXI.Graphics(); mmG.x = 8; mmG.y = 8; mm.addChild(mmG);
  const compassT = txt("", 14, C.border, { weight: "700" });
  compassT.x = 16; compassT.y = mm.y + map.h * MM_CELL + 22; root.addChild(compassT);

  function redrawMinimap(): void {
    mmG.clear();
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      if (!E.explored[y * map.w + x]) continue;
      const k = cellAt(map, x, y);
      const col = k === "wall" ? 0x35304a
        : k === "water" ? 0x2c4a6e
          : k === "door" ? 0x7a5a34
            : k === "stairs" ? 0x8a7430
              : 0x6e6552;
      mmG.rect(x * MM_CELL, y * MM_CELL, MM_CELL - 1, MM_CELL - 1).fill(col);
    }
    for (const p of POIS) {
      if (!poiVisible(p) || !E.explored[p.y * map.w + p.x]) continue;
      const col = p.kind === "chest" ? C.border : p.kind === "portal" ? 0x5ad07a : C.dim;
      mmG.rect(p.x * MM_CELL + 1, p.y * MM_CELL + 1, MM_CELL - 3, MM_CELL - 3).fill(col);
    }
    for (const e of E.enemies) {
      if (!e.alive) continue;
      if (!hasLOS(map, E.x, E.y, e.x, e.y) || chebyshev(E.x, E.y, e.x, e.y) > AGGRO_R + 2) continue;
      const col = e.symbol ? (e.symbol === "orc" ? C.elite : e.symbol === "lord" ? C.boss : C.epic) : C.blood;
      mmG.circle(e.x * MM_CELL + MM_CELL / 2, e.y * MM_CELL + MM_CELL / 2, 2.6).fill(col);
    }
    /* 파티 화살표 */
    const cx = E.x * MM_CELL + MM_CELL / 2 - 0.5, cy = E.y * MM_CELL + MM_CELL / 2 - 0.5;
    const a = [[0, -4], [3.4, 3.2], [-3.4, 3.2]].map(([px2, py2]) => {
      const r = (E.facing * Math.PI) / 2;
      return [cx + px2 * Math.cos(r) - py2 * Math.sin(r), cy + px2 * Math.sin(r) + py2 * Math.cos(r)];
    });
    mmG.moveTo(a[0][0], a[0][1]).lineTo(a[1][0], a[1][1]).lineTo(a[2][0], a[2][1]).closePath()
      .fill(0xffffff);
    compassT.text = `▲ ${FACING_NAME[E.facing]}쪽을 보는 중`;
  }

  function revealAround(): void {
    for (let y = Math.max(0, E.y - REVEAL_R); y <= Math.min(map.h - 1, E.y + REVEAL_R); y++)
      for (let x = Math.max(0, E.x - REVEAL_R); x <= Math.min(map.w - 1, E.x + REVEAL_R); x++)
        if (hasLOS(map, E.x, E.y, x, y)) E.explored[y * map.w + x] = true;
  }

  /* ---- 로그/프롬프트/힌트 ---- */
  const logP = panel(620, 46, { alpha: 0.82 }); logP.x = (W - 620) / 2; logP.y = 12; root.addChild(logP);
  const logT = txt("", 15, C.text); logT.x = logP.x + 16; logT.y = 25; root.addChild(logT);
  const log = (s: string) => { logT.text = s; };

  /* ---- 퀘스트 트래커 (우상단) ---- */
  const qtc = new PIXI.Container(); root.addChild(qtc);
  function renderTracker(): void {
    qtc.removeChildren().forEach((c) => c.destroy({ children: true }));
    const lines = trackerLines(3);
    if (!lines.length) return;
    const ph = 16 + lines.length * 20;
    qtc.addChild(panel(310, ph, { alpha: 0.82 }));
    lines.forEach((l, i) => {
      const t = txt(`${l.done ? "✓" : "·"} ${l.text}`, 12, l.done ? C.border : C.text);
      t.x = 12; t.y = 9 + i * 20; qtc.addChild(t);
    });
    /* 미니맵·나침반 아래 (우상단은 파티 HUD 자리) */
    qtc.x = 16; qtc.y = mm.y + map.h * MM_CELL + 58;
  }
  log("던전에 발을 들였다. 발소리가 어둠 속으로 스며든다…");

  const prompt = txt("", 16, C.text, { weight: "700", shadow: true });
  prompt.anchor.set(0.5, 1); prompt.x = W / 2; prompt.y = H - 168; root.addChild(prompt);

  const hint = txt("W/S 전진·후진   A/D 옆걸음   Q/E·←→ 회전   Z/스페이스 조사", 13, C.dim);
  hint.x = 16; hint.y = H - 28; root.addChild(hint);
  const veilT = txt("", 13, C.epic, { weight: "700" }); veilT.x = 16; veilT.y = H - 50; root.addChild(veilT);
  const blessT = txt("", 13, C.border, { weight: "700" }); blessT.x = 16; blessT.y = H - 70; root.addChild(blessT);

  /* 어그로 적 정보 (미니맵 아래) */
  const foeT = txt("", 13, C.text, { weight: "700", lh: 20, shadow: true });
  foeT.x = 16; foeT.y = compassT.y + 26; root.addChild(foeT);
  function relLabel(e: GridEnemy): string {
    const dxm = e.x - E.x, dym = e.y - E.y;
    const fwd = DIR[E.facing], rt = DIR[rightOf(E.facing)];
    const d = fwd.dx * dxm + fwd.dy * dym;
    const j = rt.dx * dxm + rt.dy * dym;
    const parts: string[] = [];
    if (d > 0) parts.push(`전방${d > 1 ? ` ${d}칸` : ""}`);
    if (d < 0) parts.push(`후방${d < -1 ? ` ${-d}칸` : ""}`);
    if (j > 0) parts.push("우측");
    if (j < 0) parts.push("좌측");
    return parts.join(" ") || "인접";
  }

  /* ---- HUD / 필드 스킬 ---- */
  const hud = buildPartyHUD(root, {
    fieldHandlers: {
      recall() { toast("귀환 마법 발동!", C.arcane); fullFlash(0xffffff, 600, () => nav.town()); },
      bless() { G.blessedNext = true; toast("축복을 받았다. 다음 전투 파티 공격력 +25%!", C.border); refresh(); },
      darkveil() { E.veil = VEIL_TURNS; toast("어둠의 장막이 발걸음을 감춘다…", C.epic); refresh(); },
      seek() {
        const hid = POIS.find((p) => p.id === "hidden")!;
        if (!E.revealed.hidden && !E.chestOpened.hidden
          && chebyshev(E.x, E.y, hid.x, hid.y) <= 6) {
          E.revealed.hidden = true;
          toast("숨겨진 상자를 발견했다! (미니맵에 표시)", C.epic);
          E.explored[hid.y * map.w + hid.x] = true;
          refresh();
        } else toast("주변에서 아무것도 발견하지 못했다.", C.dim);
      },
    },
  });

  /* =====================================================================
   * 턴 시스템 / 전투
   * ===================================================================== */
  let phase: "free" | "party" | "anim" | "end" = "free";
  let actQueue: Member[] = [];
  let actIdx = 0;
  const guardSet = new Set<string>();
  let blessMult = 1;
  let inCombat = false;
  let pendingMag: BattleAbility | null = null; // 마법 대상 선택 중

  function aggroList(): GridEnemy[] {
    const r = E.veil > 0 ? VEIL_R : AGGRO_R;
    return E.enemies.filter((e) =>
      e.alive && chebyshev(E.x, E.y, e.x, e.y) <= r && hasLOS(map, E.x, E.y, e.x, e.y));
  }
  function frontEnemy(): GridEnemy | undefined {
    const f = DIR[E.facing];
    return enemyAt(E.x + f.dx, E.y + f.dy);
  }
  function magTargets(): GridEnemy[] {
    return E.enemies.filter((e) =>
      e.alive && chebyshev(E.x, E.y, e.x, e.y) <= MAG_RANGE && hasLOS(map, E.x, E.y, e.x, e.y));
  }

  /* ---- 이동/회전 ---- */
  function tryMove(rel: "fwd" | "back" | "sl" | "sr"): void {
    if (ui.menuOpen || phase === "anim" || phase === "end") return;
    const f: Facing = rel === "fwd" ? E.facing : rel === "back" ? (((E.facing + 2) % 4) as Facing)
      : rel === "sl" ? leftOf(E.facing) : rightOf(E.facing);
    const nx = E.x + DIR[f].dx, ny = E.y + DIR[f].dy;
    if (!passable(map, nx, ny) || enemyAt(nx, ny) || poiBlocking(nx, ny)) {
      bump(); return;
    }
    if (phase === "party") cancelRound("파티는 자리를 옮겼다.");
    E.x = nx; E.y = ny;
    stepBob();
    advanceTurn();
  }
  function rotate(dir: -1 | 1): void {
    if (ui.menuOpen || phase === "anim" || phase === "end") return;
    E.facing = dir < 0 ? leftOf(E.facing) : rightOf(E.facing);
    if (ROTATE_COSTS_TURN) {
      if (phase === "party") cancelRound("파티는 방향을 틀었다.");
      advanceTurn();
    } else refresh();
  }
  function bump(): void {
    tween(fp.root, { x: 6 }, 45, {
      onDone: () => tween(fp.root, { x: -5 }, 45, { onDone: () => tween(fp.root, { x: 0 }, 60) }),
    });
  }
  function stepBob(): void {
    fp.root.y = 7;
    tween(fp.root, { y: 0 }, 130);
  }

  /* ---- 월드 턴 진행 (이동 1칸 = 1턴 / 전투 1라운드 = 1턴) ---- */
  function advanceTurn(): void {
    if (phase === "end") return;
    phase = "anim";
    revealAround();
    if (E.veil > 0) E.veil--;
    enemyPhase();
    if (checkDefeat()) return;
    refresh();
    maybeBossIntro();
    if ((phase as string) === "end") return; // 이벤트로 씬 전환됨
    const ag = aggroList();
    if (ag.length) {
      if (!inCombat) enterCombat();
      startPartyRound();
    } else {
      if (inCombat) exitCombat();
      phase = "free";
    }
  }

  function enemyPhase(): void {
    const r = E.veil > 0 ? VEIL_R : AGGRO_R;
    for (const e of E.enemies) {
      if (!e.alive) continue;
      if (chebyshev(E.x, E.y, e.x, e.y) > r || !hasLOS(map, E.x, E.y, e.x, e.y)) continue;
      const occupied = (x: number, y: number) =>
        !!enemyAt(x, y) || !!poiBlocking(x, y);
      const res = enemyStep(map, e.x, e.y, E.x, E.y, (x, y) =>
        (x === e.x && y === e.y) ? false : occupied(x, y));
      if (res === "attack") enemyAttack(e);
      else if (res) { e.x = res.x; e.y = res.y; }
    }
  }

  function enemyAttack(e: GridEnemy): void {
    const def = ENEMY_DEFS[e.defId];
    const alive = G.party.filter((m) => m.hp > 0);
    if (!alive.length) return;
    const aoe = (def.tier === "보스" || def.tier === "에픽") && Math.random() < 0.35;
    const victims = aoe ? alive : [alive[(Math.random() * alive.length) | 0]];
    const lines: string[] = [];
    for (const m of victims) {
      const s = memberStats(m);
      let dmg = Math.round(def.atk * (aoe ? 0.65 : 1) * (0.9 + Math.random() * 0.25));
      dmg = Math.max(1, dmg - s.def);
      if (guardSet.has(m.id)) dmg = Math.max(1, Math.round(dmg * 0.45));
      dmg = Math.max(1, Math.round(dmg * (1 - s.guardCut)));
      if (Math.random() < s.evade) { lines.push(`${m.name} 회피!`); continue; }
      m.hp = Math.max(0, m.hp - dmg);
      lines.push(`${m.name} -${dmg}`);
      if (m.hp <= 0) lines.push(`${m.name} 전투불능!`);
    }
    log(`${def.name}의 ${aoe ? "광역 " : ""}공격! ${lines.join("  ")}`);
    hitFlash();
    hud.redraw();
  }
  function hitFlash(): void {
    const g = new PIXI.Graphics();
    g.rect(0, 0, W, H).fill(0xc03030); g.alpha = 0.22; root.addChild(g);
    tween(g, { alpha: 0 }, 260, { onDone: () => g.destroy() });
  }

  function checkDefeat(): boolean {
    if (G.party.some((m) => m.hp > 0)) return false;
    phase = "end";
    hideCmds();
    log("파티가 전멸했다…");
    const dim = new PIXI.Graphics();
    dim.rect(0, 0, W, H).fill(0x000000); dim.alpha = 0; root.addChild(dim);
    tween(dim, { alpha: 0.78 }, 900, {
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
    return true;
  }

  /* ---- 전투 상태 ---- */
  function enterCombat(): void {
    inCombat = true;
    blessMult = G.blessedNext ? 1.25 : 1;
    if (blessMult > 1) { G.blessedNext = false; toast("축복의 가호! 이번 전투 파티 공격력 +25%", C.border); }
    setModeBadge("전투! — 그리드 턴제", C.blood);
    log("적이 파티를 발견했다! (이동·옆걸음도 한 턴을 소모한다)");
  }
  function exitCombat(): void {
    inCombat = false;
    blessMult = 1;
    guardSet.clear();
    setModeBadge("탐험 모드 — 황혼의 숲 지하미궁", C.green);
    const revived = G.party.filter((m) => m.hp <= 0);
    if (revived.length) {
      revived.forEach((m) => { m.hp = 1; });
      toast(`${revived.map((m) => m.name).join("·")}(이)가 정신을 차렸다. (HP 1)`, C.dim);
      hud.redraw();
    }
    hideCmds();
  }

  /* ---- 파티 라운드 (전원 행동 → 적 페이즈) ---- */
  function startPartyRound(): void {
    actQueue = G.party.filter((m) => m.hp > 0)
      .sort((a, b) => memberStats(b).spd - memberStats(a).spd);
    actIdx = 0;
    phase = "party";
    nextMember();
  }
  function currentMember(): Member | null {
    return phase === "party" ? actQueue[actIdx] ?? null : null;
  }
  function nextMember(): void {
    pendingMag = null;
    closeSub();
    while (actIdx < actQueue.length && actQueue[actIdx].hp <= 0) actIdx++;
    if (actIdx >= actQueue.length) {
      hideCmds();
      phase = "anim";
      wait(260, () => advanceTurn());
      return;
    }
    const m = actQueue[actIdx];
    guardSet.delete(m.id);
    showCmds(m);
  }
  function endMemberAction(): void {
    if (phase !== "party") return;
    actIdx++;
    if (checkVictoryPause()) return;
    nextMember();
  }
  function cancelRound(reason: string): void {
    hideCmds(); closeSub();
    pendingMag = null;
    log(reason);
  }
  /** 어그로가 모두 사라졌으면 라운드를 중단하고 탐험으로 복귀 */
  function checkVictoryPause(): boolean {
    if (aggroList().length) return false;
    hideCmds();
    exitCombat();
    phase = "free";
    refresh();
    return true;
  }

  /* ---- 커맨드 바 ---- */
  const cmdRoot = new PIXI.Container(); cmdRoot.visible = false; root.addChild(cmdRoot);
  const cmdName = txt("", 15, C.border, { weight: "700" });
  cmdName.x = 240; cmdName.y = H - 106; cmdRoot.addChild(cmdName);
  let subRoot: PIXI.Container | null = null;
  const closeSub = () => { if (subRoot) { subRoot.destroy({ children: true }); subRoot = null; } };

  interface Cmd { label: string; fn: (m: Member) => void; enabled?: (m: Member) => boolean; }
  const CMDS: Cmd[] = [
    {
      label: "공격",
      enabled: () => !!frontEnemy(),
      fn: (m) => execAttack(m, BASIC_ATTACK, [frontEnemy()!]),
    },
    { label: "스킬", fn: (m) => openSkillMenu(m) },
    {
      label: "방어",
      fn: (m) => {
        guardSet.add(m.id);
        m.mp = Math.min(m.maxMp, m.mp + 3);
        log(`${m.name}, 방어 태세. (받는 피해 감소, MP 소량 회복)`);
        hud.redraw();
        endMemberAction();
      },
    },
    { label: "아이템", fn: () => openItemMenu() },
    { label: "대기", fn: () => { endMemberAction(); } },
  ];
  const cmdBtns = CMDS.map((c, i) => {
    const b = button(c.label, 128, 44, () => {
      const m = currentMember();
      if (!m || pendingMag) return;
      if (c.enabled && !c.enabled(m)) { toast("정면 칸에 적이 없다. (근접은 바로 앞 칸만)", C.dim); return; }
      c.fn(m);
    }, { size: 16 });
    b.x = 240 + i * 138; b.y = H - 72; cmdRoot.addChild(b);
    return b;
  });
  function showCmds(m: Member): void {
    cmdRoot.visible = true;
    cmdName.text = `▶ ${m.name}의 행동 — 근접은 정면 칸, 마법은 시야 내`;
    cmdBtns[0].setDisabled(!frontEnemy());
  }
  function hideCmds(): void { cmdRoot.visible = false; closeSub(); }

  function openSkillMenu(m: Member): void {
    closeSub();
    const abs = memberAbilities(m);
    subRoot = new PIXI.Container(); root.addChild(subRoot);
    const rows = Math.max(1, abs.length);
    const p = panel(600, 62 + rows * 48, { alpha: 0.97 });
    p.x = 240; p.y = H - 96 - (62 + rows * 48); subRoot.addChild(p);
    const tt = txt(`${m.name}의 스킬 — 물리: 정면 칸 / 마법: 시야 ${MAG_RANGE}칸`, 14, C.border, { weight: "700" });
    tt.x = p.x + 16; tt.y = p.y + 10; subRoot.addChild(tt);
    if (!abs.length) {
      const t = txt("사용할 수 있는 스킬이 없다.", 14, C.dim);
      t.x = p.x + 16; t.y = p.y + 42; subRoot.addChild(t);
    }
    abs.forEach((a, i) => {
      const y = p.y + 40 + i * 48;
      const b = button(`${a.name} [${RANK_NAME[a.rank]}]`, 210, 38, () => {
        if (m.mp < a.mp) { toast("MP 부족!", C.dim); return; }
        if (a.kind === "heal") {
          closeSub();
          pickMember(`${a.name} — 회복할 아군`, (t2) => {
            m.mp -= a.mp;
            const amt = healAmount(memberStats(m), a, rankMult(a.rank));
            t2.hp = Math.min(t2.maxHp, t2.hp + amt);
            log(`${m.name}의 ${a.name}! ${t2.name} HP ${amt} 회복.`);
            hud.redraw();
            endMemberAction();
          }, { filter: (t2) => t2.hp > 0, note: (t2) => `HP ${t2.hp}/${t2.maxHp}` });
          return;
        }
        if (a.kind === "phys") {
          const fe = frontEnemy();
          if (!fe) { toast("정면 칸에 적이 없다.", C.dim); return; }
          m.mp -= a.mp; hud.redraw();
          closeSub();
          execAttack(m, a, [fe]);
          return;
        }
        /* 마법 */
        const ts = magTargets();
        if (!ts.length) { toast("시야에 닿는 적이 없다.", C.dim); return; }
        closeSub();
        if (a.all) { m.mp -= a.mp; hud.redraw(); execAttack(m, a, ts); return; }
        if (ts.length === 1) { m.mp -= a.mp; hud.redraw(); execAttack(m, a, ts); return; }
        pendingMag = a;
        openTargetMenu(m, ts);
      }, { size: 13 });
      b.x = p.x + 14; b.y = y; subRoot!.addChild(b);
      const kindMark = a.kind === "mag" ? "◈마법" : a.kind === "heal" ? "✚회복" : "⚔물리";
      const d = txt(`${kindMark} · MP ${a.mp} · ${a.desc}`, 12, C.dim);
      d.x = p.x + 238; d.y = y + 10; subRoot!.addChild(d);
    });
    const cb = button("닫기", 76, 32, closeSub, { size: 13 });
    cb.x = p.x + 600 - 90; cb.y = p.y + 8; subRoot.addChild(cb);
  }

  function openTargetMenu(m: Member, ts: GridEnemy[]): void {
    closeSub();
    subRoot = new PIXI.Container(); root.addChild(subRoot);
    const p = panel(430, 58 + ts.length * 46, { alpha: 0.97 });
    p.x = 240; p.y = H - 96 - (58 + ts.length * 46); subRoot.addChild(p);
    const tt = txt("대상 선택 — 뷰의 적을 직접 클릭해도 된다", 14, C.border, { weight: "700" });
    tt.x = p.x + 16; tt.y = p.y + 10; subRoot.addChild(tt);
    ts.forEach((e, i) => {
      const def = ENEMY_DEFS[e.defId];
      const b = button(`${def.name} (${relLabel(e)})`, 390, 36, () => onEnemyTap(e), { size: 13 });
      b.x = p.x + 16; b.y = p.y + 38 + i * 46; subRoot!.addChild(b);
    });
  }

  function onEnemyTap(e: GridEnemy): void {
    if (!e.alive) return;
    const m = currentMember();
    if (!m) return;
    if (pendingMag) {
      const a = pendingMag; pendingMag = null;
      if (chebyshev(E.x, E.y, e.x, e.y) > MAG_RANGE || !hasLOS(map, E.x, E.y, e.x, e.y)) {
        toast("시야가 닿지 않는다.", C.dim); pendingMag = a; return;
      }
      m.mp -= a.mp; hud.redraw();
      closeSub();
      execAttack(m, a, [e]);
      return;
    }
    /* 대상 선택 중이 아니면: 정면 인접 적 클릭 = 기본 공격 */
    if (frontEnemy() === e) execAttack(m, BASIC_ATTACK, [e]);
  }

  function openItemMenu(): void {
    closeSub();
    subRoot = new PIXI.Container(); root.addChild(subRoot);
    const p = panel(440, 150, { alpha: 0.97 }); p.x = 240; p.y = H - 96 - 150; subRoot.addChild(p);
    const tt = txt("아이템", 15, C.border, { weight: "700" });
    tt.x = p.x + 16; tt.y = p.y + 10; subRoot.addChild(tt);
    const mk = (label: string, cnt: number, y: number, use: (t: Member) => void) => {
      const b = button(`${label} ×${cnt}`, 250, 40, () => {
        closeSub();
        pickMember(`${label} — 대상 선택`, (t) => { use(t); endMemberAction(); },
          { note: (t) => `HP ${t.hp}/${t.maxHp} MP ${t.mp}/${t.maxMp}` });
      }, { size: 14 });
      if (cnt <= 0) b.setDisabled(true);
      b.x = p.x + 16; b.y = y; subRoot!.addChild(b);
    };
    mk("치유 물약 (HP 60)", G.items.potion, p.y + 44, (t) => {
      G.items.potion--;
      const revived = t.hp <= 0;
      t.hp = Math.min(t.maxHp, Math.max(0, t.hp) + 60);
      log(revived ? `${t.name}(이)가 일어났다! HP 60 회복.` : `${t.name} HP 60 회복.`);
      hud.redraw();
    });
    mk("마나 물약 (MP 25)", G.items.mpotion, p.y + 94, (t) => {
      G.items.mpotion--;
      t.mp = Math.min(t.maxMp, t.mp + 25);
      log(`${t.name} MP 25 회복.`);
      hud.redraw();
    });
    const cb = button("닫기", 76, 32, closeSub, { size: 13 });
    cb.x = p.x + 440 - 90; cb.y = p.y + 8; subRoot.addChild(cb);
  }

  /* ---- 공격 실행 ---- */
  function popDmg(e: GridEnemy, s: string | number, color = 0xffffff): void {
    const v = enemyVis.get(e.id);
    const onScreen = v && v.node.parent;
    const x = onScreen ? v.node.x + (Math.random() * 26 - 13) : W / 2;
    const y = onScreen ? v.node.y - 130 * v.node.scale.y : 200;
    const t = txt(String(s), 26, color, { weight: "900", shadow: true });
    t.anchor.set(0.5); t.x = x; t.y = y; root.addChild(t);
    tween(t, { y: y - 44, alpha: 0 }, 750, { onDone: () => t.destroy() });
  }
  function flashEnemy(e: GridEnemy): void {
    const v = enemyVis.get(e.id); if (!v) return;
    /* Graphics(절차적)와 Sprite(이미지) 모두 틴트 — 몬스터 컨테이너 중첩 포함 */
    const gs: (PIXI.Graphics | PIXI.Sprite)[] = [];
    const walk = (c: PIXI.Container) => c.children.forEach((ch) => {
      if (ch instanceof PIXI.Graphics || ch instanceof PIXI.Sprite) gs.push(ch);
      else if (ch instanceof PIXI.Container) walk(ch);
    });
    walk(v.node);
    gs.forEach((g) => { g.tint = 0xff6666; });
    wait(130, () => gs.forEach((g) => { if (!g.destroyed) g.tint = 0xffffff; }));
  }

  function execAttack(m: Member, a: BattleAbility, targets: GridEnemy[]): void {
    phase = "anim";
    hideCmds();
    const s = memberStats(m);
    const mult = a.id ? rankMult(a.rank) : 1;
    log(`${m.name}의 ${a.name}!${a.id ? ` [${RANK_NAME[a.rank]}]` : ""}`);
    let hitIdx = 0;
    const doHit = () => {
      if (hitIdx >= a.hits || targets.every((e) => !e.alive)) {
        redrawEnemyInfo();
        refresh();
        wait(240, () => {
          if (phase === "end") return;
          phase = "party";
          endMemberAction();
        });
        return;
      }
      hitIdx++;
      let totalDealt = 0;
      for (const e of targets) {
        if (!e.alive) continue;
        const def = ENEMY_DEFS[e.defId];
        const roll = rollAllyHit(s, a, { mult, bless: blessMult, enemyDef: def.def });
        if (roll.crit) popDmg(e, "치명타!", C.border);
        const dmg = roll.dmg;
        e.hp -= dmg; totalDealt += dmg;
        popDmg(e, dmg, a.kind === "mag" ? 0xb99cff : 0xffffff);
        flashEnemy(e);
        if (e.hp <= 0) { e.hp = 0; killEnemy(e); }
      }
      if (a.drain && totalDealt > 0) {
        const back = Math.round(totalDealt * a.drain);
        m.hp = Math.min(m.maxHp, m.hp + back);
        hud.redraw();
      }
      redrawEnemyInfo();
      wait(200, doHit);
    };
    doHit();
  }

  function killEnemy(e: GridEnemy): void {
    e.alive = false;
    const def = ENEMY_DEFS[e.defId];
    G.gold += def.gold;
    let line = `${def.name}을(를) 쓰러뜨렸다! 경험치 +${def.exp}, ${def.gold} G`;
    if (Math.random() < partyFortune() * 0.012) {
      if (Math.random() < 0.5) { G.items.potion++; line += " · 행운! 치유 물약 획득"; }
      else { G.items.mpotion++; line += " · 행운! 마나 물약 획득"; }
    }
    const ups = gainExpParty(def.exp);
    toast(line, C.border);
    if (ups.length) toast(`레벨 업! ${ups.join(" · ")} (HP/MP 전부 회복 — 길드에서 전직 확인)`, C.border);
    questNotify({ t: "kill", defId: e.defId }).forEach((up) => toast(updateText(up), C.border));
    hud.redraw();
    if (e.symbol) {
      G.explore.defeated[e.symbol] = true;
      questNotify({ t: "clear", symbol: e.symbol }).forEach((up) => toast(updateText(up), C.border));
      if (e.symbol === "lord") {
        phase = "end";
        wait(900, () => {
          if (!G.flags.ending) { G.flags.ending = true; nav.ending(); }
          else nav.town();
        });
        return;
      }
      if (e.symbol === "ancient") {
        phase = "end";
        wait(900, () => nav.epicClear());
        return;
      }
      if (e.symbol === "orc") toast("길목을 지키던 정예를 물리쳤다!", C.elite);
    }
  }

  /* ---- 보스 조우 이벤트 ---- */
  function maybeBossIntro(): void {
    const lord = E.enemies.find((e) => e.symbol === "lord" && e.alive);
    if (!lord || E.lordIntroSeen) return;
    if (chebyshev(E.x, E.y, lord.x, lord.y) > 2 || !hasLOS(map, E.x, E.y, lord.x, lord.y)) return;
    E.lordIntroSeen = true;
    phase = "end"; // 씬 전환 예약 — 입력 차단
    const nodes: EventNode[] = [
      { name: "???", portrait: "dark", text: "…작은 것들이 숲의 심장까지 기어들어 왔군. 왕국이 부서지던 밤, 나는 이 숲과 하나가 되었다." },
      {
        name: "에런", portrait: "hero", text: "마을을 위협하는 게 너인가. 넷이서 왔다 — 여기서 끝내겠다.",
        choices: [
          { label: "무기를 뽑는다 (전투 개시)", goto: 2 },
          { label: "물러난다", effect: () => { G._fled = true; }, goto: "end" },
        ],
      },
      { name: "숲의 군주 그림바크", portrait: "dark", text: "좋다… 부서진 왕국의 마지막 불꽃들이 어디까지 타오르는지 보여다오!" },
    ];
    wait(350, () => switchScene(() => eventScene(nodes, () => {
      suppressRespawn = true;
      if (G._fled) {
        G._fled = false;
        /* 물러난다: 보스방 밖으로 두 칸 후퇴 */
        G.explore.x = 13; G.explore.y = 7; G.explore.facing = 2;
      }
      nav.explore();
    }, { caption: "숲의 심장", bgColor: 0x121022 })));
  }

  /* ---- 상호작용 ---- */
  function interact(): void {
    if (ui.menuOpen || phase === "anim" || phase === "end") return;
    /* 전투 중 정면 적: 현재 파티원의 기본 공격 */
    const fe = frontEnemy();
    if (fe && phase === "party") {
      const m = currentMember();
      if (m) execAttack(m, BASIC_ATTACK, [fe]);
      return;
    }
    /* 자기 칸: 포탈/계단 */
    const here = cellAt(map, E.x, E.y);
    const portal = POIS.find((p) => p.kind === "portal")!;
    if (E.x === portal.x && E.y === portal.y) {
      fullFlash(0x000000, 500, () => nav.town());
      return;
    }
    if (here === "stairs") {
      toast("더 깊은 곳으로 내려가는 계단… 아직은 굳게 봉인되어 있다.", C.dim);
      return;
    }
    /* 정면 칸 POI */
    const f = DIR[E.facing];
    const fx = E.x + f.dx, fy = E.y + f.dy;
    const p = poiBlocking(fx, fy);
    if (!p) { log("아무것도 없다."); return; }
    if (p.kind === "sign") {
      toast("「북서쪽 방에 나그네의 보물이. 북동쪽 심부, 문 너머에 숲의 군주가 잠들어 있다」", C.dim);
      return;
    }
    if (p.id === "c1" && !E.chestOpened.c1) {
      E.chestOpened.c1 = true;
      G.gold += 60; G.items.potion++;
      toast("60 G와 치유 물약을 손에 넣었다!", C.border);
      hud.redraw(); refresh();
      return;
    }
    if (p.id === "hidden" && E.revealed.hidden && !E.chestOpened.hidden) {
      E.chestOpened.hidden = true;
      if (disarmRank < 1) {
        G.party.forEach((m) => { if (m.hp > 0) m.hp = Math.max(1, m.hp - 22); });
        toast("함정이다! 파티가 22의 피해… (함정 스킬이 있었다면)", C.blood);
      } else {
        toast("함정을 해체했다. (함정 스킬)", C.green);
      }
      G.gold += 240; G.items.mpotion++;
      toast("240 G와 마나 물약을 손에 넣었다!", C.border);
      questNotify({ t: "reach", poi: "hidden" }).forEach((up) => toast(updateText(up), C.border));
      hud.redraw(); refresh();
    }
  }

  /* ---- 화면 갱신 ---- */
  function refresh(): void {
    fp.render(map, E.x, E.y, E.facing, fpEntities());
    redrawMinimap();
    redrawEnemyInfo();
    renderTracker();
    /* 정면 프롬프트 */
    const f = DIR[E.facing];
    const fx = E.x + f.dx, fy = E.y + f.dy;
    const fp2 = poiBlocking(fx, fy);
    const portal = POIS.find((q) => q.kind === "portal")!;
    if (E.x === portal.x && E.y === portal.y) prompt.text = "[Z] 마을로 돌아간다";
    else if (cellAt(map, E.x, E.y) === "stairs") prompt.text = "[Z] 계단을 조사한다";
    else if (fp2?.kind === "sign") prompt.text = "[Z] 표지판을 읽는다";
    else if (fp2?.kind === "chest") prompt.text = fp2.id === "hidden" ? "[Z] 수상한 상자를 연다" : "[Z] 상자를 연다";
    else if (frontEnemy() && inCombat) prompt.text = "[Z] 정면의 적을 공격";
    else prompt.text = "";
    /* 어그로 적 정보 */
    const ag = aggroList();
    foeT.text = ag.map((e) => {
      const d = ENEMY_DEFS[e.defId];
      const hp = idRank >= 1 ? ` HP ${e.hp}/${d.hp}` : "";
      return `▸ ${d.name} — ${relLabel(e)}${hp}`;
    }).join("\n");
    foeT.style.fill = ag.length ? C.blood : C.text;
    veilT.text = E.veil > 0 ? `어둠의 장막 지속 중 (${E.veil}턴)` : "";
    blessT.text = G.blessedNext ? "축복: 다음 전투 파티 공격력 +25%" : "";
    /* 회전 등으로 정면이 바뀌면 근접 공격 가능 여부도 갱신 */
    if (phase === "party" && cmdRoot.visible) cmdBtns[0].setDisabled(!frontEnemy());
  }

  /* ---- 방향 패드 (마우스/터치) ---- */
  const mkPad = (label: string, x: number, y: number, fn: () => void) => {
    const b = new PIXI.Container();
    const g = new PIXI.Graphics();
    g.roundRect(-26, -26, 52, 52, 10).fill({ color: 0xffffff, alpha: 0.07 });
    g.roundRect(-26, -26, 52, 52, 10).stroke({ width: 2, color: C.border, alpha: 0.4 });
    const t = txt(label, 19, C.text, { weight: "700" }); t.anchor.set(0.5);
    b.addChild(g, t); b.x = x; b.y = y;
    b.eventMode = "static"; b.cursor = "pointer";
    b.on("pointertap", fn);
    root.addChild(b);
  };
  const PX0 = W - 200, PY0 = H - 150;
  mkPad("↺", PX0, PY0, () => rotate(-1));
  mkPad("▲", PX0 + 60, PY0, () => tryMove("fwd"));
  mkPad("↻", PX0 + 120, PY0, () => rotate(1));
  mkPad("◀", PX0, PY0 + 60, () => tryMove("sl"));
  mkPad("▼", PX0 + 60, PY0 + 60, () => tryMove("back"));
  mkPad("▶", PX0 + 120, PY0 + 60, () => tryMove("sr"));
  mkPad("✦", PX0 + 180, PY0 + 30, () => interact());

  /* ---- ticker: 횃불 플리커만 (이동은 이산 스텝) ---- */
  const ticker = (t: PIXI.Ticker) => { fp.tick(t.deltaMS); };
  app.ticker.add(ticker);

  /* ---- 초기화 ---- */
  revealAround();
  refresh();
  const ag0 = aggroList();
  if (ag0.length) { enterCombat(); startPartyRound(); }

  /* ---- 키 입력 (한글 자판 포함) ---- */
  const KEYMAP: Record<string, () => void> = {
    w: () => tryMove("fwd"), s: () => tryMove("back"),
    a: () => tryMove("sl"), d: () => tryMove("sr"),
    q: () => rotate(-1), e: () => rotate(1),
    z: () => interact(), " ": () => interact(),
    "ㅈ": () => tryMove("fwd"), "ㄴ": () => tryMove("back"),
    "ㅁ": () => tryMove("sl"), "ㅇ": () => tryMove("sr"),
    "ㅂ": () => rotate(-1), "ㄷ": () => rotate(1), "ㅋ": () => interact(),
    ArrowUp: () => tryMove("fwd"), ArrowDown: () => tryMove("back"),
    ArrowLeft: () => rotate(-1), ArrowRight: () => rotate(1),
  };

  return {
    onKey(k) { (KEYMAP[k.length === 1 ? k.toLowerCase() : k])?.(); },
    dispose() { app.ticker.remove(ticker); },
  };
}
