/* =====================================================================
 * ambient.ts — 씬 공용 환경 연출 (바람 흔들림·부유 입자)
 *  - swaySprite: 빌보드 자식 스프라이트에 진자 흔들림을 건다.
 *    fpview.render가 엔티티 노드의 위치·스케일을 매 렌더 덮어쓰므로
 *    반드시 노드가 아니라 자식 스프라이트에만 적용한다.
 *  - particleField: 화면 전체를 떠다니는 입자막 (낙엽·먼지·불티·물보라).
 *    씬 ticker에서 tick을 호출하면 입자가 순환한다.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import { H, W } from "./core";

export type AmbientTick = (deltaMS: number) => void;

export interface SwayOptions {
  /** 최대 기울기(라디안). 나무 0.02 안팎, 풀꽃은 조금 크게. */
  amp?: number;
  /** 한 진동 주기(ms) */
  period?: number;
  /** 위상 — 같은 화면의 개체들이 엇갈려 흔들리게 좌표 등으로 준다 */
  phase?: number;
}

/** anchor(0.5,1) 스프라이트를 발밑 기준으로 좌우로 흔든다. */
export function swaySprite(sprite: PIXI.Sprite, opts: SwayOptions = {}): AmbientTick {
  const amp = opts.amp ?? 0.022;
  const period = opts.period ?? 2400;
  const phase = opts.phase ?? 0;
  let elapsed = 0;
  return (deltaMS) => {
    elapsed += deltaMS;
    const wave = Math.sin((elapsed / period) * Math.PI * 2 + phase);
    sprite.rotation = wave * amp;
    sprite.skew.x = wave * amp * 0.6;
  };
}

/** 노드를 제자리에서 위아래로 잔잔히 띄운다 (NPC 숨쉬기 등). */
export function bobSprite(target: PIXI.Container, opts: SwayOptions & { pixels?: number } = {}): AmbientTick {
  const pixels = opts.pixels ?? 2.2;
  const period = opts.period ?? 1900;
  const phase = opts.phase ?? 0;
  const baseY = target.y;
  let elapsed = 0;
  return (deltaMS) => {
    elapsed += deltaMS;
    target.y = baseY - Math.abs(Math.sin((elapsed / period) * Math.PI + phase)) * pixels;
  };
}

export type ParticleKind = "leaves" | "motes" | "embers" | "spray" | "dust" | "spores";

interface ParticleSpec {
  count: number;
  colors: number[];
  rMin: number;
  rMax: number;
  /** 초당 낙하 픽셀 (음수면 상승) */
  vyMin: number;
  vyMax: number;
  /** 초당 수평 드리프트 픽셀 (바람 방향) */
  vx: number;
  alphaMin: number;
  alphaMax: number;
  /** 좌우 살랑임 폭(px) */
  wobble: number;
  blend?: PIXI.BLEND_MODES;
  /** 낙엽처럼 납작한 타원 + 회전 */
  flat?: boolean;
}

const PARTICLE_SPECS: Record<ParticleKind, ParticleSpec> = {
  leaves: { count: 14, colors: [0x7f9a4a, 0xa8b45e, 0x8a6f3c], rMin: 3, rMax: 5, vyMin: 22, vyMax: 40, vx: -26, alphaMin: 0.5, alphaMax: 0.85, wobble: 26, flat: true },
  motes: { count: 20, colors: [0xfff7d8, 0xe8ecff], rMin: 1, rMax: 2.4, vyMin: -6, vyMax: 6, vx: 7, alphaMin: 0.12, alphaMax: 0.4, wobble: 18, blend: "add" },
  embers: { count: 16, colors: [0xffb050, 0xff7a30, 0xffd890], rMin: 1.2, rMax: 2.6, vyMin: -34, vyMax: -14, vx: 5, alphaMin: 0.25, alphaMax: 0.7, wobble: 14, blend: "add" },
  spray: { count: 18, colors: [0xf2f8ff, 0xd8ecf4], rMin: 1, rMax: 2.2, vyMin: 10, vyMax: 26, vx: 42, alphaMin: 0.14, alphaMax: 0.4, wobble: 10 },
  dust: { count: 16, colors: [0xcbb489, 0xb59a6c], rMin: 1.2, rMax: 2.6, vyMin: -4, vyMax: 8, vx: 30, alphaMin: 0.12, alphaMax: 0.32, wobble: 20 },
  spores: { count: 14, colors: [0xa9d8b8, 0x7fae9a, 0xd6e8c8], rMin: 1.4, rMax: 3, vyMin: -12, vyMax: -3, vx: -6, alphaMin: 0.16, alphaMax: 0.45, wobble: 22, blend: "add" },
};

interface Particle {
  g: PIXI.Graphics;
  x: number;
  y: number;
  vy: number;
  wobblePhase: number;
  wobblePeriod: number;
  spin: number;
}

/** 화면을 떠도는 입자막 — 반환된 node를 씬 뷰 위에 얹고 tick을 ticker에 등록한다. */
export function particleField(kind: ParticleKind, opts: { tint?: number; density?: number } = {}): {
  node: PIXI.Container;
  tick: AmbientTick;
} {
  const spec = PARTICLE_SPECS[kind];
  const node = new PIXI.Container();
  const rand = Math.random;
  const count = Math.max(4, Math.round(spec.count * (opts.density ?? 1)));
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const g = new PIXI.Graphics();
    const r = spec.rMin + rand() * (spec.rMax - spec.rMin);
    const color = spec.colors[i % spec.colors.length];
    if (spec.flat) g.ellipse(0, 0, r * 1.7, r).fill(color);
    else g.circle(0, 0, r).fill(color);
    if (opts.tint !== undefined) g.tint = opts.tint;
    g.alpha = spec.alphaMin + rand() * (spec.alphaMax - spec.alphaMin);
    if (spec.blend) g.blendMode = spec.blend;
    node.addChild(g);
    particles.push({
      g,
      x: rand() * W,
      y: rand() * H,
      vy: spec.vyMin + rand() * (spec.vyMax - spec.vyMin),
      wobblePhase: rand() * Math.PI * 2,
      wobblePeriod: 2400 + rand() * 2600,
      spin: spec.flat ? (rand() - 0.5) * 0.004 : 0,
    });
  }
  let elapsed = 0;
  const tick: AmbientTick = (deltaMS) => {
    elapsed += deltaMS;
    const dt = deltaMS / 1000;
    for (const p of particles) {
      p.x += spec.vx * dt;
      p.y += p.vy * dt;
      /* 화면 밖으로 나가면 반대편에서 재진입 (여유 12px) */
      if (p.x < -12) p.x += W + 24;
      else if (p.x > W + 12) p.x -= W + 24;
      if (p.y < -12) p.y += H + 24;
      else if (p.y > H + 12) p.y -= H + 24;
      p.g.x = p.x + Math.sin((elapsed / p.wobblePeriod) * Math.PI * 2 + p.wobblePhase) * spec.wobble;
      p.g.y = p.y;
      if (p.spin) p.g.rotation += p.spin * deltaMS;
    }
  };
  tick(0);
  return { node, tick };
}
