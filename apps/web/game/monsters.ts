/* =====================================================================
 * monsters.ts — 몬스터 스프라이트 (assets/monsters 이미지 + 절차적 폴백)
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
      src: `/assets/monsters/${nameEn}.png`,
      data: { scaleMode: "nearest" as const },
    })),
  );
}

/** 표준 표시 높이(px) — def.big/호출부 scale은 그 위에 곱해진다 */
const MONSTER_SIZE = 104;

/** 발밑(0,0) 기준 컨테이너. 이미지가 없으면 절차적 그리기로 폴백 */
export function drawMonster(def: EnemyDef, scale = 1): PIXI.Container {
  const tex = PIXI.Assets.get<PIXI.Texture>(alias(def.img));
  if (tex) {
    const c = new PIXI.Container();
    const shadow = new PIXI.Graphics();
    shadow.ellipse(0, 2, MONSTER_SIZE * 0.42, 12).fill({ color: 0x000000, alpha: 0.35 });
    c.addChild(shadow);
    const sp = new PIXI.Sprite(tex);
    sp.anchor.set(0.5, 1);
    sp.width = MONSTER_SIZE; sp.height = MONSTER_SIZE;
    c.addChild(sp);
    c.scale.set(scale);
    return c;
  }
  return drawMonsterShape(def, scale);
}

/** 절차적 폴백 (이미지 로드 전/누락 시) */
function drawMonsterShape(def: EnemyDef, scale = 1): PIXI.Graphics {
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
  } else if (def.shape === "ancient") {
    g.circle(0, -80, 66).fill({ color: col, alpha: 0.35 });
    g.circle(0, -80, 42).fill({ color: col, alpha: 0.8 });
    g.circle(-14, -88, 7).circle(14, -88, 7).fill({ color: 0xffffff, alpha: 0.95 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.moveTo(Math.cos(a) * 46, -80 + Math.sin(a) * 46).lineTo(Math.cos(a) * 66, -80 + Math.sin(a) * 66);
    }
    g.stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
  }
  g.scale.set(scale);
  return g;
}

/** 모험가(파티 멤버) 스프라이트 — 망토색/포인트색으로 개성 부여 */
export function drawAdventurer(cloak: number, accent: number, scale = 1): PIXI.Graphics {
  const g = new PIXI.Graphics();
  g.ellipse(0, 2, 18, 5).fill({ color: 0x000000, alpha: 0.35 });
  g.circle(0, -58, 13).fill(0x2c2440);
  g.roundRect(-14, -48, 28, 42, 9).fill(cloak);
  g.rect(10, -38, 4, 30).fill({ color: accent, alpha: 0.95 });
  g.circle(0, -58, 13).stroke({ width: 1.5, color: accent, alpha: 0.55 });
  g.scale.set(scale);
  return g;
}
