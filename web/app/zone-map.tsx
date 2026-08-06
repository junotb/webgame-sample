'use client';

/**
 * 배치 구역의 시설 배치도 (UI 층위 사양 §3).
 *
 * 도시 광역도가 아니다 — 1주차는 한 구역 고정이라 광역도를 띄우면 마커가 한 점에 겹친다.
 * 톤은 조직의 도면이다: 지형·풍경이 아니라 배치도. 표면 층의 언어를 지킨다.
 *
 * **지도는 노후도를 시각화하지 않는다.** 마커는 상태에 반응해 변하지 않으며
 * (CLAUDE.md 아이콘 규칙), 유일한 상태 표현은 처리 완료 도장이다.
 */
import { useRef } from 'react';
import type { WorkOrder, ZoneMap as ZoneMapDef } from '../core/schema';
import { FaceIcon } from './face-icons';

/** 포인터가 지나가다 여는 것을 막는 지연. 키보드·터치에는 걸지 않는다 */
const HOVER_DELAY_MS = 120;

interface ZoneMapProps {
  map: ZoneMapDef;
  orders: WorkOrder[];
  openIndex: number | null;
  onOpen: (index: number) => void;
}

export function ZoneMap({ map, orders, openIndex, onOpen }: ZoneMapProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelPending() {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function openAfterDelay(index: number) {
    cancelPending();
    timer.current = setTimeout(() => onOpen(index), HOVER_DELAY_MS);
  }

  /** 지점을 찾지 못한 지시서는 지도 밖에 두지 않는다 — 검증기가 막지만 런타임도 버틴다 */
  const placed = orders.map((order, index) => ({
    order,
    index,
    site: map.sites.find((s) => s.id === order.siteId),
  }));

  return (
    <div className="zone-map" aria-label={map.title}>
      <p className="zone-map-title">{map.title}</p>
      <div className="zone-map-plan">
        <svg aria-hidden="true" className="zone-map-grid" preserveAspectRatio="none" viewBox="0 0 100 100">
          {[20, 40, 60, 80].map((n) => (
            <g key={n}>
              <line x1={n} x2={n} y1="0" y2="100" />
              <line x1="0" x2="100" y1={n} y2={n} />
            </g>
          ))}
        </svg>

        <ul className="zone-map-sites">
          {placed.map(({ order, index, site }) =>
            site ? (
              <li key={order.templateId} style={{ left: `${site.x}%`, top: `${site.y}%` }}>
                <button
                  aria-current={openIndex === index}
                  className={`site-marker${order.resolved ? ' is-resolved' : ''}`}
                  onClick={() => {
                    cancelPending();
                    onOpen(index);
                  }}
                  onFocus={() => {
                    cancelPending();
                    onOpen(index);
                  }}
                  onPointerEnter={() => openAfterDelay(index)}
                  onPointerLeave={cancelPending}
                  type="button"
                >
                  <FaceIcon className="site-icon" face={order.face} />
                  <span className="site-label">{site.label}</span>
                  {order.resolved ? <span className="site-stamp" aria-label="처리 완료" /> : null}
                </button>
              </li>
            ) : null,
          )}
        </ul>
      </div>
    </div>
  );
}
