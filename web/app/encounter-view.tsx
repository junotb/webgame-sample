/**
 * 조우 화면 (v3 §6) — 고장 신고서 양식 위에서 벌어지는 다단 조우.
 * 조우 상태는 GameClient의 로컬 상태다. GameState에는 결과만 반입된다.
 */
import { effectiveCheck, type EncounterState } from '../core/encounter';
import { PagedCopy } from './paged-copy';
import { checkLabel } from './ui-labels';
import type { EncounterActionId, EncounterDef, GameState } from '../core/schema';

const ACTION_ORDER: EncounterActionId[] = ['observe', 'soothe', 'burn', 'withdraw'];

interface EncounterViewProps {
  def: EncounterDef;
  encounter: EncounterState;
  gameState: GameState;
  log: string[];
  onEncounterAction: (actionId: EncounterActionId) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function EncounterView({ def, encounter, gameState, log, onEncounterAction, onSubmit, disabled = false }: EncounterViewProps) {
  const finished = encounter.outcome !== null;
  return (
    <article className="document encounter-document" aria-label="설비 이상 확인">
      <header className="document-header">
        <span>고장 신고서 양식 제4호</span>
        <span>{def.id}</span>
      </header>
      <p className="eyebrow">FACILITY REPORT</p>
      <h2>{def.title}</h2>
      {/* 행동·결과는 intro를 다 읽은 뒤에만 — 조우도 읽기가 먼저다 (ui-screen-spec §2) */}
      <PagedCopy state={gameState} body={def.intro} className="document-copy narrative">
        {log.length > 0 ? <p className="result-log">{log.join(' ')}</p> : null}
        {finished ? (
          <>
            <p className="document-copy narrative">{def.outcomes[encounter.outcome!].text}</p>
            <button className="primary-action" disabled={disabled} onClick={onSubmit}>
              보고서 제출
            </button>
          </>
        ) : (
          <>
            <p className="order-code">관측 {encounter.turn} / {def.maxTurns}</p>
            <div className="choices event-choices">
              {ACTION_ORDER.map((actionId) => (
                <button key={actionId} disabled={disabled} onClick={() => onEncounterAction(actionId)}>
                  <span>{def.actions[actionId].label}</span>
                  <small>
                    {actionId === 'withdraw'
                      ? '이탈'
                      : checkLabel(effectiveCheck(def, encounter, actionId), gameState.self)}
                  </small>
                </button>
              ))}
            </div>
          </>
        )}
      </PagedCopy>
    </article>
  );
}
