'use client';

/**
 * L2 참조 패널 — 재열람 서류함 (v3 §7, UI 층위 사양 §4).
 *
 * 본문은 저장돼 있지 않다. 지금의 나로 다시 렌더링한다.
 *
 * 형태는 **일기**다: 왼쪽에 겪은 순서대로 색인이 쌓이고, 오른쪽에 한 건만 펼쳐진다.
 * 전부 세로로 늘어놓으면 로그창이 되고, 넘겨보는 행위 — 즉 "다시 읽는다" — 가 사라진다.
 *
 * 검색·필터·정렬·비교·변경 강조를 넣지 않는다. v3 §0의 강조 표시 기각 논리가
 * 그대로 적용된다: 화면이 "여기가 달라졌습니다"를 대신 말하면 통보가 되고,
 * 검증 목표 3의 통과 조건(확신하지 못한 채 다시 읽게 되는가)이 성립하지 않는다.
 */
import { useState } from 'react';
import { bindVariants } from '../core/bind';
import { selectVariant } from '../core/reducer';
import type { ArchiveEntry, ContentBundle, GameState, TextVariant } from '../core/schema';
import { FACE_LABELS } from './ui-labels';

interface ArchiveDocument {
  day: number;
  /** 색인의 앵커 — 불변이다. 제목만 달라진 채 같은 표식이 세로로 반복된다 (v3 §7) */
  anchor: string;
  title: string;
  body: TextVariant[];
}

function resolveDocument(entry: ArchiveEntry, content: ContentBundle): ArchiveDocument | null {
  if (entry.kind === 'order') {
    const t = content.orderTemplates.find((t) => t.id === entry.templateId);
    return t
      ? { day: entry.day, anchor: FACE_LABELS[t.face], title: t.title, body: bindVariants(t.body, entry.zone) }
      : null;
  }
  if (entry.kind === 'storylet') {
    const s = content.storylets.find((s) => s.id === entry.id);
    return s ? { day: entry.day, anchor: '면담', title: `면담록 ${s.id}`, body: s.body } : null;
  }
  const e = content.encounters.find((e) => e.id === entry.id);
  return e ? { day: entry.day, anchor: '신고', title: e.title, body: bindVariants(e.intro, entry.zone) } : null;
}

export function ArchivePanel({ state, content }: { state: GameState; content: ContentBundle }) {
  const documents = state.world.archive
    .map((entry) => resolveDocument(entry, content))
    .filter((d): d is ArchiveDocument => d !== null);

  const [selected, setSelected] = useState(0);

  if (documents.length === 0) {
    return <p className="empty-notice">보관된 문서가 없습니다.</p>;
  }

  const open = documents[Math.min(selected, documents.length - 1)];

  return (
    <section className="archive" aria-label="서류함">
      <ol className="archive-index">
        {documents.map((doc, i) => (
          <li key={`${doc.title}-${i}`}>
            <button
              className="archive-entry"
              aria-current={i === selected}
              onClick={() => setSelected(i)}
            >
              <span className="archive-day">DAY {String(doc.day).padStart(2, '0')}</span>
              <span className="archive-anchor">{doc.anchor}</span>
              <span className="archive-title">{doc.title}</span>
            </button>
          </li>
        ))}
      </ol>

      <article className="document archive-open">
        <header className="document-header">
          <span>보관 문서 {String(documents.indexOf(open) + 1).padStart(2, '0')}</span>
          <span>재열람</span>
        </header>
        <h3>{open.title}</h3>
        <p className="document-copy">{selectVariant(state, open.body)}</p>
      </article>
    </section>
  );
}
