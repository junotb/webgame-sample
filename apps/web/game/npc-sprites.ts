/* =====================================================================
 * npc-sprites.ts — 마을 NPC 거리 스프라이트 로더
 *  런타임 이미지는 기본 96×96 idle 프레임이다. NpcDef.sprite가 이름을 가리키고,
 *  미로드·미지정 시 호출부가 절차적 그리기(drawAdventurer)로 폴백한다.
 *
 *  투명 고해상도 원본은 assets-source/npcs/town, 경량 런타임 이미지는
 *  public/assets/npcs에 둔다. 규격이 다른 시트는 NPC_SPRITE_LAYOUTS에 배열을 명시한다.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import type { AmbientTick } from "./ambient";

/** assets/npcs/<이름>.png 와 1:1 대응 (assets.test가 강제) */
export const NPC_SPRITE_SHEETS = [
  "kael",
  "lokan",
  "chamberlain",
  "eldwin",
  "sister_lia",
  "goblin",
] as const;
export type NpcSpriteSheet = (typeof NPC_SPRITE_SHEETS)[number];

const FRAME = 96;
const FRAME_MS = 260;
const NPC_SPRITE_LAYOUTS: Partial<
  Record<NpcSpriteSheet, { frameW: number; frameH: number; columns: number; frameCount: number }>
> = {
  // 원본은 64×96 셀을 4열×2행으로 배치한 6프레임 시트다.
  goblin: { frameW: 64, frameH: 96, columns: 4, frameCount: 6 },
};
/** 런타임 이미지는 표시 크기와 1:1이다. */
const SCALE = 1;
/** 모든 런타임 시트의 발밑에 남은 투명 여백. 원근 확대 시 NPC가 떠 보이지 않게 보정한다. */
const GROUND_INSET = 4;
/** 거리 스프라이트의 표시 높이(px) — 빌보드 baseH·머리 위 마크 배치 기준 */
export const NPC_SPRITE_PX = FRAME * SCALE;

const alias = (sheet: string) => `npc-${sheet}`;
const frameCache = new Map<string, PIXI.Texture[]>();

/** boot에서 1회 호출 — 시트 전체 프리로드 */
export async function loadNpcSprites(): Promise<void> {
  await PIXI.Assets.load(
    NPC_SPRITE_SHEETS.map((sheet) => ({
      alias: alias(sheet),
      src: `/assets/npcs/${sheet}.png`,
      data: { scaleMode: "nearest" as const },
    })),
  );
}

function frameTextures(sheet: string): PIXI.Texture[] | null {
  const cached = frameCache.get(sheet);
  if (cached) return cached;
  const base = PIXI.Assets.get<PIXI.Texture>(alias(sheet));
  if (!base) return null;
  const layout = NPC_SPRITE_LAYOUTS[sheet as NpcSpriteSheet];
  const frameW = layout?.frameW ?? FRAME;
  const frameH = layout?.frameH ?? FRAME;
  const columns = layout?.columns ?? Math.max(1, Math.floor(base.width / frameW));
  const count = layout?.frameCount ?? columns;
  const frames = Array.from(
    { length: count },
    (_, i) =>
      new PIXI.Texture({
        source: base.source,
        frame: new PIXI.Rectangle(
          (i % columns) * frameW,
          Math.floor(i / columns) * frameH,
          frameW,
          frameH,
        ),
      }),
  );
  frameCache.set(sheet, frames);
  return frames;
}

/** 발밑(0,0) 기준 idle 애니메이션 노드. tick을 씬 ticker에 등록해야 숨을 쉰다.
 *  phase로 프레임 위상을 어긋내 광장의 NPC들이 일제히 움직이지 않게 한다. */
export function npcSpriteView(
  sheet: string,
  opts: { phase?: number } = {},
): { node: PIXI.Container; tick: AmbientTick } | null {
  const frames = frameTextures(sheet);
  if (!frames) return null;
  const node = new PIXI.Container();
  const shadow = new PIXI.Graphics();
  shadow.ellipse(0, 2, 21, 6).fill({ color: 0x000000, alpha: 0.35 });
  const sprite = new PIXI.Sprite(frames[0]);
  sprite.anchor.set(0.5, 1);
  sprite.scale.set(SCALE);
  sprite.y = GROUND_INSET;
  node.addChild(shadow, sprite);

  let elapsed = ((opts.phase ?? 0) % frames.length) * FRAME_MS;
  const tick: AmbientTick = (deltaMS) => {
    elapsed += deltaMS;
    sprite.texture = frames[Math.floor(elapsed / FRAME_MS) % frames.length];
  };
  return { node, tick };
}
