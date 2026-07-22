/* =====================================================================
 * scenes/field.ts — 크로스베일 주변 야외 필드
 *  자연물과 출구를 갖춘 경량 1인칭 탐험 씬. 전투 구역은 기존 explore.ts가 담당.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import {
  C, H, SceneHandle, SceneScope, W, nav, panel, sceneRoot, setModeBadge, toast, tween, txt,
} from "../core";
import { carriageUnlocked, questNotify, questStatus, updateText } from "../core/quests";
import { ParticleKind, particleField, swaySprite } from "../ambient";
import { gameplayRandom } from "../core/random";
import { RARITY_META, gearDisplayName } from "../defs";
import { FieldBattleHandle, fieldBattleOverlay } from "./field-battle";
import { LEVEL_AP, LEVEL_SP, gainExpParty, rollDropToBag } from "../state";
import {
  DUNGEON_ENTRANCE_KIND, ENTRANCE_WALL_SKIN, EntranceVisual,
  FIELD_ENTRANCE_KIND, TOWN_ENTRANCE_KIND, entranceNode,
} from "../entrances";
import { FIELDS, FieldData, FieldDeco, FieldExit, FieldId, FieldTarget } from "../fieldmaps";
import { DIR, Facing, RelativeMove, cellAt, moveTarget, passable, rotateFacing } from "../grid";
import { FPEntity, FPTheme, SurfacePick, createFPView } from "../fpview";
import { G } from "../state";
import { TileName, tileSprite, tileTex } from "../tiles";
import { buildPartyHUD } from "../hud";
import { ENEMY_DEFS } from "../defs";
import { drawMonster, MonsterView } from "../monsters";
import { EventNode, eventOverlay } from "./event";

interface FieldNode {
  entity: FPEntity;
  monster?: MonsterView;
  tick?: (deltaMS: number) => void;
}

function fieldBuilding(style: Extract<NonNullable<FieldDeco["visual"]>, { kind: "building" }>["style"]): {
  node: PIXI.Container; worldH: number; baseH: number; tick?: (deltaMS: number) => void;
} {
  const node = new PIXI.Container();
  const g = new PIXI.Graphics();
  g.ellipse(0, 3, 58, 12).fill({ color: 0x16120e, alpha: 0.38 });

  if (style === "bandit_hideout") {
    const camp = tileSprite("bandit_hideout_obj", 0.65);
    camp.anchor.set(0.5, 1);
    node.addChild(g, camp);
    return { node, worldH: 1.05, baseH: 156 };
  }

  if (style === "goblin_camp") {
    const tent = tileSprite("goblin_tent_obj", 1.35);
    tent.anchor.set(0.5, 1);
    node.addChild(g, tent);
    return { node, worldH: 0.94, baseH: 144 };
  }

  if (style === "cage_full" || style === "cage_empty") {
    g.rect(-58, -82, 116, 82).fill({ color: 0x2a2118, alpha: 0.3 });
    if (style === "cage_full") {
      for (const x of [-27, 2, 28]) {
        g.circle(x, -42 - (x % 3), 9).fill(0xc7a078);
        g.roundRect(x - 9, -33, 18, 27, 6).fill(x === 2 ? 0x52616a : 0x765745);
      }
    } else {
      g.poly([-34, -6, -12, -20, 12, -8, 36, -18]).stroke({ width: 5, color: 0x9c885b });
    }
    for (const x of [-58, -29, 0, 29, 58]) g.rect(x - 3, -92, 6, 92).fill(0x60452b);
    g.rect(-63, -96, 126, 9).rect(-63, -8, 126, 9).fill(0x805d38);
    node.addChild(g);
    return { node, worldH: 0.86, baseH: 98 };
  }

  if (style === "goblin_totem") {
    const totem = tileSprite("goblin_totem_obj", 1);
    totem.anchor.set(0.5, 1);
    node.addChild(g, totem);
    return { node, worldH: 0.98, baseH: 140 };
  }

  if (style === "campfire") {
    const frames: TileName[] = ["campfire_obj_0", "campfire_obj_1", "campfire_obj_2"];
    const fire = tileSprite(frames[0], 0.9);
    fire.anchor.set(0.5, 1);
    node.addChild(g, fire);
    let elapsed = 0;
    return {
      node, worldH: 0.32, baseH: 58,
      tick(deltaMS) {
        elapsed += deltaMS;
        fire.texture = tileTex(frames[Math.floor(elapsed / 120) % frames.length]);
      },
    };
  }

  const asset: Record<"shore_boat" | "shore_dock" | "valley_rock" | "shore_netline" | "shore_net" | "broken_cross" | "ruin_column", {
    tile: TileName; scaleX: number; scaleY: number; worldH: number; baseH: number;
  }> = {
    shore_boat: { tile: "shore_boat_obj", scaleX: 0.86, scaleY: 0.86, worldH: 0.38, baseH: 62 },
    shore_dock: { tile: "shore_dock_obj", scaleX: 0.82, scaleY: 0.28, worldH: 0.18, baseH: 50 },
    valley_rock: { tile: "valley_rock_obj", scaleX: 0.8, scaleY: 0.8, worldH: 0.56, baseH: 77 },
    shore_netline: { tile: "shore_netline_obj", scaleX: 0.75, scaleY: 0.75, worldH: 0.92, baseH: 144 },
    shore_net: { tile: "shore_net_obj", scaleX: 0.85, scaleY: 0.85, worldH: 0.45, baseH: 68 },
    broken_cross: { tile: "crypt_cross_obj", scaleX: 0.85, scaleY: 0.85, worldH: 0.62, baseH: 95 },
    ruin_column: { tile: "ruin_column_obj", scaleX: 1.4, scaleY: 1.4, worldH: 0.9, baseH: 134 },
  };
  const pick = asset[style];
  const sprite = tileSprite(pick.tile, 1);
  sprite.anchor.set(0.5, 1);
  sprite.scale.set(pick.scaleX, pick.scaleY);
  node.addChild(g, sprite);
  return { node, worldH: pick.worldH, baseH: pick.baseH };
}

function fieldNode(deco: FieldDeco): FieldNode {
  if (deco.visual?.kind === "monster") {
    const node = new PIXI.Container();
    const def = ENEMY_DEFS[deco.visual.defId];
    const monster = drawMonster(def, (def.big ?? 1) * (deco.visual.defId === "wolf" ? 0.9 : 0.82));
    node.addChild(monster);
    return {
      entity: { id: `deco:${deco.id}`, x: deco.x, y: deco.y, node, worldH: 0.72, baseH: 104 },
      monster,
    };
  }
  if (deco.visual?.kind === "building") {
    const building = fieldBuilding(deco.visual.style);
    return {
      entity: {
        id: `deco:${deco.id}`, x: deco.x, y: deco.y, node: building.node,
        worldH: building.worldH, baseH: building.baseH,
      },
      tick: building.tick,
    };
  }

  if (!deco.tile) throw new Error(`field deco "${deco.id}" has no visual`);
  const node = new PIXI.Container();
  const s = tileSprite(deco.tile); s.anchor.set(0.5, 1); node.addChild(s);
  const tall = deco.tile.startsWith("tree_");
  const shrub = deco.tile.startsWith("bush_");
  return {
    entity: {
      id: `deco:${deco.id}`, x: deco.x, y: deco.y, node,
      worldH: tall ? 1.0 : shrub ? 0.34 : 0.17,
      baseH: tall ? 112 : shrub ? 32 : 16,
    },
    /* 나무는 무겁게, 덤불·풀꽃은 가볍고 빠르게 바람에 흔들린다 */
    tick: swaySprite(s, {
      amp: tall ? 0.016 : shrub ? 0.03 : 0.05,
      period: tall ? 3400 : 2200,
      phase: deco.x * 1.3 + deco.y * 2.1,
    }),
  };
}

function fieldBackground(field: FieldData): { node: PIXI.Container; tick?: (deltaMS: number) => void } {
  const bg = new PIXI.Container();
  const { sky, horizon, ridge, texture, layers = [], tint = 0xffffff } = field.theme.background;
  let tick: ((deltaMS: number) => void) | undefined;
  if (texture) {
    const base = new PIXI.Sprite(tileTex(texture));
    base.width = W; base.height = H; base.tint = tint;
    bg.addChild(base);
    /* 구름 레이어는 타일링으로 감아 천천히 흘린다 — 뒤 레이어일수록 느리게 (패럴랙스) */
    const drifting = layers.map((name, i) => {
      const layer = new PIXI.TilingSprite({ texture: tileTex(name), width: W, height: H });
      layer.tileScale.set(W / layer.texture.width, H / layer.texture.height);
      layer.tint = tint;
      bg.addChild(layer);
      return { layer, speed: 0.0035 * (i + 1) };
    });
    if (drifting.length) {
      tick = (deltaMS) => {
        for (const { layer, speed } of drifting) layer.tilePosition.x -= deltaMS * speed;
      };
    }
  } else {
    const bands = new PIXI.Graphics();
    bands.rect(0, 0, W, H * 0.36).fill(sky);
    bands.rect(0, H * 0.36, W, H * 0.22).fill(horizon);
    bg.addChild(bands);
    /* 전용 하늘 텍스처가 없는 필드도 구름은 흘러가야 한다 — 공용 구름막을 옅게 얹는다 */
    const clouds = new PIXI.TilingSprite({ texture: tileTex("evermore_sky_clouds"), width: W, height: H * 0.4 });
    clouds.tileScale.set(W / clouds.texture.width, (H * 0.4) / clouds.texture.height);
    clouds.tint = sky; clouds.alpha = 0.55;
    bg.addChild(clouds);
    tick = (deltaMS) => { clouds.tilePosition.x -= deltaMS * 0.004; };
  }
  const ground = new PIXI.Graphics();
  ground.rect(0, H * 0.58, W, H * 0.42).fill(0x20251e);
  bg.addChild(ground);

  const ridges = new PIXI.Graphics();
  ridges.poly([0, 390, 0, 286, 150, 210, 290, 294, 455, 190, 640, 278, 830, 205, 1010, 292, W, 224, W, 390])
    .fill({ color: ridge, alpha: 0.88 });
  ridges.poly([0, 390, 0, 330, 190, 280, 390, 334, 590, 246, 790, 326, 1010, 266, W, 316, W, 390])
    .fill({ color: 0x2f352c, alpha: 0.7 });
  bg.addChild(ridges);
  return { node: bg, tick };
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

  const background = fieldBackground(F);
  root.addChild(background.node);
  const fieldTheme = F.theme;

  /* 입구 주변 외곽 벽 스킨 — 출구를 감싼 벽(체비쇼프 거리 2)을 목적지 재질로
   * 갈아입히고, 접근로 반대편 벽면에는 문/아치를 걸어 통로임을 보인다.
   * 출구 발밑 바닥에는 포석 문턱을 깐다. */
  const entranceWallSkin = new Map<string, SurfacePick>();
  const entranceFloor = new Set<string>();
  for (const exit of F.exits) {
    const kind = exit.target.kind === "town" ? TOWN_ENTRANCE_KIND[exit.target.id]
      : exit.target.kind === "field" ? FIELD_ENTRANCE_KIND[exit.target.id]
        : DUNGEON_ENTRANCE_KIND[exit.target.dungeon];
    const skin = ENTRANCE_WALL_SKIN[kind];
    entranceFloor.add(`${exit.x},${exit.y}`);
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (cellAt(map, exit.x + dx, exit.y + dy) !== "wall") continue;
        entranceWallSkin.set(`${exit.x + dx},${exit.y + dy}`, { base: skin.base });
      }
    }
    for (const { dx, dy } of Object.values(DIR)) {
      if (cellAt(map, exit.x + dx, exit.y + dy) !== "wall") continue;
      if (cellAt(map, exit.x - dx, exit.y - dy) === "wall") continue; // 접근 가능한 방향의 맞은편 벽만
      entranceWallSkin.set(`${exit.x + dx},${exit.y + dy}`, { base: skin.base, decal: skin.gate });
    }
  }

  const theme: FPTheme = {
    floorAt: (x, y) => entranceFloor.has(`${x},${y}`)
      ? { base: fieldTheme.floor, decal: "pave_decal" }
      : {
        base: fieldTheme.floor,
        decal: fieldTheme.floorDecal && (x * 17 + y * 31) % 7 === 0 ? fieldTheme.floorDecal : undefined,
      },
    wallAt: (x, y) => entranceWallSkin.get(`${x},${y}`) ?? {
      base: fieldTheme.wall,
      decal: fieldTheme.wallDecal && (x * 13 + y * 7) % 6 === 0 ? fieldTheme.wallDecal : undefined,
    },
    torchAt: () => false,
    ceiling: fieldTheme.ceiling, water: fieldTheme.water,
    stairs: { base: fieldTheme.floor, decal: "stairs_decal" },
    floorTint: fieldTheme.floorTint, wallTint: fieldTheme.wallTint,
    waterTint: fieldTheme.waterTint, ceilingTint: fieldTheme.floorTint,
    viewDistance: fieldTheme.viewDistance,
  };
  const fp = createFPView(theme); root.addChild(fp.root);

  /* 필드별 부유 입자 — 해안길은 물보라, 계곡은 흙먼지, 숲은 낙엽 */
  const FIELD_PARTICLES: Record<FieldId, ParticleKind> = {
    coastRoad: "spray", goblinValley: "dust", hermanForest: "leaves",
  };
  const ambient = particleField(FIELD_PARTICLES[F.id]);
  root.addChild(ambient.node);

  /* ---- 필드 배치 전투 (정예·퀘스트 몬스터) — 처치하면 respawnDays 뒤 재등장 ---- */
  let activeBattle: FieldBattleHandle | null = null;
  const worldDay = () => G.townWorld?.day ?? 1;
  const fightKey = (d: FieldDeco) => `${F.id}:${d.id}`;
  const fightDown = (d: FieldDeco): boolean => {
    if (!d.fight) return false;
    const day = G.fieldFights[fightKey(d)];
    return day !== undefined && worldDay() < day + d.fight.respawnDays;
  };

  const nodesById = new Map<string, FieldNode>();
  for (const d of F.decos) if (!fightDown(d)) nodesById.set(d.id, fieldNode(d));

  const decoAt = (x: number, y: number): FieldDeco | undefined =>
    F.decos.find((d) => d.x === x && d.y === y && nodesById.has(d.id));
  const blockedAt = (x: number, y: number): FieldDeco | undefined =>
    decoAt(x, y)?.blocking ? decoAt(x, y) : undefined;
  const exitAt = (x: number, y: number): FieldExit | undefined =>
    F.exits.find((e) => e.x === x && e.y === y);

  const exitEnts: FPEntity[] = [];
  const ents = (): FPEntity[] => [...nodesById.values()].map(({ entity }) => entity).concat(exitEnts);
  /* 출구 비주얼 — 목적지 테마의 입구(요새는 뼈문, 나머지는 entranceNode) */
  function exitVisual(target: FieldTarget): EntranceVisual {
    if (target.kind === "explore") {
      const node = new PIXI.Container();
      if (target.dungeon === "temple") {
        /* 곶 위에 선 회색 대신전 정면 — 문 너머가 던전이다 */
        const gate = tileSprite("temple_gate_obj", 0.52);
        gate.anchor.set(0.5, 1);
        node.addChild(gate);
        return { node, worldH: 1.35, baseH: 205 };
      }
      const gate = tileSprite("goblin_bone_gate_obj", 1.25);
      gate.anchor.set(0.5, 1);
      node.addChild(gate);
      return { node, worldH: 1.05, baseH: 132 };
    }
    return entranceNode(target.kind === "town"
      ? TOWN_ENTRANCE_KIND[target.id] : FIELD_ENTRANCE_KIND[target.id]);
  }
  F.exits.forEach((exit) => {
    const { node, worldH, baseH } = exitVisual(exit.target);
    const label = txt(exit.label, 12, C.text, { weight: "700", shadow: true });
    label.anchor.set(0.5, 1); label.y = -(baseH + 10); node.addChild(label);
    exitEnts.push({ id: `exit:${exit.x},${exit.y}`, x: exit.x, y: exit.y, node, worldH, baseH });
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
    fp.render(map, px, py, facing, ents());
    const front = { x: px + DIR[facing].dx, y: py + DIR[facing].dy };
    const exit = exitAt(px, py) ?? exitAt(front.x, front.y);
    if (exit) prompt.text = exit.prompt;
    else {
      const d = decoAt(front.x, front.y);
      prompt.text = d ? (d.fight ? `[Z] ${d.name} — 전투!` : `[Z] ${d.name}을(를) 살핀다`) : "";
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
    if (F.id === "goblinValley" && py >= 9 && py <= 12 && px <= 10 && px >= 6
      && !G.flags.banditsDefeated && questStatus("main_clear_evermore_road") === "active") {
      startBanditAmbush();
      return;
    }
    /* 랜덤 인카운터 — 잡몹은 지도에 보이지 않고 걷다가 마주친다 (출구 칸은 안전) */
    if (F.encounters && !exitAt(px, py) && gameplayRandom() < F.encounters.chance) {
      const groups = F.encounters.groups;
      const group = groups[Math.min(groups.length - 1, Math.floor(gameplayRandom() * groups.length))];
      startBattle(group, "야생의 습격", null);
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
    if (exit.target.kind === "explore") { nav.explore(exit.target.dungeon); return; }
    G.town = exit.target.id;
    nav.town(exit.target.spawn);
  }
  function interact(): void {
    if (activeEvent || activeBattle) return;
    const front = { x: px + DIR[facing].dx, y: py + DIR[facing].dy };
    const exit = exitAt(px, py) ?? exitAt(front.x, front.y);
    if (exit) { leave(exit); return; }
    const d = decoAt(front.x, front.y);
    if (!d) return;
    if (d.fight) {
      logT.text = d.text;
      startBattle(d.fight.enemies, d.name, d);
      return;
    }
    if (d.id === "cold_shrine") {
      logT.text = G.flags.bishopDefeated
        ? "사악한 기운이 걷힌 제단은 그저 낡은 돌덩이다. 바다는 아무 일 없다는 듯 잔잔하다."
        : d.text;
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

  /* ---- 조우 전투 — 승리 보상(골드·경험치·드랍·퀘스트 카운트)과 리스폰 기록 ---- */
  function startBattle(enemies: string[], caption: string, deco: FieldDeco | null): void {
    if (activeBattle) return;
    activeBattle = fieldBattleOverlay({
      enemies, caption, prevBadge: F.badge,
      onEnd: (result) => {
        activeBattle = null;
        if (result === "victory") {
          let gold = 0, exp = 0;
          for (const id of enemies) { gold += ENEMY_DEFS[id].gold; exp += ENEMY_DEFS[id].exp; }
          G.gold += gold;
          const ups = gainExpParty(exp);
          toast(`승리! 경험치 +${exp}, ${gold} G`, C.border);
          for (const id of enemies) {
            const drop = rollDropToBag(ENEMY_DEFS[id].tier);
            if (drop) {
              const rm = RARITY_META[drop.rarity];
              toast(`${gearDisplayName(drop)} 획득! [${rm.name}]${drop.identified ? "" : " — 미확인 (식별 필요)"} · 가방에 보관`, rm.color);
            }
            questNotify({ t: "kill", defId: id }).forEach((up) => toast(updateText(up), C.border));
          }
          if (ups.length) toast(`레벨 업! ${ups.join(" · ")} — 모험 수첩에서 성장 포인트를 배분하라 (능력치 ${LEVEL_AP}·스킬 ${LEVEL_SP})`, C.border);
          if (deco?.fight) {
            G.fieldFights[fightKey(deco)] = worldDay();
            nodesById.delete(deco.id);
            logT.text = `${deco.name}을(를) 물리쳤다. 며칠이 지나면 다시 나타날 것이다.`;
          } else {
            logT.text = "적을 물리치고 길을 재촉한다.";
          }
          refresh();
        } else if (result === "defeat") {
          G.party.forEach((m) => { if (m.hp <= 0) m.hp = 1; });
          toast("전멸했다… 정신을 차리니 크로스베일의 여관이다.", C.blood);
          G.town = "crossvale";
          nav.town();
        } else {
          logT.text = "무사히 떨어져 나왔다. 서두르자.";
          refresh();
        }
      },
    });
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

  const ticker = (t: PIXI.Ticker) => {
    fp.tick(t.deltaMS);
    background.tick?.(t.deltaMS);
    ambient.tick(t.deltaMS);
    for (const n of nodesById.values()) {
      n.monster?.tickMotion(t.deltaMS);
      n.tick?.(t.deltaMS);
    }
  };
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
      if (activeBattle) return; // 전투 오버레이는 버튼으로만 조작
      if (activeEvent) { activeEvent.onKey?.(k); return; }
      KEYMAP[k.length === 1 ? k.toLowerCase() : k]?.();
    },
    dispose() { activeBattle?.dispose(); activeEvent?.dispose?.(); scope.dispose(); },
  };
}
