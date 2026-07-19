/* =====================================================================
 * scenes/town.ts — 마을 모드 (1인칭 그리드 탐험형, New Sorpigal풍)
 *  남문—중앙 분수 광장—북단 신전의 대로를 걸으며 건물·NPC와 상호작용.
 *  건물 문 정면 [Z] → 시설 / NPC 정면 [Z] → 주제 대화 / 남문 [Z] → 탐험.
 *  전직·기술 수련은 계열 건물로 분산:
 *   무기점(물리 기술·소드맨 트리) / 방어구점(방어 기술·스펠소드 트리)
 *   영혼 길드(영혼 마법·애콜라이트 트리) / 원소 길드(원소 마법·메이지 트리)
 *   현상금 길드(의뢰 게시판) / 신전(상태이상 정화) / 도구점·여관(기존 역할)
 * ===================================================================== */
import * as PIXI from "pixi.js";
import {
  CLASSES, ClassId, GearDef, NPCS, NpcDef, QUESTS, RANK_NAME, SHOP_ARMORS, SHOP_ITEMS,
  SHOP_WEAPONS, SKILLS,
} from "../defs";
import {
  C, H, SceneHandle, W, app, button, fullFlash, nav, overlayRoot, panel,
  sceneRoot, setModeBadge, toast, tween, txt, ui,
} from "../core";
import {
  G, Member, canClassChange, classOptions, doClassChange, memberRanks,
} from "../state";
import { acceptQuest, questList, questStatus, reportQuest } from "../core/quests";
import { DIR, FACING_NAME, Facing, GridMap, cellAt, leftOf, passable, rightOf } from "../grid";
import { SKILL_PRICE, TownDecoDef, TownFacilityDef, TownGateDef, TownSpawn } from "../townmap";
import { CARRIAGE_FARE, TOWNS, otherTown } from "../towns";
import { FPEntity, FPTheme, SurfacePick, createFPView } from "../fpview";
import { TileName, tileSprite } from "../tiles";
import { portraitTexture } from "../portraits";
import { drawAdventurer } from "../monsters";
import { buildPartyHUD, pickMember } from "../hud";
import { openShopMenu, type ShopKind } from "../ui/shop-menu";

export function townScene(spawn: TownSpawn = "gate"): SceneHandle {
  const T = TOWNS[G.town];
  setModeBadge(T.badge, C.border);
  const root = new PIXI.Container(); sceneRoot.addChild(root);
  const map = T.map;
  /* 시설 문은 논리적으로는 상호작용 지점(door)이지만, 화면·시야에서는 닫힌 벽면이다. */
  const visualMap: GridMap = { ...map, cells: map.cells.map((cell) => cell === "door" ? "wall" : cell) };
  const npcs = NPCS.filter((n) => (n.town ?? "crossvale") === G.town);
  const start = T.starts[spawn] ?? T.starts.carriage ?? T.starts.gate
    ?? T.starts.fountain ?? T.starts.throne!;
  let px = start.x, py = start.y;
  let facing: Facing = start.facing;

  /* ---- 배경 + 1인칭 뷰 (마을 테마) ---- */
  const voidG = new PIXI.Graphics();
  voidG.rect(0, 0, W, H).fill(C.night);
  root.addChild(voidG);

  /* 결정적 의사난수 — 표면 변형 선택용 */
  const hash01 = (x: number, y: number, a: number, b: number): number => {
    const s = Math.sin(x * a + y * b) * 43758.5453;
    return s - Math.floor(s);
  };
  /** 시설 문 좌우 벽 — 횃불을 걸고 창문은 내지 않는다 */
  const besideDoor = (x: number, y: number): boolean =>
    T.facilities.some((f) => f.y === y && Math.abs(f.x - x) === 1);
  const townTheme: FPTheme = {
    /* 거리 바닥은 포장 데칼 2종을 섞는다 */
    floorAt: (x, y): SurfacePick =>
      ({ base: "floor", decal: hash01(x, y, 91.7, 53.3) < 0.5 ? "pave_decal" : "pave2_decal" }),
    /* 건물 벽 — 창문·풍화 벽을 드문드문 */
    wallAt: (x, y): SurfacePick => {
      if (facilityAt(x, y)) return { base: "wall", decal: "door_closed_obj" };
      if (besideDoor(x, y)) return { base: "wall" };
      const h = hash01(x, y, 17.3, 71.9);
      if (h < 0.16) return { base: "wall", decal: "wall_window_decal" };
      if (h < 0.34) return { base: "wall", decal: "wall_worn2_decal" };
      return { base: "wall" };
    },
    torchAt: (x, y) => besideDoor(x, y) || hash01(x, y, 29.1, 47.7) < 0.05,
    ceiling: "ceiling",
    water: "water",
    stairs: { base: "floor", decal: "stairs_decal" },
    floorTint: 0x93a85a,
    wallTint: 0x9a8062,
    ceilingTint: 0x73834e,
  };
  const fp = createFPView(townTheme);
  root.addChild(fp.root);

  /* ---- 칸 점유 판정 ---- */
  const facilityAt = (x: number, y: number): TownFacilityDef | undefined =>
    T.facilities.find((f) => f.x === x && f.y === y);
  const decoAt = (x: number, y: number): TownDecoDef | undefined =>
    T.decos.find((d) => d.x === x && d.y === y);
  const blockingDecoAt = (x: number, y: number): TownDecoDef | undefined => {
    const d = decoAt(x, y);
    return d?.blocking === false ? undefined : d;
  };
  const npcAt = (x: number, y: number): NpcDef | undefined =>
    npcs.find((n) => n.gx === x && n.gy === y);
  const gateAt = (x: number, y: number): TownGateDef | undefined =>
    T.gates.find((g) => g.x === x && g.y === y);

  /* =====================================================================
   * 엔티티 노드 (문·간판, 분수·우물, 성문, NPC)
   * ===================================================================== */
  const ents: FPEntity[] = [];

  /* 문(+) — 문 그림은 벽면에 원근 렌더링, 여기서는 시설 간판만 남긴다. */
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    if (cellAt(map, x, y) !== "door") continue;
    const fac = facilityAt(x, y);
    if (!fac) continue;
    const node = new PIXI.Container();
    const lb = txt(fac.name, 12, C.border, { weight: "700", shadow: true });
    lb.anchor.set(0.5, 1); lb.y = -134; node.addChild(lb);
    ents.push({ id: `door-label:${x},${y}`, x, y, node, worldH: 0.92, baseH: 128 });
  }

  /* 분수 — 광장의 심장 (마을에 분수가 있을 때만) */
  {
    const d = T.decos.find((t) => t.id === "fountain");
    if (d) {
      const node = new PIXI.Container();
      const g = new PIXI.Graphics();
      g.ellipse(0, 2, 48, 10).fill({ color: 0x000000, alpha: 0.3 });
      g.roundRect(-44, -24, 88, 24, 6).fill(0x4a4560);
      g.roundRect(-44, -24, 88, 24, 6).stroke({ width: 2, color: 0x6a657f, alpha: 0.8 });
      g.ellipse(0, -24, 40, 12).fill(0x3c6e8e);
      g.rect(-5, -58, 10, 34).fill(0x6a657f);
      g.ellipse(0, -58, 18, 6).fill(0x5a5570);
      g.ellipse(0, -60, 14, 4).fill(0x4f9fd0);
      g.rect(-1.5, -78, 3, 18).fill({ color: 0x9fd0e8, alpha: 0.8 });
      g.circle(0, -79, 4).fill({ color: 0xcfe8f4, alpha: 0.9 });
      node.addChild(g);
      ents.push({ id: "fountain", x: d.x, y: d.y, node, worldH: 0.55, baseH: 84 });
    }
  }

  /* 우물 (마을에 우물이 있을 때만) */
  {
    const d = T.decos.find((t) => t.id === "well");
    if (d) {
      const node = new PIXI.Container();
      const g = new PIXI.Graphics();
      g.ellipse(0, 2, 28, 7).fill({ color: 0x000000, alpha: 0.3 });
      g.roundRect(-24, -26, 48, 26, 5).fill(0x5a5570);
      g.roundRect(-24, -26, 48, 26, 5).stroke({ width: 2, color: 0x6a657f, alpha: 0.8 });
      g.ellipse(0, -26, 20, 6).fill(0x14101f);
      g.rect(-21, -58, 4, 32).rect(17, -58, 4, 32).fill(0x4a3a2a);
      g.moveTo(-27, -56).lineTo(0, -72).lineTo(27, -56).closePath().fill(0x6a4a3a);
      node.addChild(g);
      ents.push({ id: "well", x: d.x, y: d.y, node, worldH: 0.5, baseH: 74 });
    }
  }

  /* 석상 — 에버모어 성 광장의 군주·사자상 */
  for (const d of T.decos) {
    if (d.id !== "statue") continue;
    const node = new PIXI.Container();
    const g = new PIXI.Graphics();
    g.ellipse(0, 2, 24, 6).fill({ color: 0x000000, alpha: 0.3 });
    g.roundRect(-20, -22, 40, 22, 4).fill(0x4a4560);
    g.roundRect(-20, -22, 40, 22, 4).stroke({ width: 2, color: 0x6a657f, alpha: 0.7 });
    g.roundRect(-10, -76, 20, 54, 8).fill(0x8a86a0);
    g.circle(0, -86, 11).fill(0x9a96b0);
    g.roundRect(-13, -60, 26, 8, 3).fill({ color: 0x7a7690, alpha: 0.9 });
    node.addChild(g);
    ents.push({ id: `statue:${d.x},${d.y}`, x: d.x, y: d.y, node, worldH: 0.62, baseH: 92 });
  }

  /* 술통·짐짝 — 타일 팩 소품 스프라이트 */
  for (const d of T.decos) {
    if (d.id !== "barrel" && d.id !== "crate") continue;
    const node = new PIXI.Container();
    const s = tileSprite(d.id === "barrel" ? "barrel_obj" : "crate_obj", 2);
    s.anchor.set(0.5, 1); node.addChild(s);
    ents.push({
      id: d.id, x: d.x, y: d.y, node,
      worldH: d.id === "barrel" ? 0.5 : 0.45, baseH: 64,
    });
  }

  /* 나무·덤불·꽃·버섯 — 새 자연 타일을 1인칭 빌보드로 배치 */
  const treeTiles: TileName[] = ["tree_01", "tree_02", "tree_03", "tree_04"];
  for (const d of T.decos) {
    if (!["tree", "bush", "flower", "mushroom"].includes(d.id)) continue;
    const tile: TileName = d.id === "tree"
      ? treeTiles[(d.x + d.y) % treeTiles.length]
      : d.id === "bush" ? "bush_01"
        : d.id === "flower" ? "flower_01" : "mushroom_01";
    const node = new PIXI.Container();
    const s = tileSprite(tile); s.anchor.set(0.5, 1); node.addChild(s);
    const tall = d.id === "tree";
    ents.push({
      id: `deco:${d.x},${d.y}`, x: d.x, y: d.y, node,
      worldH: tall ? 0.98 : d.id === "bush" ? 0.34 : 0.16,
      baseH: tall ? 112 : d.id === "bush" ? 32 : 16,
    });
  }

  /* 성문 — 좌우 석주 한 쌍 (성문이 있는 마을만) */
  T.gates.forEach((gpos) => {
    const node = new PIXI.Container();
    const g = new PIXI.Graphics();
    g.rect(-34, -116, 18, 116).rect(16, -116, 18, 116).fill(0x5a4939);
    g.rect(-38, -128, 76, 16).fill(0x3f3329);
    g.rect(-34, -116, 18, 116).rect(16, -116, 18, 116).stroke({ width: 2, color: C.border, alpha: 0.28 });
    node.addChild(g);
    const lb = txt(gpos.label, 12, C.text, { weight: "700", shadow: true });
    lb.anchor.set(0.5, 1); lb.y = -134; node.addChild(lb);
    ents.push({ id: `gate:${gpos.id}`, x: gpos.x, y: gpos.y, node, worldH: 1.0, baseH: 120 });
  });

  /* NPC — 이름표 + 퀘스트 !/? 마커 */
  const npcMarks: (() => void)[] = [];
  const refreshNpcMarks = () => npcMarks.forEach((fn) => fn());
  npcs.forEach((n) => {
    const node = new PIXI.Container();
    node.addChild(drawAdventurer(n.color, n.accent, 1.2));
    const nm = txt(n.name, 12, C.border, { weight: "700", shadow: true });
    nm.anchor.set(0.5, 0); nm.y = 6; node.addChild(nm);
    const mark = txt("!", 18, C.elite, { weight: "900", shadow: true });
    mark.anchor.set(0.5, 1); mark.y = -84; node.addChild(mark);
    const refreshMark = () => {
      const st = (n.quests ?? []).map((q) => questStatus(q));
      mark.text = st.includes("done") ? "!" : st.includes("available") ? "?" : "";
      mark.style.fill = st.includes("done") ? C.elite : C.dim;
    };
    refreshMark();
    npcMarks.push(refreshMark);
    ents.push({ id: `npc:${n.id}`, x: n.gx, y: n.gy, node, worldH: 0.62, baseH: 92 });
  });

  /* =====================================================================
   * 미니맵 (좌상단, 안개 없음 — 마을은 전부 보인다)
   * ===================================================================== */
  const MM_CELL = 6;
  const mm = new PIXI.Container(); mm.x = 16; mm.y = 54; root.addChild(mm);
  mm.addChild(panel(map.w * MM_CELL + 16, map.h * MM_CELL + 16, { alpha: 0.88 }));
  const mmG = new PIXI.Graphics(); mmG.x = 8; mmG.y = 8; mm.addChild(mmG);
  const compassT = txt("", 14, C.border, { weight: "700" });
  compassT.x = 16; compassT.y = mm.y + map.h * MM_CELL + 22; root.addChild(compassT);

  function redrawMinimap(): void {
    mmG.clear();
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const k = cellAt(map, x, y);
      const col = k === "wall" ? 0x35304a
        : k === "water" ? 0x2c4a6e
          : k === "door" ? 0x7a5a34
            : 0x6e6552;
      mmG.rect(x * MM_CELL, y * MM_CELL, MM_CELL - 1, MM_CELL - 1).fill(col);
    }
    for (const f of T.facilities)
      mmG.rect(f.x * MM_CELL, f.y * MM_CELL, MM_CELL - 1, MM_CELL - 1).fill(C.border);
    for (const d of T.decos)
      mmG.rect(d.x * MM_CELL + 1, d.y * MM_CELL + 1, MM_CELL - 3, MM_CELL - 3)
        .fill(d.id === "fountain" ? 0x4f9fd0 : d.id === "statue" ? 0x9a96b0 : 0x8a7430);
    for (const gpos of T.gates)
      mmG.rect(gpos.x * MM_CELL, gpos.y * MM_CELL, MM_CELL - 1, MM_CELL - 1).fill(0x5ad07a);
    for (const n of npcs)
      mmG.circle(n.gx * MM_CELL + MM_CELL / 2, n.gy * MM_CELL + MM_CELL / 2, 2.4).fill(n.accent);
    /* 파티 화살표 */
    const cx = px * MM_CELL + MM_CELL / 2 - 0.5, cy = py * MM_CELL + MM_CELL / 2 - 0.5;
    const a = [[0, -3.6], [3, 2.8], [-3, 2.8]].map(([ax, ay]) => {
      const r = (facing * Math.PI) / 2;
      return [cx + ax * Math.cos(r) - ay * Math.sin(r), cy + ax * Math.sin(r) + ay * Math.cos(r)];
    });
    mmG.moveTo(a[0][0], a[0][1]).lineTo(a[1][0], a[1][1]).lineTo(a[2][0], a[2][1]).closePath()
      .fill(0xffffff);
    compassT.text = `▲ ${FACING_NAME[facing]}쪽을 보는 중`;
  }

  /* ---- 로그 / 프롬프트 / 힌트 ---- */
  const logP = panel(620, 46, { alpha: 0.82 }); logP.x = (W - 620) / 2; logP.y = 12; root.addChild(logP);
  const logT = txt("", 15, C.text); logT.x = logP.x + 16; logT.y = 25; root.addChild(logT);
  const log = (s: string) => { logT.text = s; };
  log(
    spawn === "fountain" ? `${T.name}의 광장 — 분수 곁에 장로 카엘이 서 있다.`
      : spawn === "carriage" ? `역마차에서 내려 ${T.name}에 도착했다.`
        : spawn === "throne" ? "연방 군주에게 인사를 마치고 물러났다."
          : `남문을 지나 ${T.name}(으)로 돌아왔다.`);

  const prompt = txt("", 16, C.text, { weight: "700", shadow: true });
  prompt.anchor.set(0.5, 1); prompt.x = W / 2; prompt.y = H - 168; root.addChild(prompt);
  const hint = txt("W/S 전진·후진   A/D 옆걸음   Q/E·←→ 회전   Z/스페이스 조사", 13, C.dim);
  hint.x = 16; hint.y = H - 28; root.addChild(hint);

  const hud = buildPartyHUD(root);

  /* =====================================================================
   * 이동
   * ===================================================================== */
  let overlayOpen = false;
  const busy = (): boolean => overlayOpen || ui.menuOpen;

  function tryMove(rel: "fwd" | "back" | "sl" | "sr"): void {
    if (busy()) return;
    const f: Facing = rel === "fwd" ? facing : rel === "back" ? (((facing + 2) % 4) as Facing)
      : rel === "sl" ? leftOf(facing) : rightOf(facing);
    const nx = px + DIR[f].dx, ny = py + DIR[f].dy;
    if (!passable(map, nx, ny) || facilityAt(nx, ny) || npcAt(nx, ny) || blockingDecoAt(nx, ny)) { bump(); return; }
    px = nx; py = ny;
    stepBob();
    refresh();
  }
  function rotate(dir: -1 | 1): void {
    if (busy()) return;
    facing = dir < 0 ? leftOf(facing) : rightOf(facing);
    refresh();
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

  /* =====================================================================
   * 상호작용 — 자기 칸(성문·문) 우선, 다음 정면 칸
   * ===================================================================== */
  const enterGate = (gate: TownGateDef): void => {
    fullFlash(0x000000, 500, () => nav.field(gate.target));
  };
  function interact(): void {
    if (busy()) return;
    const ownGate = gateAt(px, py);
    if (ownGate) { enterGate(ownGate); return; }
    const own = facilityAt(px, py);
    if (own) { openFacility(own); return; }
    const fx = px + DIR[facing].dx, fy = py + DIR[facing].dy;
    const frontGate = gateAt(fx, fy);
    if (frontGate) { enterGate(frontGate); return; }
    const npc = npcAt(fx, fy);
    if (npc) { openNpc(npc); return; }
    const fac = facilityAt(fx, fy);
    if (fac) { openFacility(fac); return; }
    const deco = decoAt(fx, fy);
    if (deco) { log(deco.text); return; }
    log("아무것도 없다.");
  }

  /* ---- 화면 갱신 ---- */
  function refresh(): void {
    fp.render(visualMap, px, py, facing, ents);
    redrawMinimap();
    const fx = px + DIR[facing].dx, fy = py + DIR[facing].dy;
    const gate = gateAt(px, py) ?? gateAt(fx, fy);
    if (gate) prompt.text = gate.prompt;
    else if (facilityAt(px, py)) prompt.text = `[Z] ${facilityAt(px, py)!.name}에 들어간다`;
    else if (facilityAt(fx, fy)) prompt.text = `[Z] ${facilityAt(fx, fy)!.name}에 들어간다`;
    else if (npcAt(fx, fy)) prompt.text = `[Z] ${npcAt(fx, fy)!.name}와(과) 대화`;
    else if (decoAt(fx, fy)) prompt.text = `[Z] ${decoAt(fx, fy)!.name}을(를) 들여다본다`;
    else prompt.text = "";
  }

  /* =====================================================================
   * 시설 라우팅
   * ===================================================================== */
  function openFacility(f: TownFacilityDef): void {
    if (busy()) return;
    switch (f.id) {
      case "item": openShop(f.title ?? f.name, SHOP_ITEMS, "item"); break;
      case "inn": inn(f); break;
      case "temple": openTemple(f); break;
      case "bountyGuild": openBountyGuild(); break;
      case "stable": openStable(); break;
      case "throne": openThrone(); break;
      default: openHall(f); break;
    }
  }

  /* ---------- 마굿간: 역마차 빠른이동 ---------- */
  function openStable(): void {
    overlayOpen = true;
    const dest = otherTown(G.town);
    const destName = TOWNS[dest].name;
    const rootS = new PIXI.Container(); rootS.zIndex = 60; overlayRoot.addChild(rootS);
    const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
    dim.eventMode = "static"; rootS.addChild(dim);
    const p = panel(620, 300); p.x = (W - 620) / 2; p.y = (H - 300) / 2; rootS.addChild(p);
    const tt = txt("마굿간 — 역마차", 24, C.border, { serif: true });
    tt.x = p.x + 26; tt.y = p.y + 18; rootS.addChild(tt);
    const ds = txt(
      `${destName}(으)로 향하는 역마차가 대기 중이다.\n삯은 ${CARRIAGE_FARE} G — 오르면 눈 깜짝할 새 도착한다.`,
      15, C.text, { lh: 24 });
    ds.x = p.x + 26; ds.y = p.y + 64; rootS.addChild(ds);
    function close(): void { overlayOpen = false; rootS.destroy({ children: true }); }
    const go = button(`${destName}(으)로 출발 — ${CARRIAGE_FARE} G`, 340, 50, () => {
      if (G.gold < CARRIAGE_FARE) return toast(`역마차 삯 ${CARRIAGE_FARE} G가 부족하다.`, C.dim);
      G.gold -= CARRIAGE_FARE;
      G.town = dest;
      close();
      fullFlash(0x000000, 800, () => nav.town("carriage"));
    }, { size: 16, border: C.border });
    go.x = p.x + 26; go.y = p.y + 150; rootS.addChild(go);
    const closeBtn = button("나가기", 110, 40, close, { size: 15 });
    closeBtn.x = p.x + 620 - 136; closeBtn.y = p.y + 300 - 56; rootS.addChild(closeBtn);
  }

  /* ---------- 알현실: 연방 군주에게 편지 전달 ---------- */
  function openThrone(): void {
    if (!G.flags.letter) { fullFlash(0x000000, 600, () => nav.letter()); return; }
    overlayOpen = true;
    const rootS = new PIXI.Container(); rootS.zIndex = 60; overlayRoot.addChild(rootS);
    const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
    dim.eventMode = "static"; rootS.addChild(dim);
    const p = panel(620, 240); p.x = (W - 620) / 2; p.y = (H - 240) / 2; rootS.addChild(p);
    const tt = txt("알현실 — 연방 군주", 24, C.border, { serif: true });
    tt.x = p.x + 26; tt.y = p.y + 18; rootS.addChild(tt);
    const ds = txt(
      "\"헤르만의 제자들이여, 그의 뜻은 잘 새겼네.\n크로스베일의 앞날은 그대들 손에 달렸으니 — 부디 몸조심하게.\"",
      15, C.text, { lh: 24 });
    ds.x = p.x + 26; ds.y = p.y + 64; rootS.addChild(ds);
    const closeBtn = button("물러난다", 130, 44, () => {
      overlayOpen = false; rootS.destroy({ children: true });
    }, { size: 15 });
    closeBtn.x = p.x + 620 - 156; closeBtn.y = p.y + 240 - 60; rootS.addChild(closeBtn);
  }

  /* ---------- 상점 (도구점 직행 / 무기·방어구점 하위 메뉴) ---------- */
  function openShop(shopTitle: string, goods: GearDef[], kind: ShopKind, onClose?: () => void): void {
    overlayOpen = true;
    openShopMenu({
      title: shopTitle, goods, kind, onChange: hud.redraw,
      onClose: () => { overlayOpen = false; onClose?.(); },
    });
  }
  /* ---------- 여관: 숙박·소문·시설 의뢰 ---------- */
  function inn(f: TownFacilityDef): void {
    overlayOpen = true;
    const rootS = new PIXI.Container(); rootS.zIndex = 60; overlayRoot.addChild(rootS);
    const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
    dim.eventMode = "static"; rootS.addChild(dim);
    const PW = 720, PH = 430;
    const p = panel(PW, PH); p.x = (W - PW) / 2; p.y = (H - PH) / 2; rootS.addChild(p);
    const title = txt(f.name, 24, C.border, { serif: true }); title.x = p.x + 28; title.y = p.y + 20; rootS.addChild(title);
    const intro = txt("난롯불과 수프 냄새가 여행객을 맞는다.", 14, C.dim);
    intro.x = p.x + 28; intro.y = p.y + 58; rootS.addChild(intro);
    const speech = txt("따뜻한 불빛 아래, 잠시 발걸음을 멈출 수 있다.", 15, C.text, { wrap: 650, lh: 24 });
    speech.x = p.x + 28; speech.y = p.y + 94; rootS.addChild(speech);
    const say = (text: string) => { speech.text = text; };
    const opts = new PIXI.Container(); rootS.addChild(opts);
    const clearOpts = () => opts.removeChildren().forEach((child) => child.destroy({ children: true }));
    const option = (label: string, i: number, fn: () => void, gold = false) => {
      const b = button(label, 360, 38, fn, { size: 14, border: gold ? C.border : 0x555068 });
      b.x = p.x + 28; b.y = p.y + 160 + i * 44; opts.addChild(b);
    };

    function menu(): void {
      clearOpts();
      let i = 0;
      for (const qid of f.quests ?? []) {
        const q = QUESTS.find((entry) => entry.id === qid);
        if (!q) continue;
        const status = questStatus(qid);
        if (status === "available") {
          option(`[의뢰] ${q.name}`, i++, () => {
            if (!acceptQuest(qid)) return;
            say(`${q.desc}\n\n— 의뢰 [${q.name}] 수주! (${q.objectives.map((o) => `${o.desc} 0/${o.count}`).join(" · ")})`);
            toast(`의뢰 수주: ${q.name}`, C.border);
            menu();
          }, true);
        } else if (status === "done") {
          option(`[보고] ${q.name}`, i++, () => {
            const reward = reportQuest(qid);
            if (!reward) return;
            const parts = [
              reward.gold ? `${reward.gold} G` : "", reward.exp ? `경험치 ${reward.exp}` : "", ...reward.items,
            ].filter(Boolean).join(" · ");
            say(`옛길에는 다시 조용함이 찾아들었다. [${q.name}]의 완수를 확인했다.\n\n보상: ${parts}`);
            toast(`의뢰 완수! 보상: ${parts}`, C.border);
            if (reward.ups.length) toast(`레벨 업! ${reward.ups.join(" · ")} (HP/MP 전부 회복)`, C.border);
            hud.redraw(); menu();
          }, true);
        } else if (status === "active") {
          const progress = G.quests[qid];
          option(`[진행 중] ${q.name}`, i++, () => {
            say(`여관 장부에는 아직 이 의뢰가 남아 있다. (${q.objectives.map((o) => `${o.desc} ${Math.min(progress.counts[o.id] ?? 0, o.count)}/${o.count}`).join(" · ")})`);
          });
        }
      }
      option("숙박 — 30 G (전원 HP/MP 회복)", i++, () => {
        if (G.gold < 30) return toast("숙박비 30 G가 부족하다.", C.dim);
        G.gold -= 30;
        G.party.forEach((m) => { m.hp = m.maxHp; m.mp = m.maxMp; });
        hud.redraw();
        say("푹신한 침대와 잔잔한 난롯불 아래에서 파티가 푹 쉬었다.\n\n전원 HP/MP가 회복되었다.");
        fullFlash(0x000000, 900, () => toast("파티가 푹 쉬었다. 전원 HP/MP 회복!", C.text));
      }, true);
      option("소문", i++, () => say("할로우베일 심부의 옛길에 백골들이 걸어다닌다는 소문이 떠돈다. 마차꾼들이 발길을 끊으면서, 여관도 한산해졌다."));
      option("옛 손님", i++, () => say("옛날에는 에버모어의 기사단도 이곳에 묵어갔다. 지금 그 방에는 먼지만 쌓였지만, 모험가들의 발걸음은 다시 이어지고 있다."));
      option("나가기", i, close);
    }

    function close(): void { overlayOpen = false; rootS.destroy({ children: true }); }
    menu();
  }

  /* ---------- 신전: 상태이상 정화 ---------- */
  function openTemple(f: TownFacilityDef): void {
    overlayOpen = true;
    const rootS = new PIXI.Container(); rootS.zIndex = 60; overlayRoot.addChild(rootS);
    const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
    dim.eventMode = "static"; rootS.addChild(dim);
    const p = panel(640, 320); p.x = (W - 640) / 2; p.y = (H - 320) / 2; rootS.addChild(p);
    const tt = txt(f.title ?? f.name, 24, C.border, { serif: true });
    tt.x = p.x + 26; tt.y = p.y + 18; rootS.addChild(tt);
    const ds = txt(
      "촛불이 조용히 흔들린다. 사제가 파티의 몸에 깃든 나쁜 것 —\n독·저주 같은 상태이상을 정화해 준다.",
      15, C.text, { lh: 24 });
    ds.x = p.x + 26; ds.y = p.y + 64; rootS.addChild(ds);
    const cure = button("정화 의식 — 상태이상 회복 (무료)", 340, 48, () => {
      /* 지속형 상태이상은 아직 없다(전투 상태는 전투 종료 시 소멸).
       * 독·저주 등 필드 지속 상태 추가 시 이곳에서 정화한다. */
      toast("사제가 파티를 살폈다 — 정화할 상태이상이 없다.", C.dim);
    }, { size: 15, border: C.border });
    cure.x = p.x + 26; cure.y = p.y + 140; rootS.addChild(cure);
    const closeBtn = button("나가기", 110, 40, () => {
      overlayOpen = false; rootS.destroy({ children: true });
    }, { size: 15 });
    closeBtn.x = p.x + 640 - 136; closeBtn.y = p.y + 320 - 56; rootS.addChild(closeBtn);
  }

  /* ---------- 현상금 길드: 의뢰 게시판 ---------- */
  function openBountyGuild(): void {
    overlayOpen = true;
    const rootS = new PIXI.Container(); rootS.zIndex = 60; overlayRoot.addChild(rootS);
    const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
    dim.eventMode = "static"; rootS.addChild(dim);
    const p = panel(860, 560); p.x = (W - 860) / 2; p.y = (H - 560) / 2; rootS.addChild(p);
    const content = new PIXI.Container(); rootS.addChild(content);
    const closeBtn = button("나가기", 110, 40, close, { size: 15 });
    closeBtn.x = p.x + 860 - 136; closeBtn.y = p.y + 560 - 56; rootS.addChild(closeBtn);

    function board(): void {
      content.removeChildren().forEach((c) => c.destroy({ children: true }));
      const tt = txt("현상금 길드 — 의뢰 게시판", 24, C.border, { serif: true });
      tt.x = p.x + 28; tt.y = p.y + 18; content.addChild(tt);
      const list = questList();
      list.forEach((e, i) => {
        const y = p.y + 62 + i * 54;
        const q = e.def;
        const marker = q.kind === "main" ? "★" : q.kind === "side" ? "◆" : "↻";
        const locked = e.status === "locked";
        const nameLine = locked
          ? `${marker} ???`
          : `${marker} ${q.name}` + (q.kind === "repeat" && (e.progress?.times ?? 0) > 0 ? `  ×${e.progress!.times}` : "");
        const nt = txt(nameLine, 15, locked ? C.dim : e.status === "done" ? C.border : C.text, { weight: "700" });
        nt.x = p.x + 28; nt.y = y; content.addChild(nt);

        let subLine: string;
        if (locked) {
          const r = q.requires;
          subLine = r?.level ? `수주 조건: 파티 Lv${r.level}` : "수주 조건: 선행 의뢰 완료";
        } else if (e.status === "available") {
          subLine = q.desc;
        } else if (e.status === "rewarded") {
          subLine = "완수한 의뢰.";
        } else {
          const pr = e.progress!;
          subLine = q.objectives
            .map((o) => `${o.desc} ${Math.min(pr.counts[o.id] ?? 0, o.count)}/${o.count}`)
            .join(" · ");
          if (e.status === "done") subLine += "  — 보고 가능!";
        }
        const dt = txt(subLine, 12, C.dim, { wrap: 620 });
        dt.x = p.x + 46; dt.y = y + 24; content.addChild(dt);

        /* NPC 또는 특정 시설에서 받는 의뢰는 게시판에서 위치만 안내한다. */
        const facilityName = Object.values(TOWNS)
          .flatMap((town) => town.facilities)
          .find((facility) => facility.quests?.includes(q.id))?.name;
        const giverName = q.giver ? (NPCS.find((n) => n.id === q.giver)?.name ?? q.giver) : facilityName;
        if (e.status === "available" && q.kind !== "main") {
          if (giverName) {
            const gt = txt(`수주처: ${giverName}`, 13, C.dim);
            gt.x = p.x + 860 - 230; gt.y = y + 10; content.addChild(gt);
          } else {
            const b = button("수주", 100, 38, () => {
              if (acceptQuest(q.id)) { toast(`의뢰 수주: ${q.name}`, C.border); refreshNpcMarks(); board(); }
            }, { size: 14 });
            b.x = p.x + 860 - 156; b.y = y; content.addChild(b);
          }
        }
        if (e.status === "done") {
          if (giverName) {
            const gt = txt(`보고처: ${giverName}`, 13, C.border);
            gt.x = p.x + 860 - 230; gt.y = y + 10; content.addChild(gt);
          } else {
            const b = button("보고", 100, 38, () => {
              const r = reportQuest(q.id);
              if (!r) return;
              const parts = [
                r.gold ? `${r.gold} G` : "",
                r.exp ? `경험치 ${r.exp}` : "",
                ...r.items,
              ].filter(Boolean).join(" · ");
              toast(`의뢰 완수! 보상: ${parts}`, C.border);
              if (r.ups.length) toast(`레벨 업! ${r.ups.join(" · ")} (HP/MP 전부 회복)`, C.border);
              hud.redraw(); refreshNpcMarks();
              board();
            }, { size: 14, border: C.border });
            b.x = p.x + 860 - 156; b.y = y; content.addChild(b);
          }
        }
      });
      const note = txt("★메인 ◆서브 ↻현상금(반복) — 현상금은 보고 후 다시 수주할 수 있다.", 13, C.dim);
      note.x = p.x + 28; note.y = p.y + 560 - 52; content.addChild(note);
    }
    board();
    function close(): void { overlayOpen = false; rootS.destroy({ children: true }); }
  }

  /* ---------- 수련관 (무기점·방어구점·영혼 길드·원소 길드) ----------
   *  장비 구매(상점 보유 시) / 기술 수련(trains) / 전직 상담(classes) */
  function openHall(f: TownFacilityDef): void {
    overlayOpen = true;
    const rootS = new PIXI.Container(); rootS.zIndex = 60; overlayRoot.addChild(rootS);
    const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
    dim.eventMode = "static"; rootS.addChild(dim);
    const p = panel(860, 560); p.x = (W - 860) / 2; p.y = (H - 560) / 2; rootS.addChild(p);
    const content = new PIXI.Container(); rootS.addChild(content);
    const closeBtn = button("나가기", 110, 40, close, { size: 15 });
    closeBtn.x = p.x + 860 - 136; closeBtn.y = p.y + 560 - 56; rootS.addChild(closeBtn);

    const shopGoods = f.id === "weapon" ? SHOP_WEAPONS : f.id === "armor" ? SHOP_ARMORS : null;
    const magic = f.id === "spiritGuild" || f.id === "elementsGuild";
    const trainLabel = magic ? "마법 수련" : "기술 수련";
    const pathNames = (f.classes ?? []).map((c) => CLASSES[c].name);

    function clear(): void { content.removeChildren().forEach((c) => c.destroy({ children: true })); }
    function header(t: string): void {
      const tt = txt(t, 24, C.border, { serif: true }); tt.x = p.x + 28; tt.y = p.y + 18; content.addChild(tt);
    }

    function main(): void {
      clear(); header(f.name);
      let i = 0;
      const mk = (label: string, desc: string, fn: () => void) => {
        const b = button(label, 340, 52, fn, { size: 16 });
        b.x = p.x + 28; b.y = p.y + 76 + i * 66; content.addChild(b);
        const d = txt(desc, 13, C.dim, { wrap: 420 });
        d.x = p.x + 390; d.y = p.y + 76 + i * 66 + 16; content.addChild(d);
        i++;
      };
      if (shopGoods) {
        mk("장비 구매", f.id === "weapon" ? "담금질한 강철 — 무기·방패 일람." : "견고한 수호 — 방어구·장신구 일람.", () => {
          close();
          openShop(
            f.id === "weapon" ? "무기점 — 담금질한 강철" : "방어구점 — 견고한 수호",
            shopGoods, f.id === "weapon" ? "weapon" : "armor",
            () => openHall(f));
        });
      }
      if (f.trains?.length) {
        mk(trainLabel, `${f.trains.map((k) => SKILLS[k].name).join(" · ")} — 미습득 기술을 ${SKILL_PRICE} G에 가르친다.`, trainPage);
      }
      if (f.classes?.length) {
        mk("전직 상담", `이곳의 길: ${pathNames.join(" · ")}`, classPage);
      }
    }

    /* ---- 기술 수련: 멤버를 골라 노비스 랭크로 습득 ---- */
    function trainPage(): void {
      clear(); header(`${f.name} — ${trainLabel}`);
      const sub = txt(`미습득 기술을 ${SKILL_PRICE} G에 가르친다. (습득 시 노비스 랭크)`, 13, C.dim);
      sub.x = p.x + 28; sub.y = p.y + 56; content.addChild(sub);
      (f.trains ?? []).forEach((k, i) => {
        const y = p.y + 92 + i * 52;
        const b = button(`${SKILLS[k].name}  —  ${SKILL_PRICE} G`, 280, 42, () => {
          if (G.gold < SKILL_PRICE) return toast("골드가 부족하다.", C.dim);
          pickMember(`${SKILLS[k].name} — 누가 배울까?`, (m) => {
            G.gold -= SKILL_PRICE;
            m.bonusSkills.push(k);
            toast(`${m.name}, [${SKILLS[k].name}] 습득! (노비스)`, C.border);
            hud.redraw();
            trainPage();
          }, {
            filter: (m) => (memberRanks(m)[k] ?? 0) === 0,
            note: (m) => {
              const r = memberRanks(m)[k] ?? 0;
              return r ? `(이미 ${RANK_NAME[r]})` : "(미습득)";
            },
          });
        }, { size: 14 });
        b.x = p.x + 28; b.y = y; content.addChild(b);
        const d = txt(`${SKILLS[k].cat} 계열`, 13, C.dim);
        d.x = p.x + 330; d.y = y + 12; content.addChild(d);
      });
      const back = button("← 돌아가기", 130, 40, main, { size: 14 });
      back.x = p.x + 28; back.y = p.y + 560 - 56; content.addChild(back);
    }

    /* ---- 전직 상담: 이 건물이 관할하는 트리만 ---- */
    function hallOptions(m: Member): ClassId[] {
      return classOptions(m).filter((c) => (f.classes ?? []).includes(c));
    }
    function classPage(): void {
      clear(); header(`${f.name} — 전직 상담`);
      const sub = txt(`이곳의 길: ${pathNames.join(" · ")}   (1차 Lv3 / 2차 Lv6, 되돌릴 수 없다)`, 13, C.dim, { wrap: 780 });
      sub.x = p.x + 28; sub.y = p.y + 56; content.addChild(sub);
      G.party.forEach((m, i) => {
        const cc = canClassChange(m);
        const opts = hallOptions(m);
        const tier = CLASSES[m.classId].tier;
        const status = cc && opts.length
          ? (cc === "t1" ? "▶ 1차 전직 가능" : "▶ 2차 전직 가능")
          : cc ? "(다른 건물의 길)"
            : tier === 2 ? "(최종 클래스)" : tier === 0 ? "(Lv3 필요)" : "(Lv6 필요)";
        const b = button(
          `${m.name} — ${CLASSES[m.classId].name} Lv.${m.level}  ${status}`,
          560, 48, () => memberPage(m), { size: 15 });
        if (!cc || !opts.length) b.setDisabled(true);
        b.x = p.x + 28; b.y = p.y + 92 + i * 58; content.addChild(b);
      });
      const back = button("← 돌아가기", 130, 40, main, { size: 14 });
      back.x = p.x + 28; back.y = p.y + 560 - 56; content.addChild(back);
    }

    function memberPage(m: Member): void {
      clear(); header(`${m.name}의 갈림길`);
      const opts = hallOptions(m);
      const intro = txt(
        `${CLASSES[m.classId].name}의 소양을 살릴 길 — ${f.name}이 안내한다.`,
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
      const back = button("← 돌아가기", 130, 40, classPage, { size: 14 });
      back.x = p.x + 28; back.y = p.y + 560 - 60; content.addChild(back);
    }

    function ldPage(m: Member, cid: ClassId): void {
      clear(); header("빛과 어둠의 기로");
      const t = txt(
        `${CLASSES[cid].name}의 길은 신앙의 선택을 요구하네.\n선택한 계열이 달인/전문가의 경지로 각성한다.`,
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
      classPage();
    }
    main();
    function close(): void { overlayOpen = false; rootS.destroy({ children: true }); }
  }

  /* ---------- NPC 대화 (주제 선택식) ---------- */
  function openNpc(npc: NpcDef): void {
    overlayOpen = true;
    const rootS = new PIXI.Container(); rootS.zIndex = 60; overlayRoot.addChild(rootS);
    const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
    dim.eventMode = "static"; rootS.addChild(dim);
    const PW = 820, PH = 480;
    const p = panel(PW, PH); p.x = (W - PW) / 2; p.y = (H - PH) / 2; rootS.addChild(p);

    /* 좌: 초상화 + 이름 */
    const tex = portraitTexture(npc.portrait);
    if (tex) {
      const sp = new PIXI.Sprite(tex);
      sp.width = 150; sp.height = 150; sp.x = p.x + 40; sp.y = p.y + 46;
      rootS.addChild(sp);
      const fr = new PIXI.Graphics();
      fr.rect(sp.x - 3, sp.y - 3, 156, 156).stroke({ width: 3, color: C.border, alpha: 0.85 });
      rootS.addChild(fr);
    }
    const nm = txt(npc.name, 19, C.border, { serif: true, align: "center" });
    nm.anchor.set(0.5, 0); nm.x = p.x + 115; nm.y = p.y + 206; rootS.addChild(nm);
    const ds = txt(npc.desc, 12, C.dim, { wrap: 200, align: "center", lh: 17 });
    ds.anchor.set(0.5, 0); ds.x = p.x + 115; ds.y = p.y + 238; rootS.addChild(ds);

    /* 우상: 대사 */
    const speech = txt("", 15, C.text, { wrap: 500, lh: 24 });
    speech.x = p.x + 280; speech.y = p.y + 46; rootS.addChild(speech);
    const say = (s: string) => { speech.text = s; };
    say(npc.greeting);

    /* 우하: 선택지 (모드에 따라 재구성) */
    const opts = new PIXI.Container(); rootS.addChild(opts);
    const clearOpts = () => opts.removeChildren().forEach((c) => c.destroy({ children: true }));
    const mkOpt = (label: string, i: number, fn: () => void, gold = false) => {
      const b = button(label, 320, 38, fn, { size: 14, border: gold ? C.border : 0x555068 });
      b.x = p.x + 280; b.y = p.y + 220 + i * 44; opts.addChild(b);
    };

    function menuRoot(): void {
      clearOpts();
      let i = 0;
      for (const qid of npc.quests ?? []) {
        const q = QUESTS.find((x) => x.id === qid)!;
        const st = questStatus(qid);
        if (st === "available") {
          mkOpt(`[의뢰] ${q.name}`, i++, () => {
            if (!acceptQuest(qid)) return;
            say(`${q.desc}\n\n— 의뢰 [${q.name}] 수주! (${q.objectives.map((o) => `${o.desc} 0/${o.count}`).join(" · ")})`);
            toast(`의뢰 수주: ${q.name}`, C.border);
            refreshNpcMarks(); menuRoot();
          }, true);
        } else if (st === "done") {
          mkOpt(`[보고] ${q.name}`, i++, () => {
            const r = reportQuest(qid);
            if (!r) return;
            const parts = [
              r.gold ? `${r.gold} G` : "", r.exp ? `경험치 ${r.exp}` : "", ...r.items,
            ].filter(Boolean).join(" · ");
            say(`수고했네, [${q.name}] 완수를 확인했어.\n\n보상: ${parts}`);
            toast(`의뢰 완수! 보상: ${parts}`, C.border);
            if (r.ups.length) toast(`레벨 업! ${r.ups.join(" · ")} (HP/MP 전부 회복)`, C.border);
            hud.redraw(); refreshNpcMarks(); menuRoot();
          }, true);
        } else if (st === "active") {
          const pr = G.quests[qid];
          mkOpt(`[진행 중] ${q.name}`, i++, () => {
            say(`서두르지 않아도 되네. (${q.objectives.map((o) => `${o.desc} ${Math.min(pr.counts[o.id] ?? 0, o.count)}/${o.count}`).join(" · ")})`);
          });
        }
      }
      mkOpt("대화하기", i++, menuTopics);
      mkOpt("떠난다", i++, close);
    }

    function menuTopics(): void {
      clearOpts();
      const unlocked = npc.topics.filter((t) =>
        (t.requires?.quests ?? []).every((qid) => questStatus(qid) === "rewarded"));
      unlocked.forEach((t, i) => mkOpt(t.label, i, () => say(t.text)));
      mkOpt("← 돌아가기", unlocked.length, menuRoot);
    }

    function close(): void {
      overlayOpen = false;
      rootS.destroy({ children: true });
    }
    menuRoot();
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

  /* ---- ticker: 횃불 플리커 ---- */
  const ticker = (t: PIXI.Ticker) => { fp.tick(t.deltaMS); };
  app.ticker.add(ticker);

  refresh();

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
