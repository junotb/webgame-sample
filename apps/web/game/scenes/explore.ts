/* =====================================================================
 * scenes/explore.ts — 탐험 모드 (MMX식 그리드 블로버)
 *  - 1인칭 유사 3D 뷰(fpview) + 좌상단 미니맵(안개 걷힘)
 *  - 한 칸 이동/옆걸음 = 1턴, 90도 회전은 무료 (ROTATE_COSTS_TURN)
 *  - 전투는 그리드 위에서 턴제: 근접은 정면 칸, 마법은 시야(LOS) 내
 * ===================================================================== */
import * as PIXI from "pixi.js";
import {
  ENEMY_DEFS, RANK_NAME, RARITY_META, enemyMelee, gearDisplayName,
} from "../defs";
import {
  C, H, SceneHandle, SceneScope, W, button, fullFlash, nav, panel, sceneRoot,
  setModeBadge, toast, tween, txt, ui, wait,
} from "../core";
import {
  BattleAbility, G, GridEnemy, LEVEL_AP, LEVEL_SP, Member, attackReach,
  equippedWeapon, gainExpParty, memberAbilities, memberStats, partyFortune,
  partyRank, respawnEnemies, rollDropToBag,
} from "../state";
import { BASIC_ATTACK, BattleEngine, BattleEvent } from "../core/battle-engine";
import { gameplayRandom } from "../core/random";
import {
  STATUS_COLOR, STATUS_NAME, incapacitatedBy,
} from "../core/statuses";
import { questNotify, trackerLines, updateText } from "../core/quests";
import {
  DIR, FACING_NAME, RelativeMove, cellAt, chebyshev, enemyStep, hasLOS,
  moveTarget, passable, rightOf, rotateFacing,
} from "../grid";
import { POIS, PoiDef, START, fortressMap } from "../goblin-fortress";
import { FPEntity, createFPView } from "../fpview";
import { tileSprite } from "../tiles";
import { drawMonster } from "../monsters";
import type { MonsterView } from "../monsters";
import { buildPartyHUD, pickMember } from "../hud";
import { EventNode, eventOverlay } from "./event";
import { createCombatPresenter } from "./explore/combat-presenter";

const ROTATE_COSTS_TURN = false; // 회전도 턴을 소모시키려면 true
const AGGRO_R = 6;               // 어그로 반경 (체비쇼프 + LOS)
const VEIL_R = 1;                // 어둠의 장막 중 어그로 반경
const MAG_RANGE = 6;             // 마법 사거리
const REVEAL_R = 4;              // 미니맵 안개 걷힘 반경
const VEIL_TURNS = 30;           // 어둠의 장막 지속 턴

export function goblinFortressScene(): SceneHandle {
  const scope = new SceneScope();
  setModeBadge("탐험 모드 — 고블린 요새", C.green);
  const root = new PIXI.Container(); sceneRoot.addChild(root);
  const map = fortressMap;
  const E = G.explore;
  /* 마을·전멸 후 진입: 입구에서 시작 + 일반 몹 리스폰 */
  respawnEnemies();
  E.x = START.x; E.y = START.y; E.facing = START.facing;
  const idRank = partyRank("identify");
  const disarmRank = partyRank("trapfinding");

  /* ---- 배경 + 1인칭 뷰 ---- */
  const voidG = new PIXI.Graphics();
  voidG.rect(0, 0, W, H).fill(C.night);
  root.addChild(voidG);
  const fp = createFPView();
  root.addChild(fp.root);

  /* ---- 엔티티 노드 (씬 소유, fpview가 배치) ---- */
  interface EnemyVis {
    e: GridEnemy;
    node: PIXI.Container;
    monster: MonsterView;
    info: PIXI.Text;
    hpT: PIXI.Text;
  }
  const enemyVis = new Map<string, EnemyVis>();
  const dyingEnemies = new Set<string>();
  for (const e of E.enemies) {
    if (!e.alive) continue;
    const def = ENEMY_DEFS[e.defId];
    const node = new PIXI.Container();
    const monster = drawMonster(def, def.big ?? 1);
    node.addChild(monster);
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
    enemyVis.set(e.id, { e, node, monster, info, hpT });
  }
  function redrawEnemyInfo(): void {
    for (const v of enemyVis.values()) {
      const base = idRank >= 1 ? `HP ${v.e.hp} / ${ENEMY_DEFS[v.e.defId].hp}` : "???";
      const st = v.e.statuses.map((s) => STATUS_NAME[s.id]);
      v.hpT.text = st.length ? `${base}  [${st.join("·")}]` : base;
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
      if (!e.alive && !dyingEnemies.has(e.id)) continue;
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
  const combatPresenter = createCombatPresenter({
    root, enemies: E.enemies, enemyVisuals: enemyVis, party: G.party, log,
    onEnemyDeath: (enemy) => killEnemy(enemy),
  });

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
  let activeEvent: SceneHandle | null = null;
  let disposed = false;
  let actQueue: Member[] = [];
  let actIdx = 0;
  let combat: BattleEngine | null = null;
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
  function tryMove(rel: RelativeMove): void {
    if (ui.menuOpen || phase === "anim" || phase === "end") return;
    const { x: nx, y: ny } = moveTarget(E, rel);
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
    E.facing = rotateFacing(E.facing, dir);
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
    if (inCombat) statusUpkeep();
    if (checkDefeat()) return;
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

  /** 세계 턴마다: 중독 지속 피해 + 상태이상 지속시간 감소 (전투 중에만 호출) */
  function statusUpkeep(): void {
    if (!combat) return;
    const events = combat.gridUpkeep();
    for (const ev of events) {
      if (ev.t === "log") log(ev.text);
      else if (ev.t === "tick") {
        const enemy = E.enemies.find((e) => e.id === ev.unit);
        if (enemy) combatPresenter.popDamage(enemy, `-${ev.amount}`, STATUS_COLOR.poison ?? 0x8fbf4a);
      } else if (ev.t === "status" && !ev.on) {
        const enemy = E.enemies.find((e) => e.id === ev.target);
        const member = G.party.find((m) => `ally:${m.id}` === ev.target);
        const name = enemy ? ENEMY_DEFS[enemy.defId].name : member?.name;
        if (name) toast(`${name} — ${STATUS_NAME[ev.status]} 해제`, C.dim);
      } else if (ev.t === "death") {
        const enemy = E.enemies.find((e) => e.id === ev.unit);
        if (enemy) { killEnemy(enemy); if ((phase as string) === "end") return; }
      }
    }
    hud.redraw();
    redrawEnemyInfo();
  }

  function enemyPhase(): void {
    const r = E.veil > 0 ? VEIL_R : AGGRO_R;
    for (const e of E.enemies) {
      if (!e.alive) continue;
      if (chebyshev(E.x, E.y, e.x, e.y) > r || !hasLOS(map, E.x, E.y, e.x, e.y)) continue;
      /* 수면·마비 — 이번 세계 턴 행동 불가 */
      const incap = incapacitatedBy(e.statuses);
      if (incap) {
        log(`${ENEMY_DEFS[e.defId].name}은(는) ${incap === "sleep" ? "잠들어" : "마비되어"} 움직이지 못한다.`);
        continue;
      }
      const occupied = (x: number, y: number) =>
        !!enemyAt(x, y) || !!poiBlocking(x, y);
      const res = enemyStep(map, e.x, e.y, E.x, E.y, (x, y) =>
        (x === e.x && y === e.y) ? false : occupied(x, y));
      if (res === "attack") enemyAttack(e);
      else if (res) { e.x = res.x; e.y = res.y; }
    }
  }

  function enemyAttack(e: GridEnemy): void {
    if (!combat) return;
    const def = ENEMY_DEFS[e.defId];
    const alive = G.party.filter((m) => m.hp > 0);
    if (!alive.length) return;
    /* 근접 공격은 전열만 노린다 (전열이 전멸했으면 후열이 노출됨). 원거리·광역은 후열까지 닿는다 */
    const front = alive.filter((m) => !m.back);
    const pool = enemyMelee(def) && front.length ? front : alive;
    const events = combat.gridEnemyAct(e.id, pool.map((m) => m.id));
    combatPresenter.presentEnemy(events, e.id, def.name);
    hud.redraw();
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
    const blessed = G.blessedNext;
    if (blessed) { G.blessedNext = false; toast("축복의 가호! 이번 전투 파티 공격력 +25%", C.border); }
    combat = new BattleEngine(G.party, E.enemies, { bless: blessed, items: G.items });
    combat.gridEnter();
    setModeBadge("전투! — 그리드 턴제", C.blood);
    log("적이 파티를 발견했다! (이동·옆걸음도 한 턴을 소모한다)");
  }
  function exitCombat(): void {
    inCombat = false;
    combat?.gridExit();
    combat = null;
    setModeBadge("탐험 모드 — 고블린 요새", C.green);
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
    const incap = combat?.gridBeginAllyTurn(m.id) ?? null;
    /* 수면·마비 — 이 멤버는 이번 라운드 행동 불가 */
    if (incap) {
      log(`${m.name}은(는) ${incap === "sleep" ? "잠들어" : "마비되어"} 행동할 수 없다!`);
      hideCmds();
      phase = "anim";
      wait(420, () => { phase = "party"; endMemberAction(); });
      return;
    }
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

  /** 물리·기본 공격을 사거리에 따라 라우팅 — 근접은 전열+정면 칸, 원거리는 시야 내 대상 */
  function routePhysAttack(m: Member, a: BattleAbility): void {
    if (attackReach(a, equippedWeapon(m)) === "ranged") {
      const ts = magTargets();
      if (!ts.length) { toast("시야에 닿는 적이 없다.", C.dim); return; }
      closeSub();
      if (ts.length === 1) { execAttack(m, a, ts); return; }
      pendingMag = a; openTargetMenu(m, ts);
      return;
    }
    if (m.back) { toast("후열에서는 근접 공격을 할 수 없다. (활·마법을 쓰거나 진형을 바꿔라)", C.dim); return; }
    const fe = frontEnemy();
    if (!fe) { toast("정면 칸에 적이 없다. (근접은 바로 앞 칸만)", C.dim); return; }
    closeSub();
    execAttack(m, a, [fe]);
  }
  /** 이 멤버가 지금 기본 공격을 할 수 있는가 (사거리·진형 고려) */
  function canBasicAttack(m: Member): boolean {
    return attackReach(BASIC_ATTACK, equippedWeapon(m)) === "ranged"
      ? magTargets().length > 0
      : !m.back && !!frontEnemy();
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
      enabled: (m) => canBasicAttack(m),
      fn: (m) => routePhysAttack(m, BASIC_ATTACK),
    },
    { label: "스킬", fn: (m) => openSkillMenu(m) },
    {
      label: "방어",
      fn: (m) => {
        const events = combat?.gridGuard(m.id) ?? [];
        const line = events.find((ev): ev is Extract<BattleEvent, { t: "log" }> => ev.t === "log");
        if (line) log(line.text);
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
      if (c.enabled && !c.enabled(m)) {
        toast(m.back ? "후열은 근접 공격 불가 — 활·마법을 쓰거나 진형을 바꿔라." : "시야에 닿는 적이 없다.", C.dim);
        return;
      }
      c.fn(m);
    }, { size: 16 });
    b.x = 240 + i * 138; b.y = H - 72; cmdRoot.addChild(b);
    return b;
  });
  function showCmds(m: Member): void {
    cmdRoot.visible = true;
    cmdName.text = `▶ ${m.name}${m.back ? "(후열)" : "(전열)"}의 행동 — 근접은 전열·정면 칸, 활·마법은 시야 내`;
    cmdBtns[0].setDisabled(!canBasicAttack(m));
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
            const events = combat?.gridHeal(m.id, a, t2.id) ?? [];
            const line = events.find((ev): ev is Extract<BattleEvent, { t: "log" }> => ev.t === "log");
            if (line) log(line.text);
            hud.redraw();
            endMemberAction();
          }, { filter: (t2) => t2.hp > 0, note: (t2) => `HP ${t2.hp}/${t2.maxHp}` });
          return;
        }
        if (a.cover) {
          closeSub();
          pickMember(`${a.name} — 보호할 아군`, (t2) => {
            const events = combat?.gridCover(m.id, a, t2.id) ?? [];
            const line = events.find((ev): ev is Extract<BattleEvent, { t: "log" }> => ev.t === "log");
            if (line) log(line.text);
            hud.redraw();
            endMemberAction();
          }, { filter: (t2) => t2.hp > 0 && t2.id !== m.id, note: (t2) => `HP ${t2.hp}/${t2.maxHp}` });
          return;
        }
        if (a.kind === "phys") {
          routePhysAttack(m, a); // 사거리·진형에 따라 근접/원거리 라우팅
          return;
        }
        /* 마법 */
        const ts = magTargets();
        if (!ts.length) { toast("시야에 닿는 적이 없다.", C.dim); return; }
        closeSub();
        if (a.all) { execAttack(m, a, ts); return; }
        if (ts.length === 1) { execAttack(m, a, ts); return; }
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
      closeSub();
      execAttack(m, a, [e]);
      return;
    }
    /* 대상 선택 중이 아니면 기본 공격: 원거리는 시야 내 그 적을, 근접은 정면 전열만 */
    if (attackReach(BASIC_ATTACK, equippedWeapon(m)) === "ranged") {
      if (chebyshev(E.x, E.y, e.x, e.y) <= MAG_RANGE && hasLOS(map, E.x, E.y, e.x, e.y)) execAttack(m, BASIC_ATTACK, [e]);
      else toast("시야가 닿지 않는다.", C.dim);
    } else if (frontEnemy() === e && !m.back) {
      execAttack(m, BASIC_ATTACK, [e]);
    }
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
      const events = combat?.gridItem("potion", t.id) ?? [];
      const line = events.find((ev): ev is Extract<BattleEvent, { t: "log" }> => ev.t === "log");
      if (line) log(line.text);
      hud.redraw();
    });
    mk("마나 물약 (MP 25)", G.items.mpotion, p.y + 94, (t) => {
      const events = combat?.gridItem("mpotion", t.id) ?? [];
      const line = events.find((ev): ev is Extract<BattleEvent, { t: "log" }> => ev.t === "log");
      if (line) log(line.text);
      hud.redraw();
    });
    const cb = button("닫기", 76, 32, closeSub, { size: 13 });
    cb.x = p.x + 440 - 90; cb.y = p.y + 8; subRoot.addChild(cb);
  }

  /* ---- 공격 실행 ---- */
  function execAttack(m: Member, a: BattleAbility, targets: GridEnemy[]): void {
    if (!combat) return;
    phase = "anim";
    hideCmds();
    const events = combat.gridOffense(m.id, a, targets.map((e) => e.id));
    combatPresenter.presentAlly(events, m.name);
    hud.redraw();
    redrawEnemyInfo();
    refresh();
    wait(Math.max(240, a.hits * 200), () => {
      if (phase === "end") return;
      phase = "party";
      endMemberAction();
    });
  }

  function killEnemy(e: GridEnemy): void {
    e.alive = false;
    dyingEnemies.add(e.id);
    const visual = enemyVis.get(e.id);
    if (visual) {
      visual.info.visible = false;
      visual.hpT.visible = false;
      visual.node.eventMode = "none";
    }
    visual?.monster.playMotion("death", () => {
      dyingEnemies.delete(e.id);
      if (!disposed) refresh();
    });
    const def = ENEMY_DEFS[e.defId];
    G.gold += def.gold;
    let line = `${def.name}을(를) 쓰러뜨렸다! 경험치 +${def.exp}, ${def.gold} G`;
    if (gameplayRandom() < partyFortune() * 0.012) {
      if (gameplayRandom() < 0.5) { G.items.potion++; line += " · 행운! 치유 물약 획득"; }
      else { G.items.mpotion++; line += " · 행운! 마나 물약 획득"; }
    }
    const ups = gainExpParty(def.exp);
    toast(line, C.border);
    /* 장비 드랍 — 티어·운으로 판정, 가방에 추가 (미확인은 감정 필요) */
    const drop = rollDropToBag(def.tier);
    if (drop) {
      const rm = RARITY_META[drop.rarity];
      toast(`${gearDisplayName(drop)} 획득! [${rm.name}]${drop.identified ? "" : " — 미확인 (식별 필요)"} · 가방에 보관`, rm.color);
    }
    if (ups.length) toast(`레벨 업! ${ups.join(" · ")} — 모험 수첩에서 성장 포인트를 배분하라 (능력치 ${LEVEL_AP}·스킬 ${LEVEL_SP})`, C.border);
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
    phase = "end"; // 이벤트가 끝날 때까지 탐험 입력 차단
    const nodes: EventNode[] = [
      { name: "???", portrait: "dark", text: "…쥐새끼들이 내 소굴 깊은 곳까지 기어들어 왔군. 이 요새의 돌 하나하나가 내 것이다." },
      {
        name: "에런", portrait: "hero", text: "마을을 약탈하고 사람들을 가둔 게 너인가. 넷이서 왔다 — 여기서 끝내겠다.",
        choices: [
          { label: "무기를 뽑는다 (전투 개시)", goto: 2 },
          { label: "물러난다", effect: () => { G._fled = true; }, goto: "end" },
        ],
      },
      { name: "고블린 로드 그름바크", portrait: "dark", text: "좋다… 요새에 발 들인 작은 불꽃들이 어디까지 타오르는지 보여다오!" },
    ];
    wait(350, () => {
      if (disposed) return;
      activeEvent = eventOverlay(nodes, () => {
        activeEvent = null;
        if (G._fled) {
          G._fled = false;
          /* 물러난다: 보스방 밖으로 두 칸 후퇴 */
          G.explore.x = 13; G.explore.y = 7; G.explore.facing = 2;
        }
        revealAround();
        refresh();
        const ag = aggroList();
        if (ag.length) {
          enterCombat();
          startPartyRound();
        } else phase = "free";
      }, { caption: "요새의 알현실" });
    });
  }

  /* ---- 상호작용 ---- */
  function interact(): void {
    if (ui.menuOpen || phase === "anim" || phase === "end") return;
    /* 전투 중 정면 적: 현재 파티원의 기본 공격 (사거리·진형 반영) */
    const fe = frontEnemy();
    if (fe && phase === "party") {
      const m = currentMember();
      if (m) routePhysAttack(m, BASIC_ATTACK);
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
      toast("「북서쪽 방에 나그네의 보물이. 북동쪽 심부, 문 너머 알현실에 고블린 로드가 도사린다」", C.dim);
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
    /* 회전 등으로 정면이 바뀌면 공격 가능 여부도 갱신 */
    const cm = currentMember();
    if (phase === "party" && cmdRoot.visible && cm) cmdBtns[0].setDisabled(!canBasicAttack(cm));
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

  /* ---- ticker: 환경 효과 + 단일 프레임 몬스터 모션 ---- */
  const ticker = (t: PIXI.Ticker) => {
    fp.tick(t.deltaMS);
    for (const visual of enemyVis.values()) visual.monster.tickMotion(t.deltaMS);
  };
  scope.ticker(ticker);

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
    onKey(k) {
      if (activeEvent) { activeEvent.onKey?.(k); return; }
      (KEYMAP[k.length === 1 ? k.toLowerCase() : k])?.();
    },
    dispose() {
      disposed = true;
      activeEvent?.dispose?.();
      activeEvent = null;
      scope.dispose();
    },
  };
}
