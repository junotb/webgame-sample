// @vitest-environment jsdom
/**
 * 미니게임 공통 셸 — 세션의 종류에 맞는 실구현을 띄우고 결과 하나를 돌려준다.
 * 게임 규칙은 minigames/logic.test.ts가 고정한다. 여기는 장착과 시간 만료 경로만 본다.
 */
import { act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MinigameShell } from './minigame-shell';
import { renderUI, screen } from './test-utils';

afterEach(() => {
  vi.useRealTimers();
});

describe('MinigameShell', () => {
  it('종류에 맞는 게임이 장착된다', () => {
    renderUI(<MinigameShell session={{ id: 'pipe', difficulty: 2, seed: 7 }} onFinish={vi.fn()} />);
    expect(document.querySelector('[data-minigame="pipe"]')).not.toBeNull();
    renderUI(<MinigameShell session={{ id: 'whack', difficulty: 0, seed: 7 }} onFinish={vi.fn()} />);
    expect(document.querySelector('[data-minigame="whack"]')).not.toBeNull();
  });

  it('손대지 않고 시간이 다 가면 성적으로 끝난다 — 등급 변환은 셸 밖의 몫', () => {
    vi.useFakeTimers();
    const onFinish = vi.fn();
    renderUI(<MinigameShell session={{ id: 'pipe', difficulty: 0, seed: 11 }} onFinish={onFinish} />);
    act(() => {
      vi.advanceTimersByTime(31000);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(['complete', 'partial', 'fail']).toContain(onFinish.mock.calls[0][0]);
  });

  it('선별 두더지도 시간 만료로 끝난다 (20초 국면)', () => {
    vi.useFakeTimers();
    const onFinish = vi.fn();
    renderUI(<MinigameShell session={{ id: 'whack', difficulty: 0, seed: 3 }} onFinish={onFinish} />);
    act(() => {
      vi.advanceTimersByTime(21000);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0][0]).toBe('fail'); // 아무것도 태우지 않았다
  });

  it('남은 시간이 표시된다', () => {
    renderUI(<MinigameShell session={{ id: 'knight', difficulty: 1, seed: 5 }} onFinish={vi.fn()} />);
    expect(screen.getByText('30')).toBeDefined();
  });
});
