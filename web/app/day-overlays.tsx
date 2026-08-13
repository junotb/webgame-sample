'use client';

/**
 * L3 진행 오버레이 — 게임(흐름)이 여는 층 (UI 층위 사양 §5).
 * 하루의 마디마다 무대를 덮고, 확정하면 물러난다. 뒤의 L1은 사라지지 않는다.
 */
import { RATING_LABELS, weekOf } from '../core/calendar';
import { evalConditions } from '../core/reducer';
import type { Action, ContentBundle, GameState } from '../core/schema';
import { OverlayShell } from './overlay-shell';
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
    <OverlayShell
      frame={[`${ZONE_LABELS[state.world.assignment.zone]} 사무소`, '업무 종료 후']}
      title="일과 뒤"
      state={state}
      body={storylet.body}
      className="event-document"
    >
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
    </OverlayShell>
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
        {/* 카드는 이월되지 않는다 (미결 더미 미채택) — '이월'은 거짓말이었다 */}
        <div><dt>미처리</dt><dd>{unresolved.length}건</dd></div>
      </dl>
      <p className="document-note">미처리 건의 방치와 자연 정체는 익일 구역에 반영됩니다.</p>
      {/* Confirm이 아니라 하루를 끝내는 행위다 — "업무 개시"와 대칭 (아침 오버레이) */}
      <button className="primary-action" disabled={disabled} onClick={() => onAction({ type: 'CLOSE_DAY' })}>
        퇴근한다
      </button>
    </article>
  );
}

/**
 * 주간 총평 장면 — 금요일 일과 종료 직후, 상사가 말로 전한다 (주간 마감 흐름 확정).
 * 통지서(문서)는 CLOSE_DAY에서 이미 발행·등록되었다. 여기는 장면이다 — 문서 스킨을 쓰지 않는다.
 */
export function DebriefOverlay({ state, content, disabled, onAction }: OverlayProps & { content: ContentBundle }) {
  const rating = state.world.weekRatings[weekOf(state.world.calendar.day)];
  const body = rating ? content.weeklyDebrief[rating] : [];
  return (
    <OverlayShell
      frame={[`${ZONE_LABELS[state.world.assignment.zone]} 사무소`, '금요일 · 업무 종료 후']}
      title="주간 총평"
      state={state}
      body={body}
      className="debrief-scene"
    >
      <button className="primary-action" disabled={disabled} onClick={() => onAction({ type: 'CONFIRM_DEBRIEF' })}>
        사무소를 나선다
      </button>
    </OverlayShell>
  );
}

/**
 * 주말 — 이틀 동안 매일 (빙결 학습 · 인물 3인) 중 택2 (주당 4슬롯).
 * 학습과 인물이 같은 슬롯을 경쟁한다: 무엇을 하지 않을지가 곧 선택이다.
 * 직전 선택의 장면 산문은 리듀서 로그로 온다 — 다음 선택지 위에 그대로 놓는다.
 */
export function WeekendOverlay({ state, content, log, disabled, onAction }: OverlayProps & { content: ContentBundle; log: string[] }) {
  const weekend = state.world.weekend;
  if (!weekend) return null;
  const { day, weekday } = state.world.calendar;
  return (
    <section className="day-open weekend-scene" aria-label="주말">
      <p className="day-open-num">DAY {String(day).padStart(2, '0')}</p>
      <h2 className="day-open-weekday">{WEEKDAY_FULL[weekday] ?? ''}</h2>
      {log.length > 0 ? (
        <div className="weekend-log narrative">
          {log.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      ) : null}
      <p className="day-open-note">오늘 남은 일: {weekend.slotsLeft}</p>
      <div className="choices weekend-choices">
        {content.weekendActivities.map((activity) => {
          const doneToday = weekend.doneToday.includes(activity.id);
          const spent = !activity.repeatable && weekend.done.includes(activity.id);
          return (
            <button
              key={activity.id}
              disabled={disabled || doneToday || spent}
              onClick={() => onAction({ type: 'CHOOSE_WEEKEND', activityId: activity.id })}
            >
              <span>{activity.label}</span>
              {spent || doneToday ? <small>다녀왔다</small> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/**
 * 엔딩 — 유임/해고 맺음 산문 → 종료 (주말 뒤에 닫힌다).
 * 재열람에 등록하지 않는다 (서류함 밖). 되돌아갈 버튼도 없다 — 종착 상태다.
 */
export function EndingOverlay({ state, content }: { state: GameState; content: ContentBundle }) {
  const ending = state.world.ending;
  const body = ending ? content.endings[ending] : [];
  const rating = state.world.weekRatings[weekOf(state.world.calendar.day)];
  return (
    <OverlayShell
      frame={['중앙 시설국', `주간 평가: ${rating ? RATING_LABELS[rating] : ''}`]}
      title={ending === 'fired' ? '배치 해제' : '배치 유지'}
      state={state}
      body={body}
      className="ending-scene"
    >
      <p className="document-note">— 1주차 기록 끝 —</p>
    </OverlayShell>
  );
}
