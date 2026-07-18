/* =====================================================================
 * tiles.ts — 던전·마을 타일 텍스처 (public/assets/tiles 팩에서 슬라이스)
 *  시트(16px 그리드):
 *   tileset_walls_floor        벽·바닥·계단·창/문 파사드
 *   props_door_chest_animation 문 개폐·상자 프레임 (빌보드용)
 *   props_objects              술통·짐짝 등 소품
 *   tileset_water_coast_animation  물
 *   decorative_wall/floor_cracks   풍화·포장 데칼 (투명부 있음 — 베이스 위에 겹침)
 *   fx_fire_brazier_animation      횃불 불꽃 6프레임
 *  *_decal 이름은 오버레이 전용: 단독으로 쓰지 말고 베이스 타일 위에 그린다.
 * ===================================================================== */
import * as PIXI from "pixi.js";

export const TILE = 16;

const SHEET_SRC = {
  walls: "/assets/tiles/tileset_walls_floor.png",
  doorAnim: "/assets/tiles/props_door_chest_animation.png",
  props: "/assets/tiles/props_objects.png",
  water: "/assets/tiles/tileset_water_coast_animation.png",
  wallCracks: "/assets/tiles/decorative_wall_cracks.png",
  floorCracks: "/assets/tiles/decorative_floor_cracks.png",
  brazier: "/assets/tiles/fx_fire_brazier_animation.png",
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
  door_closed_obj: { s: "doorAnim", x: 0, y: 32, w: 32, h: 32 }, // 닫힌 목문 — 마을 시설 입구
  chest_obj: { s: "doorAnim", x: 0, y: 128, w: 32, h: 32 },
  barrel_obj: { s: "props", x: 96, y: 64, w: 16, h: 32 },
  crate_obj: { s: "props", x: 256, y: 0, w: 32, h: 32 },
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
