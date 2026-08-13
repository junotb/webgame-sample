// @vitest-environment jsdom
/**
 * L1 무대 — 구역 지도 + 호버 열람 (UI 층위 사양 §3).
 * "가리키면 열리고, 떠나도 남는다"가 여기서 고정된다.
 */
import { describe, expect, it, vi } from 'vitest';
import type { GameState, WorkOrder } from '../core/schema';
import { FieldStage } from './field-stage';
import { createInitialState } from './game-state';
import { ORDER } from './test-fixtures';
import { renderUI, screen, waitFor } from './test-utils';

const SECOND: WorkOrder = {
  ...ORDER,
  templateId: 'WO-TEST2',
  siteId: 'site-b',
  kind: 'material',
  title: [{ text: '정기 자재 수령' }],
  body: [{ paragraphs: ['수령 서명을 받으십시오.'] }],
};

const MAP = {
  zone: 'd5' as const,
  title: '제5구역 · 시설 배치도',
  sites: [
    { id: 'test-site', label: '제3중계실', x: 40, y: 55 },
    { id: 'site-b', label: '자재 수령소', x: 75, y: 30 },
  ],
};

function fieldState(orders: WorkOrder[] = [ORDER, SECOND]): GameState {
  const state = createInitialState();
  state.world.phase = 'field';
  state.world.pendingOrders = orders;
  return state;
}

function stage(state = fieldState(), onAction = vi.fn()) {
  return {
    onAction,
    ...renderUI(
      <FieldStage active disabled={false} onAction={onAction} state={state} zoneMap={MAP} />,
    ),
  };
}

describe('지도 마커', () => {
  it('발부된 지시서 수만큼 놓이고, 지점명을 단다', () => {
    stage();
    expect(screen.getByRole('button', { name: /제3중계실/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /자재 수령소/ })).toBeDefined();
  });

  it('정체를 시각화하지 않는다 — 마커는 상태에 반응하지 않는다', () => {
    const worse = fieldState();
    worse.world.zones.d5.stagnation = 10;
    const { container } = stage(worse);
    const markers = container.querySelectorAll('.site-marker');

    // 한계 밴드에서도 마커의 클래스는 미처리 상태 그대로다
    for (const marker of markers) {
      expect(marker.className).toBe('site-marker');
    }
  });

  it('처리 완료 마커에는 도장만 붙는다 (아이콘은 그대로)', () => {
    const done = fieldState([{ ...ORDER, resolved: true, outcome: 'passed' }, SECOND]);
    const { container } = stage(done);

    const resolved = container.querySelector('.site-marker.is-resolved');
    expect(resolved).not.toBeNull();
    expect(resolved?.querySelector('[data-icon="kind-circuit"]')).not.toBeNull();
    expect(resolved?.querySelector('.site-stamp')).not.toBeNull();
  });
});

describe('호버 열람', () => {
  it('가리키면 그 지시서가 열람 패널에 열린다', async () => {
    const { user } = stage();
    expect(screen.getByText('가리킨 지점의 지시서가 여기 열립니다.')).toBeDefined();

    await user.hover(screen.getByRole('button', { name: /제3중계실/ }));

    await waitFor(() => expect(screen.getByText('이상 없음으로 처리하십시오.')).toBeDefined());
    expect(screen.getByRole('button', { name: /작업 개시/ })).toBeDefined();
  });

  it('마커를 떠나도 카드는 남는다 — 선택지로 커서를 옮기는 동안 닫히면 안 된다', async () => {
    const { user } = stage();
    const marker = screen.getByRole('button', { name: /제3중계실/ });

    await user.hover(marker);
    await waitFor(() => expect(screen.getByText('이상 없음으로 처리하십시오.')).toBeDefined());

    await user.unhover(marker);
    expect(screen.getByText('이상 없음으로 처리하십시오.')).toBeDefined();
  });

  it('다른 마커를 가리키면 교체된다 — 한 번에 하나만 보인다', async () => {
    const { user } = stage();

    await user.hover(screen.getByRole('button', { name: /제3중계실/ }));
    await waitFor(() => expect(screen.getByText('이상 없음으로 처리하십시오.')).toBeDefined());

    await user.hover(screen.getByRole('button', { name: /자재 수령소/ }));
    await waitFor(() => expect(screen.getByText('수령 서명을 받으십시오.')).toBeDefined());
    expect(screen.queryByText('이상 없음으로 처리하십시오.')).toBeNull();
  });

  it('포커스도 호버와 같게 동작한다 (키보드·터치)', async () => {
    const { user } = stage();

    await user.tab();
    expect(screen.getByText('이상 없음으로 처리하십시오.')).toBeDefined();
  });
});

describe('작업 개시 — 카드 리뉴얼: 처리 = 미니게임', () => {
  it('열린 카드에서 작업 개시를 누르면 onStartWork가 카드 자리를 받는다', async () => {
    const onStartWork = vi.fn();
    const { user } = renderUI(
      <FieldStage
        state={fieldState()}
        zoneMap={MAP}
        disabled={false}
        onAction={vi.fn()}
        onStartWork={onStartWork}
        active
      />,
    );

    await user.hover(screen.getByRole('button', { name: /제3중계실/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: /작업 개시/ })).toBeDefined());
    await user.click(screen.getByRole('button', { name: /작업 개시/ }));

    expect(onStartWork).toHaveBeenCalledWith(0);
  });

  it('처리 완료 카드에는 작업 개시 대신 성적 도장이 남는다', async () => {
    const done = fieldState([{ ...ORDER, resolved: true, outcome: 'passed' }, SECOND]);
    const { user } = renderUI(
      <FieldStage state={done} zoneMap={MAP} disabled={false} onAction={vi.fn()} onStartWork={vi.fn()} active />,
    );

    await user.hover(screen.getByRole('button', { name: /제3중계실/ }));
    await waitFor(() => expect(screen.getByText('Passed')).toBeDefined());
    expect(screen.queryByRole('button', { name: /작업 개시/ })).toBeNull();
  });
});
