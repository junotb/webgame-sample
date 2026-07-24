/* =====================================================================
 * scenes/event-battle.ts — 이벤트 전투 (대화 → 강제 전투 → 대화)
 *  현재 씬을 유지한 채 인트로 대화 오버레이 → 필드 전투 → 승리 시
 *  아웃트로 대화 오버레이를 하나의 흐름으로 잇는다. 패배·도주 시
 *  아웃트로는 건너뛰고 결과만 전달한다.
 * ===================================================================== */
import { SceneHandle } from "../core";
import { BattleResult } from "../core/battle-engine";
import { EventNode, EventOpts, eventOverlay } from "./event";
import { FieldBattleHandle, fieldBattleOverlay } from "./field-battle";

export interface EventBattleHandle {
  dispose(): void;
  /** L 키 — 전투 단계에서만 전투 기록을 토글한다 */
  toggleLog(): void;
}

export function eventBattle(opts: {
  intro: EventNode[];
  /** 승리 시에만 재생된다 */
  outro?: EventNode[];
  enemies: string[];
  caption: string;
  prevBadge: string;
  introOpts?: EventOpts;
  outroOpts?: EventOpts;
  onEnd: (result: BattleResult) => void;
}): EventBattleHandle {
  let dialogue: SceneHandle | null = null;
  let battle: FieldBattleHandle | null = null;
  let disposed = false;

  dialogue = eventOverlay(opts.intro, () => {
    dialogue = null;
    if (disposed) return;
    battle = fieldBattleOverlay({
      enemies: opts.enemies, caption: opts.caption, prevBadge: opts.prevBadge,
      onEnd: (result) => {
        battle = null;
        if (disposed) return;
        if (result === "victory" && opts.outro?.length) {
          dialogue = eventOverlay(opts.outro, () => {
            dialogue = null;
            opts.onEnd(result);
          }, opts.outroOpts ?? opts.introOpts);
        } else opts.onEnd(result);
      },
    });
  }, opts.introOpts);

  return {
    dispose() {
      disposed = true;
      dialogue?.dispose?.();
      battle?.dispose();
    },
    toggleLog: () => battle?.toggleLog(),
  };
}
