'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  encounterReduce,
  finishEncounter,
  startEncounter,
  type EncounterState,
} from '../core/encounter';
import { MINIGAME_OF_KIND, type MinigameSession } from '../core/minigame';
import { reduce } from '../core/reducer';
import type { Action, ContentBundle, EncounterActionId, EncounterDef, GameState, MenaceId, MinigameResult, WorkOrder } from '../core/schema';
import { EncounterView } from './encounter-view';
import { createInitialState } from './game-state';
import { GameView } from './game-view';
import { MinigameOverlay } from './minigame-overlay';
import { NoticeOverlay } from './notice-overlay';
import { loadGame, saveGame } from './save';
import { TitleScreen } from './title-screen';
import type { SaveStatus } from './ui-labels';

interface GameClientProps {
  content: ContentBundle;
}

/** 조우 세션 — GameState에 저장되지 않는 로컬 상태 (v3 §6 격리 원칙).
 *  orderIndex는 선행 조우가 끝난 뒤 이어질 미니게임의 카드 자리다 (조우 → 미니게임 체인) */
interface EncounterSession {
  def: EncounterDef;
  state: EncounterState;
  orderIndex: number;
  log: string[];
}

/** 미니게임 세션 — 카드 스냅샷을 함께 든다 (결과 산문은 이 카드의 것) */
interface MinigamePlay {
  orderIndex: number;
  order: WorkOrder;
  session: MinigameSession;
}

export function GameClient({ content }: GameClientProps) {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [log, setLog] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('loading');
  const [ready, setReady] = useState(false);
  /** L0 게이트 — 타이틀을 지나야 근무가 시작된다 (UI 층위 사양 §2) */
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState<GameState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const stateRef = useRef(state);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveVersion = useRef(0);

  useEffect(() => {
    let active = true;
    void loadGame()
      .then((restored) => {
        if (!active) return;
        // 복원은 하되 화면은 넘기지 않는다 — 이어할지 새로 할지는 타이틀에서 고른다
        setSaved(restored);
        setSaveStatus('saved');
        setReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : '세이브를 불러오지 못했습니다.');
        setSaveStatus('error');
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((nextState: GameState) => {
    const version = ++saveVersion.current;
    setSaveStatus('saving');
    const queued = saveQueue.current.catch(() => undefined).then(() => saveGame(nextState));
    saveQueue.current = queued;
    void queued
      .then(() => {
        if (version === saveVersion.current) setSaveStatus('saved');
      })
      .catch((error: unknown) => {
        if (version !== saveVersion.current) return;
        setSaveStatus('error');
        setLog((current) => [
          ...current,
          error instanceof Error ? error.message : '세이브 기록에 실패했습니다.',
        ]);
      });
  }, []);

  const onContinue = useCallback(() => {
    if (!saved) return;
    stateRef.current = saved;
    setState(saved);
    setLog([`Day ${saved.world.calendar.day} 저장 기록을 복원했습니다.`]);
    setStarted(true);
  }, [saved]);

  const onNewGame = useCallback(() => {
    const fresh = createInitialState();
    stateRef.current = fresh;
    setState(fresh);
    setLog([]);
    setStarted(true);
    persist(fresh); // 기존 세이브를 즉시 덮는다 — 타이틀에서 이미 확인을 받았다
  }, [persist]);

  const [encounter, setEncounter] = useState<EncounterSession | null>(null);

  /** L4 대기열 — 동시에 둘이 상한에 닿을 수 있으므로 하나씩 확인시킨다 */
  const [notices, setNotices] = useState<MenaceId[]>([]);

  const onAction = useCallback((action: Action) => {
    try {
      const result = reduce(stateRef.current, action, content);
      stateRef.current = result.state;
      setState(result.state);
      setLog(result.log);
      if (result.notices?.length) setNotices((queue) => [...queue, ...result.notices!]);
      persist(result.state);
    } catch (error) {
      setLog([error instanceof Error ? error.message : '처리할 수 없는 요청입니다.']);
    }
  }, [content, persist]);

  const [minigame, setMinigame] = useState<MinigamePlay | null>(null);

  const openMinigame = useCallback((orderIndex: number) => {
    const order = stateRef.current.world.pendingOrders[orderIndex];
    if (!order) return;
    setMinigame({
      orderIndex,
      order,
      session: {
        id: MINIGAME_OF_KIND[order.kind],
        difficulty: order.difficultyBonus,
        seed: stateRef.current.world.seed,
      },
    });
  }, []);

  /** 작업 개시 — 최초의 소각 카드는 미니게임 전에 조우 ENC-001이 선행된다 (확정) */
  const onStartWork = useCallback((orderIndex: number) => {
    const order = stateRef.current.world.pendingOrders[orderIndex];
    if (!order || order.resolved) return;
    const enc001Done = (stateRef.current.world.flags.enc001_done ?? 0) >= 1;
    if (order.kind === 'incinerate' && !enc001Done) {
      const def = content.encounters.find((e) => e.id === 'ENC-001');
      if (def) {
        setEncounter({
          def,
          state: startEncounter(def, order.zone, stateRef.current.world.seed),
          orderIndex,
          log: [],
        });
        return;
      }
    }
    openMinigame(orderIndex);
  }, [content, openMinigame]);

  const onEncounterAction = useCallback((actionId: EncounterActionId) => {
    setEncounter((current) => {
      if (!current) return current;
      try {
        const step = encounterReduce(current.state, current.def, actionId, stateRef.current.self);
        return { ...current, state: step.state, log: step.log };
      } catch (error) {
        setLog([error instanceof Error ? error.message : '조우를 진행할 수 없습니다.']);
        return current;
      }
    });
  }, []);

  const onEncounterSubmit = useCallback(() => {
    setEncounter((current) => {
      if (!current) return current;
      const result = finishEncounter(current.def, current.state);
      const zone = current.state.zone;
      onAction({
        type: 'RESOLVE_ENCOUNTER',
        encounterId: current.def.id,
        zone,
        outcome: result.outcome,
        effects: result.effects,
        text: result.text,
      });
      // 조우 종료 후 미니게임이 이어진다 — 성적은 미니게임이 맡는다 (§6-5 확정)
      openMinigame(current.orderIndex);
      return null;
    });
  }, [onAction, openMinigame]);

  const onMinigameResolve = useCallback((result: MinigameResult) => {
    setMinigame((current) => {
      if (!current) return current;
      onAction({ type: 'RESOLVE_MINIGAME', orderIndex: current.orderIndex, result });
      return current; // 산문을 읽는 동안 오버레이는 남는다 — onClose가 걷는다
    });
  }, [onAction]);

  if (!started) {
    return (
      <TitleScreen
        saved={saved}
        loading={!ready}
        error={loadError}
        onContinue={onContinue}
        onNewGame={onNewGame}
      />
    );
  }

  return (
    <>
      <GameView
        state={state}
        content={content}
        log={log}
        saveStatus={saveStatus}
        onAction={onAction}
        onStartWork={onStartWork}
        disabled={!ready}
        overlay={
          encounter ? (
            <EncounterView
              def={encounter.def}
              encounter={encounter.state}
              gameState={state}
              log={encounter.log}
              onEncounterAction={onEncounterAction}
              onSubmit={onEncounterSubmit}
              disabled={!ready}
            />
          ) : minigame ? (
            <MinigameOverlay
              order={minigame.order}
              state={state}
              session={minigame.session}
              onResolve={onMinigameResolve}
              onClose={() => setMinigame(null)}
              disabled={!ready}
            />
          ) : null
        }
      />
      {/* L4 — 유일하게 L3 위에 뜬다. 드물기 때문에 겹쳐도 혼란이 없고,
          겹쳐야 "끼어들었다"는 성격이 산다 (UI 층위 사양 §1) */}
      {notices.length > 0 ? (
        <NoticeOverlay menace={notices[0]} onDismiss={() => setNotices((queue) => queue.slice(1))} />
      ) : null}
    </>
  );
}
