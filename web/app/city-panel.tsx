'use client';

/**
 * L2 참조 패널 — 도시 상태 (UI 층위 사양 §4).
 *
 * 구 「도시 운용 원장」의 다른 한쪽. 도시와 조직에 관한 것만:
 * 구역 밴드, 주목(조직이 나를), 동요(도시가), 신뢰(그 사람과), 일정 점유.
 * 피로는 내 몸의 것이라 「내 능력치」로 갔다 — 메나스 삼각이 두 창으로 갈라지지만,
 * 나/조직/도시라는 축 자체가 그 경계다.
 */
import { BAND_NAMES, bandOf } from '../core/calendar';
import type { GameState, ZoneId } from '../core/schema';
import { ZONE_LABELS } from './ui-labels';

export function CityPanel({ state }: { state: GameState }) {
  const menace = state.world.menace;
  return (
    <section className="ledger" aria-label="도시 상태">
      <div className="ledger-heading">
        <span>도시 상태</span>
        <span className="ledger-code">FORM 0-A</span>
      </div>
      {/* 정체는 밴드만 보인다 (v3 §9의 유일한 비공개 항목) */}
      <dl className="ledger-grid" aria-label="구역 상태">
        {(Object.entries(state.world.zones) as [ZoneId, { stagnation: number }][]).map(([zone, value]) => (
          <div key={zone}>
            <dt>{ZONE_LABELS[zone]}</dt>
            <dd>{BAND_NAMES[bandOf(value.stagnation)]}</dd>
          </div>
        ))}
      </dl>
      <div className="menace-row" aria-label="위협 수치">
        <span>주목 <b>{menace.scrutiny}</b></span>
        <span>동요 <b>{menace.unrest}</b></span>
        <span>신뢰 <b>{state.world.npcs.returned.trust}</b></span>
      </div>
      {state.world.multiday ? (
        <div className="multiday-row" aria-label="일정 점유">
          <span>승인 일정 진행 중 — 잔여 {state.world.multiday.daysLeft}일</span>
        </div>
      ) : null}
    </section>
  );
}
