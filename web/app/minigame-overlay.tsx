'use client';

/**
 * L3 오버레이 — 카드 처리의 뒷부분: 미니게임 → 결과 반영 산문 (인터랙션 순서 확정).
 * 산문은 반드시 미니게임 뒤에 온다. 결과가 산문을 바꾼다 (성적 3변형).
 * 성적 반입(RESOLVE_MINIGAME)은 미니게임이 끝나는 순간 일어나고,
 * 산문을 읽고 나서야 오버레이가 닫힌다 — 읽지 않고는 다음 카드로 갈 수 없다.
 */
import { useState } from 'react';
import type { MinigameSession } from '../core/minigame';
import type { GameState, MinigameResult, WorkOrder } from '../core/schema';
import { MinigameShell } from './minigame-shell';
import { PagedCopy } from './paged-copy';

interface MinigameOverlayProps {
  order: WorkOrder;
  state: GameState;
  session: MinigameSession;
  /** 미니게임 종료 즉시 호출 — RESOLVE_MINIGAME 반입 (성적 귀속) */
  onResolve: (result: MinigameResult) => void;
  /** 결과 산문을 읽은 뒤 — 오버레이를 걷는다 */
  onClose: () => void;
  disabled?: boolean;
}

export function MinigameOverlay({ order, state, session, onResolve, onClose, disabled }: MinigameOverlayProps) {
  const [result, setResult] = useState<MinigameResult | null>(null);

  if (result === null) {
    return (
      <section className="document minigame-overlay" aria-label="작업 진행">
        <MinigameShell
          session={session}
          onFinish={(r) => {
            setResult(r);
            onResolve(r);
          }}
        />
      </section>
    );
  }

  return (
    <section className="document minigame-overlay" aria-label="작업 결과">
      {/* 현장 묘사(노후도 축) 문단과 보고 문구(기억 축) 문단이 분리된 채 내려온다 */}
      <PagedCopy state={state} body={order.resultProse[result]}>
        <div className="choices">
          <button disabled={disabled} onClick={onClose}>
            업무 기록 제출
          </button>
        </div>
      </PagedCopy>
    </section>
  );
}
