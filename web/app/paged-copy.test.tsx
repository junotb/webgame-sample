// @vitest-environment jsdom
/**
 * 분절 본문 (ui-screen-spec §5-3) — "입력 한 번 = 문단 하나"가 여기서 고정된다.
 * 장 넘김 실측(scrollHeight)은 jsdom에 레이아웃이 없어 다루지 않는다 —
 * 그 경계는 실기기 눈 검증(가로모드 뷰포트)의 몫이다.
 */
import { describe, expect, it } from 'vitest';
import type { ProseVariant } from '../core/schema';
import { createInitialState } from './game-state';
import { PagedCopy } from './paged-copy';
import { renderUI, screen } from './test-utils';

const BODY: ProseVariant[] = [
  { paragraphs: ['첫 문단이다.', '둘째 문단이다.', '셋째 문단이다.'] },
];

function paged(revealAll = false) {
  return renderUI(
    <PagedCopy body={BODY} revealAll={revealAll} state={createInitialState()}>
      <button>표준 절차 수행</button>
    </PagedCopy>,
  );
}

describe('PagedCopy — 문단 분절 진행', () => {
  it('처음에는 첫 문단만 보인다 — 선택지는 아직 없다', () => {
    paged();
    expect(screen.getByText('첫 문단이다.')).toBeTruthy();
    expect(screen.queryByText('둘째 문단이다.')).toBeNull();
    expect(screen.queryByText('표준 절차 수행')).toBeNull();
    expect(screen.getByRole('button', { name: '다음 문단 (1/3)' })).toBeTruthy();
  });

  it('클릭마다 문단이 쌓이고, 끝에 닿으면 선택지가 나타나며 표식은 사라진다', async () => {
    const { user } = paged();
    await user.click(screen.getByRole('button', { name: '다음 문단 (1/3)' }));
    expect(screen.getByText('첫 문단이다.')).toBeTruthy();
    expect(screen.getByText('둘째 문단이다.')).toBeTruthy();
    expect(screen.queryByText('셋째 문단이다.')).toBeNull();

    await user.click(screen.getByRole('button', { name: '다음 문단 (2/3)' }));
    expect(screen.getByText('셋째 문단이다.')).toBeTruthy();
    expect(screen.getByText('표준 절차 수행')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /다음 문단/ })).toBeNull();
  });

  it('엔터·스페이스로도 진행된다 (VN 문법 — 포커스 무관)', async () => {
    const { user } = paged();
    await user.keyboard('{Enter}');
    expect(screen.getByText('둘째 문단이다.')).toBeTruthy();
    await user.keyboard(' ');
    expect(screen.getByText('셋째 문단이다.')).toBeTruthy();
    expect(screen.getByText('표준 절차 수행')).toBeTruthy();
  });

  it('다 읽은 뒤의 엔터는 진행이 아니다 — 선택지의 몫', async () => {
    const { user } = paged();
    await user.keyboard('{Enter}{Enter}');
    expect(screen.getByText('표준 절차 수행')).toBeTruthy();
    // 남은 입력이 오류 없이 무시된다
    await user.keyboard('{Enter}');
    expect(screen.getByText('표준 절차 수행')).toBeTruthy();
  });

  it('revealAll — 이미 읽은 문서는 전 문단이 즉시 펼쳐진다', () => {
    paged(true);
    expect(screen.getByText('셋째 문단이다.')).toBeTruthy();
    expect(screen.getByText('표준 절차 수행')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /다음 문단/ })).toBeNull();
  });
});
