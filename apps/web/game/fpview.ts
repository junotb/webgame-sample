/* =====================================================================
 * fpview.ts — 1인칭 유사 3D 던전 렌더러 (고전 블로버 고정 깊이 방식)
 *  - 전방 MAXD칸 × 좌우 ±SIDE칸을 먼 깊이부터 painter's algorithm으로 드로우
 *  - 정면 벽: 타일 스프라이트 / 측면 벽·바닥·천장: PerspectiveMesh 원근 매핑
 *  - 표면은 베이스 타일 + 선택적 데칼(풍화·포장·창문 등) 2겹으로 그린다
 *  - 횃불은 벽 위 불꽃 스프라이트 — tick에서 6프레임 애니메이션 + 광원 플리커
 *  - 닫힌 문 칸은 벽과 같은 입체로 서되 표면만 doorAt(닫힌 문 데칼)으로 그린다
 *  - 엔티티(적·상자 등)는 씬이 소유한 노드를 빌보드로 배치
 *  - 테마(FPTheme)로 던전/마을이 같은 렌더러를 다른 표면으로 사용
 * ===================================================================== */
import * as PIXI from "pixi.js";
import { CellKind, DIR, Facing, GridMap, cellAt, hasLOS, rightOf } from "./grid";
import { floorVariant, mossAt, torchAt } from "./goblin-fortress";
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

/** 표면 = 베이스 타일 + 선택적 오버레이 데칼·벽 상단 지붕 띠.
 *  tint는 이 표면에만 곱하는 색조 — 같은 타일로 재질 차이(포석/흙길 등)를 낼 때 쓴다. */
export interface SurfacePick { base: TileName; decal?: TileName; cap?: TileName; tint?: number }

export interface FPTheme {
  floorAt(x: number, y: number): SurfacePick;
  wallAt(x: number, y: number): SurfacePick;
  /** 문 칸의 표면 — 벽처럼 서서 통행·시야를 막는 닫힌 문. 생략하면 wallAt을 쓴다. */
  doorAt?(x: number, y: number): SurfacePick;
  torchAt(x: number, y: number): boolean;
  /** null이면 야외 하늘이 보이도록 천장 면을 그리지 않는다. */
  ceiling: TileName | null;
  water: TileName;
  stairs: SurfacePick;
  /** 벽 위로 얹는 지붕 높이(벽 높이 1.0 기준). 지정하면 cap을 벽면 띠가 아니라
   *  벽 상단에서 안쪽으로 기울어 올라가는 실제 지붕면으로 그린다. 하늘이 보이는
   *  야외 마을 전용 — 천장이 있는 실내 테마에서는 지정하지 않는다. */
  roofHeight?: number;
  /** 테마별 색조. 지정하지 않으면 원본 타일 색을 유지한다. */
  floorTint?: number;
  waterTint?: number;
  wallTint?: number;
  ceilingTint?: number;
  /** 전방 가시 깊이. 던전은 짧게, 야외·마을은 길게 설정할 수 있다. */
  viewDistance?: number;
}

/** 기본 던전 테마 — 석조 지하미궁 (goblin-fortress.ts의 결정적 변형 함수 사용) */
export function dungeonTheme(): FPTheme {
  return {
    floorAt: (x, y) => ({ base: floorVariant(x, y) }),
    wallAt: (x, y) => (mossAt(x, y) ? { base: "wall", decal: "wall_worn_decal" } : { base: "wall" }),
    doorAt: () => ({ base: "wall", decal: "door_closed_obj" }),
    torchAt,
    ceiling: "ceiling",
    water: "water",
    stairs: { base: "floor", decal: "stairs_decal" },
  };
}

/* 던전별 실제 테마는 dungeons.ts의 레지스트리가 정의한다. */

const DEFAULT_MAXD = 4;  // 기본 전방 가시 깊이(던전)
const SIDE = 5;          // 16:9 화면 가장자리까지 바닥·벽이 닿는 좌우 가시 폭
const FOCAL = 580;       // 원근 초점 거리(px)
const CX = 640;          // 소실점 x
const CY = 320;          // 지평선 y
const NEAR = 0.28;       // 최소 근접 거리 (카메라 칸 클리핑)
const FLAME_MS = 110;    // 횃불 프레임 간격
const ROOF_DEPTH = 0.34; // 용마루가 벽면보다 건물 안쪽으로 물러나는 깊이(칸)
const ROOF_HIP = 0.32;   // 건물 끝 칸에서 용마루를 안쪽으로 접는 폭 — 우진각 모임
const ROOF_EAVE = 0.06;  // 끝 칸 처마가 벽 밖으로 나오는 폭(칸)

/** 가시 거리 끝에서도 실루엣이 남도록 깊이에 비례해 감쇠한다. */
const fog = (dist: number, viewDistance: number) =>
  Math.max(0.18, Math.min(1, 1.12 - (0.9 * dist) / viewDistance));
/** 원근 투영: (거리, 횡 오프셋) → 화면 x / (거리, 높이) → 화면 y (바닥 0, 벽 상단 1) */
const px = (dist: number, lat: number) => CX + (FOCAL * lat) / dist;
const yAt = (dist: number, h: number) => CY + (FOCAL * (0.5 - h)) / dist;
const topY = (dist: number) => yAt(dist, 1);
const botY = (dist: number) => yAt(dist, 0);

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
  let waters: { m: PIXI.Container; phase: number }[] = [];
  let glowT = 0;
  const viewDistance = Math.max(1, Math.floor(theme.viewDistance ?? DEFAULT_MAXD));
  const roofH = theme.roofHeight ?? 0;

  /* 벽과 닫힌 문은 같은 입체로 선다 — 표면만 doorAt으로 갈린다 */
  const solid = (k: CellKind): boolean => k === "wall" || k === "door";
  const surfAt = (map: GridMap, mx: number, my: number): SurfacePick =>
    cellAt(map, mx, my) === "door" && theme.doorAt ? theme.doorAt(mx, my) : theme.wallAt(mx, my);

  const shade = (color: number, amount: number): number => {
    const r = Math.round(((color >> 16) & 0xff) * amount);
    const g = Math.round(((color >> 8) & 0xff) * amount);
    const b = Math.round((color & 0xff) * amount);
    return (r << 16) | (g << 8) | b;
  };
  const mulColor = (a: number, b: number): number => {
    const r = Math.round((((a >> 16) & 0xff) * ((b >> 16) & 0xff)) / 255);
    const g = Math.round((((a >> 8) & 0xff) * ((b >> 8) & 0xff)) / 255);
    const bl = Math.round(((a & 0xff) * (b & 0xff)) / 255);
    return (r << 16) | (g << 8) | bl;
  };

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
  function surfQuad(pick: SurfacePick, c: number[], tint: number): PIXI.PerspectiveMesh {
    const t = pick.tint === undefined ? tint : mulColor(tint, pick.tint);
    const base = quad(tileTex(pick.base), c, t);
    if (pick.decal) quad(tileTex(pick.decal), c, t);
    return base;
  }

  /** 벽 상단 약 30%에 지붕 재질을 얹고, 문·창·표식은 그 위에 그린다.
   *  (roofHeight 테마에서는 cap을 벽 위 지붕면으로 따로 그리므로 띠를 생략한다) */
  function wallQuad(pick: SurfacePick, c: number[], tint: number): void {
    quad(tileTex(pick.base), c, tint);
    if (pick.cap && !theme.roofHeight) {
      const ratio = 0.3;
      const rightX = c[2] + (c[4] - c[2]) * ratio;
      const rightY = c[3] + (c[5] - c[3]) * ratio;
      const leftX = c[0] + (c[6] - c[0]) * ratio;
      const leftY = c[1] + (c[7] - c[1]) * ratio;
      quad(tileTex(pick.cap), [c[0], c[1], c[2], c[3], rightX, rightY, leftX, leftY], tint);
    }
    if (pick.decal) quad(tileTex(pick.decal), c, tint);
  }

  function render(map: GridMap, x: number, y: number, facing: Facing, entities: FPEntity[]): void {
    geom.removeChildren().forEach((c) => c.destroy({ children: true }));
    bills.removeChildren(); // 엔티티 노드는 씬 소유 — destroy하지 않는다
    glows = [];
    flames = [];
    waters = [];

    const fwd = DIR[facing];
    const rt = DIR[rightOf(facing)];
    const mapXY = (d: number, j: number) => ({ mx: x + fwd.dx * d + rt.dx * j, my: y + fwd.dy * d + rt.dy * j });

    /* 카메라는 자기 칸의 뒤쪽 가장자리에 위치 — 깊이 d 칸은 거리 d..d+1 구간,
     * 정면 벽 면은 거리 d. (근접 벽의 과도한 텍스처 확대를 막는다) */
    for (let d = viewDistance; d >= 0; d--) {
      const near = Math.max(NEAR, d);
      const far = d + 1;
      const cFog = fog(d + 0.5, viewDistance);

      /* --- 바닥·천장 (열린 칸) --- */
      for (let j = -SIDE; j <= SIDE; j++) {
        const { mx, my } = mapXY(d, j);
        const kind = cellAt(map, mx, my);
        if (solid(kind)) continue;
        const pick: SurfacePick =
          kind === "water" ? { base: theme.water }
            : kind === "stairs" ? theme.stairs
              : theme.floorAt(mx, my);
        const surface = surfQuad(pick, [
          px(far, j - 0.5), botY(far),   // top-left (먼 변이 화면상 위)
          px(far, j + 0.5), botY(far),
          px(near, j + 0.5), botY(near),
          px(near, j - 0.5), botY(near),
        ], shade(kind === "water" ? theme.waterTint ?? theme.floorTint ?? 0xffffff
          : theme.floorTint ?? 0xffffff, cFog));
        /* 물칸은 tick에서 알파를 일렁여 수면 반짝임을 낸다 */
        if (kind === "water") waters.push({ m: surface, phase: (mx * 5 + my * 9) % 12 });
        if (theme.ceiling) {
          quad(tileTex(theme.ceiling), [
            px(near, j - 0.5), topY(near),
            px(near, j + 0.5), topY(near),
            px(far, j + 0.5), topY(far),
            px(far, j - 0.5), topY(far),
          ], shade(theme.ceilingTint ?? theme.floorTint ?? 0xffffff, cFog * 0.45));
        }
      }

      /* --- 측면 벽 (복도 중심을 향한 면, 바깥쪽부터) --- */
      for (let a = SIDE; a >= 1; a--) {
        for (const j of [-a, a]) {
          const { mx, my } = mapXY(d, j);
          if (!solid(cellAt(map, mx, my))) continue;
          const inner = mapXY(d, j - Math.sign(j));
          if (solid(cellAt(map, inner.mx, inner.my))) continue; // 면이 벽에 붙어 안 보임
          const lat = j - Math.sign(j) * 0.5;
          const wp = surfAt(map, mx, my);
          const sFog = shade(theme.wallTint ?? 0xffffff, fog((near + far) / 2, viewDistance) * 0.88);
          const nT = topY(near), nB = botY(near), fT = topY(far), fB = botY(far);
          const xN = px(near, lat), xF = px(far, lat);
          wallQuad(wp, j > 0
            ? [xF, fT, xN, nT, xN, nB, xF, fB]
            : [xN, nT, xF, fT, xF, fB, xN, nB], sFog);
          /* 처마(벽 상단)에서 건물 안쪽으로 기울어 오르는 지붕면.
           * 건물이 끝나는 깊이 쪽은 용마루를 접어 우진각으로 마감한다. */
          if (wp.cap && roofH > 0) {
            const latRidge = lat + Math.sign(j) * ROOF_DEPTH;
            const ahead = mapXY(d - 1, j), behind = mapXY(d + 1, j);
            const nR = near + (solid(cellAt(map, ahead.mx, ahead.my)) ? 0 : ROOF_HIP);
            const fR = far - (solid(cellAt(map, behind.mx, behind.my)) ? 0 : ROOF_HIP);
            const xRN = px(nR, latRidge), yRN = yAt(nR, 1 + roofH);
            const xRF = px(fR, latRidge), yRF = yAt(fR, 1 + roofH);
            quad(tileTex(wp.cap), j > 0
              ? [xRF, yRF, xRN, yRN, xN, nT, xF, fT]
              : [xRN, yRN, xRF, yRF, xF, fT, xN, nT], sFog);
          }
        }
      }

      /* --- 정면 벽 --- */
      if (d >= 1) {
        const face = d;
        for (let j = -SIDE; j <= SIDE; j++) {
          const { mx, my } = mapXY(d, j);
          if (!solid(cellAt(map, mx, my))) continue;
          const behind = mapXY(d - 1, j);
          if (d > 1 && solid(cellAt(map, behind.mx, behind.my))) continue; // 앞 벽에 가려짐
          const wp = surfAt(map, mx, my);
          const xL = px(face, j - 0.5), xR = px(face, j + 0.5);
          const yT = topY(face), yB = botY(face);
          const tint = shade(theme.wallTint ?? 0xffffff, fog(face, viewDistance));
          const mkFace = (name: TileName) => {
            const s = new PIXI.Sprite(tileTex(name));
            s.x = xL; s.y = yT;
            s.width = xR - xL; s.height = yB - yT;
            s.tint = tint;
            geom.addChild(s);
          };
          mkFace(wp.base);
          if (wp.cap && roofH <= 0) {
            const cap = new PIXI.Sprite(tileTex(wp.cap));
            cap.x = xL; cap.y = yT;
            cap.width = xR - xL; cap.height = (yB - yT) * 0.3;
            cap.tint = tint;
            geom.addChild(cap);
          }
          if (wp.decal) mkFace(wp.decal);
          /* 지붕 — 벽 상단 처마에서 안쪽(깊이 +)으로 물러나며 올라간다.
           * 옆 칸이 벽이 아니면(건물 모서리) 그쪽 용마루를 접고 처마를 조금 내민다. */
          if (wp.cap && roofH > 0) {
            const ridgeD = face + ROOF_DEPTH;
            const left = mapXY(d, j - 1), right = mapXY(d, j + 1);
            const hipL = solid(cellAt(map, left.mx, left.my)) ? 0 : ROOF_HIP;
            const hipR = solid(cellAt(map, right.mx, right.my)) ? 0 : ROOF_HIP;
            const ridgeY = yAt(ridgeD, 1 + roofH);
            quad(tileTex(wp.cap), [
              px(ridgeD, j - 0.5 + hipL), ridgeY,
              px(ridgeD, j + 0.5 - hipR), ridgeY,
              px(face, j + 0.5 + (hipR ? ROOF_EAVE : 0)), yT,
              px(face, j - 0.5 - (hipL ? ROOF_EAVE : 0)), yT,
            ], tint);
          }
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
      if (d < 1 || d > viewDistance || Math.abs(j) > SIDE) continue;
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
      n.alpha = fog(dist, viewDistance);
      bills.addChild(n);
    }
  }

  function tick(dtMS: number): void {
    glowT += dtMS;
    const fi = Math.floor(glowT / FLAME_MS);
    for (const f of flames) f.sp.texture = flameTex(fi + f.phase);
    for (const t of glows)
      t.g.alpha = 0.09 + 0.05 * Math.sin(glowT / 150 + t.phase);
    for (const w of waters)
      w.m.alpha = 0.9 + 0.08 * Math.sin(glowT / 640 + w.phase);
  }

  return { root, render, tick };
}
