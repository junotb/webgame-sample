/* =====================================================================
 * battle-fx.ts — 전투 피격 이펙트 (데미지 타입별 임팩트 버스트)
 *  스프라이트: fx_magic_circle_animation (144px 그리드, 12열×8행)
 *   열: 0=중립(빛 틴트용) 2=불 5=물 8=바람 11=어둠
 *   행: 7(가장 얇은 호) → 0(완성된 원) — 성장 단계로 재생
 *  베기·찌르기·때리기·땅·정신은 대응 원본 에셋이 없어 절차적으로 그린다.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import { DAMAGE_META, DamageType } from "./defs";
import { tween, wait } from "./core";
import { visualRandom } from "./core/random";

const SHEET_SRC = {
  magicCircle: "/assets/world/effects/magic/magic_circle_animation.png",
} as const;

type CircleType = "fire" | "water" | "wind" | "dark" | "light";
const CIRCLE_COL: Record<CircleType, number> = { light: 0, fire: 2, water: 5, wind: 8, dark: 11 };
const CIRCLE_ROWS = [7, 6, 5, 0]; // 가는 호 → 완성된 원
const CIRCLE_TYPE: Partial<Record<DamageType, CircleType>> = {
  fire: "fire", water: "water", wind: "wind", dark: "dark", light: "light",
};

let sheetTex: PIXI.Texture | null = null;

/** boot에서 1회 호출 — 마법진 시트 로드 */
export async function loadBattleFx(): Promise<void> {
  const sheets: Record<string, PIXI.Texture> = await PIXI.Assets.load([
    { alias: "battlefx-magiccircle", src: SHEET_SRC.magicCircle, data: { scaleMode: "nearest" as const } },
  ]);
  sheetTex = sheets["battlefx-magiccircle"];
}

function circleFrame(type: CircleType, stage: number): PIXI.Texture {
  if (!sheetTex) throw new Error("battle-fx: 미로드 — boot의 loadBattleFx() 이후 사용 가능");
  const x = CIRCLE_COL[type] * 144, y = CIRCLE_ROWS[stage] * 144;
  return new PIXI.Texture({ source: sheetTex.source, frame: new PIXI.Rectangle(x, y, 144, 144) });
}

/** 명중 지점에 데미지 타입별 임팩트를 1회 재생하고 스스로 정리한다 */
export function spawnImpactBurst(container: PIXI.Container, x: number, y: number, dtype: DamageType): void {
  const circleType = CIRCLE_TYPE[dtype];
  if (circleType) spawnCircleBurst(container, x, y, circleType);
  else spawnProceduralBurst(container, x, y, dtype);
}

function spawnCircleBurst(container: PIXI.Container, x: number, y: number, type: CircleType): void {
  const sprite = new PIXI.Sprite(circleFrame(type, 0));
  sprite.anchor.set(0.5);
  sprite.width = 96; sprite.height = 96;
  sprite.x = x; sprite.y = y;
  sprite.blendMode = "add";
  if (type === "light") sprite.tint = DAMAGE_META.light.color;
  container.addChild(sprite);
  const advance = (stage: number): void => {
    if (sprite.destroyed) return;
    sprite.texture = circleFrame(type, stage);
    if (stage < CIRCLE_ROWS.length - 1) wait(70, () => advance(stage + 1));
    else wait(90, () => tween(sprite, { alpha: 0 }, 160, { onDone: () => sprite.destroy() }));
  };
  advance(1);
}

type RingOpts = { chips: number; additive?: boolean };

function drawArc(color: number): PIXI.Graphics {
  const g = new PIXI.Graphics();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + visualRandom() * 0.6;
    const mid = a + 0.5;
    const r1 = 14, r2 = 34, rc = (r1 + r2) / 2;
    g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1 * 0.6)
      .quadraticCurveTo(Math.cos(mid) * rc, Math.sin(mid) * rc * 0.6, Math.cos(a) * r2, Math.sin(a) * r2 * 0.6)
      .stroke({ width: 4, color, alpha: 0.9 });
  }
  return g;
}

function drawStreak(color: number): PIXI.Graphics {
  const g = new PIXI.Graphics();
  const a = visualRandom() * Math.PI * 2;
  const r = 30;
  g.moveTo(-Math.cos(a) * r, -Math.sin(a) * r * 0.6)
    .lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.6)
    .stroke({ width: 3, color, alpha: 0.95 });
  return g;
}

function drawRing(color: number, opts: RingOpts): PIXI.Graphics {
  const g = new PIXI.Graphics();
  g.circle(0, 0, 20).stroke({ width: 5, color, alpha: 0.85 });
  for (let i = 0; i < opts.chips; i++) {
    const a = (i / opts.chips) * Math.PI * 2 + visualRandom() * 0.4;
    const r = 22 + visualRandom() * 6;
    const cx = Math.cos(a) * r, cy = Math.sin(a) * r * 0.6;
    g.rect(cx - 3, cy - 3, 6, 6).fill({ color, alpha: 0.9 });
  }
  return g;
}

const PROCEDURAL: Partial<Record<DamageType, (color: number) => PIXI.Graphics>> = {
  slash: drawArc,
  pierce: drawStreak,
  bludgeon: (c) => drawRing(c, { chips: 4 }),
  earth: (c) => drawRing(c, { chips: 6 }),
  spirit: (c) => drawRing(c, { chips: 0, additive: true }),
};

function spawnProceduralBurst(container: PIXI.Container, x: number, y: number, dtype: DamageType): void {
  const build = PROCEDURAL[dtype];
  if (!build) return;
  const g = build(DAMAGE_META[dtype].color);
  g.x = x; g.y = y; g.alpha = 1; g.scale.set(0.5);
  if (dtype === "spirit") g.blendMode = "add";
  container.addChild(g);
  tween(g.scale, { x: 1.15, y: 1.15 }, 200);
  tween(g, { alpha: 0 }, 220, { onDone: () => g.destroy() });
}
