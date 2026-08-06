import { altitude, evalConditions, selectVariant, SHIFT_PER_DAY } from '../core/reducer';
import type { Action, ContentBundle, DayPhase, GameState } from '../core/schema';

export type SaveStatus = 'loading' | 'saving' | 'saved' | 'error';

interface GameViewProps {
  state: GameState;
  content: ContentBundle;
  log: string[];
  saveStatus: SaveStatus;
  onAction: (action: Action) => void;
  disabled?: boolean;
}

const PHASE_LABELS: Record<DayPhase, string> = {
  morning: '업무 개시',
  field: '현장 처리',
  event: '특이 사항',
  closing: '일일 정산',
};

const ZONE_LABELS = { d2: '제2구역', d5: '제5구역', d7: '제7구역' } as const;
const WEEKDAY_LABELS: Record<number, string> = { 1: '월', 2: '화', 3: '수', 4: '목', 5: '금' };
const SAVE_LABELS: Record<SaveStatus, string> = {
  loading: '세이브 확인 중',
  saving: '저장 중…',
  saved: '저장됨',
  error: '저장 확인 필요',
};

function StatusLedger({ state }: { state: GameState }) {
  const menace = state.world.menace;
  return (
    <aside className="ledger" aria-label="상태 원장">
      <div className="ledger-heading">
        <span>도시 운용 원장</span>
        <span className="ledger-code">FORM 0-A</span>
      </div>
      <dl className="ledger-grid">
        <div>
          <dt>도시 고도</dt>
          <dd>{altitude(state.world.zones).toLocaleString('ko-KR')} m</dd>
        </div>
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
      <div className="menace-row" aria-label="위협 수치">
        <span>피로 <b>{menace.fatigue}</b></span>
        <span>주목 <b>{menace.scrutiny}</b></span>
        <span>동요 <b>{menace.unrest}</b></span>
      </div>
      <div className="zone-row">
        {Object.entries(state.world.zones).map(([zone, value]) => (
          <span key={zone}>{ZONE_LABELS[zone as keyof typeof ZONE_LABELS]} 노후 {value.decay}</span>
        ))}
      </div>
    </aside>
  );
}

function MorningDocument({ disabled, onAction }: Pick<GameViewProps, 'disabled' | 'onAction'>) {
  return (
    <article className="document document-featured">
      <header className="document-header">
        <span>중앙 시설국 · 일일 배부</span>
        <span>승인 대기</span>
      </header>
      <p className="eyebrow">MORNING BRIEF</p>
      <h2>업무 개시 보고</h2>
      <p className="document-copy">
        야간 관측 기록을 취합했습니다. 세 구역의 지시서를 발부하면 오늘 처리할 두 건을 선택하십시오.
        미처리 건은 해당 구역의 노후도에 반영됩니다.
      </p>
      <button className="primary-action" disabled={disabled} onClick={() => onAction({ type: 'START_DAY' })}>
        오늘 업무 시작
      </button>
    </article>
  );
}

function FieldDocuments({ state, disabled, onAction }: Pick<GameViewProps, 'state' | 'disabled' | 'onAction'>) {
  return (
    <section className="document-stack" aria-label="오늘의 지시서">
      <div className="section-title">
        <div>
          <p className="eyebrow">TRIAGE DESK</p>
          <h2>처리 대기 지시서</h2>
        </div>
        <span className="shift-badge">잔여 근무 {state.world.shiftLeft} / {SHIFT_PER_DAY}</span>
      </div>
      <div className="orders-grid">
        {state.world.pendingOrders.map((order, orderIndex) => (
          <article className={`document order-card${order.resolved ? ' is-resolved' : ''}`} key={`${order.templateId}-${order.zone}`}>
            <header className="document-header">
              <span>지시서 {String(orderIndex + 1).padStart(2, '0')}</span>
              <span>{ZONE_LABELS[order.zone]}</span>
            </header>
            <p className="order-code">{order.templateId} · 난이도 보정 +{order.difficultyBonus}</p>
            <h3>{order.title}</h3>
            <p className="document-copy">{selectVariant(state, order.body)}</p>
            <div className="choices">
              {order.options.map((option, optionIndex) => (
                <button
                  disabled={disabled || order.resolved || option.timeCost > state.world.shiftLeft}
                  key={`${option.label}-${optionIndex}`}
                  onClick={() => onAction({ type: 'RESOLVE_ORDER', orderIndex, optionIndex })}
                >
                  <span>{option.label}</span>
                  <small>근무 {option.timeCost}</small>
                </button>
              ))}
            </div>
            {order.resolved ? <span className="resolved-stamp">처리 완료</span> : null}
          </article>
        ))}
      </div>
      <button className="text-action" disabled={disabled} onClick={() => onAction({ type: 'SKIP_TO_EVENT' })}>
        현장 업무 종료 →
      </button>
    </section>
  );
}

function EventDocument({ state, content, disabled, onAction }: Pick<GameViewProps, 'state' | 'content' | 'disabled' | 'onAction'>) {
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
            <small>선택</small>
          </button>
        ))}
      </div>
    </article>
  );
}

function ClosingDocument({ state, log, disabled, onAction }: Pick<GameViewProps, 'state' | 'log' | 'disabled' | 'onAction'>) {
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
        <div><dt>현재 고도</dt><dd>{altitude(state.world.zones).toLocaleString('ko-KR')} m</dd></div>
      </dl>
      <p className="document-note">확정 시 미처리 구역의 방치 페널티와 전 구역 자연 노후가 반영됩니다.</p>
      <button className="primary-action" disabled={disabled} onClick={() => onAction({ type: 'CLOSE_DAY' })}>
        정산 확정 및 저장
      </button>
    </article>
  );
}

export function GameView({ state, content, log, saveStatus, onAction, disabled = false }: GameViewProps) {
  return (
    <main className="game-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">PHASE 0</p>
          <h1>가제 미정 — 정비 일지</h1>
        </div>
        <div className="day-seal">
          <strong>DAY {String(state.world.calendar.day).padStart(2, '0')}</strong>
          <span>{WEEKDAY_LABELS[state.world.calendar.weekday] ?? ''} · {PHASE_LABELS[state.world.phase]}</span>
        </div>
      </header>

      <StatusLedger state={state} />

      <div className="workspace">
        {state.world.phase === 'morning' ? <MorningDocument disabled={disabled} onAction={onAction} /> : null}
        {state.world.phase === 'field' ? <FieldDocuments state={state} disabled={disabled} onAction={onAction} /> : null}
        {state.world.phase === 'event' ? <EventDocument state={state} content={content} disabled={disabled} onAction={onAction} /> : null}
        {state.world.phase === 'closing' ? <ClosingDocument state={state} log={log} disabled={disabled} onAction={onAction} /> : null}
      </div>

      {state.world.phase !== 'closing' && log.length > 0 ? (
        <aside className="transmission" aria-live="polite">
          <span>최근 기록</span>
          <p>{log.join(' ')}</p>
        </aside>
      ) : null}

      <footer className="save-indicator" data-status={saveStatus} aria-live="polite">
        <span aria-hidden="true" />
        {SAVE_LABELS[saveStatus]}
      </footer>
    </main>
  );
}
