import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ContentBundle, GameState, WorkOrder } from '../core/schema';
import { GameView } from './game-view';
import { createInitialState } from './game-state';

const ORDER: WorkOrder = {
  templateId: 'WO-TEST',
  zone: 'd5',
  difficultyBonus: 0,
  weight: 1,
  title: '간헐 명멸 현상 점검',
  body: [
    { if: [{ path: 'self.memory', gte: 1 }], text: '당신은 이 문구가 무언가를 감추고 있음을 안다.' },
    { text: '이상 없음으로 처리하십시오.' },
  ],
  options: [
    {
      label: '표준 절차로 처리',
      check: { kind: 'auto' },
      timeCost: 1,
      onSuccess: { effects: [], text: '완료' },
    },
  ],
  resolved: false,
};

const CONTENT: ContentBundle = {
  bundleId: 'ui-test',
  version: '1',
  orderTemplates: [],
  storylets: [
    {
      id: 'EV-001',
      requirements: [{ path: 'world.calendar.day', gte: 1 }],
      body: [{ text: '귀환자가 서류를 내려다본다.' }],
      choices: [
        {
          label: '무엇이 문제인지 묻는다',
          check: { kind: 'auto' },
          onSuccess: { effects: [], text: '그가 대답했다.' },
        },
      ],
    },
  ],
};

function render(state: GameState, log: string[] = []): string {
  return renderToStaticMarkup(
    <GameView
      state={state}
      content={CONTENT}
      log={log}
      saveStatus="saved"
      onAction={() => undefined}
    />,
  );
}

describe('GameView document UI', () => {
  it('morning에 업무 개시 문서와 상태 원장을 표시한다', () => {
    const html = render(createInitialState());

    expect(html).toContain('DAY 01');
    expect(html).toContain('업무 개시 보고');
    expect(html).toContain('오늘 업무 시작');
    expect(html).toContain('도시 고도');
    expect(html).toContain('6,560 m');
    expect(html).toContain('저장됨');
  });

  it('field에 지시서 카드·선택지·트리아지 잔여 시간을 표시하고 기억 변형을 고른다', () => {
    const state = createInitialState();
    state.self.memory = 1;
    state.world.phase = 'field';
    state.world.pendingOrders = [ORDER];

    const html = render(state);

    expect(html).toContain('지시서 01');
    expect(html).toContain('간헐 명멸 현상 점검');
    expect(html).toContain('당신은 이 문구가 무언가를 감추고 있음을 안다.');
    expect(html).not.toContain('이상 없음으로 처리하십시오.');
    expect(html).toContain('표준 절차로 처리');
    expect(html).toContain('잔여 근무 2 / 2');
    expect(html).toContain('현장 업무 종료');
  });

  it('event 선택지와 closing 하루 요약 문서를 phase에 맞게 표시한다', () => {
    const event = createInitialState();
    event.world.phase = 'event';
    expect(render(event)).toContain('무엇이 문제인지 묻는다');

    const closing = createInitialState();
    closing.world.phase = 'closing';
    const html = render(closing, ['기억이 새겨졌다.']);
    expect(html).toContain('하루 정산 보고');
    expect(html).toContain('기억이 새겨졌다.');
    expect(html).toContain('정산 확정 및 저장');
  });
});
