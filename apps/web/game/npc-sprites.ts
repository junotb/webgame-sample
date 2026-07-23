/* =====================================================================
 * npc-sprites.ts — 마을 NPC 거리 스프라이트 로더
 *  런타임 이미지는 96×96 단일 idle 프레임이다. NpcDef.sprite가 이름을 가리키고,
 *  미로드·미지정 시 호출부가 절차적 그리기(drawAdventurer)로 폴백한다.
 *
 *  투명 고해상도 원본은 assets-source/npcs/town, 경량 런타임 이미지는
 *  public/assets/npcs에 둔다. 가로 프레임을 추가하면 기존 애니메이터가 그대로 읽는다.
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
] as const;
export type NpcSpriteSheet = (typeof NPC_SPRITE_SHEETS)[number];

const FRAME = 96;
const FRAME_MS = 260;
/** 런타임 이미지는 표시 크기와 1:1이다. */
const SCALE = 1;
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
  const count = Math.max(1, Math.floor(base.width / FRAME));
  const frames = Array.from({ length: count }, (_, i) => new PIXI.Texture({
    source: base.source,
    frame: new PIXI.Rectangle(i * FRAME, 0, FRAME, FRAME),
  }));
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
  node.addChild(shadow, sprite);

  let elapsed = ((opts.phase ?? 0) % frames.length) * FRAME_MS;
  const tick: AmbientTick = (deltaMS) => {
    elapsed += deltaMS;
    sprite.texture = frames[Math.floor(elapsed / FRAME_MS) % frames.length];
  };
  return { node, tick };
}
