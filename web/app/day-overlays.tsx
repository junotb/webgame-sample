'use client';

/**
 * L3 진행 오버레이 — 게임(흐름)이 여는 층 (UI 층위 사양 §5).
 * 하루의 마디마다 무대를 덮고, 확정하면 물러난다. 뒤의 L1은 사라지지 않는다.
 */
import { evalConditions, selectVariant } from '../core/reducer';
import type { Action, ContentBundle, GameState } from '../core/schema';
import { checkLabel } from './ui-labels';

interface OverlayProps {
  state: GameState;
  disabled: boolean;
  onAction: (action: Action) => void;
}

export function MorningOverlay({ disabled, onAction }: Omit<OverlayProps, 'state'>) {
  return (
    <article className="document document-featured">
      <header className="document-header">
        <span>중앙 시설국 · 일일 배부</span>
        <span>승인 대기</span>
      </header>
      <p className="eyebrow">MORNING BRIEF</p>
      <h2>업무 개시 보고</h2>
      <p className="document-copy">
        야간 관측 기록을 취합했습니다. 담당 구역의 지시서를 발부하면 오늘 처리할 건을 선택하십시오.
        미처리 건은 익일 재발부됩니다.
      </p>
      <button className="primary-action" disabled={disabled} onClick={() => onAction({ type: 'START_DAY' })}>
        오늘 업무 시작
      </button>
    </article>
  );
}

export function EventOverlay({ state, content, disabled, onAction }: OverlayProps & { content: ContentBundle }) {
  const storylet = content.storylets.find((item) => evalConditions(state, item.requirements));
  if (!storylet) {
    return <p className="empty-notice">오늘 보고된 특이 사항이 없습니다.</p>;
  }

  return (
    <article className="document event-document">
      <header className="document-header">
        <span>비정규 접촉 기록</span>
        <span>{storylet.id}</span>
      </header>
      <p className="eyebrow">INCIDENT MEMO</p>
      <h2>특이 사항 면담록</h2>
      <p className="document-copy narrative">{selectVariant(state, storylet.body)}</p>
      <div className="choices event-choices">
        {storylet.choices.map((choice, choiceIndex) => (
          <button
            disabled={disabled}
            key={`${choice.label}-${choiceIndex}`}
            onClick={() => onAction({ type: 'CHOOSE_STORYLET', storyletId: storylet.id, choiceIndex })}
          >
            <span>{choice.label}</span>
            <small>{choice.startsMultiday ? `${choice.startsMultiday.days}일 일정` : checkLabel(choice.check, state.self)}</small>
          </button>
        ))}
      </div>
    </article>
  );
}

export function ClosingOverlay({ state, log, disabled, onAction }: OverlayProps & { log: string[] }) {
  const unresolved = state.world.pendingOrders.filter((order) => !order.resolved);
  return (
    <article className="document closing-document">
      <header className="document-header">
        <span>중앙 시설국 · 일일 결산</span>
        <span>DAY {String(state.world.calendar.day).padStart(2, '0')}</span>
      </header>
      <p className="eyebrow">CLOSING REPORT</p>
      <h2>하루 정산 보고</h2>
      {log.length > 0 ? <p className="result-log">{log.join(' ')}</p> : null}
      <dl className="report-lines">
        <div><dt>처리 완료</dt><dd>{state.world.pendingOrders.length - unresolved.length}건</dd></div>
        <div><dt>미처리 이월</dt><dd>{unresolved.length}건</dd></div>
      </dl>
      <p className="document-note">확정 시 미처리 건의 방치와 자연 노후가 구역에 반영됩니다.</p>
      <button className="primary-action" disabled={disabled} onClick={() => onAction({ type: 'CLOSE_DAY' })}>
        정산 확정 및 저장
      </button>
    </article>
  );
}
