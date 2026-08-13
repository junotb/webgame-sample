'use client';

/**
 * 오버레이 공통 셸 — 조우·다일·탐사 공용.
 *
 * L3 문서 오버레이의 공통 골격: 문서 프레임(헤더 좌/우) → 제목 → 분절 본문 →
 * **본문을 다 읽은 뒤에만** 행동(children). 읽기가 먼저라는 규칙(ui-screen-spec §2)이
 * 셸에 있으므로, 이 셸을 쓰는 화면은 그 규칙을 어길 수 없다.
 *
 * 조우가 첫 사용자이고, 다일·탐사(특수 카드 보류 해제 후)가 같은 셸에 얹힌다.
 * 총평·엔딩·사무소 장면도 같은 골격이라 함께 이행했다 — 갈라진 마크업이
 * 화면마다 다른 규칙을 기르는 것을 막는다.
 */
import type { ReactNode } from 'react';
import type { GameState, ProseVariant } from '../core/schema';
import { PagedCopy } from './paged-copy';

interface OverlayShellProps {
  /** 문서 헤더 좌/우 — 양식명·문서번호, 또는 장소·시각 (장면형 문서) */
  frame: [string, string];
  /** 작은 영문 표제 — 조직 서식에만 둔다. 장면형 문서에는 두지 않는다 (사고 서식 회피) */
  eyebrow?: string;
  title: string;
  state: GameState;
  body: ProseVariant[];
  ariaLabel?: string;
  /** `document` 뒤에 붙는 수식 클래스 — 화면별 스타일 훅 */
  className?: string;
  /** 본문을 다 읽은 뒤에만 렌더된다 — 행동·선택지·닫기 버튼 */
  children?: ReactNode;
}

export function OverlayShell({
  frame,
  eyebrow,
  title,
  state,
  body,
  ariaLabel,
  className,
  children,
}: OverlayShellProps) {
  return (
    <article className={`document${className ? ` ${className}` : ''}`} aria-label={ariaLabel}>
      <header className="document-header">
        <span>{frame[0]}</span>
        <span>{frame[1]}</span>
      </header>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      <PagedCopy state={state} body={body} className="document-copy narrative">
        {children}
      </PagedCopy>
    </article>
  );
}
