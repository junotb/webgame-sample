// @vitest-environment jsdom
/**
 * 미니게임 이탈 = 실패 (system-rules §카드) — 테스트로 고정하는 성질:
 * 작업 개시가 저장되고, 이어하기가 진행 중이던 카드를 실패로 반입한다.
 * (자연스러운 구현은 세션을 저장하지 않는 쪽이고, 그러면 새로고침이
 * 같은 seed로 같은 퍼즐을 다시 여는 재도전 뒷길이 된다.)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState } from '../core/schema';
import { createInitialState } from './game-state';
import { CONTENT, ORDER } from './test-fixtures';
import { renderUI, screen, waitFor } from './test-utils';

const saveMock = vi.hoisted(() => ({
  loadGame: vi.fn(),
  saveGame: vi.fn(),
  clearGame: vi.fn(),
}));
vi.mock('./save', () => saveMock);

import { GameClient } from './game-client';

function fieldSave(): GameState {
  const state = createInitialState();
  state.world.phase = 'field';
  state.world.pendingOrders = [structuredClone(ORDER)];
  return state;
}

beforeEach(() => {
  vi.clearAllMocks();
  saveMock.saveGame.mockResolvedValue(undefined);
  saveMock.clearGame.mockResolvedValue(undefined);
});

describe('미니게임 이탈 = 실패', () => {
  it('작업 개시 시점에 개시 마커가 저장된다', async () => {
    saveMock.loadGame.mockResolvedValue(fieldSave());
    const { user } = renderUI(<GameClient content={CONTENT} />);

    await user.click(await screen.findByRole('button', { name: /이어하기/ }));
    await user.hover(screen.getByRole('button', { name: /제3중계실/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: /작업 개시/ })).toBeDefined());
    await user.click(screen.getByRole('button', { name: /작업 개시/ }));

    await waitFor(() => expect(saveMock.saveGame).toHaveBeenCalled());
    const persisted = saveMock.saveGame.mock.calls.at(-1)![0] as GameState;
    expect(persisted.world.activeOrder).toBe(0);
    // 마커는 개시의 기록일 뿐 — 성적은 아직 없다
    expect(persisted.world.pendingOrders[0].resolved).toBe(false);
  });

  it('마커가 남은 세이브의 이어하기는 그 카드를 실패로 반입한다', async () => {
    const saved = fieldSave();
    saved.world.activeOrder = 0;
    saveMock.loadGame.mockResolvedValue(saved);
    const { user } = renderUI(<GameClient content={CONTENT} />);

    await user.click(await screen.findByRole('button', { name: /이어하기/ }));

    await waitFor(() => expect(saveMock.saveGame).toHaveBeenCalled());
    const persisted = saveMock.saveGame.mock.calls.at(-1)![0] as GameState;
    expect(persisted.world.activeOrder).toBeNull();
    expect(persisted.world.pendingOrders[0].resolved).toBe(true);
    expect(persisted.world.pendingOrders[0].outcome).toBe('notPassed');
  });

  it('마커 없는 이어하기는 아무것도 반입하지 않는다', async () => {
    saveMock.loadGame.mockResolvedValue(fieldSave());
    const { user } = renderUI(<GameClient content={CONTENT} />);

    await user.click(await screen.findByRole('button', { name: /이어하기/ }));

    // 복원만으로는 저장이 일어나지 않고, 카드도 그대로다
    expect(saveMock.saveGame).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /제3중계실/ })).toBeDefined();
  });
});
