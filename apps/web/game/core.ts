/* =====================================================================
 * core.ts — PIXI 셋업, 씬 매니저, 트윈, 공용 UI 헬퍼, nav 라우터
 * ===================================================================== */
import * as PIXI from "pixi.js";

export const W = 1280;
export const H = 720;

export const C = {
  bg: 0x131020, panel: 0x1d1830, panelHi: 0x2a2244,
  border: 0xc9a227, text: 0xe8dcc0, dim: 0x9a8f78,
  blood: 0xa33b3b, arcane: 0x8f7ff0,
  hp: 0xc0503c, mp: 0x4f6fd0, exp: 0xc9a227,
  green: 0x5e8c5a, night: 0x0d0a18,
  elite: 0xd8a531, boss: 0xc04040, epic: 0xb46ff0,
} as const;
export const hexs = (n: number) => "#" + n.toString(16).padStart(6, "0");

/* ---- 폰트 (boot에서 next/font 패밀리 주입) ---- */
export const FONTS = { display: "serif", body: "sans-serif" };

/* ---- PIXI 앱 (boot에서 생성) ---- */
export let app: PIXI.Application = null as unknown as PIXI.Application;
export let sceneRoot: PIXI.Container = null as unknown as PIXI.Container;
export let overlayRoot: PIXI.Container = null as unknown as PIXI.Container;

/* ---- 씬 핸들 ---- */
export interface SceneHandle {
  onKey?: (k: string) => void;
  dispose?: () => void;
}
let currentScene: SceneHandle | null = null;

export function switchScene(builder: () => SceneHandle): void {
  if (currentScene?.dispose) currentScene.dispose();
  sceneRoot.removeChildren().forEach((c) => c.destroy({ children: true }));
  currentScene = builder();
}

/* ---- nav: 씬 간 순환 import 방지용 라우터 (index.ts에서 배선) ---- */
type NavFn = (...args: any[]) => void;
export const nav: Record<string, NavFn> = {};

/* ---- 키 입력 ---- */
export const keys: Record<string, boolean> = {};
let onKeyDown: ((e: KeyboardEvent) => void) | null = null;
let onKeyUp: ((e: KeyboardEvent) => void) | null = null;

export function attachInput(): void {
  onKeyDown = (e) => {
    keys[e.key] = true;
    currentScene?.onKey?.(e.key);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
  };
  onKeyUp = (e) => { keys[e.key] = false; };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
}
export function detachInput(): void {
  if (onKeyDown) window.removeEventListener("keydown", onKeyDown);
  if (onKeyUp) window.removeEventListener("keyup", onKeyUp);
  onKeyDown = onKeyUp = null;
}

/* ---- 트윈 ---- */
interface Tween {
  obj: any; from: Record<string, number>; to: Record<string, number>;
  dur: number; t: number; ease: (t: number) => number; onDone?: () => void;
}
const tweens: Tween[] = [];
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const linear = (t: number) => t;

export function tween(obj: any, to: Record<string, number>, dur: number,
  opts: { ease?: (t: number) => number; onDone?: () => void } = {}): void {
  const from: Record<string, number> = {};
  for (const k in to) from[k] = obj[k];
  tweens.push({ obj, from, to, dur, t: 0, ease: opts.ease ?? easeOut, onDone: opts.onDone });
}
export function wait(ms: number, fn: () => void): void {
  tween({ v: 0 }, { v: 1 }, ms, { ease: linear, onDone: fn });
}
function tickTweens(): void {
  const dt = app.ticker.deltaMS;
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    if (tw.obj && tw.obj.destroyed) { tweens.splice(i, 1); continue; }
    tw.t += dt;
    const p = Math.min(1, tw.t / tw.dur);
    const e = tw.ease(p);
    for (const k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
    if (p >= 1) { tweens.splice(i, 1); tw.onDone?.(); }
  }
}

/* ---- UI 헬퍼 ---- */
export interface TxtOpts {
  serif?: boolean; weight?: string; align?: "left" | "center" | "right";
  wrap?: number; lh?: number; ls?: number; shadow?: boolean;
}
export function txt(s: string, size: number, color: number = C.text, opts: TxtOpts = {}): PIXI.Text {
  return new PIXI.Text({
    text: s,
    style: {
      fontFamily: opts.serif ? FONTS.display : FONTS.body,
      fontSize: size, fill: color,
      fontWeight: (opts.weight ?? (opts.serif ? "900" : "500")) as PIXI.TextStyleFontWeight,
      align: opts.align ?? "left",
      wordWrap: !!opts.wrap, wordWrapWidth: opts.wrap ?? 0,
      lineHeight: opts.lh ?? Math.round(size * 1.5),
      letterSpacing: opts.ls ?? 0,
      dropShadow: opts.shadow
        ? { color: "#000000", alpha: 0.5, distance: 2, angle: Math.PI / 3, blur: 2 }
        : false,
    },
  });
}

export function panel(w: number, h: number,
  opts: { fill?: number; alpha?: number; border?: number; borderAlpha?: number; r?: number } = {}): PIXI.Graphics {
  const g = new PIXI.Graphics();
  g.roundRect(0, 0, w, h, opts.r ?? 10).fill({ color: opts.fill ?? C.panel, alpha: opts.alpha ?? 0.96 });
  g.roundRect(0, 0, w, h, opts.r ?? 10).stroke({ width: 2, color: opts.border ?? C.border, alpha: opts.borderAlpha ?? 0.75 });
  g.roundRect(3, 3, w - 6, h - 6, (opts.r ?? 10) - 3).stroke({ width: 1, color: 0x000000, alpha: 0.35 });
  return g;
}

export interface Btn extends PIXI.Container {
  disabled?: boolean;
  setDisabled(v: boolean): void;
  labelText: PIXI.Text;
}
export function button(label: string, w: number, h: number, onTap: () => void,
  opts: { fill?: number; border?: number; size?: number; color?: number } = {}): Btn {
  const c = new PIXI.Container() as Btn;
  const g = panel(w, h, { fill: opts.fill ?? C.panelHi, border: opts.border ?? C.border, r: 8 });
  const t = txt(label, opts.size ?? 18, opts.color ?? C.text, { weight: "700" });
  t.anchor.set(0.5); t.x = w / 2; t.y = h / 2;
  c.addChild(g, t);
  c.eventMode = "static"; c.cursor = "pointer";
  c.on("pointertap", () => { if (!c.disabled) onTap(); });
  c.on("pointerover", () => { if (!c.disabled) c.alpha = 0.85; });
  c.on("pointerout", () => { c.alpha = c.disabled ? 0.45 : 1; });
  c.setDisabled = (v: boolean) => {
    c.disabled = v; c.alpha = v ? 0.45 : 1; c.cursor = v ? "default" : "pointer";
  };
  c.labelText = t;
  return c;
}

export function toast(msg: string, color: number = C.text): void {
  const c = new PIXI.Container();
  const t = txt(msg, 18, color, { weight: "700" });
  const p = panel(t.width + 40, 44, { fill: 0x000000, alpha: 0.8, border: C.border });
  t.x = 20; t.y = (44 - t.height) / 2;
  c.addChild(p, t);
  c.x = (W - p.width) / 2; c.y = 90; c.alpha = 0; c.zIndex = 99;
  overlayRoot.addChild(c);
  tween(c, { alpha: 1, y: 100 }, 250);
  wait(1600, () => tween(c, { alpha: 0 }, 400, { onDone: () => c.destroy({ children: true }) }));
}

export function fullFlash(color = 0xffffff, dur = 350, cb?: () => void): void {
  const g = new PIXI.Graphics();
  g.rect(0, 0, W, H).fill(color);
  g.alpha = 0; g.zIndex = 98; overlayRoot.addChild(g);
  tween(g, { alpha: 1 }, dur / 2, {
    onDone: () => {
      cb?.();
      tween(g, { alpha: 0 }, dur / 2, { onDone: () => g.destroy() });
    },
  });
}

let modeBadge: PIXI.Container | null = null;
export function setModeBadge(label: string | null, color: number = C.text): void {
  if (modeBadge) { modeBadge.destroy({ children: true }); modeBadge = null; }
  if (!label) return;
  const c = new PIXI.Container();
  const t = txt(label, 14, color, { weight: "700", ls: 2 });
  const g = new PIXI.Graphics();
  g.roundRect(0, 0, t.width + 26, 28, 14).fill({ color: 0x000000, alpha: 0.55 });
  g.roundRect(0, 0, t.width + 26, 28, 14).stroke({ width: 1, color, alpha: 0.7 });
  t.x = 13; t.y = 5;
  c.addChild(g, t); c.x = 16; c.y = 14; c.zIndex = 50;
  overlayRoot.addChild(c); modeBadge = c;
}

/* ---- 메뉴 잠금 (오버레이 중복 방지) ---- */
export const ui = { menuOpen: false };

/* ---- 라이프사이클 ---- */
export async function initPixi(el: HTMLElement, fonts: { displayFont: string; bodyFont: string }): Promise<void> {
  FONTS.display = fonts.displayFont;
  FONTS.body = fonts.bodyFont;
  app = new PIXI.Application();
  await app.init({ width: W, height: H, background: hexs(C.bg), antialias: true });
  el.appendChild(app.canvas);
  app.stage.sortableChildren = true;
  sceneRoot = new PIXI.Container(); sceneRoot.zIndex = 0;
  overlayRoot = new PIXI.Container(); overlayRoot.zIndex = 10;
  overlayRoot.sortableChildren = true;
  app.stage.addChild(sceneRoot, overlayRoot);
  app.ticker.add(tickTweens);
}
export function destroyPixi(): void {
  if (currentScene?.dispose) currentScene.dispose();
  currentScene = null;
  tweens.length = 0;
  modeBadge = null;
  ui.menuOpen = false;
  detachInput();
  if (app) { app.destroy(true, { children: true }); app = null as unknown as PIXI.Application; }
}
