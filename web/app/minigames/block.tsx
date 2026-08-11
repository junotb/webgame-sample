'use client';

/** 블록 퍼즐 (자재 옮기기) — 조각을 수레 판에 앉힌다. 탭한 칸이 조각의 좌상단 기준 */
import { useMemo, useRef, useState } from 'react';
import type { MinigameProps } from '../minigame-shell';
import { useCountdown } from './countdown';
import { canPlace, generateBlockPuzzle, gradeBlock, place } from './block-logic';

const TOTAL_MS = 30000;

export function BlockGame({ session, onFinish }: MinigameProps) {
  const puzzle = useMemo(() => generateBlockPuzzle(session.seed, session.difficulty), [session]);
  const [occupied, setOccupied] = useState<boolean[][]>(() =>
    Array.from({ length: puzzle.size }, () => Array(puzzle.size).fill(false)),
  );
  const [pieceIndex, setPieceIndex] = useState(0);
  const [placedCells, setPlacedCells] = useState(0);
  const finishedRef = useRef(false);

  const totalCells = puzzle.size * puzzle.size;
  const piece = puzzle.pieces[pieceIndex];

  const finish = (cells: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish(gradeBlock(cells, totalCells));
  };

  const remaining = useCountdown(TOTAL_MS, () => finish(placedCells));

  const advance = (nextOccupied: boolean[][], nextPlaced: number) => {
    setOccupied(nextOccupied);
    setPlacedCells(nextPlaced);
    if (pieceIndex + 1 >= puzzle.pieces.length) {
      finish(nextPlaced);
    } else {
      setPieceIndex(pieceIndex + 1);
    }
  };

  return (
    <div className="minigame" data-minigame="block">
      <header className="minigame-head">
        <span>자재 옮기기 — 남은 조각 {puzzle.pieces.length - pieceIndex}</span>
        <span className="minigame-clock">{Math.ceil(remaining / 1000)}</span>
      </header>
      <div className="minigame-split" style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        <div
          className="minigame-board"
          style={{ display: 'grid', gridTemplateColumns: `repeat(${puzzle.size}, 40px)`, gap: 2 }}
        >
          {Array.from({ length: totalCells }, (_, i) => {
            const r = Math.floor(i / puzzle.size);
            const c = i % puzzle.size;
            const ok = piece ? canPlace(occupied, piece, [r, c]) : false;
            return (
              <button
                key={i}
                aria-label={`적재 ${r + 1}행 ${c + 1}열`}
                disabled={!ok}
                style={{
                  width: 40,
                  height: 40,
                  background: occupied[r][c] ? 'rgba(127,127,127,.55)' : 'rgba(127,127,127,.14)',
                  outline: ok ? '1.5px solid currentColor' : 'none',
                }}
                onClick={() => {
                  if (!piece) return;
                  advance(place(occupied, piece, [r, c]), placedCells + piece.cells.length);
                }}
              />
            );
          })}
        </div>
        <div>
          <p style={{ margin: '0 0 4px' }}>이번 조각</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 18px)', gap: 1 }}>
            {Array.from({ length: 16 }, (_, i) => {
              const r = Math.floor(i / 4);
              const c = i % 4;
              const filled = piece?.cells.some(([pr, pc]) => pr === r && pc === c) ?? false;
              return (
                <span key={i} style={{ width: 18, height: 18, background: filled ? 'currentColor' : 'transparent' }} />
              );
            })}
          </div>
          <button
            style={{ marginTop: 8 }}
            onClick={() => {
              // 자리가 없는 조각은 내려놓는다 — 남긴 만큼 성적에서 빠진다
              if (pieceIndex + 1 >= puzzle.pieces.length) finish(placedCells);
              else setPieceIndex(pieceIndex + 1);
            }}
          >
            이 조각을 내려놓는다
          </button>
        </div>
      </div>
    </div>
  );
}
