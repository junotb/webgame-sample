'use client';

/**
 * 순찰 경로 (구역 순찰) — 시작 지점에서 끝 지점까지, 지났던 칸을 다시 밟지 않고
 * 모든 칸을 지난다. 인접 칸을 눌러 나아가고, 직전 칸을 누르면 한 걸음 무른다.
 */
import { useMemo, useRef, useState } from 'react';
import type { MinigameProps } from '../minigame-shell';
import { useCountdown } from './countdown';
import { cellKey, generatePatrolBoard, gradePatrol, isAdjacent, judgeStep } from './onestroke-logic';

const TOTAL_MS = 30000;

export function OnestrokeGame({ session, onFinish }: MinigameProps) {
  const board = useMemo(() => generatePatrolBoard(session.seed, session.difficulty), [session]);
  const [trail, setTrail] = useState<Array<[number, number]>>([board.start]);
  const finishedRef = useRef(false);

  const total = board.size * board.size;
  const visited = new Set(trail.map((cell) => cellKey(...cell)));
  const head = trail[trail.length - 1];
  const atEnd = head[0] === board.end[0] && head[1] === board.end[1];

  const finish = (cells: number, reachedEnd: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish(gradePatrol(cells, total, reachedEnd));
  };

  const remaining = useCountdown(TOTAL_MS, () => finish(trail.length, atEnd && trail.length === total));

  const step = (r: number, c: number) => {
    const k = cellKey(r, c);
    // 직전 칸 = 한 걸음 무르기 (판정 전 한정 — 잘못 들어선 뒤에는 무를 수 없다)
    if (trail.length >= 2 && cellKey(...trail[trail.length - 2]) === k) {
      setTrail(trail.slice(0, -1));
      return;
    }
    if (visited.has(k) || !isAdjacent(head, [r, c])) return;
    const next = [...trail, [r, c] as [number, number]];
    setTrail(next);
    // 즉시 판정 — 잘못된 경로는 그 자리에서 끝난다:
    // 끝 타일인데 남은 칸이 있거나(earlyEnd), 끝 타일이 아닌 막다른 길(deadEnd)이면 실패
    const verdict = judgeStep(board, next);
    if (verdict === 'complete') finish(next.length, true);
    else if (verdict === 'earlyEnd' || verdict === 'deadEnd') {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onFinish('fail');
      }
    }
  };

  return (
    <div className="minigame" data-minigame="onestroke">
      <header className="minigame-head">
        <span>구역 순찰 — 모든 칸을 한 번씩 지나 끝 지점까지 ({trail.length}/{total})</span>
        <span className="minigame-clock">{Math.ceil(remaining / 1000)}</span>
      </header>
      <div
        className="minigame-board"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${board.size}, 44px)`, gap: 2, justifyContent: 'center' }}
      >
        {Array.from({ length: total }, (_, i) => {
          const r = Math.floor(i / board.size);
          const c = i % board.size;
          const k = cellKey(r, c);
          const isHead = head[0] === r && head[1] === c;
          const isVisited = visited.has(k);
          const isPrev = trail.length >= 2 && cellKey(...trail[trail.length - 2]) === k;
          const canStep = !isVisited && isAdjacent(head, [r, c]);
          const isStart = board.start[0] === r && board.start[1] === c;
          const isEnd = board.end[0] === r && board.end[1] === c;
          return (
            <button
              key={k}
              aria-label={`순찰 ${r + 1}행 ${c + 1}열`}
              disabled={!canStep && !isPrev}
              style={{
                width: 44,
                height: 44,
                background: isHead
                  ? 'currentColor'
                  : isVisited
                    ? 'rgba(127,127,127,.45)'
                    : canStep
                      ? 'rgba(127,127,127,.28)'
                      : 'rgba(127,127,127,.14)',
                outline: canStep ? '1.5px solid currentColor' : 'none',
              }}
              onClick={() => step(r, c)}
            >
              {isStart && !isHead ? '시' : isEnd ? '끝' : ''}
            </button>
          );
        })}
      </div>
      <p className="minigame-note" style={{ textAlign: 'center', margin: '6px 0 0' }}>
        직전 칸을 누르면 한 걸음 무릅니다. 막다른 길, 이른 도착은 그 자리에서 순찰 실패입니다.
      </p>
    </div>
  );
}
