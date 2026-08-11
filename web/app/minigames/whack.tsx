'use client';

/** 선별 두더지 잡기 (찌꺼기 소각) — 태울 것만 태운다. 오인 소각은 기록만 남는다 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MinigameProps } from '../minigame-shell';
import { generateWhackPlan, gradeWhack, WHACK_HOLES } from './whack-logic';

export function WhackGame({ session, onFinish }: MinigameProps) {
  const plan = useMemo(() => generateWhackPlan(session.seed, session.difficulty), [session]);
  const totalResidue = useMemo(() => plan.spawns.filter((s) => s.kind === 'residue').length, [plan]);
  const [elapsed, setElapsed] = useState(0);
  const [handled, setHandled] = useState<Set<number>>(() => new Set());
  const burnedRef = useRef(0);
  const mistakesRef = useRef(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const now = Date.now() - startedAt;
      setElapsed(now);
      if (now >= plan.duration && !finishedRef.current) {
        finishedRef.current = true;
        clearInterval(timer);
        onFinish(gradeWhack(burnedRef.current, totalResidue));
      }
    }, 50);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, totalResidue]);

  // 구멍별 현재 노출 개체 — 나중 스폰이 이긴다 (같은 구멍 중첩은 덮어쓰기)
  const active = new Map<number, { index: number; kind: 'residue' | 'keeper' }>();
  plan.spawns.forEach((s, index) => {
    if (handled.has(index)) return;
    if (elapsed >= s.at && elapsed < s.at + s.life) active.set(s.hole, { index, kind: s.kind });
  });

  // 모호함 — 난이도가 오를수록 두 형상의 색이 가까워진다
  const keeperAlpha = 0.2 + plan.ambiguity * 0.5;

  return (
    <div className="minigame" data-minigame="whack">
      <header className="minigame-head">
        <span>찌꺼기 소각 — 태울 것만 태우십시오 ({burnedRef.current}/{totalResidue})</span>
        <span className="minigame-clock">{Math.max(0, Math.ceil((plan.duration - elapsed) / 1000))}</span>
      </header>
      <div
        className="minigame-board"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 56px)', gap: 6, justifyContent: 'center' }}
      >
        {Array.from({ length: WHACK_HOLES }, (_, hole) => {
          const mole = active.get(hole);
          return (
            <button
              key={hole}
              aria-label={`소각구 ${hole + 1}`}
              disabled={!mole}
              style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(127,127,127,.15)', padding: 0 }}
              onClick={() => {
                if (!mole) return;
                setHandled((prev) => new Set(prev).add(mole.index));
                if (mole.kind === 'residue') burnedRef.current += 1;
                else mistakesRef.current += 1;
              }}
            >
              {mole ? (
                <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
                  {mole.kind === 'residue' ? (
                    // 태울 것 — 일그러진 덩어리
                    <path
                      d="M12 3.5c2.8 1.5 5.4 3 6.3 6 .9 3-.4 6.6-3 8.4-2.6 1.8-6.3 1.6-8.6-.4C4.4 15.5 3.9 12 5.2 9.3 6.5 6.6 9.2 5 12 3.5z"
                      fill="currentColor"
                      opacity="0.85"
                    />
                  ) : (
                    // 두어야 할 것 — 고른 원. 난이도가 오르면 점점 비슷해진다
                    <circle cx="12" cy="12" r="8" fill="currentColor" opacity={keeperAlpha} />
                  )}
                </svg>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
