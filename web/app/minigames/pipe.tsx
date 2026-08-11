'use client';

/** 파이프 퍼즐 (마력회로 점검) — 셀을 탭해 회전, 30초 안에 회로를 잇는다 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MinigameProps } from '../minigame-shell';
import { useCountdown } from './countdown';
import { correctCount, dirsAt, generatePipePuzzle, gradePipe, isSolved, type PipePuzzle } from './pipe-logic';

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

  return (
    <div className="minigame" data-minigame="pipe">
      <header className="minigame-head">
        <span>마력회로 점검 — 회로를 이으십시오</span>
        <span className="minigame-clock">{Math.ceil(remaining / 1000)}</span>
      </header>
      <div
        className="minigame-board"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${puzzle.size}, 44px)`, gap: 2, justifyContent: 'center' }}
      >
        {Array.from({ length: puzzle.size * puzzle.size }, (_, i) => {
          const row = Math.floor(i / puzzle.size);
          const col = i % puzzle.size;
          const cellIndex = pathAt.get(`${row}:${col}`);
          if (cellIndex === undefined) {
            return <span key={i} style={{ width: 44, height: 44, background: 'rgba(127,127,127,.12)' }} />;
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
