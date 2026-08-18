'use client';

/** 파이프 퍼즐 (마력회로 점검) — 셀을 탭해 회전, 30초 안에 회로를 잇는다 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MinigameProps } from '../minigame-shell';
import { useCountdown } from './countdown';
import { correctCount, dirsAt, generatePipePuzzle, gradePipe, isSolved, type PipePuzzle } from './pipe-logic';
import StoneBlock from '../../assets/icons/game-icons.net/lorc/stone-block.svg';
import Valve from '../../assets/icons/game-icons.net/delapouite/valve.svg';
import EnergyTank from '../../assets/icons/game-icons.net/delapouite/energy-tank.svg';

const TOTAL_MS = 30000;

/** 방향 → 셀 중심에서 가장자리로 그리는 선분 (viewBox 0~24) */
const LINE: Record<string, string> = {
  L: 'M12 12H0', R: 'M12 12H24', U: 'M12 12V0', D: 'M12 12V24',
};

export function PipeGame({ session, onFinish }: MinigameProps) {
  const base = useMemo(() => generatePipePuzzle(session.seed, session.difficulty), [session]);
  const [rotations, setRotations] = useState<number[]>(() => base.cells.map((c) => c.rotation));
  const finishedRef = useRef(false);

  const puzzle: PipePuzzle = {
    size: base.size,
    cells: base.cells.map((c, i) => ({ ...c, rotation: rotations[i] })),
    obstacles: base.obstacles,
  };

  const finish = (result: ReturnType<typeof gradePipe>) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish(result);
  };

  const remaining = useCountdown(TOTAL_MS, () => finish(gradePipe(correctCount(puzzle), puzzle.cells.length)));

  useEffect(() => {
    if (isSolved(puzzle)) finish('complete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotations]);

  const pathAt = new Map(puzzle.cells.map((c, i) => [`${c.row}:${c.col}`, i]));
  const startRow = puzzle.cells[0].row;
  const endRow = puzzle.cells[puzzle.cells.length - 1].row;

  // 행렬 바깥 마커 — 급원(밸브)과 종점(수용조). 판의 일부가 아니며 회전 대상이 아니다
  const edgeMarker = (kind: 'source' | 'sink') => (
    <span aria-hidden style={{ display: 'flex', alignItems: 'center', flexDirection: kind === 'source' ? 'row' : 'row-reverse' }}>
      {kind === 'source' ? <Valve width={22} height={22} /> : <EnergyTank width={22} height={22} />}
      <svg viewBox="0 0 6 24" width="6" height="40" fill="none" stroke="currentColor" strokeWidth="3.4">
        <path d="M0 12H6" />
      </svg>
    </span>
  );

  return (
    <div className="minigame" data-minigame="pipe">
      <header className="minigame-head">
        <span>마력회로 점검 — 회로를 이으십시오</span>
        <span className="minigame-clock">{Math.ceil(remaining / 1000)}</span>
      </header>
      <div
        className="minigame-board"
        style={{ display: 'grid', gridTemplateColumns: `28px repeat(${puzzle.size}, 44px) 28px`, gap: 2, justifyContent: 'center', alignItems: 'center' }}
      >
        {Array.from({ length: puzzle.size * (puzzle.size + 2) }, (_, i) => {
          const row = Math.floor(i / (puzzle.size + 2));
          const gridCol = i % (puzzle.size + 2);
          if (gridCol === 0) {
            return (
              <span key={i} aria-label={row === startRow ? '급원' : undefined} style={{ width: 28, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                {row === startRow ? edgeMarker('source') : null}
              </span>
            );
          }
          if (gridCol === puzzle.size + 1) {
            return (
              <span key={i} aria-label={row === endRow ? '종점' : undefined} style={{ width: 28, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                {row === endRow ? edgeMarker('sink') : null}
              </span>
            );
          }
          const col = gridCol - 1;
          const cellIndex = pathAt.get(`${row}:${col}`);
          if (cellIndex === undefined) {
            const blocked = puzzle.obstacles.has(`${row}:${col}`);
            return (
              <span
                key={i}
                style={{
                  width: 44, height: 44,
                  background: blocked ? 'rgba(127,127,127,.3)' : 'rgba(127,127,127,.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: blocked ? 0.75 : 1,
                }}
              >
                {blocked ? <StoneBlock width={26} height={26} aria-hidden /> : null}
              </span>
            );
          }
          const cell = puzzle.cells[cellIndex];
          const [a, b] = dirsAt(cell.type, cell.rotation);
          return (
            <button
              key={i}
              aria-label={`회로 ${row + 1}행 ${col + 1}열`}
              style={{ width: 44, height: 44, padding: 0, background: 'rgba(127,127,127,.25)' }}
              onClick={() =>
                setRotations((prev) => prev.map((r, idx) => (idx === cellIndex ? r + 1 : r)))
              }
            >
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="3.4">
                <path d={LINE[a]} />
                <path d={LINE[b]} />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
