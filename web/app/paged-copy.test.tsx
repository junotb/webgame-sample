// @vitest-environment jsdom
/**
 * 분절 본문 (system-rules §화면) — "입력 한 번 = 문단 하나 = 화면 하나"가 여기서 고정된다.
 * 진행은 덧붙임(NVL 누적)이 아니라 문단 단위 전환이고, 다시 보기는 백로그의 몫이다.
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

  it('클릭마다 다음 문단으로 전환된다 — 이전 문단은 화면에서 물러나고, 끝에 닿으면 선택지가 나타난다', async () => {
    const { user } = paged();
    await user.click(screen.getByRole('button', { name: '다음 문단 (1/3)' }));
    expect(screen.getByText('둘째 문단이다.')).toBeTruthy();
    expect(screen.queryByText('첫 문단이다.')).toBeNull(); // 덧붙임 없음 — 다시 보기는 백로그의 몫
    expect(screen.queryByText('셋째 문단이다.')).toBeNull();

    await user.click(screen.getByRole('button', { name: '다음 문단 (2/3)' }));
    expect(screen.getByText('셋째 문단이다.')).toBeTruthy();
    expect(screen.queryByText('둘째 문단이다.')).toBeNull();
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

describe('PagedCopy — 백로그 (system-rules §화면, 문서 단위)', () => {
  it('열면 드러난 문단까지만 보인다 — 미리 읽기 없음', async () => {
    const { user } = paged();
    await user.click(screen.getByRole('button', { name: '다음 문단 (1/3)' }));
    await user.click(screen.getByRole('button', { name: '지난 문단' }));
    expect(screen.getByText('첫 문단이다.')).toBeTruthy();
    expect(screen.getByText('둘째 문단이다.')).toBeTruthy();
    expect(screen.queryByText('셋째 문단이다.')).toBeNull();
    expect(screen.queryByRole('button', { name: /다음 문단/ })).toBeNull();
  });

  it('여는 클릭이 진행으로 새지 않고, 닫으면 그 자리에서 이어진다', async () => {
    const { user } = paged();
    await user.click(screen.getByRole('button', { name: '지난 문단' }));
    expect(screen.queryByText('둘째 문단이다.')).toBeNull();
    await user.click(screen.getByRole('button', { name: '돌아가기' }));
    expect(screen.getByRole('button', { name: '다음 문단 (1/3)' })).toBeTruthy();
  });

  it('열려 있는 동안 엔터는 진행이 아니고, ESC로 닫힌다', async () => {
    const { user } = paged();
    await user.click(screen.getByRole('button', { name: '지난 문단' }));
    await user.keyboard('{Enter}');
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: '다음 문단 (1/3)' })).toBeTruthy();
  });

  it('다 읽은 뒤에도 열 수 있고, 닫으면 선택지가 돌아온다', async () => {
    const { user } = paged();
    await user.keyboard('{Enter}{Enter}');
    await user.click(screen.getByRole('button', { name: '지난 문단' }));
    expect(screen.queryByText('표준 절차 수행')).toBeNull();
    await user.click(screen.getByRole('button', { name: '돌아가기' }));
    expect(screen.getByText('표준 절차 수행')).toBeTruthy();
  });

  it('재열람(revealAll)에는 백로그 버튼이 없다 — 전문이 이미 보인다', () => {
    paged(true);
    expect(screen.queryByRole('button', { name: '지난 문단' })).toBeNull();
  });
});
