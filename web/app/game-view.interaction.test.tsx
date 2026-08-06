// @vitest-environment jsdom
/**
 * 상호작용 테스트 — 마크업이 아니라 "누르면 무엇이 열리는가"를 본다.
 * 층위 사양(docs/phase0-ui-layers.md §1)의 전이 규칙이 여기서 고정된다.
 */
import { describe, expect, it, vi } from 'vitest';
import type { GameState } from '../core/schema';
import { GameView } from './game-view';
import { createInitialState } from './game-state';
import { CONTENT, ORDER } from './test-fixtures';
import { renderUI, screen } from './test-utils';

/** field 단계 = 오버레이가 없는 유일한 단계. 패널 조작은 여기서만 가능하다 */
function fieldState(): GameState {
  const state = createInitialState();
  state.world.phase = 'field';
  state.world.pendingOrders = [ORDER];
  state.world.archive = [{ kind: 'storylet', day: 1, id: 'EV-001' }];
  return state;
}

function view(state: GameState, log: string[] = []) {
  return renderUI(
    <GameView state={state} content={CONTENT} log={log} saveStatus="saved" onAction={vi.fn()} />,
  );
}

describe('L2 참조 패널', () => {
  it('원장 버튼으로 열고 닫는다', async () => {
    const { user } = view(fieldState());
    expect(screen.queryByRole('region', { name: '도시 운용 원장' })).toBeNull();

    await user.click(screen.getByRole('button', { name: '원장' }));
    expect(screen.getByRole('region', { name: '도시 운용 원장' })).toBeDefined();

    await user.click(screen.getByRole('button', { name: '원장' }));
    expect(screen.queryByRole('region', { name: '도시 운용 원장' })).toBeNull();
  });

  it('원장과 서류함은 서로를 밀어낸다 — 한 번에 하나만 열린다', async () => {
    const { user } = view(fieldState());

    await user.click(screen.getByRole('button', { name: '원장' }));
    await user.click(screen.getByRole('button', { name: /서류함/ }));

    expect(screen.getByRole('region', { name: '서류함' })).toBeDefined();
    expect(screen.queryByRole('region', { name: '도시 운용 원장' })).toBeNull();
  });

  it('원장은 노후도 수치가 아니라 밴드 이름을 보인다 (v3 §9)', async () => {
    const state = fieldState();
    state.world.zones.d5.decay = 7; // 3밴드 = 이상
    const { user } = view(state);

    await user.click(screen.getByRole('button', { name: '원장' }));
    const zones = screen.getByLabelText('구역 상태');

    expect(zones.textContent).toContain('제5구역 이상');
    // 각 줄은 "구역명 + 밴드"가 전부다 — 노후도 수치가 어떤 형태로도 새지 않는다
    for (const row of zones.querySelectorAll('span')) {
      expect(row.textContent).toMatch(/^제\d구역 (정상|삐걱임|이상|한계)$/);
    }
  });
});

describe('L2와 L3는 동시에 열리지 않는다', () => {
  it('오버레이가 있는 단계에서는 패널 버튼이 잠긴다', () => {
    view(createInitialState()); // morning = 개시 오버레이

    expect(screen.getByRole('button', { name: '원장' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: /서류함/ })).toHaveProperty('disabled', true);
  });

  it('패널을 연 채로 단계가 넘어가면 패널이 닫힌다', async () => {
    const state = fieldState();
    const { user, rerender } = view(state);

    await user.click(screen.getByRole('button', { name: '원장' }));
    expect(screen.getByRole('region', { name: '도시 운용 원장' })).toBeDefined();

    const closing = { ...state, world: { ...state.world, phase: 'closing' as const } };
    rerender(
      <GameView state={closing} content={CONTENT} log={[]} saveStatus="saved" onAction={vi.fn()} />,
    );

    expect(screen.queryByRole('region', { name: '도시 운용 원장' })).toBeNull();
    expect(screen.getByText('하루 정산 보고')).toBeDefined();
  });
});

describe('L1은 사라지지 않는다', () => {
  it('오버레이가 덮여도 무대는 남아 있고, 다만 조작할 수 없다', () => {
    const state = fieldState();
    state.world.phase = 'closing';
    const { container } = view(state);

    const stage = container.querySelector('.stage');
    expect(stage).not.toBeNull();
    // 지도는 뒤에 남는다 — "사무실을 나간 적이 없다"는 감각
    expect(stage?.textContent).toContain('제5구역 · 시설 배치도');
    expect(stage?.hasAttribute('inert')).toBe(true);
  });
});
