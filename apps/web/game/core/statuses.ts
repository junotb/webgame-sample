/* =====================================================================
 * core/statuses.ts — 전투 상태(버프/디버프) 통합 정의 + 순수 상태 엔진
 * 두 전투 경로(core/battle-engine · scenes/explore 인라인)가 공유한다.
 * 새 상태이상은 여기에 id·이름·헬퍼를 더하고 각 전투 훅에서 호출한다.
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
  | "silence"
  /** 중독 — 자기 턴 시작마다 power 만큼 고정 피해 (방어·저항 무시) */
  | "poison"
  /** 수면 — 행동 불가. 피해를 받으면 즉시 깨어난다 */
  | "sleep"
  /** 마비 — 행동 불가. 피해로는 풀리지 않는다 */
  | "paralyze"
  /** 공포 — 자신의 공격이 불리(disadvantage)로 굴려진다 */
  | "fear";

export interface StatusInstance {
  id: BattleStatusId;
  /** 남은 턴 수. -1 = 턴 경과로 사라지지 않음(조건 해제/전투 종료까지) */
  turns: number;
  /** 효과 크기 (defdown: 방어 감소량, poison: 턴당 피해) */
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
  poison: "중독",
  sleep: "수면",
  paralyze: "마비",
  fear: "공포",
};

/** 상태이상 계열 색 (배너·태그용) */
export const STATUS_COLOR: Partial<Record<BattleStatusId, number>> = {
  poison: 0x8fbf4a,
  sleep: 0x7fa8dc,
  paralyze: 0xe0d24a,
  fear: 0xb46ff0,
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

/* ===== 순수 상태 엔진 (전투 경로 공용) ===== */

/** 중독 피해량 — 걸려있지 않으면 0 */
export function poisonPower(list: StatusInstance[]): number {
  return findStatus(list, "poison")?.power ?? 0;
}

/** 행동 불가 상태면 그 id(sleep/paralyze), 아니면 null */
export function incapacitatedBy(list: StatusInstance[]): "sleep" | "paralyze" | null {
  if (findStatus(list, "sleep")) return "sleep";
  if (findStatus(list, "paralyze")) return "paralyze";
  return null;
}

/** 공포 상태 — 공격이 불리하게 굴려진다 */
export function isFeared(list: StatusInstance[]): boolean {
  return !!findStatus(list, "fear");
}

/** 피해를 받았을 때 수면 해제 — 자고 있었으면 true (해제됨) */
export function wakeOnDamage(list: StatusInstance[]): boolean {
  if (findStatus(list, "sleep")) { removeStatus(list, "sleep"); return true; }
  return false;
}

/** 턴 경과 처리 — turns>0 상태를 1 감소, 0이 된 것은 제거하고 그 id 목록 반환.
 *  turns<0(영구/조건 해제) 상태는 건드리지 않는다. */
export function tickDurations(list: StatusInstance[]): BattleStatusId[] {
  const expired: BattleStatusId[] = [];
  for (const s of [...list]) {
    if (s.turns > 0) {
      s.turns--;
      if (s.turns <= 0) { removeStatus(list, s.id); expired.push(s.id); }
    }
  }
  return expired;
}
