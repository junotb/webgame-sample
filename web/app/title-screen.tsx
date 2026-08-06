'use client';

/**
 * L0 타이틀 — 게임 밖의 화면 (UI 층위 사양 §2).
 *
 * 제목은 여기에만 있다. 근무 중에 상단 띠가 제목을 이고 있으면 그것이 화면의
 * 무게 중심이 되는데, 정작 눌러야 할 것은 아래에 있다.
 * 세이브 확인도 여기서 흡수한다 — 근무 화면 구석에서 깜빡일 일이 아니다.
 */
import { useState } from 'react';
import type { GameState } from '../core/schema';
import { WEEKDAY_LABELS } from './ui-labels';

interface TitleScreenProps {
  /** 복원된 세이브. null이면 이어할 것이 없다 */
  saved: GameState | null;
  loading: boolean;
  error: string | null;
  onContinue: () => void;
  onNewGame: () => void;
}

function savedLabel(saved: GameState): string {
  const { day, weekday } = saved.world.calendar;
  return `Day ${String(day).padStart(2, '0')} · ${WEEKDAY_LABELS[weekday] ?? ''}`;
}

export function TitleScreen({ saved, loading, error, onContinue, onNewGame }: TitleScreenProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <main className="title-screen">
      <div className="title-block">
        <h1>내일도 난 여기에</h1>
        <p className="title-sub">STILL HERE TOMORROW</p>
      </div>

      {loading ? (
        <p className="title-status">세이브 확인 중…</p>
      ) : (
        <nav className="title-menu">
          {saved ? (
            <button className="title-action" onClick={onContinue}>
              <span>이어하기</span>
              <small>{savedLabel(saved)}</small>
            </button>
          ) : null}

          {confirming ? (
            <div className="title-confirm" role="group" aria-label="새 근무 확인">
              <p>기록된 근무 일지를 덮어씁니다.</p>
              <button className="title-action" onClick={onNewGame}>
                <span>덮어쓰고 시작</span>
              </button>
              <button className="title-back" onClick={() => setConfirming(false)}>
                돌아가기
              </button>
            </div>
          ) : (
            <button
              className="title-action"
              onClick={() => (saved ? setConfirming(true) : onNewGame())}
            >
              <span>새 근무</span>
            </button>
          )}
        </nav>
      )}

      {error ? <p className="title-status is-error">{error}</p> : null}
    </main>
  );
}
