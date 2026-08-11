// @vitest-environment jsdom
/**
 * 미니게임 공통 셸 (세션 ②) — 세션을 받아 구현(현재 스텁)을 띄우고 결과 하나를 돌려준다.
 * 셸은 등급을 만들지 않는다 — MinigameResult만 위로 올라간다.
 */
import { describe, expect, it, vi } from 'vitest';
import { MinigameShell } from './minigame-shell';
import { renderUI, screen } from './test-utils';

const SESSION = { id: 'pipe' as const, difficulty: 2, seed: 7 };

describe('MinigameShell', () => {
  it('세션의 미니게임 구현을 띄운다 (스텁: 이름·난이도 표기)', () => {
    renderUI(<MinigameShell session={SESSION} onFinish={vi.fn()} />);
    expect(screen.getByText(/파이프 퍼즐/)).toBeTruthy();
    expect(screen.getByText(/난이도 2/)).toBeTruthy();
  });
  it('결과는 MinigameResult 그대로 올라간다 — 등급 변환은 셸 밖의 몫', async () => {
    const onFinish = vi.fn();
    const { user } = renderUI(<MinigameShell session={SESSION} onFinish={onFinish} />);
    await user.click(screen.getByRole('button', { name: '부분' }));
    expect(onFinish).toHaveBeenCalledWith('partial');
  });
});
