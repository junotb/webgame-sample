import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { GameState } from '../core/schema';
import { GameView } from './game-view';
import { createInitialState } from './game-state';
import { CONTENT, ORDER } from './test-fixtures';

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

describe('상단 띠 (L1)', () => {
  it('날짜·구역·잔여 근무·패널 버튼만 두고 제목과 단계 라벨은 두지 않는다', () => {
    const html = render(createInitialState());

    expect(html).toContain('DAY 01');
    expect(html).toContain('제5구역');
    expect(html).toContain('잔여 근무 2 / 2');
    expect(html).toContain('내 능력치');
    expect(html).toContain('도시 상태');
    expect(html).toContain('서류함');
    // 제목은 L0(타이틀 화면)의 것이다 — 근무 중에는 표시하지 않는다
    expect(html).not.toContain('내일도 난 여기에');
    expect(html).not.toContain('STILL HERE TOMORROW');
    // 단계 라벨을 날짜에 붙이면 `DAY 01 월 · 특이 사항`이 한 덩어리로 읽힌다
    expect(html).not.toContain('특이 사항');
  });
});

describe('층위 렌더 (L1/L2/L3)', () => {
  it('morning은 일일 개시로 덮고 패널은 열지 않은 채 둔다', () => {
    const html = render(createInitialState());

    expect(html).toContain('DAY 01');
    expect(html).toContain('월요일');
    expect(html).toContain('업무 개시');
    // 패널은 L2 — 버튼을 눌러야 열린다 (상시 노출이 집중을 흩뜨렸다)
    expect(html).not.toContain('정비 <b>40</b>');
    expect(html).toContain('저장됨');
  });

  it('field는 오버레이 없이 지도만 보이고, 지시서는 아직 열려 있지 않다', () => {
    const state = createInitialState();
    state.self.memory = 1;
    state.world.phase = 'field';
    state.world.pendingOrders = [ORDER];

    const html = render(state);

    expect(html).toContain('제5구역 · 시설 배치도');
    expect(html).toContain('제3중계실');
    expect(html).toContain('가리킨 지점의 지시서가 여기 열립니다.');
    expect(html).toContain('현장 업무 종료');
    expect(html).not.toContain('overlay-layer');
    // 산문과 선택지는 가리켜야 나온다 — 4장을 나란히 펼치면 비교·스캔이 된다 (v3 §4)
    expect(html).not.toContain('당신은 이 문구가 무언가를 감추고 있음을 안다.');
    expect(html).not.toContain('표준 절차로 처리');
  });

  it('event·closing은 오버레이 층에 올라간다', () => {
    const event = createInitialState();
    event.world.phase = 'event';
    const eventHtml = render(event);
    expect(eventHtml).toContain('overlay-layer');
    expect(eventHtml).toContain('무엇이 문제인지 묻는다');

    const closing = createInitialState();
    closing.world.phase = 'closing';
    const html = render(closing, ['기억이 새겨졌다.']);
    expect(html).toContain('overlay-layer');
    expect(html).toContain('하루 정산 보고');
    expect(html).toContain('기억이 새겨졌다.');
    expect(html).toContain('정산 확정 및 저장');
  });
});
