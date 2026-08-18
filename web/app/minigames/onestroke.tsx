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
// 판 위의 말·장애물이다 — 아이콘 어휘(카드 4종 1:1) 밖 (system-rules "아이콘")
import Walk from '../../assets/icons/game-icons.net/delapouite/walk.svg';
import Barricade from '../../assets/icons/game-icons.net/delapouite/barricade.svg';

const TOTAL_MS = 30000;

// 소각 미니게임과 같은 계열 — 녹청(구역 바닥) / 녹슨 적갈(지나온 자취·경고)
const GROUND = 'rgba(51, 75, 66, .28)';
const GROUND_DIM = 'rgba(51, 75, 66, .14)';
const TRAIL = 'rgba(140, 62, 47, .42)';
const HEAD_BG = 'rgba(140, 62, 47, .65)';
const INK = 'rgb(232, 226, 218)';
const RUST = 'rgb(140, 62, 47)';

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
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: GROUND_DIM,
                }}
              >
                <Barricade aria-hidden="true" width={36} height={36} style={{ color: RUST }} />
              </span>
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
                // 클릭 가능 칸은 별도 표시하지 않는다 — 통행 칸은 모두 같은 바닥색.
                // 전역 button:disabled의 흐림(opacity .48)도 대비로 가능 칸을 드러내므로 무효화
                background: isHead ? HEAD_BG : isVisited ? TRAIL : GROUND,
                opacity: 1,
              }}
              onClick={() => step(r, c)}
            >
              {isHead ? (
                <Walk aria-hidden="true" width={36} height={36} style={{ verticalAlign: 'middle', color: INK }} />
              ) : isStart ? (
                '시'
              ) : isEnd ? (
                '끝'
              ) : (
                ''
              )}
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
