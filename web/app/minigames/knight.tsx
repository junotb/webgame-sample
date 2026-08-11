'use client';

/** 기사의 여행 (구역 순찰) — 행마 가능한 지점을 골라 30초 안에 최대한 밟는다 */
import { useMemo, useRef, useState } from 'react';
import type { MinigameProps } from '../minigame-shell';
import { useCountdown } from './countdown';
import { cellKey, generateKnightBoard, gradeKnight, legalMoves } from './knight-logic';

const TOTAL_MS = 30000;

export function KnightGame({ session, onFinish }: MinigameProps) {
  const board = useMemo(() => generateKnightBoard(session.seed, session.difficulty), [session]);
  const blocked = useMemo(() => new Set(board.blocked), [board]);
  const [pos, setPos] = useState<[number, number]>(board.start);
  const [visited, setVisited] = useState<Set<string>>(() => new Set([cellKey(...board.start)]));
  const finishedRef = useRef(false);

  const playable = board.size * board.size - blocked.size;
  const moves = legalMoves(pos, visited, blocked, board.size);
  const moveKeys = new Set(moves.map(([r, c]) => cellKey(r, c)));

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish(gradeKnight(visited.size, playable));
  };

  const remaining = useCountdown(TOTAL_MS, finish);
  if (moves.length === 0 && !finishedRef.current) {
    // 더 갈 곳이 없다 — 즉시 정산 (렌더 중 부수효과 회피)
    setTimeout(finish, 0);
  }

  return (
    <div className="minigame" data-minigame="knight">
      <header className="minigame-head">
        <span>구역 순찰 — 순찰로를 밟으십시오 ({visited.size}/{playable})</span>
        <span className="minigame-clock">{Math.ceil(remaining / 1000)}</span>
      </header>
      <div
        className="minigame-board"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${board.size}, 44px)`, gap: 2, justifyContent: 'center' }}
      >
        {Array.from({ length: board.size * board.size }, (_, i) => {
          const r = Math.floor(i / board.size);
          const c = i % board.size;
          const k = cellKey(r, c);
          const isBlocked = blocked.has(k);
          const isCurrent = pos[0] === r && pos[1] === c;
          const isVisited = visited.has(k);
          const isMove = moveKeys.has(k);
          return (
            <button
              key={k}
              aria-label={`순찰 ${r + 1}행 ${c + 1}열`}
              disabled={!isMove}
              style={{
                width: 44,
                height: 44,
                background: isBlocked
                  ? 'rgba(127,127,127,.06)'
                  : isCurrent
                    ? 'currentColor'
                    : isVisited
                      ? 'rgba(127,127,127,.45)'
                      : isMove
                        ? 'rgba(127,127,127,.28)'
                        : 'rgba(127,127,127,.14)',
                outline: isMove ? '1.5px solid currentColor' : 'none',
              }}
              onClick={() => {
                setPos([r, c]);
                setVisited((prev) => new Set(prev).add(k));
              }}
            >
              {isBlocked ? '×' : isCurrent ? '♞' : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}
