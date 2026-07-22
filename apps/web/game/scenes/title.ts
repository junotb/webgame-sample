/* =====================================================================
 * scenes/title.ts — 타이틀 화면
 *  푸른 달밤 배경(title_sky 3레이어) 위에 부서진 성 실루엣을 겹친다.
 *  구름은 성 앞뒤 두 겹의 TilingSprite로 흘러 원근감을 만든다.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import {
  C, H, SceneHandle, SceneScope, W, button, fullFlash, nav, sceneRoot, setModeBadge, tween, txt,
} from "../core";
import { visualRandom } from "../core/random";
import { tileTex } from "../tiles";

const BG_SCALE = W / 576; // 576×324 원본 → 1280×720

export function titleScene(): SceneHandle {
  setModeBadge(null);
  const root = new PIXI.Container(); sceneRoot.addChild(root);
  const scope = new SceneScope();

  /* 배경: 별하늘 베이스 */
  const sky = new PIXI.Sprite(tileTex("title_sky_base"));
  sky.width = W; sky.height = H;
  root.addChild(sky);

  /* 반짝이는 별 — 베이스의 정지 별 위에 소수만 얹는다 */
  const stars: Array<{ g: PIXI.Graphics; phase: number; speed: number }> = [];
  for (let i = 0; i < 14; i++) {
    const g = new PIXI.Graphics();
    g.circle(0, 0, 1 + visualRandom() * 1.4).fill(0xdde4ff);
    g.x = visualRandom() * W; g.y = visualRandom() * H * 0.55;
    root.addChild(g);
    stars.push({ g, phase: visualRandom() * Math.PI * 2, speed: 0.0012 + visualRandom() * 0.0018 });
  }

  /* 달 — 우상단 배치, 가산 혼합 글로우가 천천히 맥동한다 */
  const moon = new PIXI.Sprite(tileTex("title_sky_moon"));
  moon.anchor.set(0.5); moon.scale.set(BG_SCALE);
  moon.x = 1105; moon.y = 122;
  const moonGlow = new PIXI.Sprite(tileTex("title_sky_moon"));
  moonGlow.anchor.set(0.5); moonGlow.scale.set(BG_SCALE * 1.04);
  moonGlow.position.copyFrom(moon.position);
  moonGlow.blendMode = "add"; moonGlow.alpha = 0.08;
  root.addChild(moon, moonGlow);

  /* 뒷구름 — 성 뒤에서 느리게 흐른다 */
  const cloudsBack = new PIXI.TilingSprite({ texture: tileTex("title_sky_clouds"), width: W, height: H });
  cloudsBack.tileScale.set(BG_SCALE, H / 324);
  cloudsBack.y = -56; cloudsBack.alpha = 0.45;
  root.addChild(cloudsBack);

  /* 부서진 성 실루엣 — 달빛 밤하늘에 맞춘 짙은 남색 */
  const castle = new PIXI.Graphics();
  castle.rect(180, 430, 90, 200);
  castle.moveTo(180, 430).lineTo(225, 380).lineTo(250, 435).closePath();
  castle.rect(330, 470, 70, 160);
  castle.rect(430, 400, 110, 230);
  castle.moveTo(430, 400).lineTo(470, 330).lineTo(505, 345).lineTo(540, 400).closePath();
  castle.rect(620, 460, 80, 170);
  castle.rect(760, 420, 100, 210);
  castle.moveTo(760, 420).lineTo(830, 372).lineTo(860, 425).closePath();
  castle.fill(0x0b0e22);
  root.addChild(castle);

  /* 폐허의 창 — 성소에 남은 힘이 깜빡인다 (앞구름에 안 덮이는 상단 몸체) */
  const windows: Array<{ g: PIXI.Graphics; phase: number }> = [];
  for (const [wx, wy] of [[462, 408], [497, 416], [800, 432]] as const) {
    const g = new PIXI.Graphics();
    g.rect(wx, wy, 7, 12).fill(C.arcane);
    g.alpha = 0.3;
    root.addChild(g);
    windows.push({ g, phase: visualRandom() * Math.PI * 2 });
  }

  /* 앞구름 — 성 밑동을 덮으며 흘러 폐허가 구름바다 위에 떠 보인다 */
  const cloudsFront = new PIXI.TilingSprite({ texture: tileTex("title_sky_clouds"), width: W, height: H });
  cloudsFront.tileScale.set(BG_SCALE, H / 324);
  cloudsFront.tilePosition.x = 288;
  root.addChild(cloudsFront);

  const subtitle = txt("CHRONICLE OF THE SHATTERED REALM", 15, C.dim, { ls: 6 });
  subtitle.anchor.set(0.5); subtitle.x = W / 2; subtitle.y = 176; subtitle.alpha = 0;
  root.addChild(subtitle);

  const title = txt("부서진 왕국의 연대기", 74, C.border, { serif: true, shadow: true });
  title.anchor.set(0.5); title.x = W / 2; title.y = 260; title.alpha = 0;
  root.addChild(title);

  const line = new PIXI.Graphics();
  line.moveTo(W / 2 - 260, 322).lineTo(W / 2 + 260, 322).stroke({ width: 2, color: C.border, alpha: 0.7 });
  line.alpha = 0; root.addChild(line);

  const ver = txt("Prototype v0.2 — Next.js + TypeScript · 4인 파티 · 멀티 레인 탐험", 14, C.dim);
  ver.anchor.set(0.5); ver.x = W / 2; ver.y = 350; ver.alpha = 0; root.addChild(ver);

  const startBtn = button("모험을 시작한다", 300, 60, start, { size: 20, border: C.border });
  startBtn.x = (W - 300) / 2; startBtn.y = 430; startBtn.alpha = 0; root.addChild(startBtn);

  /* 조작법 — 구름 위에서도 읽히도록 어두운 띠를 깔고 얹는다 */
  const controls = new PIXI.Container();
  const ctrlBack = new PIXI.Graphics();
  ctrlBack.roundRect(W / 2 - 400, 644, 800, 32, 8).fill({ color: 0x05060f, alpha: 0.5 });
  const ctrlText = txt(
    "조작법 — ← → 이동   ↑ ↓ 갈림길에서 레인 이동   Z/스페이스 조사·대화 진행",
    14, C.dim, { align: "center" });
  ctrlText.anchor.set(0.5); ctrlText.x = W / 2; ctrlText.y = 660;
  controls.addChild(ctrlBack, ctrlText); controls.alpha = 0;
  root.addChild(controls);

  tween(subtitle, { alpha: 1 }, 700);
  tween(title, { alpha: 1, y: 254 }, 900);
  tween(line, { alpha: 1 }, 1100);
  tween(ver, { alpha: 1 }, 1300);
  tween(startBtn, { alpha: 1 }, 1500);
  tween(controls, { alpha: 0.9 }, 1700);

  let t = 0;
  scope.ticker((ticker) => {
    t += ticker.deltaMS;
    cloudsBack.tilePosition.x -= ticker.deltaMS * 0.003;
    cloudsFront.tilePosition.x -= ticker.deltaMS * 0.008;
    moonGlow.alpha = 0.08 + 0.07 * Math.sin(t * 0.0006);
    for (const s of stars) s.g.alpha = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
    for (const [i, w] of windows.entries())
      w.g.alpha = 0.22 + 0.2 * (0.5 + 0.5 * Math.sin(t * 0.0011 + w.phase + i));
  });

  let started = false;
  function start(): void {
    if (started) return; started = true;
    fullFlash(0x000000, 600, () => nav.create());
  }

  return {
    onKey: (k) => { if (k === "Enter" || k === " ") start(); },
    dispose: () => scope.dispose(),
  };
}
