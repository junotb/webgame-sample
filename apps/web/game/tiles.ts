/* =====================================================================
 * tiles.ts — 던전·마을 타일 텍스처 (public/assets/world에서 슬라이스)
 *  시트(16px 그리드):
 *   tileset_walls_floor        벽·바닥·계단·창/문 파사드
 *   props_door_chest_animation 문 개폐·상자 프레임 (빌보드용)
 *   props_objects              술통·짐짝 등 소품
 *   tileset_water_coast_animation  물
 *   decor_wall/floor_cracks        풍화·포장 데칼 (투명부 있음 — 베이스 위에 겹침)
 *   fx_fire_brazier_animation      횃불 불꽃 6프레임
 *  *_decal 이름은 오버레이 전용: 단독으로 쓰지 말고 베이스 타일 위에 그린다.
 * ===================================================================== */
import * as PIXI from "pixi.js";

export const TILE = 16;

const SHEET_SRC = {
  walls: "/assets/world/tilesets/dungeon/walls_floor.png",
  doorAnim: "/assets/world/props/buildings/door_chest_animation.png",
  props: "/assets/world/props/common/objects.png",
  water: "/assets/world/tilesets/nature/water_coast_animation.png",
  wallCracks: "/assets/world/decals/wall/cracks.png",
  floorCracks: "/assets/world/decals/floor/cracks.png",
  brazier: "/assets/world/effects/fire/brazier_animation.png",
  facilityEmblems: "/assets/world/props/buildings/facility_emblems.png",
  villageFacades: "/assets/world/tilesets/village/facades.png",
  villageGround: "/assets/world/tilesets/village/ground.png",
  villageWater: "/assets/world/tilesets/village/water.png",
  townBackgrounds: "/assets/world/backgrounds/crossvale_valley.png",
  trees: "/assets/world/props/nature/trees.png",
  bushes: "/assets/world/props/nature/bushes.png",
  flowers: "/assets/world/props/nature/flowers.png",
  mushrooms: "/assets/world/props/nature/mushrooms.png",
  cave: "/assets/world/tilesets/cave/ground.png",
  fountainProp: "/assets/world/props/structures/fountain.png",
  wellProp: "/assets/world/props/village/well.png",
  goblinSky1: "/assets/world/backgrounds/goblin_valley_sky_01.png",
  goblinSky2: "/assets/world/backgrounds/goblin_valley_sky_02.png",
  goblinSky3: "/assets/world/backgrounds/goblin_valley_sky_03.png",
  barbarianOutpost: "/assets/world/tilesets/outposts/barbarian.png",
  beachOutpost: "/assets/world/tilesets/outposts/beach.png",
  valleyRocks: "/assets/world/tilesets/nature/rocks.png",
  hunterCamp: "/assets/world/props/outposts/huntercamp_small.png",
  outdoorCampfire: "/assets/world/props/outdoor/campfire_01_animation.png",
} as const;
type SheetName = keyof typeof SHEET_SRC;

/** 테스트용 — 시트 경로 목록 (public 기준) */
export const SHEET_FILES: string[] = Object.values(SHEET_SRC);

interface FrameDef { s: SheetName; x: number; y: number; w: number; h: number }

const FRAMES = {
  /* ---- 벽·천장 ---- */
  wall: { s: "walls", x: 8, y: 48, w: 32, h: 28 },
  ceiling: { s: "walls", x: 8, y: 8, w: 32, h: 24 },
  wall_worn_decal: { s: "wallCracks", x: 0, y: 224, w: 32, h: 32 },
  wall_worn2_decal: { s: "wallCracks", x: 64, y: 224, w: 32, h: 32 },
  wall_window_decal: { s: "walls", x: 80, y: 336, w: 32, h: 32 },
  /* ---- 바닥 ---- */
  floor: { s: "walls", x: 16, y: 96, w: 16, h: 16 },
  floor_crack: { s: "walls", x: 0, y: 336, w: 16, h: 16 },
  floor_rubble: { s: "walls", x: 176, y: 336, w: 16, h: 16 },
  pave_decal: { s: "floorCracks", x: 0, y: 48, w: 32, h: 32 },
  pave2_decal: { s: "floorCracks", x: 64, y: 48, w: 32, h: 32 },
  stairs_decal: { s: "walls", x: 160, y: 128, w: 16, h: 16 },
  water: { s: "water", x: 96, y: 432, w: 16, h: 16 },
  /* ---- 오브젝트 (빌보드, 발밑 기준으로 쓰려면 anchor(0.5,1)) ---- */
  door_obj: { s: "doorAnim", x: 128, y: 32, w: 32, h: 32 },      // 열린 아치 — 던전 통로
  door_closed_obj: { s: "doorAnim", x: 0, y: 96, w: 32, h: 32 }, // 닫힌 목문 — 마을 시설 입구 (바닥까지 닿는 목문 프레임)
  chest_obj: { s: "doorAnim", x: 0, y: 128, w: 32, h: 32 },
  barrel_obj: { s: "props", x: 96, y: 64, w: 16, h: 32 },
  crate_obj: { s: "props", x: 256, y: 0, w: 32, h: 32 },
  /* ---- 마을 기능성 건물 벽면 엠블럼 (4×2, 96×96 프레임) ---- */
  facility_emblem_weapon: { s: "facilityEmblems", x: 0, y: 0, w: 96, h: 96 },
  facility_emblem_armor: { s: "facilityEmblems", x: 96, y: 0, w: 96, h: 96 },
  facility_emblem_item: { s: "facilityEmblems", x: 192, y: 0, w: 96, h: 96 },
  facility_emblem_inn: { s: "facilityEmblems", x: 288, y: 0, w: 96, h: 96 },
  facility_emblem_stable: { s: "facilityEmblems", x: 0, y: 96, w: 96, h: 96 },
  facility_emblem_bounty: { s: "facilityEmblems", x: 96, y: 96, w: 96, h: 96 },
  facility_emblem_elements: { s: "facilityEmblems", x: 192, y: 96, w: 96, h: 96 },
  facility_emblem_spirit: { s: "facilityEmblems", x: 288, y: 96, w: 96, h: 96 },
  /* ---- 마을 외관 (style_48 공통 아틀라스) ---- */
  village_wall_brick: { s: "villageFacades", x: 0, y: 0, w: 96, h: 96 },
  village_wall_plaster: { s: "villageFacades", x: 96, y: 0, w: 96, h: 96 },
  village_wall_stone: { s: "villageFacades", x: 192, y: 0, w: 96, h: 96 },
  village_wall_timber: { s: "villageFacades", x: 288, y: 0, w: 96, h: 96 },
  village_roof_red: { s: "villageFacades", x: 0, y: 96, w: 96, h: 96 },
  village_roof_blue: { s: "villageFacades", x: 96, y: 96, w: 96, h: 96 },
  village_window_arch: { s: "villageFacades", x: 0, y: 480, w: 48, h: 96 },
  village_window_small: { s: "villageFacades", x: 48, y: 528, w: 48, h: 48 },
  village_window_wide: { s: "villageFacades", x: 96, y: 528, w: 96, h: 48 },
  village_window_flower: { s: "villageFacades", x: 0, y: 576, w: 48, h: 96 },
  village_door_wood: { s: "villageFacades", x: 48, y: 576, w: 48, h: 96 },
  village_door_arch: { s: "villageFacades", x: 96, y: 576, w: 48, h: 96 },
  /* ---- 크로스베일 초지·대로·개울 (style_48 48px 그리드) ---- */
  village_grass: { s: "villageGround", x: 0, y: 0, w: 48, h: 48 },
  village_grass_alt: { s: "villageGround", x: 48, y: 48, w: 48, h: 48 },
  village_paving: { s: "villageGround", x: 144, y: 48, w: 48, h: 48 },
  village_cobble: { s: "villageGround", x: 240, y: 48, w: 48, h: 48 },
  village_water: { s: "villageWater", x: 0, y: 64, w: 48, h: 48 },
  crossvale_valley_bg: { s: "townBackgrounds", x: 0, y: 0, w: 576, h: 324 },
  /* ---- 목가적 마을·필드 자연물 (종류별 atlas, 프레임은 원본 크기 유지) ---- */
  tree_01: { s: "trees", x: 0, y: 0, w: 96, h: 112 },
  tree_02: { s: "trees", x: 96, y: 0, w: 96, h: 112 },
  tree_03: { s: "trees", x: 0, y: 112, w: 96, h: 112 },
  tree_04: { s: "trees", x: 96, y: 112, w: 96, h: 112 },
  bush_01: { s: "bushes", x: 0, y: 0, w: 32, h: 32 },
  bush_02: { s: "bushes", x: 32, y: 0, w: 32, h: 32 },
  flower_01: { s: "flowers", x: 0, y: 0, w: 16, h: 16 },
  flower_02: { s: "flowers", x: 16, y: 0, w: 16, h: 16 },
  mushroom_01: { s: "mushrooms", x: 0, y: 0, w: 16, h: 16 },
  /* ---- 고블린 요새(동굴) 표면 — cave/ground.png의 이음매 없는 암반 블록에서 슬라이스 ---- */
  cave_floor: { s: "cave", x: 88, y: 208, w: 16, h: 16 },   // 회색 암반 바닥
  cave_wall: { s: "cave", x: 272, y: 440, w: 32, h: 28 },   // 갈색 암벽
  cave_ceiling: { s: "cave", x: 80, y: 470, w: 32, h: 24 }, // 어두운 암반 천장
  /* ---- 마을 구조물 프롭 (빌보드) ---- */
  fountain_obj: { s: "fountainProp", x: 0, y: 0, w: 92, h: 40 }, // 둥근 돌 분수 (시선 높이에 맞춰 납작하게)
  well_obj: { s: "wellProp", x: 0, y: 0, w: 52, h: 58 },         // 지붕 달린 돌우물
  /* ---- 고블린 계곡길 — 야영지·해안 전용 비주얼 ---- */
  goblin_sky_base: { s: "goblinSky1", x: 0, y: 0, w: 576, h: 324 },
  goblin_sky_cloud_back: { s: "goblinSky2", x: 0, y: 0, w: 576, h: 324 },
  goblin_sky_cloud_near: { s: "goblinSky3", x: 0, y: 0, w: 576, h: 324 },
  bandit_hideout_obj: { s: "hunterCamp", x: 0, y: 0, w: 192, h: 240 },
  goblin_tent_obj: { s: "barbarianOutpost", x: 248, y: 0, w: 164, h: 146 },
  goblin_totem_obj: { s: "barbarianOutpost", x: 48, y: 352, w: 48, h: 112 },
  goblin_bone_gate_obj: { s: "barbarianOutpost", x: 8, y: 476, w: 80, h: 100 },
  shore_boat_obj: { s: "beachOutpost", x: 624, y: 194, w: 144, h: 72 },
  shore_dock_obj: { s: "beachOutpost", x: 624, y: 592, w: 144, h: 176 },
  valley_rock_obj: { s: "valleyRocks", x: 288, y: 0, w: 96, h: 96 },
  campfire_obj_0: { s: "outdoorCampfire", x: 0, y: 0, w: 48, h: 64 },
  campfire_obj_1: { s: "outdoorCampfire", x: 48, y: 0, w: 48, h: 64 },
  campfire_obj_2: { s: "outdoorCampfire", x: 96, y: 0, w: 48, h: 64 },
} as const satisfies Record<string, FrameDef>;
export type TileName = keyof typeof FRAMES;

/* 횃불 불꽃 — fx_fire_brazier 2번째 열(44×48), 세로 6프레임 */
export const FLAME_N = 6;
const flameFrame = (i: number): FrameDef => ({ s: "brazier", x: 44, y: i * 48, w: 44, h: 48 });

const tex: Record<string, PIXI.Texture> = {};
const flameTexs: PIXI.Texture[] = [];

/** boot에서 1회 호출 — 시트 로드 후 프레임 텍스처로 슬라이스 */
export async function loadTiles(): Promise<void> {
  const sheets: Record<string, PIXI.Texture> = await PIXI.Assets.load(
    (Object.keys(SHEET_SRC) as SheetName[]).map((k) => ({
      alias: `tiles-${k}`,
      src: SHEET_SRC[k],
      data: { scaleMode: "nearest" as const },
    })),
  );
  const cut = (f: FrameDef) => new PIXI.Texture({
    source: sheets[`tiles-${f.s}`].source,
    frame: new PIXI.Rectangle(f.x, f.y, f.w, f.h),
  });
  for (const [name, f] of Object.entries(FRAMES)) tex[name] = cut(f);
  flameTexs.length = 0;
  for (let i = 0; i < FLAME_N; i++) flameTexs.push(cut(flameFrame(i)));
}

export function tileTex(name: TileName): PIXI.Texture {
  const t = tex[name];
  if (!t) throw new Error(`tiles: "${name}" 미로드 — boot의 loadTiles() 이후 사용 가능`);
  return t;
}

export function flameTex(i: number): PIXI.Texture {
  if (!flameTexs.length) throw new Error("tiles: 불꽃 미로드 — boot의 loadTiles() 이후 사용 가능");
  return flameTexs[((i % FLAME_N) + FLAME_N) % FLAME_N];
}

export function tileSprite(name: TileName, scale = 2): PIXI.Sprite {
  const s = new PIXI.Sprite(tileTex(name));
  s.scale.set(scale);
  return s;
}
