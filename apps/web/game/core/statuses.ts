/* =====================================================================
 * core/statuses.ts — 전투 상태(버프/디버프) 통합 정의 (순수 로직)
 * 새 상태이상은 여기에 id를 추가하고 battle-engine의 훅에서 처리한다.
 * ===================================================================== */

export type BattleStatusId =
  /** 방어 태세 — 받는 피해 감소. 자신의 다음 턴 시작까지 */
  | "guard"
  /** 가로막기 — 다음에 받는 공격 1회를 src 아군이 대신 맞는다 */
  | "cover"
  /** 도발 — src 아군만 공격. src가 쓰러지면 해제 */
  | "taunt"
  /** 방어력 감소 — power 만큼. 전투 종료까지 */
  | "defdown"
  /** 마법 봉인 — 다음 행동에서 마법(광역 특수기) 불가 */
  | "silence";

export interface StatusInstance {
  id: BattleStatusId;
  /** 남은 턴 수. -1 = 턴 경과로 사라지지 않음(조건 해제/전투 종료까지) */
  turns: number;
  /** 효과 크기 (defdown: 방어 감소량) */
  power?: number;
  /** 부여자 UnitId (taunt: 도발자, cover: 대신 맞는 아군) */
  src?: string;
}

export const STATUS_NAME: Record<BattleStatusId, string> = {
  guard: "방어",
  cover: "가로막기",
  taunt: "도발",
  defdown: "방어 감소",
  silence: "마법 봉인",
};

export function findStatus(list: StatusInstance[], id: BattleStatusId): StatusInstance | undefined {
  return list.find((s) => s.id === id);
}

export function removeStatus(list: StatusInstance[], id: BattleStatusId): void {
  const i = list.findIndex((s) => s.id === id);
  if (i >= 0) list.splice(i, 1);
}

/** 같은 상태는 하나만 유지 — 기존 것을 교체 (수치 병합은 호출부 책임) */
export function upsertStatus(list: StatusInstance[], inst: StatusInstance): void {
  removeStatus(list, inst.id);
  list.push(inst);
}
