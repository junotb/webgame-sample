// @vitest-environment jsdom
/**
 * L3 진행 오버레이 (UI 층위 사양 §5).
 * 특히 사무소 장면 — 사고 보고서 양식을 걷어냈는지가 여기서 고정된다.
 */
import { describe, expect, it, vi } from 'vitest';
import { EventOverlay, MorningOverlay } from './day-overlays';
import { createInitialState } from './game-state';
import { CONTENT } from './test-fixtures';
import { renderUI, screen } from './test-utils';

describe('일일 개시', () => {
  it('날짜와 구역만 크게 말하고 지시서 목록은 읽어 주지 않는다', () => {
    const state = createInitialState();
    state.world.calendar = { day: 3, weekday: 3 };
    const { container } = renderUI(
      <MorningOverlay state={state} disabled={false} onAction={vi.fn()} />,
    );

    expect(screen.getByText('DAY 03')).toBeDefined();
    expect(screen.getByText('수요일')).toBeDefined();
    expect(screen.getByText('제5구역')).toBeDefined();
    expect(container.textContent).not.toMatch(/건 발부|지시서/);
  });

  it('다일 점유 중이면 한 줄 덧붙인다', () => {
    const state = createInitialState();
    state.world.multiday = { id: 'EV-002', daysLeft: 2 };
    renderUI(<MorningOverlay state={state} disabled={false} onAction={vi.fn()} />);

    expect(screen.getByText(/약속된 일정/)).toBeDefined();
  });
});

describe('사무소 장면', () => {
  it('사고 보고서 양식을 쓰지 않는다 — 시간과 장소만 준다', () => {
    const state = createInitialState();
    state.world.phase = 'event';
    const { container } = renderUI(
      <EventOverlay state={state} content={CONTENT} disabled={false} onAction={vi.fn()} />,
    );

    expect(screen.getByText('제5구역 사무소')).toBeDefined();
    expect(screen.getByText('업무 종료 후')).toBeDefined();
    // 이 층은 v3 §5의 필수 이벤트다. 경고로 읽히면 빈도가 문제로 오인된다
    expect(container.textContent).not.toContain('비정규 접촉 기록');
    expect(container.textContent).not.toContain('INCIDENT MEMO');
    expect(container.textContent).not.toContain('특이 사항');
    // 문서 번호는 이것이 접수된 사건이라는 뜻이다
    expect(container.textContent).not.toContain('EV-001');
  });

  it('선택지와 판정 표기는 그대로 둔다 (v3 §4 — 저울에는 눈금이 있어야 한다)', () => {
    const state = createInitialState();
    state.world.phase = 'event';
    renderUI(<EventOverlay state={state} content={CONTENT} disabled={false} onAction={vi.fn()} />);

    expect(screen.getByRole('button', { name: /무엇이 문제인지 묻는다/ })).toBeDefined();
  });
});
