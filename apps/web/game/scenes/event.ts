/* =====================================================================
 * scenes/event.ts — 이벤트 모드 (초상화 + 대화창 + 선택지 분기)
 * ===================================================================== */
import * as PIXI from "pixi.js";
import {
  C, H, SceneHandle, W, button, linear, overlayRoot, panel, sceneRoot, setModeBadge, tween, txt,
} from "../core";

export interface EventChoice {
  label: string;
  effect?: () => void;
  /** number=노드 인덱스, 'end'=종료, 'none'=effect가 직접 씬 전환 */
  goto?: number | "end" | "none";
}
export interface EventNode {
  name?: string;
  portrait?: "hero" | "elder" | "dark";
  text: string;
  choices?: EventChoice[];
  run?: () => void;
}
export interface EventOpts {
  caption?: string;
  bgColor?: number;
  /** 사전 로드된 이벤트 일러스트. 지정하면 오버레이가 일러스트 팝업으로 표시된다. */
  illustration?: PIXI.Texture;
}

/** 화면을 전환하는 스토리 이벤트. */
export function eventScene(nodes: EventNode[], onEnd?: () => void, opts: EventOpts = {}): SceneHandle {
  setModeBadge("이벤트 모드", C.arcane);
  return createEvent(nodes, onEnd, opts, false);
}

/**
 * 현재 씬을 유지한 채 이벤트를 최상단에 표시한다.
 * 일러스트가 있으면 어두운 배경 위에 일러스트 팝업을, 없으면 대화창만 표시한다.
 */
export function eventOverlay(nodes: EventNode[], onEnd?: () => void, opts: EventOpts = {}): SceneHandle {
  return createEvent(nodes, onEnd, opts, true);
}

function createEvent(
  nodes: EventNode[], onEnd: (() => void) | undefined, opts: EventOpts, overlay: boolean,
): SceneHandle {
  const root = new PIXI.Container();
  if (overlay) {
    root.zIndex = 75;
    overlayRoot.addChild(root);
  } else sceneRoot.addChild(root);

  const hasIllustration = !!opts.illustration;

  /** 일러스트 패널 — 오버레이·전체 씬 공용 (대화창 위 중앙) */
  const addIllustration = (topY: number) => {
    const artFrame = panel(760, 330, { fill: 0x100d1d, alpha: 0.98 });
    artFrame.x = (W - artFrame.width) / 2; artFrame.y = topY; root.addChild(artFrame);
    const art = new PIXI.Sprite(opts.illustration!);
    const maxW = artFrame.width - 24, maxH = artFrame.height - 24;
    const scale = Math.min(maxW / art.texture.width, maxH / art.texture.height);
    art.scale.set(scale); art.anchor.set(0.5);
    art.x = artFrame.x + artFrame.width / 2; art.y = artFrame.y + artFrame.height / 2;
    root.addChild(art);
  };

  let advance: () => void = () => {};
  if (overlay) {
    if (hasIllustration) {
      const dim = new PIXI.Graphics();
      dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.68 });
      root.addChild(dim);
      addIllustration(54);
    }

    // 빈 영역의 클릭도 이벤트 입력으로 소비해 탐험 조작이 뒤로 전달되지 않게 한다.
    const inputBlocker = new PIXI.Graphics();
    inputBlocker.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0 });
    inputBlocker.eventMode = "static";
    inputBlocker.on("pointertap", () => advance());
    root.addChild(inputBlocker);
  } else {
    const bg = new PIXI.Graphics();
    bg.rect(0, 0, W, H).fill(opts.bgColor ?? C.night);
    for (let i = 0; i < 6; i++) bg.circle(W / 2, H / 2, 120 + i * 70);
    bg.stroke({ width: 1, color: C.border, alpha: 0.12 });
    bg.eventMode = "static";
    bg.on("pointertap", () => advance());
    root.addChild(bg);
    if (hasIllustration) addIllustration(112);
  }

  if (opts.caption && (!overlay || hasIllustration)) {
    const cap = txt(opts.caption, 30, C.border, { serif: true, align: "center" });
    cap.anchor.set(0.5, 0); cap.x = W / 2;
    cap.y = overlay && hasIllustration ? 66 : hasIllustration ? 60 : 110;
    root.addChild(cap);
  }

  const bp = panel(W - 160, 200, { alpha: 0.97 }); bp.x = 80; bp.y = H - 236; root.addChild(bp);
  const nameTag = panel(220, 42, { fill: C.panelHi }); nameTag.x = 104; nameTag.y = H - 258; root.addChild(nameTag);
  const nameT = txt("", 18, C.border, { serif: true }); nameT.x = 124; nameT.y = H - 252; root.addChild(nameT);
  const bodyT = txt("", 18, C.text, { wrap: W - 260, lh: 30 }); bodyT.x = 112; bodyT.y = H - 206; root.addChild(bodyT);
  const nextHint = txt("▼", 16, C.border); nextHint.x = W - 120; nextHint.y = H - 70; root.addChild(nextHint);

  const portrait = new PIXI.Container(); portrait.x = 150; portrait.y = H - 300; root.addChild(portrait);

  let idx = 0;
  let busy = false;
  let typeTimer: ReturnType<typeof setInterval> | null = null;
  let choiceBtns: PIXI.Container[] = [];

  function drawPortrait(kind?: string): void {
    portrait.removeChildren().forEach((c) => c.destroy());
    if (!kind) return;
    const g = new PIXI.Graphics();
    if (kind === "hero") {
      g.circle(0, -96, 34).fill(0x2c2440);
      g.roundRect(-46, -70, 92, 120, 20).fill(0x3a2f52);
      g.rect(-4, -40, 8, 70).fill({ color: C.border, alpha: 0.9 });
      g.circle(0, -96, 34).stroke({ width: 2, color: C.border, alpha: 0.6 });
    } else if (kind === "elder") {
      g.circle(0, -96, 36).fill(0x40365a);
      g.roundRect(-52, -68, 104, 124, 22).fill(0x2e2648);
      g.roundRect(-20, -84, 40, 50, 16).fill({ color: 0xcfc8b0, alpha: 0.85 });
      g.circle(0, -96, 36).stroke({ width: 2, color: C.arcane, alpha: 0.7 });
    } else if (kind === "dark") {
      g.circle(0, -96, 38).fill(0x101018);
      g.roundRect(-54, -66, 108, 126, 20).fill(0x181428);
      g.circle(-12, -100, 5).circle(12, -100, 5).fill({ color: C.epic, alpha: 0.9 });
      g.circle(0, -96, 38).stroke({ width: 2, color: C.epic, alpha: 0.6 });
    }
    portrait.addChild(g);
    portrait.alpha = 0; tween(portrait, { alpha: 1 }, 250);
  }
  function clearChoices(): void {
    choiceBtns.forEach((b) => b.destroy({ children: true }));
    choiceBtns = [];
  }
  function show(i: number): void {
    clearChoices();
    if (i >= nodes.length) { finish(); return; }
    idx = i;
    const n = nodes[i];
    n.run?.();
    nameT.text = n.name ?? ""; nameTag.visible = !!n.name;
    bodyT.text = "";
    drawPortrait(overlay && !hasIllustration ? undefined : n.portrait);
    if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
    busy = true;
    let ci = 0;
    const full = n.text ?? "";
    typeTimer = setInterval(() => {
      if (bodyT.destroyed) { if (typeTimer) clearInterval(typeTimer); typeTimer = null; return; }
      ci += 2; bodyT.text = full.slice(0, ci);
      if (ci >= full.length) {
        if (typeTimer) clearInterval(typeTimer);
        typeTimer = null; busy = false; layoutChoices(n);
      }
    }, 16);
    nextHint.visible = false;
  }
  function layoutChoices(n: EventNode): void {
    if (n.choices?.length) {
      n.choices.forEach((ch, k) => {
        const b = button(ch.label, 520, 44, () => {
          ch.effect?.();
          if (ch.goto === "none") return;
          if (typeof ch.goto === "number") show(ch.goto);
          else if (ch.goto === "end") finish();
          else show(idx + 1);
        }, { size: 15 });
        b.x = W - 160 - 540;
        b.y = H - 300 - (n.choices!.length - 1 - k) * 54;
        root.addChild(b); choiceBtns.push(b);
      });
    } else {
      nextHint.visible = true;
      tween(nextHint, { y: H - 64 }, 400, { ease: linear, onDone: () => { if (!nextHint.destroyed) nextHint.y = H - 70; } });
    }
  }
  advance = (): void => {
    if (busy) return;
    const n = nodes[idx];
    if (n.choices?.length) return;
    show(idx + 1);
  };
  bp.eventMode = "static"; bp.on("pointertap", advance);

  /* 오버레이가 열린 동안에는 기반 씬의 단축키까지 막는다. */
  const onOverlayKey = overlay ? (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.key === " " || e.key === "Enter") advance();
  } : null;
  if (onOverlayKey) window.addEventListener("keydown", onOverlayKey, true);

  let finished = false;
  function dispose(): void {
    if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
    if (onOverlayKey) window.removeEventListener("keydown", onOverlayKey, true);
    clearChoices();
    if (!root.destroyed) root.destroy({ children: true });
  }
  function finish(): void {
    if (finished) return;
    finished = true;
    dispose();
    onEnd?.();
  }
  show(0);
  return {
    onKey: (k) => { if (k === " " || k === "Enter") advance(); },
    dispose,
  };
}
