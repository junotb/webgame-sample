'use client';

/**
 * L2 참조 패널 — 도시 운용 원장 (UI 층위 사양 §4).
 * 상시 노출이 아니라 플레이어가 여는 패널이다. 상시로 보이는 수치는 상단 띠의 잔여 근무뿐.
 */
import { BAND_NAMES, bandOf } from '../core/calendar';
import { SHIFT_PER_DAY, SKILL_LABELS, STAT_LABELS } from '../core/reducer';
import type { GameState, ZoneId } from '../core/schema';
import { ZONE_LABELS } from './ui-labels';

export function LedgerPanel({ state }: { state: GameState }) {
  const menace = state.world.menace;
  return (
    <section className="ledger" aria-label="도시 운용 원장">
      <div className="ledger-heading">
        <span>도시 운용 원장</span>
        <span className="ledger-code">FORM 0-A</span>
      </div>
      <dl className="ledger-grid">
        <div>
          <dt>잔여 근무</dt>
          <dd>{state.world.shiftLeft} / {SHIFT_PER_DAY}</dd>
        </div>
        <div>
          <dt>기억</dt>
          <dd>{state.self.memory} / 7</dd>
        </div>
        <div>
          <dt>신뢰</dt>
          <dd>{state.world.npcs.protagonist.trust} / 7</dd>
        </div>
      </dl>
      <div className="stat-row" aria-label="주 스탯">
        {(Object.keys(STAT_LABELS) as (keyof typeof STAT_LABELS)[]).map((stat) => (
          <span key={stat}>{STAT_LABELS[stat]} <b>{state.self.stats[stat]}</b></span>
        ))}
      </div>
      <div className="stat-row" aria-label="전문 기술">
        {(Object.keys(SKILL_LABELS) as (keyof typeof SKILL_LABELS)[]).map((skill) => (
          <span key={skill}>{SKILL_LABELS[skill]} <b>{state.self.skills[skill]}등급</b></span>
        ))}
      </div>
      {state.world.multiday ? (
        <div className="multiday-row" aria-label="일정 점유">
          <span>승인 일정 진행 중 — 잔여 {state.world.multiday.daysLeft}일</span>
        </div>
      ) : null}
      <div className="menace-row" aria-label="위협 수치">
        <span>피로 <b>{menace.fatigue}</b></span>
        <span>주목 <b>{menace.scrutiny}</b></span>
        <span>동요 <b>{menace.unrest}</b></span>
      </div>
      {/*
        노후도는 밴드만 보인다 (v3 §9의 유일한 비공개 항목).
        이전 구현은 `노후 5`처럼 수치를 그대로 노출하고 있었다 — 방어선 위반이라 여기서 접는다.
      */}
      <div className="zone-row" aria-label="구역 상태">
        {(Object.entries(state.world.zones) as [ZoneId, { decay: number }][]).map(([zone, value]) => (
          <span key={zone}>{ZONE_LABELS[zone]} {BAND_NAMES[bandOf(value.decay)]}</span>
        ))}
      </div>
    </section>
  );
}
