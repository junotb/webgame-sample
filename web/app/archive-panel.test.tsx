// @vitest-environment jsdom
/**
 * 서류함 = 일기 (v3 §7, UI 층위 사양 §4).
 * 한 번에 한 건만 펼쳐지는가, 그리고 과거 문서가 **현재** 기억으로 다시 렌더링되는가.
 */
import { describe, expect, it } from 'vitest';
import type { GameState } from '../core/schema';
import { ArchivePanel } from './archive-panel';
import { createInitialState } from './game-state';
import { CONTENT } from './test-fixtures';
import { renderUI, screen } from './test-utils';

function stateWithArchive(): GameState {
  const state = createInitialState();
  state.world.calendar = { day: 4, weekday: 4 };
  state.world.archive = [
    { kind: 'order', day: 1, templateId: 'WO-TEST', zone: 'd5' },
    { kind: 'storylet', day: 3, id: 'EV-001' },
  ];
  return state;
}

describe('ArchivePanel', () => {
  it('색인에 겪은 순서대로 일차가 붙는다', () => {
    renderUI(<ArchivePanel state={stateWithArchive()} content={CONTENT} />);

    const entries = screen.getAllByRole('button');
    expect(entries[0].textContent).toContain('DAY 01');
    expect(entries[0].textContent).toContain('간헐 명멸 현상 점검');
    expect(entries[1].textContent).toContain('DAY 03');
  });

  it('한 번에 한 건만 펼쳐지고, 고르면 그 본문으로 바뀐다', async () => {
    const { user, container } = renderUI(<ArchivePanel state={stateWithArchive()} content={CONTENT} />);

    expect(container.querySelectorAll('.archive-open')).toHaveLength(1);
    expect(screen.getByText('이상 없음으로 처리하십시오.')).toBeDefined();

    await user.click(screen.getAllByRole('button')[1]);

    expect(container.querySelectorAll('.archive-open')).toHaveLength(1);
    expect(screen.getByText('귀환자가 서류를 내려다본다.')).toBeDefined();
    expect(screen.queryByText('이상 없음으로 처리하십시오.')).toBeNull();
  });

  it('과거 문서를 그때가 아니라 지금의 기억으로 렌더링한다 (v3 §7)', () => {
    const state = stateWithArchive();
    state.self.memory = 1; // day 1에는 0이었다

    renderUI(<ArchivePanel state={state} content={CONTENT} />);

    expect(screen.getByText('당신은 이 문구가 무언가를 감추고 있음을 안다.')).toBeDefined();
    expect(screen.queryByText('이상 없음으로 처리하십시오.')).toBeNull();
  });

  it('무엇이 달라졌는지는 말하지 않는다 — 검색·필터·변경 표시가 없다', () => {
    const { container } = renderUI(<ArchivePanel state={stateWithArchive()} content={CONTENT} />);

    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelector('select')).toBeNull();
    expect(container.textContent).not.toMatch(/변경|달라|비교|이전 판/);
  });

  it('보관된 것이 없으면 빈 서류함이라고만 말한다', () => {
    renderUI(<ArchivePanel state={createInitialState()} content={CONTENT} />);
    expect(screen.getByText('보관된 문서가 없습니다.')).toBeDefined();
  });
});
