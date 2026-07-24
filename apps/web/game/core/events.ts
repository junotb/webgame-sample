/* =====================================================================
 * core/events.ts — 게임 전역 이벤트 버스
 *  씬·규칙이 발행하고, 오디오·업적·자동 저장 같은 횡단 관심사가 구독한다.
 *  씬 코드가 구독자를 몰라도 되게 하는 것이 목적 — 새 반응(팡파레,
 *  통계 집계 등)은 구독 한 곳만 추가하면 된다. PIXI에 의존하지 않는다.
 * ===================================================================== */

/** 이벤트 이름 → 페이로드. 새 이벤트는 여기에 타입부터 추가한다. */
export interface GameEvents {
  /** 씬 진입 — kind별 id는 마을·필드·던전 식별자 */
  "scene:enter": { kind: "title" | "create" | "event" | "town" | "field" | "dungeon"; id?: string };
  /** 전투 오버레이 시작·종료 (필드 전투 등 씬 위 오버레이 전투) */
  "battle:start": Record<string, never>;
  "battle:end": { outcome: string };
  /** 퀘스트 보고(보상 수령) 완료 */
  "quest:rewarded": { id: string };
}

type Handler<E extends keyof GameEvents> = (payload: GameEvents[E]) => void;

class EventBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<keyof GameEvents>>>();

  on<E extends keyof GameEvents>(event: E, handler: Handler<E>): () => void {
    let set = this.handlers.get(event);
    if (!set) { set = new Set(); this.handlers.set(event, set); }
    set.add(handler as Handler<keyof GameEvents>);
    return () => set.delete(handler as Handler<keyof GameEvents>);
  }

  emit<E extends keyof GameEvents>(event: E, payload: GameEvents[E]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    /* 구독자 오류가 발행 지점(씬 로직)을 죽이지 않게 격리한다. */
    for (const handler of [...set]) {
      try { (handler as Handler<E>)(payload); }
      catch (err) { console.error(`[events] ${event} 구독자 오류`, err); }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const events = new EventBus();
