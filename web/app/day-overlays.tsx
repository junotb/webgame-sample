'use client';

/**
 * L3 진행 오버레이 — 게임(흐름)이 여는 층 (UI 층위 사양 §5).
 * 하루의 마디마다 무대를 덮고, 확정하면 물러난다. 뒤의 L1은 사라지지 않는다.
 */
import { evalConditions, selectVariant } from '../core/reducer';
import type { Action, ContentBundle, GameState } from '../core/schema';
import { checkLabel, WEEKDAY_FULL, ZONE_LABELS } from './ui-labels';

interface OverlayProps {
  state: GameState;
  disabled: boolean;
  onAction: (action: Action) => void;
}

/**
 * 일일 개시 — 하루의 시작에 한 번만 크게 (사양 §5).
 * 이후 날짜는 상단 띠의 작은 칩으로만 남는다.
 *
 * 발부 건수는 말하지 않는다. START_DAY 전이라 아직 생성되지 않았고, 무엇보다
 * 화면이 미리 세어 주면 무대를 볼 이유가 준다 — 몇 건인지는 지시서가 놓인 것을 보고 안다.
 */
export function MorningOverlay({ state, disabled, onAction }: OverlayProps) {
  const { day, weekday } = state.world.calendar;
  return (
    <section className="day-open" aria-label="일일 개시">
      <p className="day-open-num">DAY {String(day).padStart(2, '0')}</p>
      <h2 className="day-open-weekday">{WEEKDAY_FULL[weekday] ?? ''}</h2>
      <p className="day-open-zone">{ZONE_LABELS[state.world.assignment.zone]}</p>
      {state.world.multiday ? (
        <p className="day-open-note">약속된 일정이 오늘 근무의 대부분을 가져간다.</p>
      ) : null}
      <button className="primary-action" disabled={disabled} onClick={() => onAction({ type: 'START_DAY' })}>
        업무 개시
      </button>
    </section>
  );
}

/**
 * 사무소 장면 — 일과를 마치고 돌아온 자리 (사양 §5).
 *
 * 이전 프레이밍(`비정규 접촉 기록` / `INCIDENT MEMO` / `특이 사항 면담록`)은
 * 사고 보고서 양식이라 "위험 경고가 시도 때도 없이 뜬다"로 읽혔다. 그러나 이 층은
 * v3 §5의 **필수 이벤트 = 진실에 도달하는 뼈대**이고 자주 나오는 것이 의도다.
 * 고칠 것은 빈도가 아니라 양식이었다. 사고 서식을 걷어내고 시간과 장소만 준다.
 *
 * 스토리렛 ID도 표시하지 않는다 — 문서 번호는 이것이 접수된 사건이라는 뜻이다.
 */
export function EventOverlay({ state, content, disabled, onAction }: OverlayProps & { content: ContentBundle }) {
  const storylet = content.storylets.find((item) => evalConditions(state, item.requirements));
  if (!storylet) {
    // 서사가 카드로 가면서(v3 §4 정정) 빈 저녁이 생겼다 — 조용히 하루를 닫는다
    return (
      <section className="day-open" aria-label="저녁">
        <p className="day-open-note">사무소에는 아무도 없었다.</p>
        <button className="primary-action" disabled={disabled} onClick={() => onAction({ type: 'SKIP_EVENT' })}>
          불을 끄고 정산으로
        </button>
      </section>
    );
  }

  return (
    <article className="document event-document">
      <header className="document-header">
        <span>{ZONE_LABELS[state.world.assignment.zone]} 사무소</span>
        <span>업무 종료 후</span>
      </header>
      <h2>일과 뒤</h2>
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
