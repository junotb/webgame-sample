"use client";

/**
 * 선별 두더지 잡기 (불순물 소각) — 원형 9포트, 태울 것만 태운다.
 * 목표·점수는 표기하지 않는다: 판에 보이는 수치는 남은 시간뿐이고,
 * 통과는 완료 문구 한 줄로만 알린다 (system-rules "소각 미니게임").
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { MinigameProps } from "../minigame-shell";
import {
  generateWhackPlan,
  gradeWhack,
  WHACK_HOLES,
  WHACK_TARGET,
} from "./whack-logic";
import DrippingGoo from "../../assets/icons/game-icons.net/lorc/dripping-goo.svg";
import AcidBlob from "../../assets/icons/game-icons.net/lorc/acid-blob.svg";
import CrystalCluster from "../../assets/icons/game-icons.net/lorc/crystal-cluster.svg";
import CrystalShine from "../../assets/icons/game-icons.net/lorc/crystal-shine.svg";

const RESIDUE_ICONS = [DrippingGoo, AcidBlob];
const KEEPER_ICONS = [CrystalCluster, CrystalShine];

const BOARD = 300;
const RADIUS = 118;
const PORT = 64;

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
        className="minigame-board"
        style={{
          position: "relative",
          width: BOARD,
          height: BOARD,
          margin: "0 auto",
          flexShrink: 0,
        }}
      >
        {/* 회로 관로 — 포트를 잇는 고리 */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: BOARD / 2 - RADIUS,
            top: BOARD / 2 - RADIUS,
            width: RADIUS * 2,
            height: RADIUS * 2,
            borderRadius: "50%",
            border: "5px solid rgba(74, 65, 48, 0.14)",
          }}
        />
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
        ) : (
          <>
            <span
              className="minigame-clock"
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
              }}
            >
              {secondsLeft}
            </span>
            {Array.from({ length: WHACK_HOLES }, (_, hole) => {
              const angle = -Math.PI / 2 + (hole * 2 * Math.PI) / WHACK_HOLES;
              const mole = active.get(hole);
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
                    left: BOARD / 2 + Math.cos(angle) * RADIUS - PORT / 2,
                    top: BOARD / 2 + Math.sin(angle) * RADIUS - PORT / 2,
                    width: PORT,
                    height: PORT,
                    borderRadius: "50%",
                    background: "rgba(127,127,127,.15)",
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
          </>
        )}
      </div>
    </div>
  );
}
