/* =====================================================================
 * monsters.ts — 몬스터 스프라이트 (assets/monsters/icons 이미지 + 절차적 폴백)
 *  + 모험가(파티) 절차적 스프라이트
 * ===================================================================== */
import * as PIXI from "pixi.js";
import { EnemyDef, MONSTER_ICONS } from "./defs";

/* ---- 몬스터 아이콘 (32×32 픽셀아트, nearest 스케일) ---- */
const alias = (img: string) => `monster-${img}`;

/** boot에서 1회 호출 — 카탈로그(MONSTER_ICONS) 전체 프리로드 (~48장, 소형) */
export async function loadMonsterIcons(): Promise<void> {
  await PIXI.Assets.load(
    MONSTER_ICONS.map(({ nameEn }) => ({
      alias: alias(nameEn),
      src: `/assets/monsters/icons/${nameEn.toLowerCase()}.png`,
      data: { scaleMode: "nearest" as const },
    })),
  );
}

/** 표준 표시 높이(px) — def.big/호출부 scale은 그 위에 곱해진다 */
const MONSTER_SIZE = 104;

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
  const shadow = new PIXI.Graphics();
  shadow.ellipse(0, 2, MONSTER_SIZE * 0.42, 12).fill({ color: 0x000000, alpha: 0.35 });
  const body = new PIXI.Container();
  const tex = PIXI.Assets.get<PIXI.Texture>(alias(def.img));
  if (tex) {
    const sp = new PIXI.Sprite(tex);
    sp.anchor.set(0.5, 1);
    sp.width = MONSTER_SIZE; sp.height = MONSTER_SIZE;
    body.addChild(sp);
  } else {
    body.addChild(drawMonsterShape(def));
  }
  root.addChild(shadow, body);
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
