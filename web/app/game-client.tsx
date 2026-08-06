'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  encounterReduce,
  finishEncounter,
  startEncounter,
  type EncounterState,
} from '../core/encounter';
import { reduce } from '../core/reducer';
import type { Action, ContentBundle, EncounterActionId, EncounterDef, GameState } from '../core/schema';
import { EncounterView } from './encounter-view';
import { createInitialState } from './game-state';
import { GameView } from './game-view';
import { loadGame, saveGame } from './save';
import { TitleScreen } from './title-screen';
import type { SaveStatus } from './ui-labels';

interface GameClientProps {
  content: ContentBundle;
}

/** 조우 세션 — GameState에 저장되지 않는 로컬 상태 (v3 §6 격리 원칙) */
interface EncounterSession {
  def: EncounterDef;
  state: EncounterState;
  orderIndex: number;
  log: string[];
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

  const onAction = useCallback((action: Action) => {
    try {
      const result = reduce(stateRef.current, action, content);
      stateRef.current = result.state;
      setState(result.state);
      setLog(result.log);
      persist(result.state);
    } catch (error) {
      setLog([error instanceof Error ? error.message : '처리할 수 없는 요청입니다.']);
    }
  }, [content, persist]);

  const onStartEncounter = useCallback((orderIndex: number, encounterId: string) => {
    const def = content.encounters.find((e) => e.id === encounterId);
    const order = stateRef.current.world.pendingOrders[orderIndex];
    if (!def || !order) {
      setLog([`조우 정의 없음: ${encounterId}`]);
      return;
    }
    setEncounter({
      def,
      state: startEncounter(def, order.zone, stateRef.current.world.seed),
      orderIndex,
      log: [],
    });
  }, [content]);

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
      onAction({
        type: 'RESOLVE_ENCOUNTER',
        orderIndex: current.orderIndex,
        outcome: result.outcome,
        effects: result.effects,
        text: result.text,
      });
      return null;
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
    <GameView
      state={state}
      content={content}
      log={log}
      saveStatus={saveStatus}
      onAction={onAction}
      onStartEncounter={onStartEncounter}
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
        ) : null
      }
    />
  );
}
