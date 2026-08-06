// @vitest-environment jsdom
/**
 * L4 통지 (UI 층위 사양 §6) — 조직이 나에게 보내는 것은 공문이다.
 */
import { describe, expect, it, vi } from 'vitest';
import { NoticeOverlay } from './notice-overlay';
import { renderUI, screen } from './test-utils';

describe('NoticeOverlay', () => {
  it('주목·피로는 본부 공문 서식으로 온다', () => {
    const { container, unmount } = renderUI(<NoticeOverlay menace="scrutiny" onDismiss={vi.fn()} />);
    expect(container.textContent).toContain('중앙 시설국 감사과');
    unmount();

    renderUI(<NoticeOverlay menace="fatigue" onDismiss={vi.fn()} />);
    expect(screen.getByText('중앙 시설국 인사과')).toBeDefined();
  });

  it('동요는 공문이 아니다 — 조직이 인지하지 못하는 축이라 발신처가 없다', () => {
    const { container } = renderUI(<NoticeOverlay menace="unrest" onDismiss={vi.fn()} />);

    expect(screen.getByText('발신처 없음')).toBeDefined();
    expect(container.textContent).not.toContain('중앙 시설국');
    expect(container.querySelector('.is-unsigned')).not.toBeNull();
  });

  it('경고 연출을 쓰지 않는다 (v3 §1 톤 기준)', () => {
    for (const menace of ['scrutiny', 'fatigue', 'unrest'] as const) {
      const { container, unmount } = renderUI(<NoticeOverlay menace={menace} onDismiss={vi.fn()} />);
      expect(container.textContent).not.toMatch(/[⚠!]|경고|위험/);
      unmount();
    }
  });

  it('확인 하나로 닫힌다', async () => {
    const onDismiss = vi.fn();
    const { user } = renderUI(<NoticeOverlay menace="scrutiny" onDismiss={onDismiss} />);

    await user.click(screen.getByRole('button', { name: '확인' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
