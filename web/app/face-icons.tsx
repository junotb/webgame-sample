'use client';

/**
 * 표면 분류 아이콘 5종 (docs/icon-vocabulary.md, CLAUDE.md 아이콘 규칙).
 *
 * - 어휘 크기 = 표면 분류 5개와 **일대일**. 대응 대상은 `CardFace` 필드이지
 *   얼굴 문구가 아니다. Record 전수 매핑이라 분류가 늘면 타입이 먼저 막는다
 * - **상태에 반응해 변하지 않는다.** 노후도가 오르든 재발부든 같은 그림이다.
 *   아이콘은 앵커이고, 앵커가 흔들리면 "제목만 달라졌다"를 알아챌 수 없다 (v3 §7)
 * - 실제 층을 예고하지 않는다. 도면 기호처럼 중립적으로 그린다
 *
 * 등록부의 파일은 아직 미정이다(game-icons.net 임포트는 별도 라인).
 * 여기 있는 것은 절차적 폴백이며, 파일이 확정되면 이 모듈만 교체한다 —
 * 참조하는 쪽은 `CardFace`만 넘기므로 무변경이다.
 */
import type { CardFace } from '../core/schema';

/** 등록부의 의미 ID — 스펙 문서는 아이콘을 이 ID로만 언급한다 */
export const FACE_ICON_IDS: Record<CardFace, string> = {
  inspection: 'face-inspection',
  patrol: 'face-patrol',
  liaison: 'face-liaison',
  supply: 'face-supply',
  survey: 'face-survey',
};

const PATHS: Record<CardFace, React.ReactNode> = {
  // 점검 — 검사 틀 안의 확인 표시
  inspection: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" />
      <path d="M7.5 12.4l3 3 6-6.4" />
    </>
  ),
  // 순찰 — 닫힌 경로를 도는 화살
  patrol: (
    <>
      <path d="M20 12a8 8 0 1 1-3.1-6.3" />
      <path d="M17.4 2.6v3.4h-3.4" />
    </>
  ),
  // 보고 — 접힌 모서리의 서류
  liaison: (
    <>
      <path d="M5.5 3.5h9l5 5v12h-14z" />
      <path d="M14.5 3.5v5h5" />
      <path d="M8.5 13h7M8.5 16.5h4.5" />
    </>
  ),
  // 자재 — 봉인된 상자
  supply: (
    <>
      <path d="M3.5 7.5L12 3.5l8.5 4v9L12 20.5l-8.5-4z" />
      <path d="M3.5 7.5L12 11.5l8.5-4M12 11.5v9" />
    </>
  ),
  // 탐사 — 미확정 구간의 측점
  survey: (
    <>
      <path d="M12 3.5v17M3.5 12h17" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 3.5l3 3-3 3" />
    </>
  ),
};

export function FaceIcon({ face, className }: { face: CardFace; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      data-icon={FACE_ICON_IDS[face]}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
      viewBox="0 0 24 24"
    >
      {PATHS[face]}
    </svg>
  );
}
