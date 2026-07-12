/* =====================================================================
 * scenes/title.ts — 타이틀 화면
 * ===================================================================== */
import * as PIXI from "pixi.js";
import {
  C, H, SceneHandle, W, button, fullFlash, nav, sceneRoot, setModeBadge, tween, txt,
} from "../core";
import { newGame } from "../state";

export function titleScene(): SceneHandle {
  setModeBadge(null);
  const root = new PIXI.Container(); sceneRoot.addChild(root);

  /* 배경: 밤하늘 + 부서진 성 실루엣 */
  const bg = new PIXI.Graphics();
  bg.rect(0, 0, W, H).fill(0x0d0a18);
  for (let i = 0; i < 130; i++)
    bg.circle(Math.random() * W, Math.random() * H * 0.7, Math.random() * 1.7)
      .fill({ color: 0xffffff, alpha: 0.15 + Math.random() * 0.6 });
  bg.circle(1020, 130, 52).fill({ color: 0xd8cba0, alpha: 0.9 });
  bg.circle(998, 116, 44).fill(0x0d0a18);
  /* 부서진 성 */
  bg.rect(180, 430, 90, 200);
  bg.moveTo(180, 430).lineTo(225, 380).lineTo(250, 435).closePath();
  bg.rect(330, 470, 70, 160);
  bg.rect(430, 400, 110, 230);
  bg.moveTo(430, 400).lineTo(470, 330).lineTo(505, 345).lineTo(540, 400).closePath();
  bg.rect(620, 460, 80, 170);
  bg.rect(760, 420, 100, 210);
  bg.moveTo(760, 420).lineTo(830, 372).lineTo(860, 425).closePath();
  bg.fill(0x151027);
  bg.rect(0, 600, W, H - 600).fill(0x1c1533);
  root.addChild(bg);

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

  const controls = txt(
    "조작법 — ← → 이동   ↑ ↓ 갈림길에서 레인 이동   Z/스페이스 조사·대화 진행",
    14, C.dim, { align: "center" });
  controls.anchor.set(0.5); controls.x = W / 2; controls.y = 660; controls.alpha = 0;
  root.addChild(controls);

  tween(subtitle, { alpha: 1 }, 700);
  tween(title, { alpha: 1, y: 254 }, 900);
  tween(line, { alpha: 1 }, 1100);
  tween(ver, { alpha: 1 }, 1300);
  tween(startBtn, { alpha: 1 }, 1500);
  tween(controls, { alpha: 0.9 }, 1700);

  let started = false;
  function start(): void {
    if (started) return; started = true;
    newGame();
    fullFlash(0x000000, 600, () => nav.intro());
  }

  return { onKey: (k) => { if (k === "Enter" || k === " ") start(); } };
}
