"use client";

/**
 * 선별 두더지 잡기 (불순물 소각) — 관로 위 9포트, 태울 것만 태운다.
 * 관로 형태(사행·지그재그·말굽)는 시드가 고른다 — 배치는 난이도 축이 아니다.
 * 목표·점수는 표기하지 않는다: 판에 보이는 수치는 남은 시간뿐이고,
 * 통과는 완료 문구 한 줄로만 알린다 (system-rules "소각 미니게임").
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { MinigameProps } from "../minigame-shell";
import {
  generateWhackPlan,
  gradeWhack,
  pickWhackLayout,
  WHACK_TARGET,
  type WhackLayoutId,
} from "./whack-logic";
import DrippingGoo from "../../assets/icons/game-icons.net/lorc/dripping-goo.svg";
import AcidBlob from "../../assets/icons/game-icons.net/lorc/acid-blob.svg";
import CrystalCluster from "../../assets/icons/game-icons.net/lorc/crystal-cluster.svg";
import CrystalShine from "../../assets/icons/game-icons.net/lorc/crystal-shine.svg";

const RESIDUE_ICONS = [DrippingGoo, AcidBlob];
const KEEPER_ICONS = [CrystalCluster, CrystalShine];

const PORT = 64;

// 관로는 포트 사이 구간만 잇는다 — 포트를 관통하는 선을 만들지 않는다
const PIPE_INK = "rgba(74, 65, 48, 0.2)";
const PIPE_HALF = 5.5; // 관 반폭 (윤곽선 두 줄 사이)
const FLANGE_HALF = 9; // 접합 플랜지 반길이
const PORT_TRIM = PORT / 2 + 3; // 포트 가장자리 + 여백

type Pt = [number, number];

interface BoardLayout {
  width: number;
  height: number;
  /** 관로 연결 순서의 포트 중심 9개 — 배열 순서가 곧 배관 순서 */
  ports: Pt[];
  /** 남은 시간 자리 — 관로가 비워 둔 곳 */
  clock: Pt;
  /** 판 밖으로 이어지는 인입·회송 — 포트에서 판 가장자리로 */
  stubs: { from: Pt; to: Pt }[];
}

/** 사행 — 간선에서 갈라져 한 번 굽이치는 회수 관로 */
const COIL: BoardLayout = {
  width: 500,
  height: 248,
  ports: [
    [56, 68],
    [156, 68],
    [256, 68],
    [356, 68],
    [456, 68],
    [406, 180],
    [306, 180],
    [206, 180],
    [106, 180],
  ],
  clock: [256, 124],
  stubs: [
    { from: [56, 68], to: [4, 68] },
    { from: [106, 180], to: [4, 180] },
  ],
};

/** 지그재그 — 열교환기식 절곡 구간, 간선이 판을 가로질러 지나간다 */
const ZIGZAG: BoardLayout = {
  width: 480,
  height: 244,
  ports: Array.from({ length: 9 }, (_, k): Pt => [
    44 + k * 49,
    k % 2 === 0 ? 66 : 178,
  ]),
  clock: [442, 214],
  stubs: [
    { from: [44, 66], to: [4, 66] },
    { from: [436, 66], to: [476, 66] },
  ],
};

/** 말굽 — 왼쪽 간선에서 나와 오른쪽 끝을 돌아 되돌아가는 구간 */
const HORSESHOE: BoardLayout = {
  width: 500,
  height: 248,
  ports: [
    [110, 68],
    [205, 68],
    [300, 68],
    [395, 68],
    [462, 124],
    [395, 180],
    [300, 180],
    [205, 180],
    [110, 180],
  ],
  clock: [240, 124],
  stubs: [
    { from: [110, 68], to: [4, 68] },
    { from: [110, 180], to: [4, 180] },
  ],
};

const LAYOUTS: Record<WhackLayoutId, BoardLayout> = {
  coil: COIL,
  zigzag: ZIGZAG,
  horseshoe: HORSESHOE,
};

/** 직관 한 토막 — 윤곽선 두 줄 + 다듬은 양끝의 접합 플랜지 */
function PipeSeg({
  a,
  b,
  trimA,
  trimB,
  flangeB = true,
}: {
  a: Pt;
  b: Pt;
  trimA: number;
  trimB: number;
  flangeB?: boolean;
}) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len;
  const uy = (b[1] - a[1]) / len;
  const nx = -uy;
  const ny = ux;
  const s: Pt = [a[0] + ux * trimA, a[1] + uy * trimA];
  const e: Pt = [b[0] - ux * trimB, b[1] - uy * trimB];
  const contour = (o: number) => ({
    x1: s[0] + nx * o,
    y1: s[1] + ny * o,
    x2: e[0] + nx * o,
    y2: e[1] + ny * o,
  });
  const flange = (p: Pt) => ({
    x1: p[0] + nx * FLANGE_HALF,
    y1: p[1] + ny * FLANGE_HALF,
    x2: p[0] - nx * FLANGE_HALF,
    y2: p[1] - ny * FLANGE_HALF,
  });
  return (
    <g stroke={PIPE_INK} fill="none">
      <line {...contour(PIPE_HALF)} strokeWidth={2} />
      <line {...contour(-PIPE_HALF)} strokeWidth={2} />
      <line {...flange(s)} strokeWidth={3} />
      {flangeB ? <line {...flange(e)} strokeWidth={3} /> : null}
    </g>
  );
}

/** 관로 전체 — 포트 사이 직관 + 판 밖으로 이어지는 인입·회송 */
function PipeWork({ layout }: { layout: BoardLayout }) {
  return (
    <svg
      aria-hidden="true"
      width={layout.width}
      height={layout.height}
      style={{ position: "absolute", inset: 0 }}
    >
      {layout.ports.slice(0, -1).map((a, i) => (
        <PipeSeg
          key={`run-${i}`}
          a={a}
          b={layout.ports[i + 1]}
          trimA={PORT_TRIM}
          trimB={PORT_TRIM}
        />
      ))}
      {layout.stubs.map((stub, i) => (
        <PipeSeg
          key={`stub-${i}`}
          a={stub.from}
          b={stub.to}
          trimA={PORT_TRIM}
          trimB={0}
          flangeB={false}
        />
      ))}
    </svg>
  );
}

// 색 구분이 난이도의 모호함 축 — 두 색이 중간톤으로 다가간다
const RUST: [number, number, number] = [140, 62, 47];
const GREEN: [number, number, number] = [51, 75, 66];
function mix(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): string {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

const NOTICE_MS = 1400;

export function WhackGame({ session, onFinish }: MinigameProps) {
  const plan = useMemo(
    () => generateWhackPlan(session.seed, session.difficulty),
    [session],
  );
  const layout = LAYOUTS[pickWhackLayout(session.seed)];
  // 판은 설계 좌표 그대로 그리고, 모자란 화면에는 통째로 축소해 앉힌다 —
  // 넘치면 flex 중앙정렬이 위(지시서 제목)와 아래(포트)를 함께 침범한다
  const fitRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setScale(
        Math.min(1, rect.width / layout.width, rect.height / layout.height),
      );
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [layout]);
  const [elapsed, setElapsed] = useState(0);
  const [handled, setHandled] = useState<Set<number>>(() => new Set());
  const [notice, setNotice] = useState(false);
  const burnedRef = useRef(0);
  const wrongRef = useRef(0);
  const finishedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 통과는 문구를 보여준 뒤 반입, 실패는 곧장 반입 —
  // 실패의 결과는 현장이 아니라 다른 장소의 보고로 도착한다
  const endRound = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    const result = gradeWhack(burnedRef.current, wrongRef.current);
    if (result === "fail") {
      onFinish(result);
      return;
    }
    setNotice(true);
    setTimeout(() => onFinish(result), NOTICE_MS);
  };

  useEffect(() => {
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      const now = Date.now() - startedAt;
      setElapsed(now);
      if (now >= plan.duration) endRound();
    }, 50);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  // 포트별 현재 노출 개체 — 계획이 포트 겹침을 만들지 않으므로 하나뿐
  const active = new Map<
    number,
    { index: number; kind: "residue" | "keeper"; variant: 0 | 1 }
  >();
  plan.spawns.forEach((s, index) => {
    if (handled.has(index)) return;
    if (elapsed >= s.at && elapsed < s.at + s.life)
      active.set(s.hole, { index, kind: s.kind, variant: s.variant });
  });

  const residueColor = mix(RUST, GREEN, plan.ambiguity * 0.45);
  const keeperColor = mix(GREEN, RUST, plan.ambiguity * 0.45);
  const secondsLeft = Math.max(0, Math.ceil((plan.duration - elapsed) / 1000));

  return (
    <div className="minigame" data-minigame="whack">
      <header className="minigame-head">
        <span>불순물 소각 — 태울 것만 태우십시오</span>
      </header>
      <div
        ref={fitRef}
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          className="minigame-board"
          style={{
            position: "relative",
            width: layout.width,
            height: layout.height,
            flexShrink: 0,
            transform: `scale(${scale})`,
            transformOrigin: "center",
          }}
        >
          <PipeWork layout={layout} />
          {/* 안정되면 시계만 걷는다 — 판과 소각구는 빈 채로 남아 잠잠해진다 */}
          {notice ? null : (
            <span
              className="minigame-clock"
              style={{
                position: "absolute",
                left: layout.clock[0],
                top: layout.clock[1],
                transform: "translate(-50%, -50%)",
              }}
            >
              {secondsLeft}
            </span>
          )}
          {layout.ports.map(([px, py], hole) => {
            const mole = notice ? undefined : active.get(hole);
            const Icon = mole
              ? (mole.kind === "residue" ? RESIDUE_ICONS : KEEPER_ICONS)[
                  mole.variant
                ]
              : null;
            return (
              <button
                key={hole}
                aria-label={`소각구 ${hole + 1}`}
                disabled={!mole}
                style={{
                  position: "absolute",
                  left: px - PORT / 2,
                  top: py - PORT / 2,
                  width: PORT,
                  height: PORT,
                  borderRadius: "50%",
                  background: "rgba(127,127,127,.15)",
                  border: `2px solid ${PIPE_INK}`,
                  padding: 0,
                  display: "grid",
                  placeItems: "center",
                }}
                onClick={() => {
                  if (!mole || finishedRef.current) return;
                  setHandled((prev) => new Set(prev).add(mole.index));
                  if (mole.kind === "residue") burnedRef.current += 1;
                  else wrongRef.current += 1;
                  if (burnedRef.current - wrongRef.current >= WHACK_TARGET)
                    endRound();
                }}
              >
                {Icon ? (
                  <Icon
                    aria-hidden="true"
                    width={44}
                    height={44}
                    style={{
                      color:
                        mole!.kind === "residue" ? residueColor : keeperColor,
                    }}
                  />
                ) : null}
              </button>
            );
          })}
          {notice ? (
            <p
              className="minigame-note"
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                margin: 0,
                fontSize: "0.95rem",
              }}
            >
              마력 회로가 안정된 것 같다.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
