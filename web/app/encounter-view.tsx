/**
 * 조우 화면 (v3 §6) — 고장 신고서 양식 위에서 벌어지는 다단 조우.
 * 조우 상태는 GameClient의 로컬 상태다. GameState에는 결과만 반입된다.
 */
import { effectiveCheck, type EncounterState } from '../core/encounter';
import { OverlayShell } from './overlay-shell';
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
    // 행동·결과는 intro를 다 읽은 뒤에만 — 읽기 우선 규칙은 공통 셸의 몫 (세션 ④)
    <OverlayShell
      frame={['고장 신고서 양식 제4호', def.id]}
      eyebrow="FACILITY REPORT"
      title={def.title}
      state={gameState}
      body={def.intro}
      ariaLabel="설비 이상 확인"
      className="encounter-document"
    >
      {log.length > 0 ? <p className="result-log">{log.join(' ')}</p> : null}
      {finished ? (
        <>
          <p className="document-copy narrative">{def.outcomes?.[encounter.outcome!]?.text}</p>
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
                <span>{def.actions?.[actionId].label}</span>
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
    </OverlayShell>
  );
}
