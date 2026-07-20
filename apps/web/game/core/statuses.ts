/* =====================================================================
 * core/statuses.ts — 전투 상태(버프/디버프) 통합 정의 + 순수 상태 엔진
 * 두 전투 경로(core/battle-engine · scenes/explore 인라인)가 공유한다.
 * 새 상태이상은 여기에 id·이름·헬퍼를 더하고 각 전투 훅에서 호출한다.
 * ===================================================================== */

import type { ResistTable } from "../defs/damage";

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
  | "fear"
  /** 출혈/화상 — 자기 턴 시작마다 power 고정 피해 */
  | "bleed"
  | "burn"
  /** 감속/속박 — 행동 순서 감소. 속박은 이동도 막는 그리드 전투 표식 */
  | "slow"
  | "bind"
  /** 전투 버프 */
  | "atkup"
  | "defup"
  | "speedup"
  /** power만큼 피해를 대신 받는 보호막 */
  | "barrier"
  /** res에 기록된 타입별 피해 배율 */
  | "resistup";

export interface StatusInstance {
  id: BattleStatusId;
  /** 남은 턴 수. -1 = 턴 경과로 사라지지 않음(조건 해제/전투 종료까지) */
  turns: number;
  /** 효과 크기 (defdown: 방어 감소량, poison: 턴당 피해) */
  power?: number;
  /** 부여자 UnitId (taunt: 도발자, cover: 대신 맞는 아군) */
  src?: string;
  /** resistup 전용 타입별 최종 피해 배율 */
  res?: ResistTable;
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
  bleed: "출혈",
  burn: "화상",
  slow: "감속",
  bind: "속박",
  atkup: "공격 강화",
  defup: "방어 강화",
  speedup: "속도 강화",
  barrier: "보호막",
  resistup: "속성 보호",
};

/** 상태이상 계열 색 (배너·태그용) */
export const STATUS_COLOR: Partial<Record<BattleStatusId, number>> = {
  poison: 0x8fbf4a,
  sleep: 0x7fa8dc,
  paralyze: 0xe0d24a,
  fear: 0xb46ff0,
  bleed: 0xd94b5b,
  burn: 0xff7a3c,
  slow: 0x72b9df,
  bind: 0xc9a24a,
  atkup: 0xf06a55,
  defup: 0xd9c38c,
  speedup: 0x8fe0a0,
  barrier: 0x8fb7ff,
  resistup: 0xffe08a,
};

export const HARMFUL_STATUSES: BattleStatusId[] = [
  "taunt", "defdown", "silence", "poison", "sleep", "paralyze", "fear",
  "bleed", "burn", "slow", "bind",
];

export function isHarmfulStatus(id: BattleStatusId): boolean {
  return HARMFUL_STATUSES.includes(id);
}

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

export function damageOverTime(list: StatusInstance[]): { id: "poison" | "bleed" | "burn"; power: number }[] {
  return (["poison", "bleed", "burn"] as const)
    .map((id) => ({ id, power: findStatus(list, id)?.power ?? 0 }))
    .filter((dot) => dot.power > 0);
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

export function attackStatusMult(list: StatusInstance[]): number {
  return 1 + (findStatus(list, "atkup")?.power ?? 0) / 100;
}

export function defenseStatusBonus(list: StatusInstance[]): number {
  return findStatus(list, "defup")?.power ?? 0;
}

export function speedStatusMult(list: StatusInstance[]): number {
  const up = (findStatus(list, "speedup")?.power ?? 0) / 100;
  const slow = (findStatus(list, "slow")?.power ?? 0) / 100;
  const bound = findStatus(list, "bind") ? 0.5 : 1;
  return Math.max(0.25, (1 + up) * (1 - slow) * bound);
}

export function statusResist(list: StatusInstance[]): ResistTable | undefined {
  return findStatus(list, "resistup")?.res;
}

/** 해로운 상태를 모두 제거하고 제거된 id를 반환한다. */
export function cleanseStatuses(list: StatusInstance[]): BattleStatusId[] {
  const removed = list.filter((s) => isHarmfulStatus(s.id)).map((s) => s.id);
  for (const id of removed) removeStatus(list, id);
  return removed;
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
