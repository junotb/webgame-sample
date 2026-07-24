/* =====================================================================
 * core.ts — PIXI 셋업, 씬 매니저, 트윈, 공용 UI 헬퍼, nav 라우터
 * ===================================================================== */
import * as PIXI from "pixi.js";
import { resumeAudio, suspendAudio } from "./audio";
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

/* ---- 오버레이 레이어 — zIndex는 반드시 여기서 가져다 쓴다 (쌓임 순서의 단일 출처) ----
 * menu 대역(60~)은 openOverlay 스택이 깊이만큼 +1씩 올려 자동 배정한다. */
export const Z = {
  hud: 40, badge: 50, menu: 60, event: 75,
  flash: 98, toast: 99, touch: 150, crash: 200,
} as const;

/* ---- 폰트 (boot에서 next/font 패밀리 주입) ---- */
export const FONTS = { display: "serif", body: "sans-serif" };

/* ---- PIXI 앱 (boot에서 생성) ---- */
export let app: PIXI.Application = null as unknown as PIXI.Application;
let onVisibility: (() => void) | null = null;
export let sceneRoot: PIXI.Container = null as unknown as PIXI.Container;
export let overlayRoot: PIXI.Container = null as unknown as PIXI.Container;

/* ---- 씬 핸들 ---- */
export interface SceneHandle {
  onKey?: (k: string) => void;
  /** 논리 액션 입력 — 키보드 외 입력원(게임패드·터치)을 더할 때의 공용 통로 */
  onAction?: (a: InputAction) => void;
  dispose?: () => void;
}
let currentScene: SceneHandle | null = null;

export function switchScene(builder: () => SceneHandle): void {
  if (currentScene?.dispose) currentScene.dispose();
  /* 이전 씬이 예약한 wait/tween 콜백을 제거해 전환 후 실행되지 않게 한다. */
  tweenQueue.cancelSceneTweens();
  /* 씬에 딸린 메뉴 오버레이가 다음 씬으로 넘어가지 않게 정리한다 (onClose는 부르지 않는다). */
  closeAllOverlays();
  sceneRoot.removeChildren().forEach((c) => c.destroy({ children: true }));
  try { currentScene = builder(); }
  catch (err) { currentScene = null; reportCrash(err); }
}

/* ---- 크래시 가드 ----
 * 씬 구축·틱·입력 처리에서 터진 예외를 잡아 복구 화면을 띄운다.
 * 세이브는 명시적 저장 시에만 쓰므로 진행 중 크래시가 슬롯을 건드리지 않는다. */
let crashScreen: PIXI.Container | null = null;
export function reportCrash(err: unknown): void {
  console.error("[게임 크래시]", err);
  if (crashScreen) return; /* 복구 화면 위에서 또 터져도 중첩하지 않는다 */
  try {
    if (currentScene?.dispose) { try { currentScene.dispose(); } catch { /* 이미 죽은 씬 */ } }
    currentScene = null;
    tweenQueue.cancelSceneTweens();
    sceneRoot.removeChildren().forEach((c) => c.destroy({ children: true }));
    closeAllOverlays();
    ui.inBattle = false;
    setModeBadge(null);

    const c = new PIXI.Container();
    c.zIndex = Z.crash;
    const g = new PIXI.Graphics();
    g.rect(0, 0, W, H).fill({ color: 0x05040a, alpha: 0.92 });
    const p = panel(560, 240);
    p.x = (W - 560) / 2; p.y = (H - 240) / 2;
    const title = txt("문제가 발생했다", 26, C.blood, { serif: true, weight: "900" });
    title.anchor.set(0.5); title.x = W / 2; title.y = p.y + 52;
    const msg = err instanceof Error ? err.message : String(err);
    const body = txt(`예기치 못한 오류로 화면을 복구했다.\n저장된 세이브는 안전하다.\n\n${msg}`.slice(0, 300),
      15, C.dim, { align: "center", wrap: 500 });
    body.anchor.set(0.5, 0); body.x = W / 2; body.y = p.y + 78;
    const btn = button("타이틀로 돌아가기", 220, 46, () => {
      crashScreen?.destroy({ children: true });
      crashScreen = null;
      nav.title();
    });
    btn.x = (W - 220) / 2; btn.y = p.y + 240 - 66;
    c.addChild(g, p, title, body, btn);
    overlayRoot.addChild(c);
    crashScreen = c;
  } catch (fatal) {
    /* 복구 화면조차 못 그리면 콘솔에만 남긴다 — 세이브는 여전히 안전하다. */
    console.error("[게임 크래시] 복구 화면 표시 실패", fatal);
  }
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
    /* 씬 틱에서 터진 예외는 크래시 가드로 넘겨 매 프레임 반복되지 않게 한다. */
    const guarded = (t: PIXI.Ticker) => {
      try { fn(t); }
      catch (err) { app.ticker.remove(guarded); reportCrash(err); }
    };
    app.ticker.add(guarded);
    this.add(() => app.ticker.remove(guarded));
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

/* ---- 키 입력 · 액션 매핑 ----
 * 씬은 물리 키 대신 논리 액션으로 입력을 받을 수 있다.
 * 새 입력원(게임패드·터치)은 dispatchAction만 호출하면 전 씬에 전달된다. */
export type InputAction = "up" | "down" | "left" | "right" | "confirm" | "cancel" | "menu";

const KEY_BINDINGS: Record<string, InputAction> = {
  ArrowUp: "up", w: "up", W: "up",
  ArrowDown: "down", s: "down", S: "down",
  ArrowLeft: "left", a: "left", A: "left",
  ArrowRight: "right", d: "right", D: "right",
  " ": "confirm", Enter: "confirm", z: "confirm", Z: "confirm",
  Escape: "cancel", x: "cancel", X: "cancel",
  m: "menu", M: "menu",
};

export function actionOf(key: string): InputAction | null {
  return KEY_BINDINGS[key] ?? null;
}

/** 액션에 묶인 키 중 하나라도 눌려 있는지 — 이동 홀드 판정용 */
export function actionDown(action: InputAction): boolean {
  for (const key in KEY_BINDINGS) if (KEY_BINDINGS[key] === action && keys[key]) return true;
  return false;
}

/** 게임패드·터치 등 외부 입력원의 진입점 */
export function dispatchAction(a: InputAction): void {
  try {
    if (a === "cancel" && closeTopOverlay()) return; /* 오버레이가 소비 */
    currentScene?.onAction?.(a);
  } catch (err) { reportCrash(err); }
}

export const keys: Record<string, boolean> = {};
let onKeyDown: ((e: KeyboardEvent) => void) | null = null;
let onKeyUp: ((e: KeyboardEvent) => void) | null = null;

export function attachInput(): void {
  onKeyDown = (e) => {
    keys[e.key] = true;
    try {
      const a = actionOf(e.key);
      /* cancel은 열린 오버레이가 먼저 소비한다 — 씬에는 전달하지 않는다. */
      if (a === "cancel" && closeTopOverlay()) { /* consumed */ }
      else {
        currentScene?.onKey?.(e.key);
        if (a) currentScene?.onAction?.(a);
      }
    } catch (err) { reportCrash(err); }
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
  /* 탭 복귀·프레임 스파이크의 거대 델타로 트윈·대기가 한 번에 건너뛰지 않게 상한을 둔다. */
  tweenQueue.tick(Math.min(app.ticker.deltaMS, 100));
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
  c.x = (W - p.width) / 2; c.y = 90; c.alpha = 0; c.zIndex = Z.toast;
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
  g.alpha = 0; g.zIndex = Z.flash; overlayRoot.addChild(g);
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
  c.addChild(g, t); c.x = 16; c.y = 14; c.zIndex = Z.badge;
  overlayRoot.addChild(c); modeBadge = c;
}

/* =====================================================================
 * 오버레이 스택 매니저
 *  - 메뉴류 오버레이는 전부 openOverlay로 연다: zIndex 자동 배정(Z.menu+깊이),
 *    스크림(backdrop) 자동 부착, Esc(cancel)로 최상단부터 닫힘.
 *  - ui.menuOpen은 스택에서 파생된다 — 직접 대입하지 않는다.
 * ===================================================================== */
export interface OverlayHandle {
  root: PIXI.Container;
  /** 오버레이를 닫는다. silent면 onClose 콜백을 부르지 않는다. */
  close: (opts?: { silent?: boolean }) => void;
}

interface OverlayEntry {
  root: PIXI.Container;
  scrim: PIXI.Graphics;
  onClose?: () => void;
  escClose: boolean;
}
const overlayStack: OverlayEntry[] = [];

export function openOverlay(opts: { onClose?: () => void; escClose?: boolean } = {}): OverlayHandle {
  const root = new PIXI.Container();
  root.zIndex = Z.menu + overlayStack.length;
  const scrim = backdrop();
  root.addChild(scrim);
  /* 딤이 겹쳐 과하게 어두워지지 않게, 덮이는 오버레이의 스크림은 잠시 숨긴다. */
  const below = overlayStack[overlayStack.length - 1];
  if (below) below.scrim.visible = false;
  overlayRoot.addChild(root);
  const entry: OverlayEntry = { root, scrim, onClose: opts.onClose, escClose: opts.escClose ?? true };
  overlayStack.push(entry);
  return { root, close: (o) => closeOverlayEntry(entry, o?.silent ?? false) };
}

function closeOverlayEntry(entry: OverlayEntry, silent: boolean): void {
  const i = overlayStack.indexOf(entry);
  if (i < 0) return; /* 이미 닫혔다 (중복 close 무해) */
  overlayStack.splice(i, 1);
  entry.root.destroy({ children: true });
  const top = overlayStack[overlayStack.length - 1];
  if (top) top.scrim.visible = true;
  if (!silent) entry.onClose?.();
}

/** cancel 입력의 오버레이 소비 — 최상단을 닫았으면(또는 잠겨 있으면) true. */
export function closeTopOverlay(): boolean {
  const top = overlayStack[overlayStack.length - 1];
  if (!top) return false;
  if (top.escClose) closeOverlayEntry(top, false);
  return true;
}

/** 크래시 복구·씬 전환용 일괄 정리. onClose 콜백은 부르지 않는다. */
export function closeAllOverlays(): void {
  while (overlayStack.length) overlayStack.pop()!.root.destroy({ children: true });
}

/* ---- 메뉴 잠금 (스택 파생) · 전투 중 여부 (진형 변경 등 자유 행동 잠금) ---- */
export const ui = {
  inBattle: false,
  get menuOpen(): boolean { return overlayStack.length > 0; },
};

/* ---- 라이프사이클 ---- */
export async function initPixi(el: HTMLElement, fonts: { displayFont: string; bodyFont: string }): Promise<void> {
  FONTS.display = fonts.displayFont;
  FONTS.body = fonts.bodyFont;
  app = new PIXI.Application();
  /* resolution: 고DPI 화면에서도 선명하게 렌더한다(상한 2 — 과도한 픽셀 비용 방지).
   * 표시 크기는 globals.css의 .game-root canvas 규칙이 반응형으로 맞추므로
   * autoDensity(인라인 스타일 주입)는 쓰지 않는다. */
  await app.init({
    width: W, height: H, background: hexs(C.bg), antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });
  el.appendChild(app.canvas);
  /* 탭이 가려지면 루프·오디오를 멈춰 배터리를 아끼고, 복귀 시 이어 간다. */
  onVisibility = () => {
    if (document.hidden) { app.ticker.stop(); suspendAudio(); }
    else { app.ticker.start(); resumeAudio(); }
  };
  document.addEventListener("visibilitychange", onVisibility);
  app.stage.sortableChildren = true;
  sceneRoot = new PIXI.Container(); sceneRoot.zIndex = 0;
  overlayRoot = new PIXI.Container(); overlayRoot.zIndex = 10;
  overlayRoot.sortableChildren = true;
  app.stage.addChild(sceneRoot, overlayRoot);
  app.ticker.add(tickTweens);
}
export function destroyPixi(): void {
  if (onVisibility) { document.removeEventListener("visibilitychange", onVisibility); onVisibility = null; }
  if (currentScene?.dispose) currentScene.dispose();
  currentScene = null;
  crashScreen = null;
  tweenQueue.clear();
  modeBadge = null;
  closeAllOverlays();
  ui.inBattle = false;
  detachInput();
  if (app) { app.destroy(true, { children: true }); app = null as unknown as PIXI.Application; }
}
