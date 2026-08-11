// @vitest-environment jsdom
/**
 * 오버레이 공통 셸 (세션 ④) — 조우·다일·탐사 공용 골격.
 * 여기서 고정하는 것: 문서 프레임 마크업과 "본문을 다 읽은 뒤에만 행동" 규칙.
 * 분절 진행 자체의 세부는 paged-copy.test의 몫이다.
 */
import { describe, expect, it } from 'vitest';
import { createInitialState } from './game-state';
import { OverlayShell } from './overlay-shell';
import { renderUI, screen } from './test-utils';

const TWO_PARAGRAPHS = [{ paragraphs: ['첫 문단.', '둘째 문단.'] }];

describe('OverlayShell', () => {
  it('문서 프레임 — 헤더 좌/우·표제·제목이 그대로 선다', () => {
    renderUI(
      <OverlayShell
        frame={['고장 신고서 양식 제4호', 'ENC-001']}
        eyebrow="FACILITY REPORT"
        title="설비 이상 확인 요청"
        state={createInitialState()}
        body={[{ paragraphs: ['본문.'] }]}
      />,
    );
    expect(screen.getByText('고장 신고서 양식 제4호')).toBeDefined();
    expect(screen.getByText('ENC-001')).toBeDefined();
    expect(screen.getByText('FACILITY REPORT')).toBeDefined();
    expect(screen.getByRole('heading', { name: '설비 이상 확인 요청' })).toBeDefined();
  });

  it('eyebrow는 조직 서식 전용 — 없으면 렌더되지 않는다 (장면형 문서)', () => {
    const { container } = renderUI(
      <OverlayShell
        frame={['서편 거주구역 사무소', '업무 종료 후']}
        title="일과 뒤"
        state={createInitialState()}
        body={[{ paragraphs: ['본문.'] }]}
      />,
    );
    expect(container.querySelector('.eyebrow')).toBeNull();
  });

  it('행동은 본문을 다 읽은 뒤에만 — 읽기 우선 규칙이 셸에 있다', async () => {
    const { user } = renderUI(
      <OverlayShell frame={['양식', 'X-1']} title="제목" state={createInitialState()} body={TWO_PARAGRAPHS}>
        <button>보고서 제출</button>
      </OverlayShell>,
    );
    expect(screen.queryByRole('button', { name: '보고서 제출' })).toBeNull();
    await user.click(screen.getByRole('button', { name: /다음 문단/ }));
    expect(screen.getByRole('button', { name: '보고서 제출' })).toBeDefined();
  });
});
