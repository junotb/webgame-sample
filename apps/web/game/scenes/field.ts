/* =====================================================================
 * scenes/field.ts — 크로스베일 주변 야외 필드
 *  자연물과 출구를 갖춘 경량 1인칭 탐험 씬. 전투 구역은 기존 explore.ts가 담당.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import {
  C, H, SceneHandle, SceneScope, W, nav, panel, sceneRoot, setModeBadge, tween, txt,
} from "../core";
import { carriageUnlocked, questNotify, questStatus, updateText } from "../core/quests";
import { FIELDS, FieldData, FieldDeco, FieldExit, FieldId } from "../fieldmaps";
import { DIR, Facing, RelativeMove, moveTarget, passable, rotateFacing } from "../grid";
import { FPEntity, FPTheme, createFPView } from "../fpview";
import { G } from "../state";
import { tileSprite } from "../tiles";
import { buildPartyHUD } from "../hud";
import { EventNode, eventOverlay } from "./event";

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
  const scope = new SceneScope();
  setModeBadge(F.badge, C.green);
  const root = new PIXI.Container(); sceneRoot.addChild(root);
  const map = F.map;
  let px = F.start.x, py = F.start.y;
  let facing: Facing = F.start.facing;
  let activeEvent: SceneHandle | null = null;

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
  function move(rel: RelativeMove): void {
    const { x: nx, y: ny } = moveTarget({ x: px, y: py, facing }, rel);
    if (!passable(map, nx, ny) || blockedAt(nx, ny)) { bump(); return; }
    px = nx; py = ny; fp.root.y = 7; tween(fp.root, { y: 0 }, 130); refresh();
    if (F.id === "goblinValley" && py === 9 && px <= 10 && px >= 8
      && !G.flags.banditsDefeated && questStatus("main_clear_evermore_road") === "active") {
      startBanditAmbush();
    }
  }
  function rotate(dir: -1 | 1): void {
    facing = rotateFacing(facing, dir); refresh();
  }
  function leave(exit: FieldExit): void {
    if (F.id === "goblinValley" && exit.target.kind === "town" && exit.target.id === "evermore"
      && !carriageUnlocked()) {
      logT.text = G.flags.banditsDefeated
        ? "산적은 소탕했지만 아직 길드의 통행 재개 승인이 나지 않았다. 크로스베일 현상금 길드에 먼저 보고하자."
        : "좁은 계곡을 산적들이 봉쇄하고 있다. 마구간에서 사정을 확인한 뒤 산적들을 소탕해야 한다.";
      return;
    }
    if (exit.target.kind === "field") { nav.field(exit.target.id); return; }
    if (exit.target.kind === "explore") { nav.explore(); return; }
    G.town = exit.target.id;
    nav.town(exit.target.spawn);
  }
  function interact(): void {
    if (activeEvent) return;
    const front = { x: px + DIR[facing].dx, y: py + DIR[facing].dy };
    const exit = exitAt(px, py) ?? exitAt(front.x, front.y);
    if (exit) { leave(exit); return; }
    const d = decoAt(front.x, front.y);
    if (!d) return;
    if (d.id === "bishop_altar") {
      if (G.flags.bishopDefeated) logT.text = "사악한 기운이 사라진 제단에는 깨진 주교관만 남아 있다.";
      else if (questStatus("side_ruined_temple") !== "active")
        logT.text = "제단 아래의 존재는 위험해 보인다. 에버모어 성의 시종장에게 사원 조사에 관해 물어보자.";
      else startBishopEncounter();
      return;
    }
    if (d.id === "cage_full") {
      if (G.flags.hostagesRescued) logT.text = "문이 열린 우리 안에는 잘린 밧줄과 빈 물그릇만 남아 있다.";
      else if (questStatus("side_rescue_hostages") !== "active")
        logT.text = "겁에 질린 인질들이 구조를 기다린다. 크로스베일의 장로 카엘에게 고블린 주둔지에 관해 물어보자.";
      else {
        G.flags.hostagesRescued = true;
        const updates = questNotify({ t: "rescue", group: "valley_hostages" });
        logT.text = "우리의 자물쇠를 부수고 인질들을 풀어 주었다. 모두 크로스베일로 무사히 달아났다.";
        if (updates[0]) logT.text += `  ${updateText(updates[0])}`;
      }
      return;
    }
    logT.text = d.text;
  }

  function startBishopEncounter(): void {
    const nodes: EventNode[] = [
      { name: "???", portrait: "dark", text: "갈라진 제단 아래에서 썩은 향 냄새와 함께 검은 예복의 사제가 몸을 일으킨다." },
      { name: "되살아난 사악한 주교", portrait: "dark", text: "산 자들이 진실을 탐하다니… 이 사원의 마지막 기도에 너희 이름도 새겨 주마." },
      { name: "에런", portrait: "hero", text: "의식은 여기서 끝이다. 무기를 들어!" },
      { text: "격전 끝에 주교의 몸을 붙들던 알 수 없는 힘이 흩어지고, 제단 아래에서 사악한 교단과 희생자들의 기록이 발견되었다. 에버모어 성에 보고할 증거다." },
    ];
    activeEvent = eventOverlay(nodes, () => {
      activeEvent = null;
      G.flags.bishopDefeated = true;
      const updates = questNotify({ t: "clear", symbol: "fallen_bishop" });
      logT.text = updates[0] ? updateText(updates[0]) : "사악한 주교를 쓰러뜨리고 보고할 증거를 확보했다.";
      refresh();
    }, { caption: "버려진 사원의 진상" });
  }

  function startBanditAmbush(): void {
    const nodes: EventNode[] = [
      { text: "좁은 계곡의 앞뒤에서 바위가 굴러 떨어진다. 숨어 있던 산적들이 퇴로를 막고 모습을 드러냈다." },
      { name: "산적 두목", portrait: "dark", text: "짐과 돈을 내려놔라. 그러면 목숨만은 살려 주지." },
      { name: "미라", portrait: "hero", text: "마차로를 막은 게 너희였군요. 대답은 이미 정해졌어요!" },
      { text: "포위를 뚫고 산적 무리를 제압했다. 통행 재개를 위해 크로스베일 현상금 길드에 결과를 보고해야 한다." },
    ];
    activeEvent = eventOverlay(nodes, () => {
      activeEvent = null;
      G.flags.banditsDefeated = true;
      const updates = questNotify({ t: "clear", symbol: "valley_bandits" });
      logT.text = updates[0] ? updateText(updates[0]) : "산적 무리를 소탕했다. 현상금 길드에 보고하자.";
      refresh();
    }, { caption: "산적의 포위" });
  }

  const ticker = (t: PIXI.Ticker) => fp.tick(t.deltaMS);
  scope.ticker(ticker);
  refresh();
  const KEYMAP: Record<string, () => void> = {
    w: () => move("fwd"), s: () => move("back"), a: () => move("sl"), d: () => move("sr"),
    q: () => rotate(-1), e: () => rotate(1), z: interact, " ": interact,
    "ㅈ": () => move("fwd"), "ㄴ": () => move("back"), "ㅁ": () => move("sl"), "ㅇ": () => move("sr"),
    "ㅂ": () => rotate(-1), "ㄷ": () => rotate(1), "ㅋ": interact,
    ArrowUp: () => move("fwd"), ArrowDown: () => move("back"), ArrowLeft: () => rotate(-1), ArrowRight: () => rotate(1),
  };
  return {
    onKey(k) {
      if (activeEvent) { activeEvent.onKey?.(k); return; }
      KEYMAP[k.length === 1 ? k.toLowerCase() : k]?.();
    },
    dispose() { activeEvent?.dispose?.(); scope.dispose(); },
  };
}
