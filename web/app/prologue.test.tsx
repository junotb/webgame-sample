// @vitest-environment jsdom
/**
 * 프롤로그 흐름 (system-rules §프롤로그) — 테스트로 고정하는 성질:
 * 새 게임은 프롤로그를 거쳐 DAY 01로 진입하고, 이어하기는 거치지 않으며,
 * 첫 저장은 프롤로그 종료 시점이다 — 완료 자체는 어디에도 저장되지 않는다.
 * (자연스러운 구현은 새 게임 클릭 즉시 저장하는 쪽이고, 그러면 도중 이탈 후
 * 이어하기가 프롤로그를 건너뛰는 뒷길이 생긴다.)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from './game-state';
import { CONTENT } from './test-fixtures';
import { renderUI, screen, waitFor } from './test-utils';

const saveMock = vi.hoisted(() => ({
  loadGame: vi.fn(),
  saveGame: vi.fn(),
  clearGame: vi.fn(),
}));
vi.mock('./save', () => saveMock);

import { GameClient } from './game-client';

beforeEach(() => {
  vi.clearAllMocks();
  saveMock.saveGame.mockResolvedValue(undefined);
  saveMock.clearGame.mockResolvedValue(undefined);
});

describe('프롤로그 — 새 게임', () => {
  it('새 근무는 프롤로그를 거치고, 첫 저장은 프롤로그 종료 시점이다', async () => {
    saveMock.loadGame.mockResolvedValue(null);
    const { user } = renderUI(<GameClient content={CONTENT} />);

    await user.click(await screen.findByRole('button', { name: /새 근무/ }));

    // 프롤로그가 열렸고, DAY 01 아침(업무 개시)은 아직이다
    expect(screen.getByText('장례 뒤')).toBeTruthy();
    expect(screen.queryByText('업무 개시')).toBeNull();
    // 완료 전에는 아무것도 저장되지 않는다
    expect(saveMock.saveGame).not.toHaveBeenCalled();

    // 분절을 끝까지 읽어야 확정 버튼이 나온다 (공통 셸의 읽기 우선 규칙)
    expect(screen.queryByRole('button', { name: '불을 끄고 눕는다' })).toBeNull();
    await user.click(screen.getByRole('button', { name: /다음 문단/ }));

    await user.click(screen.getByRole('button', { name: '불을 끄고 눕는다' }));

    // DAY 01 아침으로 넘어갔고, 이때 비로소 저장된다
    expect(await screen.findByText('업무 개시')).toBeTruthy();
    await waitFor(() => expect(saveMock.saveGame).toHaveBeenCalledTimes(1));
    const persisted = saveMock.saveGame.mock.calls[0][0];
    expect(persisted.world.calendar.day).toBe(1);
  });
});

describe('프롤로그 — 이어하기', () => {
  it('이어하기는 프롤로그를 거치지 않는다', async () => {
    saveMock.loadGame.mockResolvedValue(createInitialState());
    const { user } = renderUI(<GameClient content={CONTENT} />);

    await user.click(await screen.findByRole('button', { name: /이어하기/ }));

    expect(screen.queryByText('장례 뒤')).toBeNull();
    expect(await screen.findByText('업무 개시')).toBeTruthy();
  });
});
