// @vitest-environment jsdom
/**
 * L0 타이틀 (UI 층위 사양 §2) — 근무는 이 화면을 지나야 시작된다.
 */
import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from './game-state';
import { TitleScreen } from './title-screen';
import { renderUI, screen } from './test-utils';

function props(overrides: Partial<Parameters<typeof TitleScreen>[0]> = {}) {
  return {
    saved: null,
    loading: false,
    error: null,
    onContinue: vi.fn(),
    onNewGame: vi.fn(),
    ...overrides,
  };
}

describe('TitleScreen', () => {
  it('세이브가 없으면 새 근무만 내놓는다', () => {
    renderUI(<TitleScreen {...props()} />);

    expect(screen.getByRole('button', { name: /새 근무/ })).toBeDefined();
    expect(screen.queryByRole('button', { name: /이어하기/ })).toBeNull();
  });

  it('세이브가 있으면 이어하기에 일차를 붙인다', async () => {
    const saved = createInitialState();
    saved.world.calendar = { day: 3, weekday: 3 };
    const p = props({ saved });
    const { user } = renderUI(<TitleScreen {...p} />);

    const button = screen.getByRole('button', { name: /이어하기/ });
    expect(button.textContent).toContain('Day 03 · 수');

    await user.click(button);
    expect(p.onContinue).toHaveBeenCalledOnce();
  });

  it('세이브가 있을 때 새 근무는 확인 한 단계를 거친다', async () => {
    const p = props({ saved: createInitialState() });
    const { user } = renderUI(<TitleScreen {...p} />);

    await user.click(screen.getByRole('button', { name: /새 근무/ }));
    expect(p.onNewGame).not.toHaveBeenCalled();
    expect(screen.getByText(/덮어씁니다/)).toBeDefined();

    await user.click(screen.getByRole('button', { name: /덮어쓰고 시작/ }));
    expect(p.onNewGame).toHaveBeenCalledOnce();
  });

  it('세이브가 없으면 확인 없이 바로 시작한다', async () => {
    const p = props();
    const { user } = renderUI(<TitleScreen {...p} />);

    await user.click(screen.getByRole('button', { name: /새 근무/ }));
    expect(p.onNewGame).toHaveBeenCalledOnce();
  });

  it('세이브 확인 중에는 메뉴를 내놓지 않는다', () => {
    renderUI(<TitleScreen {...props({ loading: true })} />);

    expect(screen.getByText('세이브 확인 중…')).toBeDefined();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
