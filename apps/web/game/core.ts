/* =====================================================================
 * core.ts — PIXI 셋업, 씬 매니저, 트윈, 공용 UI 헬퍼, nav 라우터
 * ===================================================================== */
import * as PIXI from "pixi.js";
import { TweenQueue } from "./core/tween-queue";
import type { FieldId } from "./fieldmaps";
import type { DungeonId } from "./dungeons";
import type { TownSpawn } from "./town/types";

export const W = 1280;
export const H = 720;

export const C = {
  bg: 0x0d0b16, panel: 0x191526, panelHi: 0x29213c,
  panelLow: 0x100d19, border: 0xd0aa45, borderSoft: 0x67562f,
  text: 0xeee4cf, dim: 0xa89d87,
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
  /* 이전 씬이 예약한 wait/tween 콜백을 제거해 전환 후 실행되지 않게 한다. */
  tweenQueue.cancelSceneTweens();
  sceneRoot.removeChildren().forEach((c) => c.destroy({ children: true }));
  currentScene = builder();
}

/** 장면이 등록한 ticker·리스너 같은 자원을 한 번에 정리한다. */
export class SceneScope {
  private cleanups: Array<() => void> = [];
  private closed = false;

  add(cleanup: () => void): void {
    if (this.closed) cleanup();
    else this.cleanups.push(cleanup);
  }

  ticker(fn: (ticker: PIXI.Ticker) => void): void {
    app.ticker.add(fn);
    this.add(() => app.ticker.remove(fn));
  }

  dispose(): void {
    if (this.closed) return;
    this.closed = true;
    for (let i = this.cleanups.length - 1; i >= 0; i--) this.cleanups[i]();
    this.cleanups.length = 0;
  }
}

/* ---- nav: 씬 간 순환 import 방지용 타입 안전 라우터 (index.ts에서 배선) ---- */
export interface GameNavigator {
  title(): void;
  create(): void;
  prologue(): void;
  town(spawn?: TownSpawn): void;
  letter(): void;
  /** at을 주면 입구 대신 그 칸에서 시작 (층간 계단 이동) */
  explore(id: DungeonId, at?: { x: number; y: number; facing: 0 | 1 | 2 | 3 }): void;
  field(id: FieldId): void;
  ending(): void;
}
export const nav = {} as GameNavigator;

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
const tweenQueue = new TweenQueue();
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const linear = (t: number) => t;

export function tween<T extends object>(obj: T, to: Record<string, number>, dur: number,
  opts: { ease?: (t: number) => number; onDone?: () => void; global?: boolean } = {}): void {
  const values = obj as unknown as Record<string, number>;
  const from: Record<string, number> = {};
  for (const k in to) from[k] = values[k];
  tweenQueue.add({
    obj, from, to, dur, ease: opts.ease ?? easeOut, onDone: opts.onDone,
    global: opts.global ?? false,
  });
}
export function wait(ms: number, fn: () => void): void {
  tween({ v: 0 }, { v: 1 }, ms, { ease: linear, onDone: fn });
}

/* ---- Promise 버전 — async 연출 시퀀스용.
 * 대상이 파괴되면(씬 전환 등) resolve되지 않고 그대로 멈춘다:
 * 사라진 씬의 후속 로직이 실행되지 않게 하는 의도된 동작. ---- */
export function tweenP(obj: object, to: Record<string, number>, dur: number,
  opts: { ease?: (t: number) => number } = {}): Promise<void> {
  return new Promise((res) => tween(obj, to, dur, { ...opts, onDone: res }));
}
export function waitP(ms: number): Promise<void> {
  return new Promise((res) => wait(ms, res));
}
function tickTweens(): void {
  tweenQueue.tick(app.ticker.deltaMS);
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
  const r = opts.r ?? 10;
  const border = opts.border ?? C.border;
  /* One restrained, carved-metal frame shared by every HUD card and modal. */
  g.roundRect(0, 0, w, h, r).fill({ color: C.panelLow, alpha: 0.82 });
  g.roundRect(2, 2, w - 4, h - 4, Math.max(2, r - 2))
    .fill({ color: opts.fill ?? C.panel, alpha: opts.alpha ?? 0.97 });
  g.roundRect(1, 1, w - 2, h - 2, Math.max(2, r - 1))
    .stroke({ width: 2, color: border, alpha: opts.borderAlpha ?? 0.78 });
  g.roundRect(5, 5, w - 10, h - 10, Math.max(2, r - 4))
    .stroke({ width: 1, color: C.borderSoft, alpha: 0.48 });
  g.moveTo(14, 7).lineTo(Math.min(w - 14, 76), 7)
    .stroke({ width: 1, color: border, alpha: 0.55 });
  g.moveTo(Math.max(14, w - 76), h - 7).lineTo(w - 14, h - 7)
    .stroke({ width: 1, color: border, alpha: 0.32 });
  return g;
}

/** Shared modal scrim: consistent opacity plus a subtle inner vignette. */
export function backdrop(alpha = 0.66): PIXI.Graphics {
  const g = new PIXI.Graphics();
  g.rect(0, 0, W, H).fill({ color: 0x05040a, alpha });
  g.rect(18, 18, W - 36, H - 36)
    .stroke({ width: 2, color: C.borderSoft, alpha: 0.18 });
  g.eventMode = "static";
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
  let pressed = false;
  const g = panel(w, h, { fill: opts.fill ?? C.panelHi, border: opts.border ?? C.border, r: 8 });
  const t = txt(label, opts.size ?? 18, opts.color ?? C.text, { weight: "700" });
  t.anchor.set(0.5); t.x = w / 2; t.y = h / 2;
  c.addChild(g, t);
  c.eventMode = "static"; c.cursor = "pointer";
  c.on("pointertap", () => { if (!c.disabled) onTap(); });
  c.on("pointerover", () => {
    if (c.disabled) return;
    g.tint = 0xfff2c2;
    t.style.fill = 0xffffff;
  });
  c.on("pointerout", () => {
    g.tint = 0xffffff;
    t.style.fill = opts.color ?? C.text;
    c.alpha = c.disabled ? 0.42 : 1;
    if (pressed) { c.position.y -= 1; pressed = false; }
  });
  c.on("pointerdown", () => {
    if (!c.disabled && !pressed) { c.position.y += 1; pressed = true; }
  });
  const release = () => { if (pressed) { c.position.y -= 1; pressed = false; } };
  c.on("pointerup", release);
  c.on("pointerupoutside", release);
  c.setDisabled = (v: boolean) => {
    c.disabled = v; c.alpha = v ? 0.42 : 1; c.cursor = v ? "default" : "pointer";
    if (v) { g.tint = 0xb8b1a4; t.style.fill = C.dim; }
    else { g.tint = 0xffffff; t.style.fill = opts.color ?? C.text; }
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
  tween(c, { alpha: 1, y: 100 }, 250, { global: true });
  tween({ v: 0 }, { v: 1 }, 1600, {
    global: true,
    onDone: () => tween(c, { alpha: 0 }, 400, { global: true, onDone: () => c.destroy({ children: true }) }),
  });
}

export function fullFlash(color = 0xffffff, dur = 350, cb?: () => void): void {
  const g = new PIXI.Graphics();
  g.rect(0, 0, W, H).fill(color);
  g.alpha = 0; g.zIndex = 98; overlayRoot.addChild(g);
  tween(g, { alpha: 1 }, dur / 2, {
    global: true,
    onDone: () => {
      cb?.();
      tween(g, { alpha: 0 }, dur / 2, { global: true, onDone: () => g.destroy() });
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

/* ---- 메뉴 잠금 (오버레이 중복 방지) · 전투 중 여부 (진형 변경 등 자유 행동 잠금) ---- */
export const ui = { menuOpen: false, inBattle: false };

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
  tweenQueue.clear();
  modeBadge = null;
  ui.menuOpen = false;
  ui.inBattle = false;
  detachInput();
  if (app) { app.destroy(true, { children: true }); app = null as unknown as PIXI.Application; }
}
