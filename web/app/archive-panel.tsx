'use client';

/**
 * L2 참조 패널 — 재열람 서류함 (v3 §7).
 * 본문은 저장돼 있지 않다. 지금의 나로 다시 렌더링한다.
 */
import { bindVariants } from '../core/bind';
import { selectVariant } from '../core/reducer';
import type { ArchiveEntry, ContentBundle, GameState, TextVariant } from '../core/schema';

export function ArchivePanel({ state, content }: { state: GameState; content: ContentBundle }) {
  function resolveDocument(entry: ArchiveEntry): { title: string; body: TextVariant[] } | null {
    if (entry.kind === 'order') {
      const t = content.orderTemplates.find((t) => t.id === entry.templateId);
      return t ? { title: t.title, body: bindVariants(t.body, entry.zone) } : null;
    }
    if (entry.kind === 'storylet') {
      const s = content.storylets.find((s) => s.id === entry.id);
      return s ? { title: `면담록 ${s.id}`, body: s.body } : null;
    }
    const e = content.encounters.find((e) => e.id === entry.id);
    return e ? { title: e.title, body: bindVariants(e.intro, entry.zone) } : null;
  }
  const documents = state.world.archive
    .map((entry) => resolveDocument(entry))
    .filter((d): d is { title: string; body: TextVariant[] } => d !== null);
  if (documents.length === 0) {
    return <p className="empty-notice">보관된 문서가 없습니다.</p>;
  }
  return (
    <section className="document-stack" aria-label="서류함">
      {documents.map((doc, i) => (
        <article className="document" key={`${doc.title}-${i}`}>
          <header className="document-header">
            <span>보관 문서 {String(i + 1).padStart(2, '0')}</span>
            <span>재열람</span>
          </header>
          <h3>{doc.title}</h3>
          <p className="document-copy">{selectVariant(state, doc.body)}</p>
        </article>
      ))}
    </section>
  );
}
