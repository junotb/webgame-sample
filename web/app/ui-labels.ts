/**
 * UI 공용 라벨 — 층 컴포넌트들이 공유한다.
 * (encounter-view가 game-view에서 checkLabel을 가져오던 역참조를 여기로 푼다)
 */
import { checkProbability } from '../core/checks';
import { SKILL_LABELS, STAT_LABELS } from '../core/reducer';
import type { CardFace, Check, DayPhase, GameState, ZoneId } from '../core/schema';

/** 판정 표기: "각인학 · 72%" — 트리아지 고민의 재료 (v3 §4, v1 실패 처방) */
export function checkLabel(check: Check, self: GameState['self']): string {
  if (check.kind === 'auto') return '판정 없음';
  const name = check.kind === 'narrow' ? SKILL_LABELS[check.skill] : STAT_LABELS[check.stat];
  const p = Math.round(checkProbability(check, self.stats, self.skills) * 100);
  return `${name} · ${p}%`;
}

/**
 * 구역 표기 — 행정 코드가 아니라 사람들이 부르는 이름 (open-questions D).
 * d5 = 서편 거주구역 (2026-08-07 확정): 도시 서쪽의 하위 거주구, 화자의 집이 있다.
 * 특이 지형은 하수도 — 회색 폭포(하수가 공중도시 밖으로 떨어지는 곳),
 * 인공습지(하층민들이 하수를 정화하는 갈대밭)가 여기 딸려 있다.
 * d2/d7은 고유명사 미정 — 행정 코드로 남는다.
 */
export const ZONE_LABELS: Record<ZoneId, string> = {
  d2: '제2구역',
  d5: '서편 거주구역',
  d7: '제7구역',
};

export const WEEKDAY_LABELS: Record<number, string> = { 1: '월', 2: '화', 3: '수', 4: '목', 5: '금' };

/** 일일 개시 오버레이용 — 하루에 한 번 크게 나오는 자리에서는 한 글자로 두지 않는다 */
export const WEEKDAY_FULL: Record<number, string> = {
  1: '월요일',
  2: '화요일',
  3: '수요일',
  4: '목요일',
  5: '금요일',
};

/**
 * 카드 표면 분류 5종 (v3 §4 확정) — 이것은 분류명이지 얼굴 문구가 아니다.
 * "정기 순시" / "미확인 구간 확인" 같은 표현 변형은 지시서의 title이 담당하며,
 * 아이콘 어휘가 일대일로 대응하는 대상은 이 다섯 개다.
 */
export const FACE_LABELS: Record<CardFace, string> = {
  inspection: '점검',
  patrol: '순찰',
  liaison: '보고',
  supply: '자재',
  survey: '탐사',
};

/** 단계 라벨 — 상단 띠에서는 쓰지 않는다 (화면이 이미 말하고 있다). 오버레이 내부 표기용 */
export const PHASE_LABELS: Record<DayPhase, string> = {
  morning: '업무 개시',
  field: '현장 처리',
  event: '특이 사항',
  closing: '일일 정산',
  ended: '업무 종결',
};

/**
 * 시간 소모 표기 — "근무 1"이라는 내부 단위 대신 시간의 말로.
 * 하루 = 근무 슬롯 2이므로 1슬롯 = 반나절이다. "하루 소요"라는 제안을 받았으나
 * 슬롯 1은 하루의 절반이라 그대로 쓰면 거짓말이 된다 — 반나절/하루로 접는다.
 */
export function timeCostLabel(timeCost: number): string {
  if (timeCost <= 1) return '반나절';
  if (timeCost === 2) return '하루';
  return `${timeCost} 반나절`; // 슬라이스 밖의 값 — 나오면 콘텐츠를 의심할 것
}

export type SaveStatus = 'loading' | 'saving' | 'saved' | 'error';

export const SAVE_LABELS: Record<SaveStatus, string> = {
  loading: '세이브 확인 중',
  saving: '저장 중…',
  saved: '저장됨',
  error: '저장 확인 필요',
};
