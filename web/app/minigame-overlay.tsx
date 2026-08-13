'use client';

/**
 * L3 오버레이 — 카드 처리의 뒷부분: 미니게임 → 결과 반영 산문 (인터랙션 순서 확정).
 * 미니게임은 지시서 카드(문서 스킨) **안에서** 벌어진다 — 게임이 떠 있는 별도 화면이
 * 아니라, 열어 둔 지시서 위에서 일을 하는 것이다 (2026-08-11 UI 정비).
 * 산문은 반드시 미니게임 뒤에 온다. 결과가 산문을 바꾼다 (성적 3변형).
 * 성적 반입(RESOLVE_MINIGAME)은 미니게임이 끝나는 순간 일어나고,
 * 산문을 읽고 나서야 오버레이가 닫힌다 — 읽지 않고는 다음 카드로 갈 수 없다.
 */
import { useState } from 'react';
import { RATING_LABELS } from '../core/calendar';
import { gradeOf, type MinigameSession } from '../core/minigame';
import { selectVariant } from '../core/reducer';
import type { GameState, MinigameResult, WorkOrder } from '../core/schema';
import { KindIcon } from './face-icons';
import { MinigameShell } from './minigame-shell';
import { PagedCopy } from './paged-copy';
import { KIND_LABELS } from './ui-labels';

/** 결과의 현장 언어 — 성적이 산문보다 먼저 잡힌다 (좋았는지 나빴는지를 화면이 말한다) */
const RESULT_LABELS: Record<MinigameResult, string> = {
  complete: '완수',
  partial: '부분 완수',
  fail: '미완',
};

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

  return (
    <article className="document minigame-overlay" aria-label={result === null ? '작업 진행' : '작업 결과'}>
      <header className="document-header">
        <span>
          <KindIcon className="header-icon" kind={order.kind} />
          {KIND_LABELS[order.kind]}
        </span>
        <span>{result === null ? '작업 중' : `작업 결과 — ${RESULT_LABELS[result]}`}</span>
      </header>
      <p className="order-code">{order.templateId}</p>
      <h3>{selectVariant(state, order.title)}</h3>

      {result === null ? (
        <MinigameShell
          session={session}
          onFinish={(r) => {
            setResult(r);
            onResolve(r);
          }}
        />
      ) : (
        <>
          {/* 현장 묘사(정체 축) 문단과 보고 문구(기억 축) 문단이 분리된 채 내려온다 */}
          <PagedCopy state={state} body={order.resultProse[result]}>
            <div className="choices">
              <button disabled={disabled} onClick={onClose}>
                업무 기록 제출
              </button>
            </div>
          </PagedCopy>
          {/* 조직의 도장 — 현장 언어(헤더)와 같은 화면에서 3등급으로 번역된다 */}
          <span className="resolved-stamp">{RATING_LABELS[gradeOf(result)]}</span>
        </>
      )}
    </article>
  );
}
