'use client';

/**
 * L1 무대 — `field` 단계에서 실제로 일하는 화면 (UI 층위 사양 §3).
 * 오버레이가 아니라 상시 존재하는 바닥이다: 다른 단계에서도 뒤에 남아 있다.
 *
 * 구역 지도(왼쪽) + 열람 패널(오른쪽). 마커를 가리키면 그 지시서가 패널에 열린다.
 *
 * 패널은 툴팁이 아니라 **고정 슬롯**이다. 마커 옆에 붙이면 위치가 마커마다 흔들리고
 * 산문이 들어갈 자리가 없다. 그리고 마우스가 마커를 떠나도 카드는 남는다 —
 * 그러지 않으면 마커에서 선택지 버튼으로 커서를 옮기는 동안 닫힌다.
 *
 * 한 번에 하나만 보이는 것이 핵심이다. 예전처럼 4장이 나란히 펼쳐지면
 * 비교·스캔이 되고 산문은 읽히지 않는다 (v3 §4).
 */
import { useState } from 'react';
import { selectVariant } from '../core/reducer';
import type { Action, GameState, WorkOrder, ZoneMap as ZoneMapDef } from '../core/schema';
import { FaceIcon } from './face-icons';
import { checkLabel, FACE_LABELS } from './ui-labels';
import { ZoneMap } from './zone-map';

interface FieldStageProps {
  state: GameState;
  zoneMap: ZoneMapDef | null;
  disabled: boolean;
  onAction: (action: Action) => void;
  onStartEncounter?: (orderIndex: number, encounterId: string) => void;
  /** field 단계가 아닐 때는 조작할 수 없다 — 뒤에 남아 있되 살아 있지는 않다 */
  active: boolean;
}

function OrderPanel({
  order,
  orderIndex,
  state,
  siteLabel,
  locked,
  onAction,
  onStartEncounter,
}: {
  order: WorkOrder;
  orderIndex: number;
  state: GameState;
  siteLabel: string;
  locked: boolean;
  onAction: (action: Action) => void;
  onStartEncounter?: (orderIndex: number, encounterId: string) => void;
}) {
  return (
    <article className={`document order-open${order.resolved ? ' is-resolved' : ''}`}>
      <header className="document-header">
        <span>
          <FaceIcon className="header-icon" face={order.face} />
          {FACE_LABELS[order.face]}
        </span>
        <span>{siteLabel}</span>
      </header>
      <p className="order-code">{order.templateId}</p>
      <h3>{selectVariant(state, order.title)}</h3>
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
            <small>
              {option.startsEncounter ? '현장 확인' : checkLabel(option.check, state.self)} · 근무 {option.timeCost}
            </small>
          </button>
        ))}
      </div>
      {order.resolved ? <span className="resolved-stamp">처리 완료</span> : null}
    </article>
  );
}

export function FieldStage({ state, zoneMap, disabled, onAction, onStartEncounter, active }: FieldStageProps) {
  const orders = state.world.pendingOrders;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (orders.length === 0) {
    return <p className="empty-notice">발부된 지시서가 없습니다.</p>;
  }

  const locked = disabled || !active;
  // 처리로 목록이 줄어드는 일은 없지만, 열어 둔 자리가 범위를 벗어나면 닫는다
  const open = openIndex !== null && openIndex < orders.length ? orders[openIndex] : null;
  const openSite = open ? zoneMap?.sites.find((s) => s.id === open.siteId) : undefined;

  return (
    <section className="field" aria-label="처리 대기 지시서">
      {zoneMap ? (
        <ZoneMap map={zoneMap} orders={orders} openIndex={openIndex} onOpen={setOpenIndex} />
      ) : (
        // 도면이 없는 구역 — 검증기가 막지만 런타임이 멈추지는 않게 한다
        <ul className="zone-map-fallback" aria-label="지시서 목록">
          {orders.map((order, index) => (
            <li key={order.templateId}>
              <button onClick={() => setOpenIndex(index)} onFocus={() => setOpenIndex(index)}>
                <FaceIcon className="site-icon" face={order.face} />
                {selectVariant(state, order.title)}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="reading-slot">
        {open ? (
          <OrderPanel
            key={open.templateId}
            locked={locked}
            onAction={onAction}
            onStartEncounter={onStartEncounter}
            order={open}
            orderIndex={openIndex!}
            siteLabel={openSite?.label ?? ''}
            state={state}
          />
        ) : (
          <p className="empty-notice reading-empty">가리킨 지점의 지시서가 여기 열립니다.</p>
        )}
      </div>

      {active ? (
        <button className="text-action" disabled={disabled} onClick={() => onAction({ type: 'SKIP_TO_EVENT' })}>
          현장 업무 종료 →
        </button>
      ) : null}
    </section>
  );
}
