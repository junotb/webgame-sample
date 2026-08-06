/**
 * 상호작용 테스트 헬퍼 (UI 층위 사양 §10-1).
 *
 * 기존 테스트는 `renderToStaticMarkup`으로 마크업 문자열만 검사한다 — 렌더 결과가
 * 맞는지는 보지만 호버·토글·층 전이는 볼 수 없다. 층위 분리가 이번 작업의 본체이므로
 * 실제 DOM이 필요한 테스트만 이 헬퍼를 쓴다.
 *
 * 사용하는 파일 맨 위에 다음 주석이 있어야 한다 (전역 환경은 node로 둔다 —
 * 순수 코어 테스트 18개를 jsdom으로 돌릴 이유가 없다):
 *
 *     // @vitest-environment jsdom
 */
import { cleanup, render, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';

// vitest에 globals:true를 켜지 않았으므로 RTL의 자동 cleanup이 등록되지 않는다.
// 이 모듈을 import하는 것만으로 파일 단위 정리가 걸리도록 여기서 등록한다.
afterEach(cleanup);

/** 포인터 이벤트를 실제로 흉내내는 user-event 세션 + 렌더 결과 */
export function renderUI(ui: React.ReactElement): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const user = userEvent.setup();
  return { ...render(ui), user };
}

export { screen, within, waitFor } from '@testing-library/react';
