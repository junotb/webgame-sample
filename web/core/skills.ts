/**
 * 기술 경험치 (2026-08-06 결정 — open-questions B를 "카드 선택 경험치"로 확정).
 *
 * 원칙: **경험치가 원본, 등급은 파생.** 정체 밴드와 같은 패턴이다.
 * 콘텐츠는 `self.skillXp.*`에만 쓰고, `self.skills.*`(등급)는 효과 적용기가
 * 경험치에서 승격시킨다 — 등급에 직접 쓰는 경로는 타입과 검증기가 막는다.
 * 판정·조건은 지금처럼 등급을 읽는다.
 *
 * 경험치는 처리량이 아니라 **선택**에서 온다: 자동 지급이 없고 콘텐츠 효과가
 * 옵션마다 값을 정한다. open-questions B가 우려한 "많이 처리 = 강해짐"과
 * 트리아지 최적화 붕괴는 이 지점에서 갈라진다.
 */

export const XP_PER_LEVEL = 8;
export const SKILL_LEVEL_MAX = 7;
/** 등급 7 도달 이후의 경험치는 의미가 없다 — 여기서 클램프 */
export const SKILL_XP_MAX = (SKILL_LEVEL_MAX - 1) * XP_PER_LEVEL;

/** 등급 1이 기본 소양 (신입 = 경험치 0, 등급 1) */
export function skillLevelOf(xp: number): number {
  return Math.min(SKILL_LEVEL_MAX, 1 + Math.floor(xp / XP_PER_LEVEL));
}

/** 현재 등급 안에서 찬 경험치 — 바 렌더용. 최대 등급이면 가득 찬 것으로 본다 */
export function xpIntoLevel(xp: number): number {
  return skillLevelOf(xp) >= SKILL_LEVEL_MAX ? XP_PER_LEVEL : xp % XP_PER_LEVEL;
}
