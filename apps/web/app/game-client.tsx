'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { reduce } from '../core/reducer';
import type { Action, ContentBundle, GameState } from '../core/schema';
import { createInitialState } from './game-state';
import { GameView, type SaveStatus } from './game-view';
import { loadGame, saveGame } from './save';

interface GameClientProps {
  content: ContentBundle;
}

export function GameClient({ content }: GameClientProps) {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [log, setLog] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('loading');
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveVersion = useRef(0);

  useEffect(() => {
    let active = true;
    void loadGame()
      .then((saved) => {
        if (!active) return;
        if (saved) {
          stateRef.current = saved;
          setState(saved);
          setLog([`Day ${saved.world.day} 저장 기록을 복원했습니다.`]);
        }
        setSaveStatus('saved');
        setReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLog([error instanceof Error ? error.message : '세이브를 불러오지 못했습니다.']);
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

  return (
    <GameView
      state={state}
      content={content}
      log={log}
      saveStatus={saveStatus}
      onAction={onAction}
      disabled={!ready}
    />
  );
}
