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
import { RATING_LABELS } from '../core/calendar';
import { MINIGAME_TIME_COST, selectVariant } from '../core/reducer';
import type { Action, GameState, WorkOrder, ZoneMap as ZoneMapDef } from '../core/schema';
import { KindIcon } from './face-icons';
import { PagedCopy } from './paged-copy';
import { KIND_LABELS, timeCostLabel } from './ui-labels';
import { ZoneMap } from './zone-map';

interface FieldStageProps {
  state: GameState;
  zoneMap: ZoneMapDef | null;
  disabled: boolean;
  onAction: (action: Action) => void;
  /** 작업 개시 — 미니게임(최초 소각 카드라면 선행 조우부터)으로 넘어간다. 배선은 GameClient */
  onStartWork?: (orderIndex: number) => void;
  /** field 단계가 아닐 때는 조작할 수 없다 — 뒤에 남아 있되 살아 있지는 않다 */
  active: boolean;
  /** 최근 기록 한 줄 — 지도 하단 띠. 열람 열의 세로 예산을 잠식하지 않는 자리다 */
  log?: string[];
}

function OrderPanel({
  order,
  orderIndex,
  state,
  siteLabel,
  locked,
  onStartWork,
}: {
  order: WorkOrder;
  orderIndex: number;
  state: GameState;
  siteLabel: string;
  locked: boolean;
  onStartWork?: (orderIndex: number) => void;
}) {
  return (
    <article className={`document order-open${order.resolved ? ' is-resolved' : ''}`}>
      <header className="document-header">
        <span>
          <KindIcon className="header-icon" kind={order.kind} />
          {KIND_LABELS[order.kind]}
        </span>
        <span>{siteLabel}</span>
      </header>
      <p className="order-code">{order.templateId}</p>
      <h3>{selectVariant(state, order.title)}</h3>
      {/* 처리 완료 문서는 이미 읽은 것 — 재열람에 분절 진행을 다시 시키지 않는다 */}
      <PagedCopy state={state} body={order.body} revealAll={order.resolved}>
        <div className="choices">
          {/* 카드 리뉴얼: 처리 = 미니게임. 선택지는 없고, 열어서 읽고, 작업을 개시한다 */}
          {order.resolved ? null : (
            <button
              disabled={locked || MINIGAME_TIME_COST > state.world.shiftLeft}
              onClick={() => onStartWork?.(orderIndex)}
            >
              <span>작업 개시</span>
              <small>{timeCostLabel(MINIGAME_TIME_COST)}</small>
            </button>
          )}
        </div>
      </PagedCopy>
      {order.resolved && order.outcome ? (
        <span className="resolved-stamp">{RATING_LABELS[order.outcome]}</span>
      ) : null}
    </article>
  );
}

export function FieldStage({ state, zoneMap, disabled, onAction, onStartWork, active, log = [] }: FieldStageProps) {
  const orders = state.world.pendingOrders;
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // (구) 세로 쌓임 레이아웃의 scrollIntoView는 셸 잠금과 함께 제거 —
  // 지도와 열람 패널은 이제 어떤 폭에서도 나란히 있고, 스크롤 자체가 없다

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
                <KindIcon className="site-icon" kind={order.kind} />
                {selectVariant(state, order.title)}
              </button>
            </li>
          ))}
        </ul>
      )}

      {log.length > 0 ? (
        <aside className="transmission" aria-live="polite">
          <span>최근 기록</span>
          <p>{log.join(' ')}</p>
        </aside>
      ) : null}

      <div className="reading-slot">
        {open ? (
          <OrderPanel
            key={open.templateId}
            locked={locked}
            onStartWork={onStartWork}
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
