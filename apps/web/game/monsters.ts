/* =====================================================================
 * monsters.ts — 몬스터 스프라이트 (assets/monsters/icons 이미지 + 절차적 폴백)
 *  + 모험가(파티) 절차적 스프라이트
 * ===================================================================== */
import * as PIXI from "pixi.js";
import { EnemyDef, MONSTER_ICONS, MonsterSize, Tier } from "./defs";

/* ---- 몬스터 아이콘 (32×32 픽셀아트, nearest 스케일) ---- */
const alias = (img: string) => `monster-${img}`;
const hiResAlias = (img: string) => `monster-hires-${img}`;

/** 고해상도 원본이 준비된 몬스터 목록 — assets/monsters/large/<lowercase nameEn>.png (64×64 이상).
 *  파일을 추가하면 여기에 nameEn을 등록한다. 미등록 대형·거대 몬스터는 런타임 scale2x로 대체한다. */
export const HIRES_MONSTERS: string[] = [];

/** boot에서 1회 호출 — 카탈로그(MONSTER_ICONS) 전체 프리로드 (~48장, 소형) */
export async function loadMonsterIcons(): Promise<void> {
  await PIXI.Assets.load(
    MONSTER_ICONS.map(({ nameEn }) => ({
      alias: alias(nameEn),
      src: `/assets/monsters/icons/${nameEn.toLowerCase()}.png`,
      data: { scaleMode: "nearest" as const },
    })),
  );
  if (HIRES_MONSTERS.length) {
    await PIXI.Assets.load(
      HIRES_MONSTERS.map((nameEn) => ({
        alias: hiResAlias(nameEn),
        src: `/assets/monsters/large/${nameEn.toLowerCase()}.png`,
        data: { scaleMode: "nearest" as const },
      })),
    );
  }
}

/* ---- 체급별 표준 표시 높이(px)·1인칭 월드 높이 ----
 *  체급이 곧 위계다: 쥐(small)와 오크(large)가 같은 크기로 보이면 안 된다.
 *  huge의 worldH는 복도 벽(1.0)을 넘겨 천장에 닿는 실루엣을 만든다. */
export const MONSTER_PX: Record<MonsterSize, number> = { small: 80, medium: 104, large: 140, huge: 184 };
export const MONSTER_WORLD_H: Record<MonsterSize, number> = { small: 0.45, medium: 0.62, large: 0.88, huge: 1.12 };
/** 이 몬스터의 표준 표시 높이(px) — 이름표 배치·빌보드 기준 높이 계산용 */
export function monsterPx(def: EnemyDef): number { return MONSTER_PX[def.size]; }

/* ---- scale2x(EPX) 런타임 업스케일 — 32×32 원본을 64×64로 ----
 *  대형·거대 몬스터는 확대 배율이 커서(최대 5.75×) 계단이 도드라진다.
 *  EPX는 색 경계를 보존하며 계단만 다듬으므로 픽셀아트 스타일을 해치지 않는다. */
const upscaleCache = new Map<string, PIXI.Texture | null>();
function scale2x(src: Uint32Array, w: number, h: number): Uint32Array {
  const out = new Uint32Array(w * 2 * h * 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = src[y * w + x];
      const a = y > 0 ? src[(y - 1) * w + x] : p; // 상
      const c = x > 0 ? src[y * w + x - 1] : p; // 좌
      const b = x < w - 1 ? src[y * w + x + 1] : p; // 우
      const d = y < h - 1 ? src[(y + 1) * w + x] : p; // 하
      let e0 = p, e1 = p, e2 = p, e3 = p;
      if (c === a && c !== d && a !== b) e0 = a;
      if (a === b && a !== c && b !== d) e1 = b;
      if (d === c && d !== b && c !== a) e2 = c;
      if (b === d && b !== a && d !== c) e3 = b;
      const oy = y * 2, ox = x * 2, ow = w * 2;
      out[oy * ow + ox] = e0;
      out[oy * ow + ox + 1] = e1;
      out[(oy + 1) * ow + ox] = e2;
      out[(oy + 1) * ow + ox + 1] = e3;
    }
  }
  return out;
}
/** 아이콘 텍스처를 EPX로 2배 업스케일한 텍스처. 실패(비브라우저 등) 시 null 캐시 */
function upscaledTexture(def: EnemyDef): PIXI.Texture | null {
  const cached = upscaleCache.get(def.img);
  if (cached !== undefined) return cached;
  let result: PIXI.Texture | null = null;
  try {
    const base = PIXI.Assets.get<PIXI.Texture>(alias(def.img));
    if (base && typeof document !== "undefined") {
      const w = base.source.pixelWidth, h = base.source.pixelHeight;
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      const ctx = cv.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(base.source.resource as CanvasImageSource, 0, 0);
      const img = ctx.getImageData(0, 0, w, h);
      const up = scale2x(new Uint32Array(img.data.buffer), w, h);
      const outCv = document.createElement("canvas");
      outCv.width = w * 2; outCv.height = h * 2;
      const outImg = new ImageData(new Uint8ClampedArray(up.buffer as ArrayBuffer), w * 2, h * 2);
      outCv.getContext("2d")!.putImageData(outImg, 0, 0);
      result = PIXI.Texture.from(outCv);
      result.source.scaleMode = "nearest";
    }
  } catch { result = null; }
  upscaleCache.set(def.img, result);
  return result;
}

/** 몬스터 본체 텍스처 — 고해상도 파일 > (대형·거대) scale2x 업스케일 > 32px 아이콘 */
function monsterTexture(def: EnemyDef): PIXI.Texture | undefined {
  const hi = PIXI.Assets.get<PIXI.Texture>(hiResAlias(def.img));
  if (hi) return hi;
  if (def.size === "large" || def.size === "huge") {
    const up = upscaledTexture(def);
    if (up) return up;
  }
  return PIXI.Assets.get<PIXI.Texture>(alias(def.img));
}

/* ---- 티어 오라 — 크기와 별개로 위계를 알리는 빛 (정예=호박·보스=진홍·에픽=보랏빛) ---- */
const TIER_AURA: Partial<Record<Tier, { color: number; alpha: number }>> = {
  정예: { color: 0xd8a03c, alpha: 0.13 },
  보스: { color: 0xff3c50, alpha: 0.2 },
  에픽: { color: 0xa05aff, alpha: 0.22 },
};

/** 발밑(0,0) 기준 컨테이너. 이미지가 없으면 절차적 그리기로 폴백 */
export type MonsterMotionAction = "spawn" | "attack" | "hit" | "death";

/** 단일 프레임 몬스터를 움직이는 렌더 노드와 제어 함수 */
export interface MonsterView extends PIXI.Container {
  tickMotion(deltaMS: number): void;
  playMotion(action: MonsterMotionAction, onDone?: () => void): void;
}

const ACTION_DURATION: Record<MonsterMotionAction, number> = {
  spawn: 260,
  attack: 300,
  hit: 280,
  death: 420,
};

function motionPhase(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 628) / 100;
}

/** 발밑을 원점으로 삼고 그림자와 몸체를 따로 변형하는 몬스터 노드 */
export function drawMonster(def: EnemyDef, scale = 1): MonsterView {
  const root = new PIXI.Container() as MonsterView;
  const px = MONSTER_PX[def.size];
  const shadow = new PIXI.Graphics();
  shadow.ellipse(0, 2, px * 0.42, 7 + px * 0.05).fill({ color: 0x000000, alpha: 0.35 });
  /* 티어 오라 — 몸체 뒤에서 은은히 맥동하는 가산 발광 */
  const auraDef = TIER_AURA[def.tier];
  let aura: PIXI.Graphics | null = null;
  if (auraDef) {
    aura = new PIXI.Graphics();
    aura.circle(0, -px * 0.45, px * 0.56).fill(auraDef.color);
    aura.blendMode = "add";
    aura.alpha = auraDef.alpha;
  }
  const body = new PIXI.Container();
  const tex = monsterTexture(def);
  if (tex) {
    const sp = new PIXI.Sprite(tex);
    sp.anchor.set(0.5, 1);
    sp.width = px; sp.height = px;
    body.addChild(sp);
  } else {
    const shape = drawMonsterShape(def);
    shape.scale.set(px / 104); // 절차적 폴백은 104px 기준으로 그려져 있다
    body.addChild(shape);
  }
  root.addChild(shadow);
  if (aura) root.addChild(aura);
  root.addChild(body);
  root.scale.set(scale);

  let elapsed = motionPhase(def.img) * 1000;
  let action: MonsterMotionAction | null = "spawn";
  let actionElapsed = 0;
  let actionDone: (() => void) | undefined;

  root.playMotion = (next, onDone) => {
    if (action === "death") return;
    action = next;
    actionElapsed = 0;
    actionDone = onDone;
    root.visible = true;
  };

  root.tickMotion = (deltaMS) => {
    elapsed += deltaMS;
    const wave = Math.sin(elapsed / 310);
    let x = 0, y = 0, sx = 1, sy = 1, rotation = 0, alpha = 1;
    let shadowScale = 1, shadowAlpha = 0.35;

    if (def.motion === "slime") {
      sx = 1 + wave * 0.035;
      sy = 1 - wave * 0.028;
      y = Math.max(0, wave) * 1.2;
      shadowScale = 1 + wave * 0.025;
    } else if (def.motion === "flying") {
      y = -5 + wave * 3;
      rotation = wave * 0.025;
      shadowScale = 0.86 + wave * 0.035;
      shadowAlpha = 0.25;
    } else if (def.motion === "plant") {
      rotation = wave * 0.018;
      sx = 1 - wave * 0.01;
      sy = 1 + wave * 0.016;
    } else if (def.motion === "beast") {
      y = -Math.max(0, wave) * 1.8;
      rotation = wave * 0.01;
      sy = 1 - Math.max(0, wave) * 0.012;
    } else if (def.motion === "ghost") {
      y = -4 + wave * 2.5;
      rotation = wave * 0.012;
      alpha = 0.9 + wave * 0.07;
      shadowScale = 0.8 + wave * 0.04;
      shadowAlpha = 0.2;
    } else {
      sy = 1 + wave * 0.012;
      sx = 1 - wave * 0.006;
      y = Math.max(0, wave) * 0.5;
    }

    if (action) {
      actionElapsed += deltaMS;
      const duration = ACTION_DURATION[action];
      const p = Math.min(1, actionElapsed / duration);
      if (action === "spawn") {
        const appear = 0.78 + p * 0.22;
        y += (1 - p) * 10;
        sx *= appear; sy *= appear; alpha *= p;
      } else if (action === "attack") {
        const lunge = Math.sin(p * Math.PI);
        y -= lunge * 11;
        sx *= 1 + lunge * 0.11; sy *= 1 + lunge * 0.11;
        shadowScale *= 1 + lunge * 0.08;
      } else if (action === "hit") {
        const recoil = 1 - p;
        x += Math.sin(p * Math.PI * 8) * 6 * recoil;
        rotation += Math.sin(p * Math.PI * 5) * 0.045 * recoil;
      } else {
        y += p * 16;
        rotation += p * (def.motion === "beast" ? 0.12 : 0.04);
        sx *= 1 - p * 0.45; sy *= 1 - p * 0.65;
        alpha *= 1 - p;
        shadowAlpha *= 1 - p;
      }

      if (p >= 1) {
        const finished = action;
        const done = actionDone;
        action = null;
        actionDone = undefined;
        if (finished === "death") root.visible = false;
        done?.();
      }
    }

    body.position.set(Math.round(x), Math.round(y));
    body.scale.set(sx, sy);
    body.rotation = rotation;
    body.alpha = alpha;
    shadow.scale.set(shadowScale, 1);
    shadow.alpha = shadowAlpha;
    if (aura && auraDef) aura.alpha = auraDef.alpha * (0.75 + 0.25 * Math.sin(elapsed / 430)) * alpha;
  };

  root.tickMotion(0);
  return root;
}

/** 절차적 폴백 (이미지 로드 전/누락 시) */
function drawMonsterShape(def: EnemyDef): PIXI.Graphics {
  const g = new PIXI.Graphics();
  const col = def.color;
  if (def.shape === "slime") {
    g.ellipse(0, -30, 50, 40).fill({ color: col, alpha: 0.9 });
    g.circle(-14, -38, 5).circle(14, -38, 5).fill(0x101018);
    g.ellipse(0, -30, 50, 40).stroke({ width: 2, color: 0xffffff, alpha: 0.15 });
  } else if (def.shape === "goblin") {
    g.circle(0, -64, 20).fill(col);
    g.roundRect(-20, -50, 40, 50, 10).fill({ color: col, alpha: 0.85 });
    g.circle(-8, -66, 4).circle(8, -66, 4).fill(0xc03030);
    g.moveTo(-20, -72).lineTo(-34, -84).lineTo(-16, -78).closePath().fill(col);
    g.moveTo(20, -72).lineTo(34, -84).lineTo(16, -78).closePath().fill(col);
    g.rect(20, -48, 6, 34).fill(0x777777);
  } else if (def.shape === "wolf") {
    g.ellipse(0, -34, 52, 24).fill(col);
    g.circle(-44, -48, 18).fill(col);
    g.moveTo(-54, -62).lineTo(-60, -80).lineTo(-44, -64).closePath().fill(col);
    g.circle(-50, -50, 4).fill(0xd0c040);
    g.rect(-30, -16, 8, 16).rect(20, -16, 8, 16).fill({ color: col, alpha: 0.9 });
  } else if (def.shape === "skel") {
    g.circle(0, -72, 16).fill(col);
    g.circle(-6, -74, 4).circle(6, -74, 4).fill(0x101018);
    g.moveTo(0, -56).lineTo(0, -16);
    for (let i = 0; i < 3; i++) { g.moveTo(-16, -48 + i * 10).lineTo(16, -48 + i * 10); }
    g.stroke({ width: 5, color: col });
  } else if (def.shape === "orc") {
    g.circle(0, -96, 26).fill(col);
    g.roundRect(-34, -76, 68, 76, 14).fill({ color: col, alpha: 0.9 });
    g.moveTo(-10, -86).lineTo(-6, -74).lineTo(-14, -78).closePath().fill({ color: 0xffffff, alpha: 0.9 });
    g.moveTo(10, -86).lineTo(6, -74).lineTo(14, -78).closePath().fill({ color: 0xffffff, alpha: 0.9 });
    g.circle(-10, -100, 5).circle(10, -100, 5).fill(0xc03030);
    g.roundRect(30, -110, 12, 90, 4).fill(0x555555);
    g.poly([26, -116, 54, -104, 30, -92]).fill(0x777777);
  } else if (def.shape === "lord") {
    g.roundRect(-44, -96, 88, 96, 20).fill(col);
    g.circle(0, -118, 30).fill(col);
    g.moveTo(-22, -136).lineTo(-42, -168).lineTo(-12, -142).closePath().fill(0xcfc8b0);
    g.moveTo(22, -136).lineTo(42, -168).lineTo(12, -142).closePath().fill(0xcfc8b0);
    g.circle(-12, -120, 6).circle(12, -120, 6).fill(0xe8b84a);
    g.moveTo(-40, -60).bezierCurveTo(-10, -40, 10, -80, 40, -56)
      .stroke({ width: 3, color: 0x5e8c5a, alpha: 0.8 });
  }
  return g;
}

/** 모험가(파티 멤버) 스프라이트 — 망토색/포인트색으로 개성 부여.
 *  y=0이 접지점: 마을 1인칭 빌보드가 발밑 기준으로 세우므로 실루엣이 0까지 닿아야 뜬 느낌이 없다. */
export function drawAdventurer(cloak: number, accent: number, scale = 1): PIXI.Graphics {
  const g = new PIXI.Graphics();
  g.ellipse(0, 2, 18, 5).fill({ color: 0x000000, alpha: 0.35 });
  g.circle(0, -58, 13).fill(0x2c2440);
  g.rect(-9, -6, 7, 6).fill(0x2c2440);
  g.rect(2, -6, 7, 6).fill(0x2c2440);
  g.roundRect(-14, -48, 28, 46, 9).fill(cloak);
  g.rect(10, -38, 4, 34).fill({ color: accent, alpha: 0.95 });
  g.circle(0, -58, 13).stroke({ width: 1.5, color: accent, alpha: 0.55 });
  g.scale.set(scale);
  return g;
}
