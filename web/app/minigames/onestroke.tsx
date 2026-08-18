'use client';

/**
 * 순찰 경로 (구역 순찰) — 시작 지점에서 끝 지점까지, 지났던 칸을 다시 밟지 않고
 * 장애물을 제외한 모든 통행 칸을 지나면 완수, 끝 도달만 하면 부분.
 * 인접 칸을 눌러 나아가고, 직전 칸을 누르면 한 걸음 무른다.
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

  const total = board.path.length;
  const visited = new Set(trail.map((cell) => cellKey(...cell)));
  const head = trail[trail.length - 1];

  const finish = (cells: number, reachedEnd: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish(gradePatrol(cells, total, reachedEnd));
  };

  // 시간 만료 — 끝 도달은 그 즉시 종료되므로 여기 왔다는 건 미도달이다
  const remaining = useCountdown(TOTAL_MS, () => finish(trail.length, false));

  const step = (r: number, c: number) => {
    const k = cellKey(r, c);
    // 직전 칸 = 한 걸음 무르기 (판정 전 한정 — 잘못 들어선 뒤에는 무를 수 없다)
    if (trail.length >= 2 && cellKey(...trail[trail.length - 2]) === k) {
      setTrail(trail.slice(0, -1));
      return;
    }
    if (visited.has(k) || board.obstacles.has(k) || !isAdjacent(head, [r, c])) return;
    const next = [...trail, [r, c] as [number, number]];
    setTrail(next);
    // 즉시 판정 — 끝 도달은 그 자리에서 종료: 전 칸이면 완수, 남았으면 부분.
    // 끝이 아닌 막다른 길(deadEnd)은 실패
    const verdict = judgeStep(board, next);
    if (verdict === 'complete' || verdict === 'earlyEnd') finish(next.length, true);
    else if (verdict === 'deadEnd') finish(next.length, false);
  };

  return (
    <div className="minigame" data-minigame="onestroke">
      <header className="minigame-head">
        <span>구역 순찰 — 막힌 곳을 피해 모든 칸을 지나 끝 지점까지 ({trail.length}/{total})</span>
        <span className="minigame-clock">{Math.ceil(remaining / 1000)}</span>
      </header>
      <div
        className="minigame-board"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${board.cols}, 44px)`, gap: 2, justifyContent: 'center' }}
      >
        {Array.from({ length: board.rows * board.cols }, (_, i) => {
          const r = Math.floor(i / board.cols);
          const c = i % board.cols;
          const k = cellKey(r, c);
          if (board.obstacles.has(k)) {
            return (
              <span
                key={k}
                aria-label={`순찰 ${r + 1}행 ${c + 1}열 — 막힘`}
                style={{
                  width: 44,
                  height: 44,
                  display: 'inline-block',
                  background:
                    'repeating-linear-gradient(45deg, rgba(127,127,127,.5) 0 6px, rgba(127,127,127,.2) 6px 12px)',
                }}
              />
            );
          }
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
        직전 칸을 누르면 한 걸음 무릅니다. 끝에 닿는 순간 순찰이 끝납니다 — 빠뜨린 칸은 돌아오지 않습니다.
      </p>
    </div>
  );
}
