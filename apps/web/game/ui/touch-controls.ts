/* =====================================================================
 * ui/touch-controls.ts — 터치 가상 컨트롤러
 *  좌하단 D-패드, 우하단 결정·취소, 우상단 메뉴 버튼.
 *  터치 기기(pointer: coarse)에서만 설치되고, 각 버튼은 논리 액션
 *  (dispatchAction)으로만 씬과 대화한다. 이동 버튼은 누르는 동안
 *  해당 방향 키가 눌린 것으로 기록해(keys) 씬의 홀드 판정
 *  (actionDown)이 키보드와 동일하게 동작한다.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import { C, H, InputAction, W, Z, dispatchAction, keys, overlayRoot, txt } from "../core";

/** 홀드 판정에 쓰는 대표 물리 키 — core의 KEY_BINDINGS와 일치해야 한다. */
const HOLD_KEY: Partial<Record<InputAction, string>> = {
  up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight",
};

function touchButton(label: string, r: number, action: InputAction): PIXI.Container {
  const c = new PIXI.Container();
  const g = new PIXI.Graphics();
  g.circle(0, 0, r).fill({ color: C.panel, alpha: 0.55 });
  g.circle(0, 0, r).stroke({ width: 2, color: C.border, alpha: 0.5 });
  const t = txt(label, Math.round(r * 0.68), C.text, { weight: "700" });
  t.anchor.set(0.5);
  c.addChild(g, t);
  c.eventMode = "static";
  const holdKey = HOLD_KEY[action];
  const press = () => {
    c.alpha = 1;
    if (holdKey) keys[holdKey] = true;
    dispatchAction(action);
  };
  const release = () => {
    c.alpha = 0.75;
    if (holdKey) keys[holdKey] = false;
  };
  c.alpha = 0.75;
  c.on("pointerdown", press);
  c.on("pointerup", release);
  c.on("pointerupoutside", release);
  c.on("pointercancel", release);
  return c;
}

/** 터치 기기에서 가상 컨트롤러를 설치한다 — 해제 함수를 반환. */
export function installTouchControls(): () => void {
  if (typeof window === "undefined" || !window.matchMedia("(pointer: coarse)").matches)
    return () => {};

  const root = new PIXI.Container();
  root.zIndex = Z.touch;

  /* D-패드 — 좌하단 */
  const cx = 128, cy = H - 128, gap = 66, r = 34;
  const dirs: Array<[string, InputAction, number, number]> = [
    ["▲", "up", cx, cy - gap], ["▼", "down", cx, cy + gap],
    ["◀", "left", cx - gap, cy], ["▶", "right", cx + gap, cy],
  ];
  for (const [label, action, x, y] of dirs) {
    const b = touchButton(label, r, action);
    b.x = x; b.y = y;
    root.addChild(b);
  }

  /* 결정·취소 — 우하단 (엄지 호 배치) */
  const confirm = touchButton("Z", 40, "confirm");
  confirm.x = W - 96; confirm.y = H - 150;
  const cancel = touchButton("X", 34, "cancel");
  cancel.x = W - 190; cancel.y = H - 84;
  /* 메뉴 — 우상단 */
  const menu = touchButton("≡", 26, "menu");
  menu.x = W - 52; menu.y = 96;
  root.addChild(confirm, cancel, menu);

  overlayRoot.addChild(root);
  return () => {
    for (const key of Object.values(HOLD_KEY)) keys[key] = false;
    root.destroy({ children: true });
  };
}
