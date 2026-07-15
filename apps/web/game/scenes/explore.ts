/* =====================================================================
 * scenes/explore.ts — 탐험 모드 (어나더 에덴식 멀티 레인 + 갈림길)
 *  - 3개 레인(깊이). 레인 이동은 '갈림길' 구간에서만 ↑↓ 가능
 *  - 일반 몹: 이동 중 확률 인카운터 / 정예·보스·에픽: 심볼 배치
 *  - 리더 뒤로 파티원 3명이 궤적을 따라 후행
 * ===================================================================== */
import * as PIXI from "pixi.js";
import { ENEMY_DEFS, EnemyDef } from "../data";
import {
  C, H, SceneHandle, W, app, fullFlash, keys, nav, overlayRoot,
  sceneRoot, setModeBadge, switchScene, toast, txt, ui,
} from "../core";
import { G, partyRank } from "../state";
import { TILE, TileName, tileSprite } from "../tiles";
import { drawAdventurer, drawMonster } from "../monsters";
import { buildPartyHUD } from "../hud";
import { eventScene, EventNode } from "./event";

const WORLD_W = 3400;
/** 레인별 보행 y (0=안쪽/멀리, 2=바깥/가까이) */
const LANE_Y = [472, 548, 624];
const LANE_SCALE = [0.82, 0.93, 1.04];
/** 갈림길 구간: 이 x 범위 안에서만 ↑↓ 레인 이동 가능 */
const JUNCTIONS = [
  { x: 760, w: 150 },
  { x: 1560, w: 150 },
  { x: 2380, w: 150 },
  { x: 2960, w: 150 },
];
function inJunction(x: number): boolean {
  return JUNCTIONS.some((j) => Math.abs(x - j.x) < j.w / 2);
}

interface ExObj {
  id: string; x: number; lane: number;
  node: PIXI.Container; radius: number; prompt: string;
  hidden?: () => boolean;
  act: (self: ExObj) => void;
  bob?: (dt: number) => void;
}

export function exploreScene(): SceneHandle {
  setModeBadge("탐험 모드 — 황혼의 숲 지하미궁", C.green);
  const root = new PIXI.Container(); sceneRoot.addChild(root);
  const E = G.explore;
  const idRank = partyRank("identify");
  const disarmRank = partyRank("trapfinding");

  /* --- 던전 타일맵 (dungeon_tileset.png / 샘플 맵 구도) ---
   *  천장(wall_top) 1줄 → 벽면(wall/moss/torch) 5줄 → 석재 바닥(레인 지대)
   *  바닥 변형: 균열·유골, 최하단 줄에 물웅덩이·최심부 계단 */
  const TS = TILE * 2;                         // 화면 타일 크기 64px
  const COLS = Math.ceil(WORLD_W / TS);
  const WALLTOP_Y = 32;
  const WALL_Y0 = WALLTOP_Y + TS;
  const WALL_ROWS = 5;
  const FLOOR_Y0 = WALL_Y0 + WALL_ROWS * TS;   // 416 — 레인 지대 시작
  const FLOOR_ROWS = Math.ceil((H - FLOOR_Y0) / TS);
  /* 칸마다 고정된 변형을 고르는 결정적 의사난수 */
  const rnd = (n: number) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  const voidG = new PIXI.Graphics();
  voidG.rect(0, 0, W, H).fill(C.night);
  root.addChild(voidG);

  const world = new PIXI.Container(); root.addChild(world);
  const tiles = new PIXI.Container(); world.addChild(tiles);
  const torchGlows: { g: PIXI.Graphics; phase: number }[] = [];

  /* 최하단 줄 물웅덩이 (레인 바깥 장식) */
  const POOLS = [{ c0: 14, w: 3 }, { c0: 27, w: 2 }, { c0: 44, w: 3 }];
  const inPool = (c: number) => POOLS.some((p) => c >= p.c0 && c < p.c0 + p.w);

  for (let cx = 0; cx < COLS; cx++) {
    const x = cx * TS;
    const top = tileSprite("wall_top"); top.x = x; top.y = WALLTOP_Y; tiles.addChild(top);
    for (let r = 0; r < WALL_ROWS; r++) {
      const isTorch = r === 1 && cx % 5 === 2;
      const name: TileName = isTorch ? "torch"
        : rnd(cx * 31 + r * 7) < 0.13 ? "wall_moss" : "wall";
      const s = tileSprite(name); s.x = x; s.y = WALL_Y0 + r * TS; tiles.addChild(s);
      if (isTorch) {
        const glow = new PIXI.Graphics();
        glow.circle(0, 0, 46).fill(0xe87820);
        glow.blendMode = "add"; glow.alpha = 0.08;
        glow.x = x + 31; glow.y = WALL_Y0 + r * TS + 21;
        tiles.addChild(glow);
        torchGlows.push({ g: glow, phase: cx * 1.7 });
      }
    }
    for (let r = 0; r < FLOOR_ROWS; r++) {
      const v = rnd(cx * 13 + r * 101);
      let name: TileName = v < 0.09 ? "floor_crack" : v > 0.988 ? "bones" : "floor";
      if (r === FLOOR_ROWS - 1) {
        if (inPool(cx)) name = "water";
        else if (cx === COLS - 2) name = "stairs"; // 최심부: 더 깊은 곳으로
      }
      const s = tileSprite(name); s.x = x; s.y = FLOOR_Y0 + r * TS; tiles.addChild(s);
    }
  }

  /* 3개 레인 통로 + 갈림길 연결로 (타일 위 하이라이트) */
  const laneG = new PIXI.Graphics();
  LANE_Y.forEach((y, li) => {
    laneG.rect(0, y - 14, WORLD_W, 40).fill({ color: 0xd8c9a0, alpha: 0.05 + li * 0.02 });
    laneG.moveTo(0, y - 14).lineTo(WORLD_W, y - 14).stroke({ width: 1, color: C.border, alpha: 0.08 });
  });
  for (const j of JUNCTIONS) {
    laneG
      .roundRect(j.x - j.w / 2, LANE_Y[0] - 14, j.w, LANE_Y[2] - LANE_Y[0] + 40, 14)
      .fill({ color: 0xd8c9a0, alpha: 0.09 });
    laneG
      .roundRect(j.x - j.w / 2, LANE_Y[0] - 14, j.w, LANE_Y[2] - LANE_Y[0] + 40, 14)
      .stroke({ width: 1, color: C.border, alpha: 0.28 });
  }
  world.addChild(laneG);
  /* 갈림길 표식 */
  for (const j of JUNCTIONS) {
    const mark = txt("↕ 갈림길", 13, C.border, { weight: "700", shadow: true });
    mark.anchor.set(0.5); mark.x = j.x; mark.y = LANE_Y[0] - 34;
    world.addChild(mark);
  }
  /* 장식 기둥 (벽 하단, 갈림길 제외) */
  for (let x = 260; x < WORLD_W; x += 300) {
    if (inJunction(x)) continue;
    const p = tileSprite("pillar_obj", 3);
    p.anchor.set(0.5, 1);
    p.x = x; p.y = FLOOR_Y0 + 14;
    world.addChild(p);
  }

  /* --- 오브젝트 (레인 지정) --- */
  const objects: ExObj[] = [];
  function addObj(o: ExObj): void {
    objects.push(o); world.addChild(o.node);
    o.node.x = o.x; o.node.y = LANE_Y[o.lane] + 12;
    o.node.scale.set(LANE_SCALE[o.lane]);
  }
  /* 마을 포탈 — 가운데 레인 (석재 문틀 + 목재 문 타일) */
  {
    const g = new PIXI.Container();
    const frame = new PIXI.Graphics();
    frame.roundRect(-48, -126, 96, 130, 8).fill(0x2e2648);
    frame.roundRect(-48, -126, 96, 130, 8).stroke({ width: 2, color: C.border, alpha: 0.7 });
    const door = tileSprite("door_obj", 4);
    door.anchor.set(0.5, 1); door.y = -6;
    const lb = txt("◀ 리븐홀드", 14, C.border, { weight: "700" });
    lb.anchor.set(0.5); lb.y = -146;
    g.addChild(frame, door, lb);
    addObj({
      id: "portal", x: 110, lane: 1, node: g, radius: 70, prompt: "마을로 돌아간다",
      act: () => fullFlash(0x000000, 500, () => nav.town()),
    });
  }
  /* 표지판 — 가운데 */
  {
    const g = new PIXI.Graphics();
    g.rect(-4, -70, 8, 70).fill(0x4a3a2a);
    g.roundRect(-46, -96, 92, 32, 4).fill(0x5a4a34);
    g.roundRect(-46, -96, 92, 32, 4).stroke({ width: 1, color: C.border, alpha: 0.5 });
    addObj({
      id: "sign", x: 620, lane: 1, node: g, radius: 60, prompt: "표지판을 읽는다",
      act: () => toast("「갈림길에서는 위아래로 길이 갈라진다 — 안쪽 길에 보물이, 바깥 길에 어둠이」", C.dim),
    });
  }
  function chestNode(hiddenGlow?: boolean): PIXI.Container {
    const c = new PIXI.Container();
    const s = tileSprite("chest_obj", 2.5);
    s.anchor.set(0.5, 1);
    c.addChild(s);
    if (hiddenGlow) {
      const g = new PIXI.Graphics();
      g.roundRect(-32, -54, 64, 60, 8).stroke({ width: 2, color: C.epic, alpha: 0.8 });
      c.addChild(g);
    }
    return c;
  }
  /* 일반 상자 — 위쪽(안) 레인: 첫 갈림길에서 올라가야 획득 */
  if (!E.chestOpened.c1) {
    addObj({
      id: "c1", x: 1020, lane: 0, node: chestNode(), radius: 60, prompt: "상자를 연다",
      act(self) {
        E.chestOpened.c1 = true; self.node.visible = false;
        G.gold += 60; G.items.potion++;
        toast("60 G와 치유 물약을 손에 넣었다!", C.border); hud.redraw();
      },
    });
  }
  /* 숨겨진 상자 — 아래(바깥) 레인 + 탐색 필요 */
  if (!E.chestOpened.hidden) {
    const node = chestNode(true); node.visible = E.revealed.hidden;
    addObj({
      id: "hid", x: 1680, lane: 2, node, radius: 60, prompt: "수상한 상자를 연다",
      hidden: () => !E.revealed.hidden,
      act(self) {
        if (!E.revealed.hidden) return;
        E.chestOpened.hidden = true; self.node.visible = false;
        if (disarmRank < 1) {
          G.party.forEach((m) => { if (m.hp > 0) m.hp = Math.max(1, m.hp - 22); });
          toast("함정이다! 파티가 22의 피해… (함정 스킬이 있었다면)", C.blood);
        } else {
          toast("함정을 해체했다. (함정 스킬)", C.green);
        }
        G.gold += 240; G.items.mpotion++;
        toast("240 G와 마나 물약을 손에 넣었다!", C.border); hud.redraw();
      },
    });
  }
  /* 심볼 몬스터 */
  function symbolNode(def: EnemyDef): PIXI.Container {
    const c = new PIXI.Container();
    const g = drawMonster(def, 0.55 * (def.big ?? 1));
    c.addChild(g);
    const tierCol = def.tier === "정예" ? C.elite : def.tier === "보스" ? C.boss : C.epic;
    const badge = txt(`◆ ${def.tier}`, 13, tierCol, { weight: "700", shadow: true });
    badge.anchor.set(0.5); badge.y = -118 * (def.big ?? 1); c.addChild(badge);
    const info = txt(
      idRank >= 1 ? `${def.name} · HP ${def.hp}` : "???",
      12, idRank >= 1 ? C.text : C.dim, { shadow: true });
    info.anchor.set(0.5); info.y = badge.y + 18; c.addChild(info);
    let t0 = Math.random() * 6;
    (c as any).bobFn = (dt: number) => { t0 += dt / 500; g.y = Math.sin(t0) * 4; };
    return c;
  }
  /* 정예 — 위 레인 */
  if (!E.defeated.orc) {
    const node = symbolNode(ENEMY_DEFS.orc);
    addObj({
      id: "orc", x: 2100, lane: 0, node, radius: 70,
      prompt: "[정예] 오크 워로드와 싸운다",
      act: () => nav.battle(["orc", "goblin"], { symbol: "orc" }),
      bob: (node as any).bobFn,
    });
  }
  /* 에픽 — 아래 레인 (보스 처치 후 등장) */
  if (E.defeated.lord && !E.defeated.ancient) {
    const node = symbolNode(ENEMY_DEFS.ancient);
    addObj({
      id: "ancient", x: 2620, lane: 2, node, radius: 80,
      prompt: "[에픽] 고대 정령과 싸운다",
      act: () => nav.battle(["ancient"], { symbol: "ancient" }),
      bob: (node as any).bobFn,
    });
  }
  /* 보스 — 가운데 레인 최심부 */
  if (!E.defeated.lord) {
    const node = symbolNode(ENEMY_DEFS.lord);
    addObj({
      id: "lord", x: 3140, lane: 1, node, radius: 80,
      prompt: "[보스] 숲의 군주에게 도전한다",
      act: () => {
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
        switchScene(() => eventScene(nodes, () => {
          if (G._fled) { G._fled = false; nav.explore(); }
          else nav.battle(["lord", "wolf", "wolf"], { symbol: "lord" });
        }, { caption: "숲의 심장", bgColor: 0x121022 }));
      },
      bob: (node as any).bobFn,
    });
  }

  /* --- 파티 (리더 + 후행 3인) --- */
  const partySprites = G.party.map((m, i) => {
    const c = new PIXI.Container();
    c.addChild(drawAdventurer(m.color, m.accent, i === 0 ? 1.15 : 1.05));
    world.addChild(c);
    return c;
  });
  /* 리더 궤적 버퍼 (후행 이동용) */
  const trail: { x: number; y: number }[] = [];
  const TRAIL_GAP = 13;

  const prompt = txt("", 15, C.text, { weight: "700", shadow: true });
  prompt.anchor.set(0.5, 1); prompt.zIndex = 45; overlayRoot.addChild(prompt);
  const junctionHint = txt("", 14, C.border, { weight: "700", shadow: true });
  junctionHint.anchor.set(0.5, 1); junctionHint.zIndex = 45; overlayRoot.addChild(junctionHint);

  const hint = txt("← → 이동   ↑ ↓ 레인 이동(갈림길에서만)   Z/스페이스 조사", 14, C.dim);
  hint.x = 20; hint.y = H - 32; root.addChild(hint);
  const veilT = txt("", 13, C.epic, { weight: "700" }); veilT.x = 20; veilT.y = H - 56; root.addChild(veilT);
  const blessT = txt("", 13, C.border, { weight: "700" }); blessT.x = 20; blessT.y = H - 78; root.addChild(blessT);

  const hud = buildPartyHUD(root, {
    fieldHandlers: {
      recall() { toast("귀환 마법 발동!", C.arcane); fullFlash(0xffffff, 600, () => nav.town()); },
      bless() { G.blessedNext = true; toast("축복을 받았다. 다음 전투 파티 공격력 +25%!", C.border); },
      darkveil() { E.veil = 1400; toast("어둠의 장막이 발걸음을 감춘다…", C.epic); },
      seek() {
        let found = false;
        if (!E.revealed.hidden && !E.chestOpened.hidden && Math.abs(E.x - 1680) < 520) {
          E.revealed.hidden = true; found = true;
          const o = objects.find((x) => x.id === "hid");
          if (o) o.node.visible = true;
          toast("숨겨진 상자를 발견했다! (아래쪽 길)", C.epic);
        }
        if (!found) toast("주변에서 아무것도 발견하지 못했다.", C.dim);
      },
    },
  });

  /* --- 이동/카메라/인카운터 --- */
  let nearObj: ExObj | null = null;
  let encGauge = 0;
  let touchDir = 0;
  let laneY = LANE_Y[E.lane];
  const SPEED = 4.4;
  let upHeld = false, dnHeld = false;
  let glowT = 0;

  function tryLane(dir: -1 | 1): void {
    if (!inJunction(E.x)) {
      toast("여기서는 길이 갈라지지 않는다. (갈림길에서만 이동 가능)", C.dim);
      return;
    }
    const next = E.lane + dir;
    if (next < 0 || next > 2) return;
    E.lane = next;
  }
  function tryAct(): void {
    if (ui.menuOpen) return;
    if (nearObj && !(nearObj.hidden && nearObj.hidden())) nearObj.act(nearObj);
  }

  const ticker = (t: PIXI.Ticker) => {
    if (ui.menuOpen) return;
    const d = t.deltaTime;
    let dir = 0;
    if (keys["ArrowLeft"] || keys["a"]) dir = -1;
    if (keys["ArrowRight"] || keys["d"]) dir = 1;
    if (touchDir) dir = touchDir;
    if (keys["ArrowUp"] && !upHeld) { upHeld = true; tryLane(-1); }
    if (!keys["ArrowUp"]) upHeld = false;
    if (keys["ArrowDown"] && !dnHeld) { dnHeld = true; tryLane(1); }
    if (!keys["ArrowDown"]) dnHeld = false;

    if (dir) {
      const step = SPEED * d;
      E.x = Math.max(80, Math.min(WORLD_W - 80, E.x + dir * step));
      partySprites.forEach((s) => { s.scale.x = Math.abs(s.scale.x) * (dir < 0 ? -1 : 1); });
      if (E.veil > 0) E.veil = Math.max(0, E.veil - step);
      encGauge += step;
      if (encGauge >= 480) {
        encGauge = 0;
        const rate = E.veil > 0 ? 0.12 : 0.42;
        if (Math.random() < rate && E.x > 700) {
          nav.battle(randomGroup(), {});
          return;
        }
      }
    }
    /* 리더 위치 */
    laneY += (LANE_Y[E.lane] - laneY) * 0.15;
    const leader = partySprites[0];
    leader.x = E.x; leader.y = laneY + 12;
    const sc = LANE_SCALE[Math.round((laneY - LANE_Y[0]) / (LANE_Y[1] - LANE_Y[0]))] ?? LANE_SCALE[E.lane];
    leader.scale.set(sc * (leader.scale.x < 0 ? -1 : 1), sc);
    /* 궤적 기록 + 후행 파티원 */
    const last = trail[trail.length - 1];
    if (!last || Math.abs(last.x - leader.x) + Math.abs(last.y - leader.y) > 2) {
      trail.push({ x: leader.x, y: leader.y });
      if (trail.length > 220) trail.shift();
    }
    for (let i = 1; i < partySprites.length; i++) {
      const idx = trail.length - 1 - i * TRAIL_GAP;
      const pos = trail[Math.max(0, idx)] ?? { x: leader.x - i * 34, y: leader.y };
      const s = partySprites[i];
      s.x += (pos.x - s.x) * 0.3;
      s.y += (pos.y - s.y) * 0.3;
      const fs = sc * 0.96;
      s.scale.set(fs * (s.scale.x < 0 ? -1 : 1), fs);
    }
    /* 카메라 */
    const cam = Math.max(0, Math.min(WORLD_W - W, E.x - W * 0.45));
    world.x = -cam;
    /* 횃불 플리커 */
    glowT += t.deltaMS;
    for (const tg of torchGlows)
      tg.g.alpha = 0.07 + 0.04 * Math.sin(glowT / 160 + tg.phase);
    /* 근접 오브젝트 (같은 레인만) */
    nearObj = null;
    for (const o of objects) {
      o.bob?.(app.ticker.deltaMS);
      if (!o.node.visible) continue;
      if (o.hidden && o.hidden()) continue;
      if (o.lane === E.lane && Math.abs(o.x - E.x) < o.radius) { nearObj = o; break; }
    }
    if (nearObj) {
      prompt.text = `[Z] ${nearObj.prompt}`;
      prompt.x = W * 0.45 + (nearObj.x - E.x); prompt.y = 386;
      prompt.visible = true;
    } else prompt.visible = false;
    /* 갈림길 힌트 */
    if (inJunction(E.x)) {
      junctionHint.text = "↑ ↓ 레인 이동 가능";
      junctionHint.x = W * 0.45; junctionHint.y = 356;
      junctionHint.visible = true;
    } else junctionHint.visible = false;

    veilT.text = E.veil > 0 ? `어둠의 장막 지속 중 (${Math.ceil(E.veil)}보)` : "";
    blessT.text = G.blessedNext ? "축복: 다음 전투 파티 공격력 +25%" : "";
  };
  app.ticker.add(ticker);

  /* --- 터치 버튼 --- */
  const mkTouch = (label: string, x: number, y: number, down: () => void, up?: () => void) => {
    const b = new PIXI.Container();
    const g = new PIXI.Graphics();
    g.circle(0, 0, 34).fill({ color: 0xffffff, alpha: 0.08 });
    g.circle(0, 0, 34).stroke({ width: 2, color: C.border, alpha: 0.4 });
    const t = txt(label, 20, C.text, { weight: "700" }); t.anchor.set(0.5);
    b.addChild(g, t); b.x = x; b.y = y;
    b.eventMode = "static";
    b.on("pointerdown", down);
    if (up) { b.on("pointerup", up); b.on("pointerupoutside", up); }
    root.addChild(b);
  };
  mkTouch("◀", 66, H - 100, () => { touchDir = -1; }, () => { touchDir = 0; });
  mkTouch("▶", 150, H - 100, () => { touchDir = 1; }, () => { touchDir = 0; });
  mkTouch("▲", 234, H - 140, () => tryLane(-1));
  mkTouch("▼", 234, H - 62, () => tryLane(1));
  mkTouch("✦", 318, H - 100, () => tryAct());

  return {
    onKey(k) { if (k === "z" || k === "Z" || k === " ") tryAct(); },
    dispose() {
      app.ticker.remove(ticker);
      prompt.destroy(); junctionHint.destroy();
    },
  };
}

function randomGroup(): string[] {
  const lv = Math.max(...G.party.map((m) => m.level));
  const pool = lv < 3 ? ["slime", "goblin"]
    : lv < 6 ? ["slime", "goblin", "wolf", "skeleton"]
      : ["goblin", "wolf", "skeleton"];
  const n = 2 + (Math.random() < 0.6 ? 1 : 0) + (lv >= 4 && Math.random() < 0.5 ? 1 : 0);
  const g: string[] = [];
  for (let i = 0; i < n; i++) g.push(pool[(Math.random() * pool.length) | 0]);
  return g;
}
