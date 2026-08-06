'use client';

/**
 * L1 무대 — `field` 단계에서 실제로 일하는 화면 (UI 층위 사양 §3).
 * 오버레이가 아니라 상시 존재하는 바닥이다: 다른 단계에서도 뒤에 남아 있다.
 *
 * 현재는 지시서 카드 그리드. 구역 지도 + 호버 열람 패널로 교체 예정(사양 §10-5)이며,
 * 그때 이 파일만 갈아끼우면 되도록 셸과의 접점을 props로 좁혀 두었다.
 */
import type { Action, GameState } from '../core/schema';
import { checkLabel, FACE_LABELS, ZONE_LABELS } from './ui-labels';
import { selectVariant } from '../core/reducer';

interface FieldStageProps {
  state: GameState;
  disabled: boolean;
  onAction: (action: Action) => void;
  onStartEncounter?: (orderIndex: number, encounterId: string) => void;
  /** field 단계가 아닐 때는 조작할 수 없다 — 뒤에 남아 있되 살아 있지는 않다 */
  active: boolean;
}

export function FieldStage({ state, disabled, onAction, onStartEncounter, active }: FieldStageProps) {
  const orders = state.world.pendingOrders;
  if (orders.length === 0) {
    return <p className="empty-notice">발부된 지시서가 없습니다.</p>;
  }
  const locked = disabled || !active;
  return (
    <section className="document-stack" aria-label="처리 대기 지시서">
      <div className="orders-grid">
        {orders.map((order, orderIndex) => (
          <article className={`document order-card${order.resolved ? ' is-resolved' : ''}`} key={`${order.templateId}-${order.zone}`}>
            <header className="document-header">
              <span>{FACE_LABELS[order.face]} {String(orderIndex + 1).padStart(2, '0')}</span>
              <span>{ZONE_LABELS[order.zone]}</span>
            </header>
            <p className="order-code">
              {order.templateId} · 난이도 보정 +{order.difficultyBonus}
            </p>
            <h3>{order.title}</h3>
            <p className="document-copy">{selectVariant(state, order.body)}</p>
            <div className="choices">
              {order.options.map((option, optionIndex) => (
                <button
                  disabled={locked || order.resolved || option.timeCost > state.world.shiftLeft}
                  key={`${option.label}-${optionIndex}`}
                  onClick={() =>
                    option.startsEncounter
                      ? onStartEncounter?.(orderIndex, option.startsEncounter)
                      : onAction({ type: 'RESOLVE_ORDER', orderIndex, optionIndex })
                  }
                >
                  <span>{option.label}</span>
                  <small>{option.startsEncounter ? '현장 확인' : checkLabel(option.check, state.self)} · 근무 {option.timeCost}</small>
                </button>
              ))}
            </div>
            {order.resolved ? <span className="resolved-stamp">처리 완료</span> : null}
          </article>
        ))}
      </div>
      {active ? (
        <button className="text-action" disabled={disabled} onClick={() => onAction({ type: 'SKIP_TO_EVENT' })}>
          현장 업무 종료 →
        </button>
      ) : null}
    </section>
  );
}
