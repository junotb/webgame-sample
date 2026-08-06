'use client';

/**
 * 화면 셸 — 층위 조립 (docs/phase0-ui-layers.md §1).
 *
 * 층은 "누가 여는가"로 정의된다:
 *   L1 근무 화면  상시           무대(FieldStage) + 상단 띠
 *   L2 참조 패널  플레이어       원장 / 서류함
 *   L3 진행 오버레이  게임(흐름)  단계 전환마다
 *   L4 통지       게임(끼어듦)   메나스 한계 (다음 단계에서 추가)
 *
 * 규칙 — L2와 L3는 동시에 열리지 않는다. L1은 사라지지 않는다.
 */
import { useState } from 'react';
import { SHIFT_PER_DAY } from '../core/reducer';
import type { Action, ContentBundle, GameState } from '../core/schema';
import { ArchivePanel } from './archive-panel';
import { ClosingOverlay, EventOverlay, MorningOverlay } from './day-overlays';
import { FieldStage } from './field-stage';
import { CityPanel } from './city-panel';
import { SelfPanel } from './self-panel';
import { SAVE_LABELS, WEEKDAY_LABELS, ZONE_LABELS, type SaveStatus } from './ui-labels';

type PanelId = 'self' | 'city' | 'archive';

interface GameViewProps {
  state: GameState;
  content: ContentBundle;
  log: string[];
  saveStatus: SaveStatus;
  onAction: (action: Action) => void;
  /** 조우 진입 옵션 클릭 — RESOLVE_ORDER 대신 조우 리듀서로 (v3 §6) */
  onStartEncounter?: (orderIndex: number, encounterId: string) => void;
  disabled?: boolean;
  /** 조우 화면 — L3의 한 종류로 취급된다 (GameClient가 주입) */
  overlay?: React.ReactNode;
}

/**
 * 상단 띠 — 상시 노출은 네 가지뿐이다 (사양 §3).
 * 단계 라벨(`특이 사항` 등)은 여기 두지 않는다: 화면이 이미 말하고 있고,
 * 날짜와 붙여 놓으면 `DAY 01 월 · 특이 사항`이 한 덩어리로 읽혀 정체가 흐려진다.
 */
function TopBar({
  state,
  panel,
  onTogglePanel,
  panelsLocked,
}: {
  state: GameState;
  panel: PanelId | null;
  onTogglePanel: (id: PanelId) => void;
  panelsLocked: boolean;
}) {
  const { day, weekday } = state.world.calendar;
  const shiftLeft = state.world.shiftLeft;
  return (
    <header className="topbar">
      <div className="day-chip">
        <strong>DAY {String(day).padStart(2, '0')}</strong>
        <span>{WEEKDAY_LABELS[weekday] ?? ''}</span>
      </div>
      <span className="zone-name">{ZONE_LABELS[state.world.assignment.zone]}</span>
      {/* 원장을 열지 않고도 보이는 유일한 수치 — 숫자가 아니라 점으로 (사양 §3) */}
      <div className="shift-dots" aria-label={`잔여 근무 ${shiftLeft} / ${SHIFT_PER_DAY}`}>
        {Array.from({ length: SHIFT_PER_DAY }, (_, i) => (
          <i key={i} className={i < shiftLeft ? 'is-left' : 'is-spent'} aria-hidden="true" />
        ))}
      </div>
      <nav className="topbar-actions">
        {/* "원장"은 조직 문서의 이름이지 메뉴명이 아니었다 — 무엇이 나오는지 이름이 말해야 한다 */}
        <button
          className="chip-action"
          aria-pressed={panel === 'self'}
          disabled={panelsLocked}
          onClick={() => onTogglePanel('self')}
        >
          내 능력치
        </button>
        <button
          className="chip-action"
          aria-pressed={panel === 'city'}
          disabled={panelsLocked}
          onClick={() => onTogglePanel('city')}
        >
          도시 상태
        </button>
        <button
          className="chip-action"
          aria-pressed={panel === 'archive'}
          disabled={panelsLocked}
          onClick={() => onTogglePanel('archive')}
        >
          서류함 {state.world.archive.length}
        </button>
      </nav>
    </header>
  );
}

export function GameView({
  state,
  content,
  log,
  saveStatus,
  onAction,
  onStartEncounter,
  disabled = false,
  overlay,
}: GameViewProps) {
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [wasCovered, setWasCovered] = useState(false);
  const phase = state.world.phase;

  // L3 — 흐름이 여는 층. field에만 오버레이가 없다: 그때는 무대 자체가 화면이다.
  // 조우(overlay)는 field 중에 열리므로 단계 오버레이보다 우선한다.
  function flowOverlayFor(): React.ReactNode {
    if (overlay) return overlay;
    if (phase === 'morning') return <MorningOverlay state={state} disabled={disabled} onAction={onAction} />;
    if (phase === 'event') return <EventOverlay state={state} content={content} disabled={disabled} onAction={onAction} />;
    if (phase === 'closing') return <ClosingOverlay state={state} log={log} disabled={disabled} onAction={onAction} />;
    return null;
  }

  const flowOverlay = flowOverlayFor();
  const hasOverlay = flowOverlay !== null;

  // 규칙 1 — L3가 열리면 L2는 닫힌다. 참조하다 흐름에 끌려 들어가는 것은 되지만,
  // 흐름 위에 참조를 겹치면 다시 평면이 된다.
  // (렌더 중 파생: 오버레이가 걷힌 뒤 열어 뒀던 패널이 되살아나면 안 된다)
  if (wasCovered !== hasOverlay) {
    setWasCovered(hasOverlay);
    if (hasOverlay) setPanel(null);
  }

  function togglePanel(id: PanelId) {
    setPanel((current) => (current === id ? null : id));
  }

  return (
    <main className="game-shell">
      <TopBar state={state} panel={panel} onTogglePanel={togglePanel} panelsLocked={hasOverlay} />

      {/* L1 — L3 오버레이는 이 위를 덮을 뿐 지우지 않는다 (뒤에 지도가 남는다).
          반면 L2 패널은 무대를 **대신한다**: 아래에 덧붙이면 스크롤해야 보이고
          지도와 패널이 한 화면에 함께 남아 다시 평면이 된다.
          단 언마운트하지는 않는다 — 원장을 잠깐 보고 돌아왔을 때
          읽고 있던 지시서가 그대로 열려 있어야 한다. */}
      <div className={`stage${panel !== null && !hasOverlay ? ' is-covered' : ''}`} inert={hasOverlay || panel !== null}>
        <FieldStage
          state={state}
          zoneMap={content.zoneMaps.find((m) => m.zone === state.world.assignment.zone) ?? null}
          disabled={disabled}
          onAction={onAction}
          onStartEncounter={onStartEncounter}
          active={phase === 'field' && !hasOverlay && panel === null}
        />
        {phase === 'field' && !hasOverlay && log.length > 0 ? (
          <aside className="transmission" aria-live="polite">
            <span>최근 기록</span>
            <p>{log.join(' ')}</p>
          </aside>
        ) : null}
      </div>

      {/* L2 — 플레이어가 연다 */}
      {panel !== null && !hasOverlay ? (
        <div className="panel-layer">
          <button className="layer-dismiss" onClick={() => setPanel(null)}>
            ← 업무로 돌아가기
          </button>
          {panel === 'self' ? <SelfPanel state={state} /> : null}
          {panel === 'city' ? <CityPanel state={state} /> : null}
          {panel === 'archive' ? <ArchivePanel state={state} content={content} /> : null}
        </div>
      ) : null}

      {/* L3 — 게임이 연다 */}
      {hasOverlay ? <div className="overlay-layer">{flowOverlay}</div> : null}

      <footer className="save-indicator" data-status={saveStatus} aria-live="polite">
        <span aria-hidden="true" />
        {SAVE_LABELS[saveStatus]}
      </footer>
    </main>
  );
}
