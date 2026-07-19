/* =====================================================================
 * scenes/field.ts — 크로스베일 주변 야외 필드
 *  자연물과 출구를 갖춘 경량 1인칭 탐험 씬. 전투 구역은 기존 explore.ts가 담당.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import {
  C, H, SceneHandle, W, app, nav, panel, sceneRoot, setModeBadge, tween, txt,
} from "../core";
import { FIELDS, FieldData, FieldDeco, FieldExit, FieldId } from "../fieldmaps";
import { DIR, Facing, leftOf, passable, rightOf } from "../grid";
import { FPEntity, FPTheme, createFPView } from "../fpview";
import { G } from "../state";
import { tileSprite } from "../tiles";
import { buildPartyHUD } from "../hud";

function fieldNode(deco: FieldDeco): FPEntity {
  const node = new PIXI.Container();
  const s = tileSprite(deco.tile); s.anchor.set(0.5, 1); node.addChild(s);
  const tall = deco.tile.startsWith("tree_");
  const shrub = deco.tile.startsWith("bush_");
  return {
    id: `deco:${deco.id}`, x: deco.x, y: deco.y, node,
    worldH: tall ? 1.0 : shrub ? 0.34 : 0.17,
    baseH: tall ? 112 : shrub ? 32 : 16,
  };
}

export function fieldScene(id: FieldId): SceneHandle {
  const F: FieldData = FIELDS[id];
  setModeBadge(F.badge, C.green);
  const root = new PIXI.Container(); sceneRoot.addChild(root);
  const map = F.map;
  let px = F.start.x, py = F.start.y;
  let facing: Facing = F.start.facing;

  const bg = new PIXI.Graphics();
  bg.rect(0, 0, W, H).fill(0x182315); root.addChild(bg);
  const theme: FPTheme = {
    floorAt: (x, y) => ({ base: "floor", decal: (x * 17 + y * 31) % 5 === 0 ? "pave_decal" : undefined }),
    wallAt: (x, y) => ({ base: "wall", decal: (x * 13 + y * 7) % 6 === 0 ? "wall_worn_decal" : undefined }),
    torchAt: () => false,
    ceiling: "ceiling", water: "water", stairs: { base: "floor", decal: "stairs_decal" },
    floorTint: F.floorTint, wallTint: F.wallTint, ceilingTint: F.floorTint,
  };
  const fp = createFPView(theme); root.addChild(fp.root);

  const decoAt = (x: number, y: number): FieldDeco | undefined =>
    F.decos.find((d) => d.x === x && d.y === y);
  const blockedAt = (x: number, y: number): FieldDeco | undefined =>
    decoAt(x, y)?.blocking ? decoAt(x, y) : undefined;
  const exitAt = (x: number, y: number): FieldExit | undefined =>
    F.exits.find((e) => e.x === x && e.y === y);

  const ents: FPEntity[] = F.decos.map(fieldNode);
  F.exits.forEach((exit) => {
    const node = new PIXI.Container();
    const g = new PIXI.Graphics();
    g.rect(-34, -104, 18, 104).rect(16, -104, 18, 104).fill(0x5e4930);
    g.rect(-40, -116, 80, 16).fill(0x3b2e21);
    node.addChild(g);
    const label = txt(exit.label, 12, C.text, { weight: "700", shadow: true });
    label.anchor.set(0.5, 1); label.y = -122; node.addChild(label);
    ents.push({ id: `exit:${exit.x},${exit.y}`, x: exit.x, y: exit.y, node, worldH: 0.95, baseH: 116 });
  });

  const logP = panel(700, 46, { alpha: 0.82 }); logP.x = (W - 700) / 2; logP.y = 12; root.addChild(logP);
  const logT = txt(`${F.name}에 들어섰다. 길가의 소리에 귀를 기울여 보자.`, 15, C.text);
  logT.x = logP.x + 16; logT.y = 25; root.addChild(logT);
  const prompt = txt("", 16, C.text, { weight: "700", shadow: true });
  prompt.anchor.set(0.5, 1); prompt.x = W / 2; prompt.y = H - 168; root.addChild(prompt);
  const hint = txt("W/S 전진·후진   A/D 옆걸음   Q/E·←→ 회전   Z/스페이스 조사", 13, C.dim);
  hint.x = 16; hint.y = H - 28; root.addChild(hint);
  buildPartyHUD(root);

  function refresh(): void {
    fp.render(map, px, py, facing, ents);
    const front = { x: px + DIR[facing].dx, y: py + DIR[facing].dy };
    const exit = exitAt(px, py) ?? exitAt(front.x, front.y);
    if (exit) prompt.text = exit.prompt;
    else {
      const d = decoAt(front.x, front.y);
      prompt.text = d ? `[Z] ${d.name}을(를) 살핀다` : "";
    }
  }
  function bump(): void {
    tween(fp.root, { x: 6 }, 45, {
      onDone: () => tween(fp.root, { x: -5 }, 45, { onDone: () => tween(fp.root, { x: 0 }, 60) }),
    });
  }
  function move(rel: "fwd" | "back" | "sl" | "sr"): void {
    const dir: Facing = rel === "fwd" ? facing : rel === "back" ? ((facing + 2) % 4) as Facing
      : rel === "sl" ? leftOf(facing) : rightOf(facing);
    const nx = px + DIR[dir].dx, ny = py + DIR[dir].dy;
    if (!passable(map, nx, ny) || blockedAt(nx, ny)) { bump(); return; }
    px = nx; py = ny; fp.root.y = 7; tween(fp.root, { y: 0 }, 130); refresh();
  }
  function rotate(dir: -1 | 1): void {
    facing = dir < 0 ? leftOf(facing) : rightOf(facing); refresh();
  }
  function leave(exit: FieldExit): void {
    if (exit.target.kind === "field") { nav.field(exit.target.id); return; }
    if (exit.target.kind === "explore") { nav.explore(); return; }
    G.town = exit.target.id;
    nav.town(exit.target.spawn);
  }
  function interact(): void {
    const front = { x: px + DIR[facing].dx, y: py + DIR[facing].dy };
    const exit = exitAt(px, py) ?? exitAt(front.x, front.y);
    if (exit) { leave(exit); return; }
    const d = decoAt(front.x, front.y);
    if (d) logT.text = d.text;
  }

  const ticker = (t: PIXI.Ticker) => fp.tick(t.deltaMS);
  app.ticker.add(ticker);
  refresh();
  const KEYMAP: Record<string, () => void> = {
    w: () => move("fwd"), s: () => move("back"), a: () => move("sl"), d: () => move("sr"),
    q: () => rotate(-1), e: () => rotate(1), z: interact, " ": interact,
    "ㅈ": () => move("fwd"), "ㄴ": () => move("back"), "ㅁ": () => move("sl"), "ㅇ": () => move("sr"),
    "ㅂ": () => rotate(-1), "ㄷ": () => rotate(1), "ㅋ": interact,
    ArrowUp: () => move("fwd"), ArrowDown: () => move("back"), ArrowLeft: () => rotate(-1), ArrowRight: () => rotate(1),
  };
  return {
    onKey(k) { KEYMAP[k.length === 1 ? k.toLowerCase() : k]?.(); },
    dispose() { app.ticker.remove(ticker); },
  };
}
