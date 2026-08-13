/**
 * 미니게임 셸 (세션 ②) — 4종 공통 계약.
 * 구현(퍼즐 로직·렌더링)은 앱 층의 몫이고, 코어는 이 파일의 계약만 안다:
 * 난이도를 받아 결과 하나(MinigameResult)를 돌려주면 된다.
 * 성적 귀속은 확정 규칙 (완수→Perfect / 부분→Passed / 실패→Not Passed) —
 * 미니게임 구현이 등급을 직접 만들지 않는다.
 */
import type { CardKind, MinigameId, MinigameResult, WeeklyRating } from './schema';

/** 카드 종류 → 미니게임 1:1 (확정) — 유일한 대응표. 검증기·UI가 이 표만 본다 */
export const MINIGAME_OF_KIND: Record<CardKind, MinigameId> = {
  circuit: 'pipe',
  patrol: 'onestroke',
  material: 'block',
  incinerate: 'whack',
};

/** 성적 귀속 (2026-08-11 확정) — 유일한 결과→등급 변환 지점 */
export function gradeOf(result: MinigameResult): WeeklyRating {
  if (result === 'complete') return 'perfect';
  if (result === 'partial') return 'passed';
  return 'notPassed';
}

/**
 * 미니게임 세션 입력 — 앱 층 구현이 받는 전부.
 * difficulty는 카드의 difficultyBonus에서 온다 (상승의 축은 속도가 아니라 정체).
 * seed는 배치 재현용 — 코어 PRNG(world.seed)와 분리된 값이다 (성적은 판정이 아니므로).
 */
export interface MinigameSession {
  id: MinigameId;
  difficulty: number;
  seed: number;
}

/** 카드 종류 라벨이 아니라 미니게임 자체의 개발용 명칭 — 표면 층에 노출하지 않는다 */
export const MINIGAME_NAMES: Record<MinigameId, string> = {
  pipe: '파이프 퍼즐',
  // id 'onestroke'는 구 기사의 여행의 잔재 — 게임은 한붓 순찰로 재설계됨 (2026-08-11)
  onestroke: '한붓 순찰',
  block: '블록 퍼즐',
  whack: '선별 두더지 잡기',
};
