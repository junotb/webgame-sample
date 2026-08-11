'use client';

/**
 * L2 참조 패널 — 재열람 서류함 (v3 §7, UI 층위 사양 §4).
 *
 * 본문은 저장돼 있지 않다. 지금의 나로 다시 렌더링한다 —
 * 그 계약은 core/rerender의 `renderArchiveEntry`가 진다 (세션 ⑤).
 * 이 패널은 목록의 형태(일기·색인·장 넘김)와 앵커 표기만 맡는다.
 *
 * 형태는 **일기**다: 왼쪽에 겪은 순서대로 색인이 쌓이고, 오른쪽에 한 건만 펼쳐진다.
 * 전부 세로로 늘어놓으면 로그창이 되고, 넘겨보는 행위 — 즉 "다시 읽는다" — 가 사라진다.
 *
 * 스크롤은 없다 (ui-screen-spec §0-2): 색인은 장 단위로 넘기고,
 * 본문은 분절(PagedCopy)로 읽는다 — 다시 읽는 것도 읽는 것이다.
 *
 * 검색·필터·정렬·비교·변경 강조를 넣지 않는다. v3 §0의 강조 표시 기각 논리가
 * 그대로 적용된다: 화면이 "여기가 달라졌습니다"를 대신 말하면 통보가 되고,
 * 검증 목표 3의 통과 조건(확신하지 못한 채 다시 읽게 되는가)이 성립하지 않는다.
 */
import { useState } from 'react';
import { renderArchiveEntry } from '../core/rerender';
import type { ArchiveEntry, ContentBundle, GameState } from '../core/schema';
import { PagedCopy } from './paged-copy';
import { KIND_LABELS } from './ui-labels';

/** 색인 한 장의 건수 — 가로모드 세로 예산(≈330px) 안에서 pager와 함께 서는 수 */
const INDEX_PAGE_SIZE = 4;

/** 색인의 앵커 — 불변이다. 제목만 달라진 채 같은 표식이 세로로 반복된다 (v3 §7) */
function anchorOf(entry: ArchiveEntry, content: ContentBundle): string {
  if (entry.kind === 'order') {
    const t = content.orderTemplates.find((t) => t.id === entry.templateId);
    return t ? KIND_LABELS[t.kind] : '';
  }
  if (entry.kind === 'storylet') return '면담';
  if (entry.kind === 'notice') return '통지'; // 주 단위 구분선 역할 — 아이콘 없음 (CLAUDE.md 평가 절)
  return '신고';
}

export function ArchivePanel({ state, content }: { state: GameState; content: ContentBundle }) {
  const documents = state.world.archive
    .map((entry) => {
      const rendered = renderArchiveEntry(entry, state, content);
      return rendered ? { day: entry.day, anchor: anchorOf(entry, content), ...rendered } : null;
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  const [selected, setSelected] = useState(0);
  const [page, setPage] = useState(0);

  if (documents.length === 0) {
    return <p className="empty-notice">보관된 문서가 없습니다.</p>;
  }

  const pageCount = Math.ceil(documents.length / INDEX_PAGE_SIZE);
  const currentPage = Math.min(page, pageCount - 1);
  const pageOffset = currentPage * INDEX_PAGE_SIZE;
  const pageDocuments = documents.slice(pageOffset, pageOffset + INDEX_PAGE_SIZE);

  const open = documents[Math.min(selected, documents.length - 1)];

  return (
    <section className="archive" aria-label="서류함">
      <div className="archive-list">
        <ol className="archive-index">
          {pageDocuments.map((doc, i) => {
            const index = pageOffset + i;
            return (
              <li key={`${doc.day}-${index}`}>
                <button
                  className="archive-entry"
                  aria-current={index === selected}
                  onClick={() => setSelected(index)}
                >
                  <span className="archive-day">DAY {String(doc.day).padStart(2, '0')}</span>
                  <span className="archive-anchor">{doc.anchor}</span>
                  <span className="archive-title">{doc.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
        {pageCount > 1 ? (
          <nav className="archive-pager" aria-label="색인 장 넘김">
            <button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
              ← 앞 장
            </button>
            <span>
              {currentPage + 1} / {pageCount}
            </span>
            <button disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>
              뒷장 →
            </button>
          </nav>
        ) : null}
      </div>

      <article className="document archive-open">
        <header className="document-header">
          <span>보관 문서 {String(documents.indexOf(open) + 1).padStart(2, '0')}</span>
          <span>재열람</span>
        </header>
        <h3>{open.title}</h3>
        {/* key — 다른 문서를 고르면 처음부터 다시 읽는다 (같은 문서 재선택은 유지).
            본문은 재렌더가 이미 선택을 끝낸 문장들 — 무조건 변형 하나로 감싼다 */}
        <PagedCopy key={documents.indexOf(open)} state={state} body={[{ paragraphs: open.paragraphs }]} />
      </article>
    </section>
  );
}
