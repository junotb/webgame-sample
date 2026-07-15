/* =====================================================================
 * tiles.ts — 던전 타일셋 (32×32, scripts/gen_tiles.py 산출 4×3 시트)
 *  시트 순서: floor floor_crack wall wall_top / wall_moss door stairs water
 *            / torch chest bones pillar
 * ===================================================================== */
import * as PIXI from "pixi.js";

export const TILE = 32;

const SHEET_COLS = 4;
const ORDER = [
  "floor", "floor_crack", "wall", "wall_top",
  "wall_moss", "door", "stairs", "water",
  "torch", "chest", "bones", "pillar",
] as const;
export type TileName = (typeof ORDER)[number];

/** 바닥이 함께 구워진 타일에서 오브젝트 영역만 잘라낸 프레임 */
const OBJ_FRAMES = {
  door_obj: { base: "door", x: 5, y: 6, w: 22, h: 26 },
  chest_obj: { base: "chest", x: 5, y: 9, w: 22, h: 19 },
  pillar_obj: { base: "pillar", x: 8, y: 2, w: 17, h: 29 },
} as const;
export type TileObjName = keyof typeof OBJ_FRAMES;

const tex: Record<string, PIXI.Texture> = {};

/** boot에서 1회 호출 — 시트 로드 후 개별 타일 텍스처로 슬라이스 */
export async function loadTiles(): Promise<void> {
  const sheet: PIXI.Texture = await PIXI.Assets.load({
    alias: "dungeon-tiles",
    src: "/assets/tiles/dungeon_tileset.png",
    data: { scaleMode: "nearest" as const },
  });
  ORDER.forEach((name, i) => {
    tex[name] = new PIXI.Texture({
      source: sheet.source,
      frame: new PIXI.Rectangle(
        (i % SHEET_COLS) * TILE, Math.floor(i / SHEET_COLS) * TILE, TILE, TILE),
    });
  });
  for (const [name, f] of Object.entries(OBJ_FRAMES)) {
    const base = tex[f.base];
    tex[name] = new PIXI.Texture({
      source: sheet.source,
      frame: new PIXI.Rectangle(base.frame.x + f.x, base.frame.y + f.y, f.w, f.h),
    });
  }
}

export function tileTex(name: TileName | TileObjName): PIXI.Texture {
  const t = tex[name];
  if (!t) throw new Error(`tiles: "${name}" 미로드 — boot의 loadTiles() 이후 사용 가능`);
  return t;
}

export function tileSprite(name: TileName | TileObjName, scale = 2): PIXI.Sprite {
  const s = new PIXI.Sprite(tileTex(name));
  s.scale.set(scale);
  return s;
}
