/* =====================================================================
 * fpview.ts — 1인칭 유사 3D 던전 렌더러 (고전 블로버 고정 깊이 방식)
 *  - 전방 MAXD칸 × 좌우 ±SIDE칸을 먼 깊이부터 painter's algorithm으로 드로우
 *  - 정면 벽: 타일 스프라이트 / 측면 벽·바닥·천장: PerspectiveMesh 원근 매핑
 *  - 표면은 베이스 타일 + 선택적 데칼(풍화·포장·창문 등) 2겹으로 그린다
 *  - 횃불은 벽 위 불꽃 스프라이트 — tick에서 6프레임 애니메이션 + 광원 플리커
 *  - 엔티티(적·상자·문 등)는 씬이 소유한 노드를 빌보드로 배치
 *  - 테마(FPTheme)로 던전/마을이 같은 렌더러를 다른 표면으로 사용
 * ===================================================================== */
import * as PIXI from "pixi.js";
import { DIR, Facing, GridMap, cellAt, hasLOS, rightOf } from "./grid";
import { floorVariant, mossAt, torchAt } from "./dungeon";
import { TileName, flameTex, tileTex } from "./tiles";

export interface FPEntity {
  id: string;
  x: number; y: number;
  /** 씬이 소유·재사용하는 노드 (fpview는 배치만 담당) */
  node: PIXI.Container;
  /** 월드 높이 (1.0 = 벽 높이). 기본 0.55 */
  worldH?: number;
  /** node의 기준 픽셀 높이 — 스케일 산출용. 기본 120 */
  baseH?: number;
}

/** 표면 = 베이스 타일 + 선택적 오버레이 데칼 */
export interface SurfacePick { base: TileName; decal?: TileName }

export interface FPTheme {
  floorAt(x: number, y: number): SurfacePick;
  wallAt(x: number, y: number): SurfacePick;
  torchAt(x: number, y: number): boolean;
  ceiling: TileName;
  water: TileName;
  stairs: SurfacePick;
}

/** 기본 테마 — 황혼의 숲 지하미궁 (dungeon.ts의 결정적 변형 함수 사용) */
export function dungeonTheme(): FPTheme {
  return {
    floorAt: (x, y) => ({ base: floorVariant(x, y) }),
    wallAt: (x, y) => (mossAt(x, y) ? { base: "wall", decal: "wall_worn_decal" } : { base: "wall" }),
    torchAt,
    ceiling: "ceiling",
    water: "water",
    stairs: { base: "floor", decal: "stairs_decal" },
  };
}

const MAXD = 4;          // 전방 가시 깊이
const SIDE = 3;          // 좌우 가시 폭
const FOCAL = 580;       // 원근 초점 거리(px)
const CX = 640;          // 소실점 x
const CY = 320;          // 지평선 y
const NEAR = 0.28;       // 최소 근접 거리 (카메라 칸 클리핑)
const FLAME_MS = 110;    // 횃불 프레임 간격

const fog = (dist: number) => Math.max(0.16, Math.min(1, 1.16 - 0.23 * dist));
const gray = (b: number) => {
  const v = Math.round(255 * b);
  return (v << 16) | (v << 8) | v;
};

/** 원근 투영: (거리, 횡 오프셋) → 화면 x / 벽 상·하단 y */
const px = (dist: number, lat: number) => CX + (FOCAL * lat) / dist;
const topY = (dist: number) => CY - (FOCAL * 0.5) / dist;
const botY = (dist: number) => CY + (FOCAL * 0.5) / dist;

export interface FPView {
  root: PIXI.Container;
  /** 상태 변화 시 전체 재구성 */
  render(map: GridMap, x: number, y: number, facing: Facing, entities: FPEntity[]): void;
  /** 횃불 애니메이션·플리커 (씬 ticker에서 호출) */
  tick(dtMS: number): void;
}

export function createFPView(theme: FPTheme = dungeonTheme()): FPView {
  const root = new PIXI.Container();
  const geom = new PIXI.Container();   // 벽·바닥·천장 (매 렌더 재생성)
  const bills = new PIXI.Container();  // 엔티티 빌보드
  root.addChild(geom, bills);
  let glows: { g: PIXI.Graphics; phase: number }[] = [];
  let flames: { sp: PIXI.Sprite; phase: number }[] = [];
  let glowT = 0;

  function quad(tex: PIXI.Texture, c: number[], tint: number): PIXI.PerspectiveMesh {
    const m = new PIXI.PerspectiveMesh({
      texture: tex, verticesX: 8, verticesY: 8,
      x0: c[0], y0: c[1], x1: c[2], y1: c[3], x2: c[4], y2: c[5], x3: c[6], y3: c[7],
    });
    m.tint = tint;
    geom.addChild(m);
    return m;
  }
  /** 베이스 + 데칼 2겹 */
  function surfQuad(pick: SurfacePick, c: number[], tint: number): void {
    quad(tileTex(pick.base), c, tint);
    if (pick.decal) quad(tileTex(pick.decal), c, tint);
  }

  function render(map: GridMap, x: number, y: number, facing: Facing, entities: FPEntity[]): void {
    geom.removeChildren().forEach((c) => c.destroy({ children: true }));
    bills.removeChildren(); // 엔티티 노드는 씬 소유 — destroy하지 않는다
    glows = [];
    flames = [];

    const fwd = DIR[facing];
    const rt = DIR[rightOf(facing)];
    const mapXY = (d: number, j: number) => ({ mx: x + fwd.dx * d + rt.dx * j, my: y + fwd.dy * d + rt.dy * j });

    /* 카메라는 자기 칸의 뒤쪽 가장자리에 위치 — 깊이 d 칸은 거리 d..d+1 구간,
     * 정면 벽 면은 거리 d. (근접 벽의 과도한 텍스처 확대를 막는다) */
    for (let d = MAXD; d >= 0; d--) {
      const near = Math.max(NEAR, d);
      const far = d + 1;
      const cFog = fog(d + 0.5);

      /* --- 바닥·천장 (열린 칸) --- */
      for (let j = -SIDE; j <= SIDE; j++) {
        const { mx, my } = mapXY(d, j);
        const kind = cellAt(map, mx, my);
        if (kind === "wall") continue;
        const pick: SurfacePick =
          kind === "water" ? { base: theme.water }
            : kind === "stairs" ? theme.stairs
              : theme.floorAt(mx, my);
        surfQuad(pick, [
          px(far, j - 0.5), botY(far),   // top-left (먼 변이 화면상 위)
          px(far, j + 0.5), botY(far),
          px(near, j + 0.5), botY(near),
          px(near, j - 0.5), botY(near),
        ], gray(cFog));
        quad(tileTex(theme.ceiling), [
          px(near, j - 0.5), topY(near),
          px(near, j + 0.5), topY(near),
          px(far, j + 0.5), topY(far),
          px(far, j - 0.5), topY(far),
        ], gray(cFog * 0.45));
      }

      /* --- 측면 벽 (복도 중심을 향한 면, 바깥쪽부터) --- */
      for (let a = SIDE; a >= 1; a--) {
        for (const j of [-a, a]) {
          const { mx, my } = mapXY(d, j);
          if (cellAt(map, mx, my) !== "wall") continue;
          const inner = mapXY(d, j - Math.sign(j));
          if (cellAt(map, inner.mx, inner.my) === "wall") continue; // 면이 벽에 붙어 안 보임
          const lat = j - Math.sign(j) * 0.5;
          const wp = theme.wallAt(mx, my);
          const sFog = gray(fog((near + far) / 2) * 0.88);
          const nT = topY(near), nB = botY(near), fT = topY(far), fB = botY(far);
          const xN = px(near, lat), xF = px(far, lat);
          surfQuad(wp, j > 0
            ? [xF, fT, xN, nT, xN, nB, xF, fB]
            : [xN, nT, xF, fT, xF, fB, xN, nB], sFog);
        }
      }

      /* --- 정면 벽 --- */
      if (d >= 1) {
        const face = d;
        for (let j = -SIDE; j <= SIDE; j++) {
          const { mx, my } = mapXY(d, j);
          if (cellAt(map, mx, my) !== "wall") continue;
          const behind = mapXY(d - 1, j);
          if (d > 1 && cellAt(map, behind.mx, behind.my) === "wall") continue; // 앞 벽에 가려짐
          const wp = theme.wallAt(mx, my);
          const xL = px(face, j - 0.5), xR = px(face, j + 0.5);
          const yT = topY(face), yB = botY(face);
          const tint = gray(fog(face));
          const mkFace = (name: TileName) => {
            const s = new PIXI.Sprite(tileTex(name));
            s.x = xL; s.y = yT;
            s.width = xR - xL; s.height = yB - yT;
            s.tint = tint;
            geom.addChild(s);
          };
          mkFace(wp.base);
          if (wp.decal) mkFace(wp.decal);
          /* 횃불 — 불꽃 스프라이트 + 광원 (가운데 열만 광원) */
          if (theme.torchAt(mx, my)) {
            const fl = new PIXI.Sprite(flameTex(0));
            fl.anchor.set(0.5, 1);
            const w = xR - xL, h = yB - yT;
            fl.width = w * 0.52; fl.height = h * 0.6;
            fl.x = (xL + xR) / 2; fl.y = yT + h * 0.78;
            fl.tint = tint;
            geom.addChild(fl);
            flames.push({ sp: fl, phase: (Math.abs(mx * 3 + my * 5)) % 6 });
            if (Math.abs(j) <= 1) {
              const g = new PIXI.Graphics();
              g.circle(0, 0, Math.min(150, w * 0.5)).fill(0xe87820);
              g.blendMode = "add"; g.alpha = 0.1;
              g.x = (xL + xR) / 2; g.y = CY - h * 0.12;
              geom.addChild(g);
              glows.push({ g, phase: mx * 1.7 + my * 0.9 });
            }
          }
        }
      }
    }

    /* --- 엔티티 빌보드 (먼 것부터) --- */
    const placed: { e: FPEntity; d: number; j: number }[] = [];
    for (const e of entities) {
      const dxm = e.x - x, dym = e.y - y;
      const d = fwd.dx * dxm + fwd.dy * dym;
      const j = rt.dx * dxm + rt.dy * dym;
      if (d < 1 || d > MAXD || Math.abs(j) > SIDE) continue;
      if (!hasLOS(map, x, y, e.x, e.y)) continue;
      placed.push({ e, d, j });
    }
    placed.sort((a, b) => b.d - a.d);
    for (const { e, d, j } of placed) {
      const n = e.node;
      const dist = d + 0.5; // 칸 중앙
      const sc = ((FOCAL / dist) * (e.worldH ?? 0.55)) / (e.baseH ?? 120);
      n.x = px(dist, j);
      n.y = botY(dist);
      n.scale.set(sc);
      n.alpha = fog(dist);
      bills.addChild(n);
    }
  }

  function tick(dtMS: number): void {
    glowT += dtMS;
    const fi = Math.floor(glowT / FLAME_MS);
    for (const f of flames) f.sp.texture = flameTex(fi + f.phase);
    for (const t of glows)
      t.g.alpha = 0.09 + 0.05 * Math.sin(glowT / 150 + t.phase);
  }

  return { root, render, tick };
}
