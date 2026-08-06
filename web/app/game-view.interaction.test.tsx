// @vitest-environment jsdom
/**
 * 상호작용 테스트 — 마크업이 아니라 "누르면 무엇이 열리는가"를 본다.
 * 층위 사양(docs/phase0-ui-layers.md)의 전이 규칙이 여기서 고정된다.
 */
import { describe, expect, it, vi } from 'vitest';
import { GameView } from './game-view';
import { createInitialState } from './game-state';
import { CONTENT } from './test-fixtures';
import { renderUI, screen } from './test-utils';

function view(state = createInitialState(), log: string[] = []) {
  return renderUI(
    <GameView state={state} content={CONTENT} log={log} saveStatus="saved" onAction={vi.fn()} />,
  );
}

describe('서류함 토글', () => {
  it('열면 서류함이 보이고 다시 누르면 업무 화면으로 돌아온다', async () => {
    const state = createInitialState();
    state.world.archive = [{ kind: 'storylet', id: 'EV-001' }];
    const { user } = view(state);

    expect(screen.queryByRole('article')).not.toBeNull(); // 업무 개시 문서
    await user.click(screen.getByRole('button', { name: /서류함 열람/ }));

    expect(screen.getByRole('region', { name: '서류함' })).toBeDefined();
    await user.click(screen.getByRole('button', { name: /업무로 돌아가기/ }));

    expect(screen.queryByRole('region', { name: '서류함' })).toBeNull();
  });
});
