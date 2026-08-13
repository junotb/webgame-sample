"use client";

/**
 * 카드 종류 아이콘 4종 (CLAUDE.md 아이콘 규칙, 카드 리뉴얼 확정).
 *
 * - 어휘 크기 = 카드 종류 4개와 **일대일**. 대응 대상은 `CardKind` 필드이지
 *   얼굴 문구가 아니다. Record 전수 매핑이라 종류가 늘면 타입이 먼저 막는다
 * - **상태에 반응해 변하지 않는다.** 정체가 오르든 재발부든 같은 그림이다.
 *   아이콘은 앵커이고, 앵커가 흔들리면 "제목만 달라졌다"를 알아챌 수 없다 (v3 §7)
 * - 실제 층을 예고하지 않는다. 도면 기호처럼 중립적으로 그린다
 *
 * 등록부의 파일은 아직 미정이다(game-icons.net 임포트는 별도 라인).
 * 여기 있는 것은 절차적 폴백이며, 파일이 확정되면 이 모듈만 교체한다 —
 * 참조하는 쪽은 `CardKind`만 넘기므로 무변경이다.
 */
import type { CardKind } from "../core/schema";

/** 등록부의 의미 ID — 스펙 문서는 아이콘을 이 ID로만 언급한다 */
export const KIND_ICON_IDS: Record<CardKind, string> = {
  circuit: "kind-circuit",
  patrol: "kind-patrol",
  material: "kind-material",
  incinerate: "kind-incinerate",
};

const PATHS: Record<CardKind, React.ReactNode> = {
  // 마력회로 점검 — 검사 틀 안의 확인 표시
  circuit: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" />
      <path d="M7.5 12.4l3 3 6-6.4" />
    </>
  ),
  // 구역 순찰 — 닫힌 경로를 도는 화살
  patrol: (
    <>
      <path d="M20 12a8 8 0 1 1-3.1-6.3" />
      <path d="M17.4 2.6v3.4h-3.4" />
    </>
  ),
  // 자재 옮기기 — 봉인된 상자
  material: (
    <>
      <path d="M3.5 7.5L12 3.5l8.5 4v9L12 20.5l-8.5-4z" />
      <path d="M3.5 7.5L12 11.5l8.5-4M12 11.5v9" />
    </>
  ),
  // 불순물 소각 — 화구 위의 불 (업무 설비의 기호이지 경고 표식이 아니다)
  incinerate: (
    <>
      <path d="M12 3.5c1.6 2.4 4.4 4.2 4.4 7.3a4.4 4.4 0 0 1-8.8 0c0-3.1 2.8-4.9 4.4-7.3z" />
      <path d="M5 20.5h14" />
    </>
  ),
};

export function KindIcon({
  kind,
  className,
}: {
  kind: CardKind;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      data-icon={KIND_ICON_IDS[kind]}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
      viewBox="0 0 24 24"
    >
      {PATHS[kind]}
    </svg>
  );
}
