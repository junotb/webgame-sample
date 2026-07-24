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
import { RARITY_META, gearDisplayName, storyEvent } from "../defs";
import { FieldBattleHandle, fieldBattleOverlay } from "./field-battle";
import { BattleResult } from "../core/battle-engine";
import { LEVEL_AP, LEVEL_SP, gainExpParty, rollDropToBag, rollMaterialToState } from "../state";
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
import { drawMonster, MonsterView, monsterPx } from "../monsters";
import { EventNode, eventOverlay } from "./event";
import { EventBattleHandle, eventBattle } from "./event-battle";
import { events } from "../core/events";

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
    return { node, worldH: 1.05, baseH: 142 };
  }

  if (style === "goblin_camp") {
    const tent = tileSprite("goblin_tent_obj", 1.35);
    tent.anchor.set(0.5, 1);
    node.addChild(g, tent);
    return { node, worldH: 0.94, baseH: 135 };
  }

  if (style === "cage_full") {
    /* 포로는 그리지 않는다 — 갇힌 이들의 사연은 조사 지문이 전한다 */
    node.addChild(g);
    for (const cx of [-38, 38]) {
      const cage = tileSprite("cage_obj", 2);
      cage.anchor.set(0.5, 1); cage.x = cx;
      node.addChild(cage);
    }
    return { node, worldH: 0.98, baseH: 146 };
  }

  if (style === "cage_empty") {
    const cage = tileSprite("cage_blood_obj", 2);
    cage.anchor.set(0.5, 1);
    node.addChild(g, cage);
    return { node, worldH: 0.98, baseH: 150 };
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
    shore_boat: { tile: "shore_boat_obj", scaleX: 0.86, scaleY: 0.86, worldH: 0.38, baseH: 42 },
    shore_dock: { tile: "shore_dock_obj", scaleX: 0.82, scaleY: 0.28, worldH: 0.18, baseH: 54 },
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

/* 늪·빛숲 자연물 프롭 — 프레임 크기가 제각각이라 스케일·월드 높이를 개별 지정한다.
 * sway를 끈 프롭(수정·버섯)은 바람에 흔들리지 않는다. */
const NATURE_PROP: Partial<Record<TileName, {
  scale: number; worldH: number; baseH: number; sway?: boolean; squashY?: number;
}>> = {
  swamp_willow_obj: { scale: 0.9, worldH: 1.15, baseH: 166, sway: true },
  swamp_willow2_obj: { scale: 0.9, worldH: 1.1, baseH: 161, sway: true },
  swamp_deadtree_obj: { scale: 0.9, worldH: 1.02, baseH: 148, sway: true },
  swamp_snag_obj: { scale: 0.9, worldH: 0.88, baseH: 128 },
  swamp_lilypad_obj: { scale: 0.85, worldH: 0.16, baseH: 27, squashY: 0.42 },
  swamp_shroom_tall_obj: { scale: 0.75, worldH: 0.98, baseH: 142, sway: true },
  swamp_shroom_violet_obj: { scale: 0.9, worldH: 0.58, baseH: 84 },
  swamp_shroom_brown_obj: { scale: 0.9, worldH: 0.55, baseH: 80 },
  glow_tree_big_obj: { scale: 0.95, worldH: 1.26, baseH: 184, sway: true },
  glow_tree_lantern_obj: { scale: 0.9, worldH: 1.16, baseH: 169, sway: true },
  glow_tree_small_obj: { scale: 0.9, worldH: 0.66, baseH: 95, sway: true },
  glow_crystal_purple_obj: { scale: 0.8, worldH: 0.46, baseH: 66 },
  glow_crystal_green_obj: { scale: 0.8, worldH: 0.46, baseH: 66 },
  glow_crystal_blue_obj: { scale: 0.8, worldH: 0.46, baseH: 66 },
  glow_grass_obj: { scale: 1, worldH: 0.32, baseH: 47, sway: true },
  giant_mushroom_obj: { scale: 0.8, worldH: 1.42, baseH: 207 },
  mush_stool_blue_obj: { scale: 0.8, worldH: 0.53, baseH: 77 },
  mush_stool_brown_obj: { scale: 0.8, worldH: 0.53, baseH: 77 },
};

function fieldNode(deco: FieldDeco): FieldNode {
  if (deco.visual?.kind === "monster") {
    const node = new PIXI.Container();
    const def = ENEMY_DEFS[deco.visual.defId];
    const monster = drawMonster(def, deco.visual.defId === "wolf" ? 0.9 : 0.82);
    node.addChild(monster);
    return {
      entity: { id: `deco:${deco.id}`, x: deco.x, y: deco.y, node, worldH: 0.72, baseH: monsterPx(def) },
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
  const nature = NATURE_PROP[deco.tile];
  if (nature) {
    const node = new PIXI.Container();
    const g = new PIXI.Graphics();
    g.ellipse(0, 3, 30 + nature.baseH * 0.18, 9).fill({ color: 0x16120e, alpha: 0.32 });
    const s = tileSprite(deco.tile, nature.scale);
    s.anchor.set(0.5, 1);
    if (nature.squashY) s.scale.y = nature.scale * nature.squashY;
    node.addChild(g, s);
    return {
      entity: { id: `deco:${deco.id}`, x: deco.x, y: deco.y, node, worldH: nature.worldH, baseH: nature.baseH },
      tick: nature.sway
        ? swaySprite(s, { amp: 0.014, period: 3600, phase: deco.x * 1.3 + deco.y * 2.1 })
        : undefined,
    };
  }
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
  events.emit("scene:enter", { kind: "field", id });
  setModeBadge(F.badge, C.green);
  const root = new PIXI.Container(); sceneRoot.addChild(root);
  const map = F.map;
  let px = F.start.x, py = F.start.y;
  let facing: Facing = F.start.facing;
  /* 필드 진입·전투 직후에는 일정 걸음 동안 랜덤 인카운터를 걸지 않는다 */
  const ENCOUNTER_GRACE_STEPS = 6;
  let encounterGrace = ENCOUNTER_GRACE_STEPS;
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
    coastRoad: "spray", goblinValley: "dust", hermanForest: "leaves", evermoreOutskirts: "leaves",
    mistmarsh: "mist", gleamwood: "fireflies",
  };
  const ambient = particleField(FIELD_PARTICLES[F.id]);
  root.addChild(ambient.node);

  /* ---- 필드 배치 전투 (정예·퀘스트 몬스터) — 처치하면 respawnDays 뒤 재등장 ---- */
  let activeBattle: FieldBattleHandle | null = null;
  let activeEventBattle: EventBattleHandle | null = null;
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
      return { node, worldH: 1.05, baseH: 176 };
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
  const logT = txt(`일행이 ${F.name}에 들어섰다. 길가의 기척에 주의해야 한다.`, 15, C.text);
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
    if (encounterGrace > 0) { encounterGrace--; return; }
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
        ? "산적은 소탕됐지만 아직 길드의 통행 재개 승인이 나지 않았다. 크로스베일 현상금 길드에 먼저 보고해야 한다."
        : "좁은 계곡을 산적들이 봉쇄하고 있다. 마구간에서 사정을 확인한 뒤 산적들을 소탕해야 한다.";
      return;
    }
    if (exit.target.kind === "field") { nav.field(exit.target.id); return; }
    if (exit.target.kind === "explore") { nav.explore(exit.target.dungeon); return; }
    G.town = exit.target.id;
    nav.town(exit.target.spawn);
  }
  function interact(): void {
    if (activeEvent || activeBattle || activeEventBattle) return;
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
        logT.text = "겁에 질린 인질들이 구조를 기다린다. 고블린 주둔지에 관해서는 크로스베일의 장로 카엘에게 물어봐야 한다.";
      else {
        G.flags.hostagesRescued = true;
        const updates = questNotify({ t: "rescue", group: "valley_hostages" });
        logT.text = "일행이 자물쇠를 부수고 우리에 갇힌 인질들을 풀어 주었다. 모두 크로스베일로 무사히 달아났다.";
        if (updates[0]) logT.text += `  ${updateText(updates[0])}`;
      }
      return;
    }
    if (d.id === "lost_prince") {
      if (G.flags.princeFound)
        logT.text = "왕자가 몸을 녹이던 모닥불 자리엔 재만 남았다. 어린 군주는 무사히 성으로 돌아갔다.";
      else if (questStatus("main_ch1_wavering_crown") === "active") startPrinceEncounter();
      else logT.text = d.text;
      return;
    }
    logT.text = d.text;
  }

  /* ---- 전투 결산 — 승리 보상(골드·경험치·드랍·퀘스트 카운트)과 리스폰 기록 ---- */
  function settleBattle(result: BattleResult, enemies: string[], deco: FieldDeco | null): void {
    encounterGrace = ENCOUNTER_GRACE_STEPS;
    if (result === "victory") {
      let gold = 0, exp = 0;
      for (const id of enemies) { gold += ENEMY_DEFS[id].gold; exp += ENEMY_DEFS[id].exp; }
      G.gold += gold;
      const ups = gainExpParty(exp);
      toast(`승리! 경험치 +${exp}, ${gold} G`, C.border);
      const mats: string[] = [];
      for (const id of enemies) {
        const mat = rollMaterialToState(id);
        if (mat) mats.push(mat);
      }
      if (mats.length) toast(`재료 획득: ${mats.join(" · ")}`, C.border);
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
        logT.text = "일행은 적을 물리치고 길을 재촉했다.";
      }
      refresh();
    } else if (result === "defeat") {
      G.party.forEach((m) => { if (m.hp <= 0) m.hp = 1; });
      toast("일행이 전멸했다… 눈을 뜬 곳은 크로스베일의 여관이었다.", C.blood);
      G.town = "crossvale";
      nav.town();
    } else {
      logT.text = "일행은 무사히 떨어져 나왔다. 갈 길을 서둘러야 한다.";
      refresh();
    }
  }

  function startBattle(enemies: string[], caption: string, deco: FieldDeco | null): void {
    if (activeBattle) return;
    activeBattle = fieldBattleOverlay({
      enemies, caption, prevBadge: F.badge,
      onEnd: (result) => {
        activeBattle = null;
        settleBattle(result, enemies, deco);
      },
    });
  }

  /* ---- 산적 매복 — 이벤트 전투: 포위 대화 → 강제 전투 → 승리 대화 ---- */
  function startBanditAmbush(): void {
    const nodes: EventNode[] = storyEvent("bandit_ambush");
    const enemies = ["banditBoss", "bandit", "bandit", "bandit"];
    activeEventBattle = eventBattle({
      intro: nodes.slice(0, 3),
      outro: nodes.slice(3),
      enemies,
      caption: "산적의 포위",
      prevBadge: F.badge,
      introOpts: { caption: "산적의 포위", dim: true },
      onEnd: (result) => {
        activeEventBattle = null;
        settleBattle(result, enemies, null);
        if (result === "victory") {
          G.flags.banditsDefeated = true;
          const updates = questNotify({ t: "clear", symbol: "valley_bandits" });
          logT.text = updates[0] ? updateText(updates[0]) : "일행이 산적 무리를 소탕했다. 현상금 길드에 보고해야 한다.";
          refresh();
        }
      },
    });
  }

  /* ---- 1장: 강변 덤불 뒤에서 성을 빠져나간 어린 군주를 찾아낸다 ---- */
  function startPrinceEncounter(): void {
    const nodes: EventNode[] = storyEvent("prince_encounter");
    activeEvent = eventOverlay(nodes, () => {
      activeEvent = null;
      G.flags.princeFound = true;
      const updates = questNotify({ t: "talk", npc: "lost_prince" });
      logT.text = updates[0] ? updateText(updates[0]) : "어린 군주를 찾아냈다. 성의 시종장 오르윈에게 알려야 한다.";
      refresh();
    }, { caption: "강변의 어린 군주" });
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
      if (activeBattle || activeEventBattle) { // 전투 오버레이는 버튼으로만 조작 — 예외: L은 전투 기록 토글
        if (k === "l" || k === "L" || k === "ㅣ") (activeBattle ?? activeEventBattle)?.toggleLog();
        return;
      }
      if (activeEvent) { activeEvent.onKey?.(k); return; }
      KEYMAP[k.length === 1 ? k.toLowerCase() : k]?.();
    },
    dispose() { activeBattle?.dispose(); activeEventBattle?.dispose(); activeEvent?.dispose?.(); scope.dispose(); },
  };
}
