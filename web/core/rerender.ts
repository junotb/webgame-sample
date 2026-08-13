/**
 * 완곡어 재렌더 (design-structure §8) — `(문서 항목, 현재 상태) → 문장`.
 *
 * 재열람 서류함의 계약이 이 함수 하나로 선다: 본문은 저장돼 있지 않고,
 * 열 때마다 **현재** 상태(기억·기술·정체)로 변형이 다시 선택된다.
 * "그때 값으로 렌더링"은 금지 — entry의 day는 처음 겪은 날의 기록일 뿐,
 * 선택에 관여하지 않는다 (테스트로 고정).
 *
 * 특수 카드 보류로 기억이 0에 고정된 지금은 언제나 같은 문장이 나온다.
 * 그 "똑같음"이 기준선이다 — 보류 해제 후 이 함수의 출력이 달라지는 것이
 * 완곡어가 작동하는 자리다.
 */
import { bindVariants } from './bind';
import { selectProse, selectVariant } from './conditions';
import type { ArchiveEntry, ContentBundle, GameState } from './schema';

export interface RenderedDocument {
  /** 완곡어 축이 실린 한 줄 — 제목 변형이 현재 상태로 판정된 결과 */
  title: string;
  /** 본문 문단 — 변형 선택까지 끝난 최종 문장들 */
  paragraphs: string[];
}

/**
 * 서류함 항목 하나를 현재 상태로 렌더링한다.
 * 콘텐츠에 없는 참조(폐기된 문서 등)는 null — 목록에서 조용히 빠진다.
 */
export function renderArchiveEntry(
  entry: ArchiveEntry,
  state: GameState,
  content: ContentBundle,
): RenderedDocument | null {
  switch (entry.kind) {
    case 'order': {
      const t = content.orderTemplates.find((t) => t.id === entry.templateId);
      if (!t) return null;
      return {
        title: selectVariant(state, bindVariants(t.title, entry.zone)),
        paragraphs: selectProse(state, bindVariants(t.body, entry.zone)),
      };
    }
    case 'storylet': {
      const s = content.storylets.find((s) => s.id === entry.id);
      if (!s) return null;
      return { title: `면담록 ${s.id}`, paragraphs: selectProse(state, s.body) };
    }
    case 'encounter': {
      const e = content.encounters.find((e) => e.id === entry.id);
      if (!e) return null;
      return { title: e.title, paragraphs: selectProse(state, bindVariants(e.intro, entry.zone)) };
    }
    case 'notice': {
      // 등급은 상태값(weekRatings)이 들고 있다 — 본문은 등급의 통지서를 현재 상태로 렌더
      const rating = state.world.weekRatings[entry.week];
      if (!rating) return null;
      return {
        title: `제${entry.week}주 평가 통지서`,
        paragraphs: selectProse(state, content.weeklyNotice[rating]),
      };
    }
  }
}
