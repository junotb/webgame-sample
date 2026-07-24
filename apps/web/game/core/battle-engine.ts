/* =====================================================================
 * core/battle-engine.ts — 순수 전투 엔진 (PIXI 비의존)
 * 상태 + 행동 → BattleEvent 배열. 연출/입력은 scenes/battle.ts가 담당.
 * Member(HP/MP)와 items는 참조로 받아 직접 갱신한다 (기존 동작 유지).
 * ===================================================================== */
import {
  CONSUMABLES, ConsumableId, DamageType,
  ENEMY_DEFS, EnemyDef, RANK_NAME, ResistBand, ResistTable, Tier,
  SKILLS, attackDamageType, attackDamageTypes, enemyAC, enemyAcc, enemyAttackTypes,
  enemyInflictDC, enemyMelee, enemySave, enemyStatusImmune,
} from "../defs";
import { BattleAbility, GridEnemy, Member, Stats, allyAccuracy, attackReach, equippedWeapon, memberResist, memberStats, rankMult } from "../state";
import { rollSave } from "./dice";
import { healAmount, rollAllyHit, rollEnemyHit } from "./formulas";
import { gameplayRandom } from "./random";
import {
  BattleStatusId, STATUS_NAME, StatusInstance, attackStatusMult, cleanseStatuses,
  damageOverTime, defenseStatusBonus, findStatus, incapacitatedBy, isFeared,
  removeStatus, speedStatusMult, statusResist, tickDurations, upsertStatus, wakeOnDamage,
} from "./statuses";

export type UnitId = string;

export interface EngineAlly {
  kind: "ally";
  id: UnitId;
  m: Member;
  statuses: StatusInstance[];
}
export interface EngineEnemy {
  kind: "enemy";
  id: UnitId;
  defId: string;
  def: EnemyDef;
  hp: number; maxHp: number;
  atk: number; defv: number; spd: number;
  alive: boolean;
  statuses: StatusInstance[];
  /** 그리드 전투에서 사용하는 실제 월드 적. 값 변경 후 이 객체로 동기화한다. */
  source?: GridEnemy;
}
export type EngineUnit = EngineAlly | EngineEnemy;

/** 커맨드 "공격" — ABILITIES에 없는 무랭크 기본기 (mult 1 고정) */
export const BASIC_ATTACK: BattleAbility = {
  id: "", skill: "blade", min: 1, name: "공격", mp: 0, pow: 1.0, hits: 1,
  kind: "phys", desc: "기본 공격", rank: 1,
};

export type BattleEvent =
  | { t: "round"; order: UnitId[] }
  | { t: "turn"; unit: UnitId }
  | { t: "log"; text: string }
  /** 공격 전진/복귀 연출 지점 */
  | { t: "lunge"; unit: UnitId }
  | { t: "return"; unit: UnitId }
  | { t: "hit"; unit: UnitId; target: UnitId; amount: number; crit: boolean; mag: boolean; resist?: ResistBand; dtype: DamageType }
  /** 지속 피해(중독 등) — 자기 턴 시작에 발생 */
  | { t: "tick"; unit: UnitId; amount: number; status: BattleStatusId }
  /** 행동 불가(수면/마비)로 턴을 건너뜀 */
  | { t: "incap"; unit: UnitId; status: BattleStatusId }
  /** 명중 굴림 실패 — 공격이 빗나감 */
  | { t: "miss"; unit: UnitId; target: UnitId }
  /** 내성 굴림 성공 — 제어 효과를 저항해 무효화 */
  | { t: "save"; target: UnitId; status: BattleStatusId }
  | { t: "healed"; target: UnitId; amount: number; resource: "hp" | "mp" }
  | { t: "drain"; unit: UnitId; amount: number }
  | { t: "status"; target: UnitId; status: BattleStatusId; on: boolean; power?: number }
  | { t: "cover"; guard: UnitId; covered: UnitId }
  | { t: "death"; unit: UnitId }
  | { t: "guard"; unit: UnitId }
  | { t: "flee"; ok: boolean }
  | { t: "end"; result: "victory" | "defeat" };

export type AllyAction =
  /** target: 단일 공격형은 적, heal/cover는 아군. all 기술은 생략 */
  | { type: "ability"; ability: BattleAbility; target?: UnitId }
  | { type: "guard" }
  | { type: "item"; item: ConsumableId; target: UnitId }
  /** 전열↔후열 이동 — 턴을 소모한다. 전열 최소 인원 검증은 UI가 담당 */
  | { type: "formation" }
  | { type: "flee" };

export type BattleResult = "victory" | "defeat" | "fled";

export type TurnState =
  | { kind: "player"; unit: UnitId; events: BattleEvent[] }
  | { kind: "over"; result: BattleResult; events: BattleEvent[] };

export type ActResult =
  | { kind: "acted"; events: BattleEvent[] }
  | { kind: "over"; result: BattleResult; events: BattleEvent[] };

export class BattleEngine {
  readonly allies: EngineAlly[];
  readonly enemies: EngineEnemy[];
  readonly tier: Tier;
  readonly blessMult: number;

  private items: Partial<Record<ConsumableId, number>>;
  private rng: () => number;
  private queue: UnitId[] = [];
  private qi = 0;
  private current: EngineAlly | null = null;
  private ended: BattleResult | null = null;
  /** 진형 교전 로그 — 같은 설명을 전투당 1회만 보여준다 */
  private rowLogs = { block: false, pierce: false, aoe: false };

  constructor(
    party: Member[],
    enemies: string[] | GridEnemy[],
    opts: { bless?: boolean; items?: Partial<Record<ConsumableId, number>>; rng?: () => number } = {},
  ) {
    this.allies = party.map((m) => ({ kind: "ally", id: `ally:${m.id}`, m, statuses: [] }));
    this.enemies = enemies.map((input, i) => {
      const source = typeof input === "string" ? undefined : input;
      const defId = typeof input === "string" ? input : input.defId;
      const d = ENEMY_DEFS[defId];
      return {
        kind: "enemy" as const, id: source?.id ?? `enemy:${i}`, defId, def: d,
        hp: source?.hp ?? d.hp, maxHp: d.hp, atk: d.atk, defv: d.def, spd: d.spd,
        alive: source?.alive ?? true, statuses: source?.statuses ?? [], source,
      };
    });
    this.tier = this.enemies.reduce<Tier>((top, e) => {
      const order: Tier[] = ["일반", "정예", "보스", "에픽"];
      return order.indexOf(e.def.tier) > order.indexOf(top) ? e.def.tier : top;
    }, "일반");
    this.blessMult = opts.bless ? 1.25 : 1;
    this.items = opts.items ?? {};
    this.rng = opts.rng ?? gameplayRandom;
  }

  /* ---- 조회 ---- */
  unit(id: UnitId): EngineUnit | undefined {
    return (this.allies as EngineUnit[]).concat(this.enemies).find((u) => u.id === id);
  }
  isDown(u: EngineAlly): boolean { return u.m.hp <= 0; }
  livingAllies(): EngineAlly[] { return this.allies.filter((u) => !this.isDown(u)); }
  aliveEnemies(): EngineEnemy[] { return this.enemies.filter((e) => e.alive); }
  hasStatus(id: UnitId, s: BattleStatusId): boolean {
    const u = this.unit(id);
    return !!u && !!findStatus(u.statuses, s);
  }
  get canFlee(): boolean { return this.tier === "일반"; }
  get result(): BattleResult | null { return this.ended; }

  /* ---- 그리드 탐험 어댑터 -------------------------------------------------
   * explore.ts는 이동·어그로·연출만 소유하고, 실제 전투 판정은 아래 API를
   * 통해 이 엔진 하나를 사용한다. 기존 next/act API도 같은 내부 메서드를
   * 호출하므로 독립 전투와 그리드 전투의 규칙이 갈라지지 않는다. */

  gridAllyStatuses(memberId: string): StatusInstance[] {
    return this.allies.find((u) => u.m.id === memberId)?.statuses ?? [];
  }

  gridBeginAllyTurn(memberId: string): BattleStatusId | null {
    const ally = this.allies.find((u) => u.m.id === memberId);
    if (!ally) return null;
    removeStatus(ally.statuses, "guard");
    return incapacitatedBy(ally.statuses);
  }

  gridEnter(): void {
    this.allies.forEach((u) => { u.statuses.length = 0; });
    this.enemies.forEach((e) => { e.statuses.length = 0; this.syncEnemy(e); });
  }

  gridExit(): void {
    this.allies.forEach((u) => { u.statuses.length = 0; });
    this.enemies.forEach((e) => { e.statuses.length = 0; this.syncEnemy(e); });
  }

  /** 세계 턴 단위 상태 처리. 사망 보상·연출은 반환 이벤트를 장면이 처리한다. */
  gridUpkeep(): BattleEvent[] {
    const ev: BattleEvent[] = [];
    for (const u of [...this.allies, ...this.enemies] as EngineUnit[]) {
      if (u.kind === "ally" ? this.isDown(u) : !u.alive) continue;
      for (const dot of damageOverTime(u.statuses)) {
        ev.push({ t: "tick", unit: u.id, amount: dot.power, status: dot.id });
        ev.push({ t: "log", text: `${this.uname(u)}이(가) ${STATUS_NAME[dot.id]}으로 ${dot.power} 피해!` });
        this.applyTrueDamage(u, dot.power, ev);
      }
      for (const id of tickDurations(u.statuses))
        ev.push({ t: "status", target: u.id, status: id, on: false });
      if (u.kind === "enemy") this.syncEnemy(u);
    }
    return ev;
  }

  gridGuard(memberId: string): BattleEvent[] {
    const actor = this.gridAlly(memberId);
    const ev: BattleEvent[] = [];
    upsertStatus(actor.statuses, { id: "guard", turns: -1 });
    actor.m.mp = Math.min(actor.m.maxMp, actor.m.mp + 3);
    ev.push({ t: "guard", unit: actor.id });
    ev.push({ t: "log", text: `${actor.m.name}, 방어 태세. (받는 피해 감소, MP 소량 회복)` });
    return ev;
  }

  gridSwapRow(memberId: string): BattleEvent[] {
    const actor = this.gridAlly(memberId);
    const ev: BattleEvent[] = [];
    this.execSwapRow(actor, ev);
    return ev;
  }

  gridOffense(memberId: string, ability: BattleAbility, enemyIds: string[]): BattleEvent[] {
    const actor = this.gridAlly(memberId);
    const targets = enemyIds.map((id) => this.enemyOf(id));
    const ev: BattleEvent[] = [];
    const spent = this.payMp(actor, ability);
    this.execOffense(actor, ability, targets, spent, ev);
    targets.forEach((e) => this.syncEnemy(e));
    return ev;
  }

  gridHeal(memberId: string, ability: BattleAbility, targetMemberId: string): BattleEvent[] {
    const actor = this.gridAlly(memberId);
    const target = this.gridAlly(targetMemberId);
    const ev: BattleEvent[] = [];
    this.payMp(actor, ability);
    this.execSupport(actor, ability, ability.allAllies ? this.allies.filter((u) => !this.isDown(u)) : [target], ev);
    return ev;
  }

  gridSupport(memberId: string, ability: BattleAbility, targetMemberId?: string): BattleEvent[] {
    const actor = this.gridAlly(memberId);
    const target = ability.target === "self" ? actor : targetMemberId ? this.gridAlly(targetMemberId) : actor;
    const ev: BattleEvent[] = [];
    this.payMp(actor, ability);
    const targets = ability.allAllies
      ? this.allies.filter((u) => !this.isDown(u) || ability.revive)
      : [target];
    this.execSupport(actor, ability, targets, ev);
    return ev;
  }

  gridCover(memberId: string, ability: BattleAbility, targetMemberId: string): BattleEvent[] {
    const actor = this.gridAlly(memberId);
    const target = this.gridAlly(targetMemberId);
    const ev: BattleEvent[] = [];
    this.payMp(actor, ability);
    this.execCover(actor, ability, target, ev);
    return ev;
  }

  gridItem(item: ConsumableId, targetMemberId: string): BattleEvent[] {
    const ev: BattleEvent[] = [];
    this.execItem(item, this.gridAlly(targetMemberId), ev);
    return ev;
  }

  /** 적의 이동/사거리 판정 후 호출. singleTargetIds는 진형을 반영한 단일공격 후보군이다. */
  gridEnemyAct(enemyId: string, singleTargetIds: string[]): BattleEvent[] {
    const ev: BattleEvent[] = [];
    const enemy = this.enemyOf(enemyId);
    const candidates = singleTargetIds.map((id) => this.gridAlly(id)).filter((u) => !this.isDown(u));
    this.enemyAct(enemy, ev, candidates);
    this.syncEnemy(enemy);
    return ev;
  }

  /* ---- 진행: 다음 아군 턴까지 자동 진행 (적 턴은 즉시 실행) ---- */
  next(): TurnState {
    const ev: BattleEvent[] = [];
    for (;;) {
      const end = this.checkEnd(ev);
      if (end) return { kind: "over", result: end, events: ev };
      if (this.qi >= this.queue.length) this.buildRound(ev);
      const u = this.unit(this.queue[this.qi++]);
      if (!u) continue;
      if (u.kind === "ally") {
        if (this.isDown(u)) continue;
        const st = this.beginTurn(u, ev); // 중독 피해·행동불가 판정
        if (st === "dead") { if (this.checkEnd(ev)) return { kind: "over", result: this.ended!, events: ev }; continue; }
        if (st === "skip") continue; // 수면/마비 — 지속시간 감소는 beginTurn이 처리
        removeStatus(u.statuses, "guard"); // 방어 태세는 자신의 다음 턴 시작까지
        this.current = u;
        ev.push({ t: "turn", unit: u.id });
        ev.push({ t: "log", text: `${u.m.name}의 턴. 행동을 선택하세요.` });
        return { kind: "player", unit: u.id, events: ev };
      }
      if (!u.alive) continue;
      const st = this.beginTurn(u, ev);
      if (st === "dead") { if (this.checkEnd(ev)) return { kind: "over", result: this.ended!, events: ev }; continue; }
      if (st === "skip") continue;
      this.enemyAct(u, ev);
      this.endTurn(u, ev);
      const end2 = this.checkEnd(ev);
      if (end2) return { kind: "over", result: end2, events: ev };
    }
  }

  /** 유닛 표시 이름 */
  private uname(u: EngineUnit): string {
    return u.kind === "ally" ? u.m.name : u.def.name;
  }

  /** 턴 시작 처리 — 중독 지속피해 → 행동불가(수면/마비) 판정.
   *  "act"=행동 가능, "skip"=행동 불가(지속시간 감소 완료), "dead"=중독으로 사망 */
  private beginTurn(u: EngineUnit, ev: BattleEvent[]): "act" | "skip" | "dead" {
    for (const dot of damageOverTime(u.statuses)) {
      ev.push({ t: "tick", unit: u.id, amount: dot.power, status: dot.id });
      ev.push({ t: "log", text: `${this.uname(u)}이(가) ${STATUS_NAME[dot.id]}으로 ${dot.power} 피해!` });
      if (this.applyTrueDamage(u, dot.power, ev)) return "dead";
    }
    const incap = incapacitatedBy(u.statuses);
    if (incap) {
      ev.push({ t: "incap", unit: u.id, status: incap });
      ev.push({ t: "log", text: `${this.uname(u)}은(는) ${incap === "sleep" ? "잠들어" : "마비되어"} 움직일 수 없다!` });
      this.endTurn(u, ev);
      return "skip";
    }
    return "act";
  }

  /** 턴 종료 — 지속시간 감소, 만료 상태를 off 이벤트로 알림 */
  private endTurn(u: EngineUnit, ev: BattleEvent[]): void {
    for (const id of tickDurations(u.statuses))
      ev.push({ t: "status", target: u.id, status: id, on: false });
  }

  /** 방어·저항 무시 고정 피해(중독 등). 사망 시 true */
  private applyTrueDamage(u: EngineUnit, amount: number, ev: BattleEvent[]): boolean {
    if (u.kind === "ally") {
      u.m.hp = Math.max(0, u.m.hp - amount);
      if (u.m.hp <= 0) { ev.push({ t: "death", unit: u.id }); return true; }
    } else {
      u.hp -= amount;
      if (u.hp <= 0) { u.hp = 0; u.alive = false; ev.push({ t: "death", unit: u.id }); return true; }
    }
    return false;
  }

  /* ---- 현재 아군의 행동 실행 ---- */
  act(action: AllyAction): ActResult {
    const ev: BattleEvent[] = [];
    if (this.ended) return { kind: "over", result: this.ended, events: ev };
    const actor = this.current;
    if (!actor) throw new Error("BattleEngine.act(): 아군 턴이 아니다");
    this.current = null;

    switch (action.type) {
      case "ability": {
        const a = action.ability;
        const spent = this.payMp(actor, a);
        if (a.cover) this.execCover(actor, a, this.allyOf(action.target!), ev);
        else if (a.target === "ally" || a.target === "self" || a.kind === "heal") {
          const target = a.target === "self" ? actor : this.allyOf(action.target!);
          const targets = a.allAllies ? this.allies.filter((u) => !this.isDown(u) || a.revive) : [target];
          this.execSupport(actor, a, targets, ev);
        }
        else {
          const targets = a.all ? this.aliveEnemies() : [this.enemyOf(action.target!)];
          this.execOffense(actor, a, targets, spent, ev);
        }
        break;
      }
      case "guard":
        upsertStatus(actor.statuses, { id: "guard", turns: -1 });
        actor.m.mp = Math.min(actor.m.maxMp, actor.m.mp + 3);
        ev.push({ t: "guard", unit: actor.id });
        ev.push({ t: "log", text: `${actor.m.name}, 방어 태세. (받는 피해 감소, MP 소량 회복)` });
        break;
      case "item":
        this.execItem(action.item, this.allyOf(action.target), ev);
        break;
      case "formation":
        this.execSwapRow(actor, ev);
        break;
      case "flee": {
        if (this.canFlee && this.rng() < 0.6) {
          ev.push({ t: "log", text: "일행은 무사히 도망쳤다!" });
          ev.push({ t: "flee", ok: true });
          this.ended = "fled";
          return { kind: "over", result: "fled", events: ev };
        }
        ev.push({ t: "log", text: "도망칠 수 없다!" });
        ev.push({ t: "flee", ok: false });
        break;
      }
    }

    this.endTurn(actor, ev); // 행동을 마쳤으니 자신의 상태 지속시간 감소
    const end = this.checkEnd(ev);
    if (end) return { kind: "over", result: end, events: ev };
    return { kind: "acted", events: ev };
  }

  /* ---- 내부 ---- */
  private execSwapRow(actor: EngineAlly, ev: BattleEvent[]): void {
    actor.m.back = !actor.m.back;
    ev.push({
      t: "log",
      text: actor.m.back
        ? `${actor.m.name}, 후열로 물러났다. (근접 면제·광역 감쇠, 원거리는 조준 보너스 — 창은 후열에서도 찌른다)`
        : `${actor.m.name}, 전열로 나섰다. (근접 적의 표적이 된다)`,
    });
  }

  private allyOf(id: UnitId): EngineAlly {
    const u = this.unit(id);
    if (!u || u.kind !== "ally") throw new Error(`아군이 아니다: ${id}`);
    return u;
  }
  private gridAlly(memberId: string): EngineAlly {
    const u = this.allies.find((a) => a.m.id === memberId || a.id === memberId);
    if (!u) throw new Error(`아군이 아니다: ${memberId}`);
    return u;
  }
  private enemyOf(id: UnitId): EngineEnemy {
    const u = this.unit(id);
    if (!u || u.kind !== "enemy") throw new Error(`적이 아니다: ${id}`);
    return u;
  }

  private syncEnemy(e: EngineEnemy): void {
    if (!e.source) return;
    e.source.hp = e.hp;
    e.source.alive = e.alive;
    e.source.statuses = e.statuses;
  }

  /** MP 지불 — manaBurn은 남은 MP 전부. 실제 소모량 반환 */
  private payMp(actor: EngineAlly, a: BattleAbility): number {
    if (a.manaBurn) {
      const spent = actor.m.mp;
      actor.m.mp = 0;
      return spent;
    }
    actor.m.mp -= a.mp;
    return a.mp;
  }

  private buildRound(ev: BattleEvent[]): void {
    const entries = [
      ...this.livingAllies().map((u) => ({ id: u.id, spd: memberStats(u.m).spd * speedStatusMult(u.statuses), ally: true })),
      ...this.aliveEnemies().map((e) => ({ id: e.id, spd: e.spd * speedStatusMult(e.statuses), ally: false })),
    ].map((e, i) => ({ ...e, i }));
    /* 속도 내림차순, 동률이면 아군 우선, 같은 진영끼리는 등록 순서 유지 */
    entries.sort((a, b) =>
      b.spd - a.spd || (a.ally === b.ally ? a.i - b.i : a.ally ? -1 : 1));
    this.queue = entries.map((e) => e.id);
    this.qi = 0;
    ev.push({ t: "round", order: [...this.queue] });
  }

  private checkEnd(ev: BattleEvent[]): BattleResult | null {
    if (this.ended) return this.ended;
    if (this.allies.every((u) => this.isDown(u))) this.ended = "defeat";
    else if (this.enemies.every((e) => !e.alive)) this.ended = "victory";
    if (this.ended === "victory" || this.ended === "defeat")
      ev.push({ t: "end", result: this.ended });
    return this.ended;
  }

  private execOffense(actor: EngineAlly, a: BattleAbility, targets: EngineEnemy[], spentMp: number, ev: BattleEvent[]): void {
    const s = memberStats(actor.m);
    const mult = a.id ? rankMult(a.rank) : 1;
    const weapon = equippedWeapon(actor.m);
    /* 후열 조준 — 원거리·마법 공격은 난전에서 벗어나 조준할 여유가 있다 (명중 +2 · 치명 +8%p) */
    const backline = actor.m.back && attackReach(a, weapon) === "ranged";
    /* 명중 보정 = 기본 숙련 + 민첩 수정치 + 숙련(랭크). 기본 공격도 rank 1 */
    const acc = allyAccuracy(s, a.rank) + (backline ? 2 : 0);
    /* 데미지 타입 — 물리는 장착 무기 계열, 마법은 스킬/명시 dtype */
    const dtype = attackDamageType(a, weapon.wtype);
    const damageTypes = attackDamageTypes(a, weapon.wtype);
    const adv: -1 | 0 | 1 = isFeared(actor.statuses) || !!findStatus(actor.statuses, "slow")
      ? -1
      : findStatus(actor.statuses, "speedup") ? 1 : 0;
    ev.push({ t: "log", text: `${actor.m.name}의 ${a.name}!${a.id ? ` [${RANK_NAME[a.rank]}]` : ""}` });
    ev.push({ t: "lunge", unit: actor.id });
    for (let h = 1; h <= a.hits; h++) {
      let totalDealt = 0;
      for (const e of targets) {
        if (!e.alive) continue;
        const tagMult = e.def.tags.reduce((best, tag) => Math.max(best, a.tagBonus?.[tag] ?? 1), 1);
        const hpCap = e.maxHp * (e.def.tier === "일반" || e.def.tier === "정예" ? 0.25 : 0.12);
        const currentHpBonus = a.currentHpPct ? Math.min(Math.round(e.hp * a.currentHpPct), Math.round(hpCap)) : 0;
        const roll = rollAllyHit(s, a, {
          mult,
          bless: this.blessMult,
          attackMult: attackStatusMult(actor.statuses),
          tagMult,
          enemyDef: e.defv,
          defDown: findStatus(e.statuses, "defdown")?.power ?? 0,
          bonus: a.manaBurn ? Math.round(spentMp * a.manaBurn) : 0,
          currentHpBonus,
          acc,
          targetAC: enemyAC(e.def),
          adv,
          critBonus: backline ? 0.08 : 0,
          dtype,
          damageTypes,
          res: e.def.res,
        }, this.rng);
        if (!roll.hit) {
          ev.push({ t: "miss", unit: actor.id, target: e.id });
          ev.push({ t: "log", text: `${e.def.name}에게 빗나갔다!` });
          continue;
        }
        let dealt = roll.dmg;
        const executable = !!a.execute && e.hp / e.maxHp <= a.execute
          && (e.def.tier === "일반" || e.def.tier === "정예") && dealt > 0;
        if (executable) dealt = e.hp;
        e.hp -= dealt;
        totalDealt += dealt;
        ev.push({ t: "hit", unit: actor.id, target: e.id, amount: dealt, crit: roll.crit, mag: a.kind === "mag", resist: roll.resist, dtype });
        if (executable) ev.push({ t: "log", text: `${e.def.name} 처형!` });
        if (roll.resist === "weak") ev.push({ t: "log", text: `약점을 찔렀다! ${e.def.name}에게 큰 피해!` });
        else if (roll.resist === "resist") ev.push({ t: "log", text: `${e.def.name}은(는) 피해를 견뎌냈다.` });
        else if (roll.resist === "immune") ev.push({ t: "log", text: `${e.def.name}에게 효과가 없다…` });
        if (dealt > 0 && e.hp > 0 && wakeOnDamage(e.statuses)) { // 수면은 피해로 깨어난다
          ev.push({ t: "status", target: e.id, status: "sleep", on: false });
          ev.push({ t: "log", text: `${e.def.name}이(가) 잠에서 깨어났다!` });
        }
        if (e.hp <= 0) {
          e.hp = 0;
          e.alive = false;
          ev.push({ t: "death", unit: e.id });
          ev.push({ t: "log", text: `${e.def.name}을(를) 쓰러뜨렸다!` });
        } else if (h === 1) {
          this.applyOnHitStatuses(actor, a, mult, e, ev, s);
        }
      }
      if (a.drain && totalDealt > 0) {
        const back = Math.round(totalDealt * a.drain);
        actor.m.hp = Math.min(actor.m.maxHp, actor.m.hp + back);
        ev.push({ t: "drain", unit: actor.id, amount: back });
      }
    }
    ev.push({ t: "return", unit: actor.id });
  }

  /** 제어기 내성 DC = 8 + 시전 능력치 수정치 + 숙련(랭크) (5e 주문 내성 DC와 동일) */
  private saveDC(s: Stats, a: BattleAbility): number {
    const attr = SKILLS[a.skill].castingAttr;
    const magKey = attr === "witint" ? Math.max(s.mods.wit, s.mods.int)
      : attr === "wit" ? s.mods.wit : s.mods.int;
    const key = a.kind === "mag" || a.kind === "heal" ? magKey : s.mods.might;
    return 8 + key + a.rank;
  }

  /** 적중 시 부가 효과 — 첫 타에 1회 (대상 생존 시). save 태그가 있으면 내성 굴림으로 저항 가능 */
  private applyOnHitStatuses(actor: EngineAlly, a: BattleAbility, mult: number, e: EngineEnemy, ev: BattleEvent[], s: Stats): void {
    /* 제어기(도발/봉인) 내성 판정 — 저항 시 효과 무효 (defDown은 물리 파쇄라 무저항) */
    const resisted = !!a.save && rollSave(this.rng, enemySave(e.def), this.saveDC(s, a));
    const blocked = (id: BattleStatusId) => resisted || enemyStatusImmune(e.def, id);
    if (a.taunt) {
      if (blocked("taunt")) ev.push({ t: "save", target: e.id, status: "taunt" });
      else {
        upsertStatus(e.statuses, { id: "taunt", turns: -1, src: actor.id });
        ev.push({ t: "status", target: e.id, status: "taunt", on: true });
      }
    }
    if (a.silence) {
      if (blocked("silence")) ev.push({ t: "save", target: e.id, status: "silence" });
      else {
        upsertStatus(e.statuses, { id: "silence", turns: 1 });
        ev.push({ t: "status", target: e.id, status: "silence", on: true });
      }
    }
    if (a.defDown) {
      const cur = findStatus(e.statuses, "defdown")?.power ?? 0;
      const power = Math.min(e.defv, Math.max(cur, Math.round(a.defDown * mult)));
      upsertStatus(e.statuses, { id: "defdown", turns: -1, power });
      ev.push({ t: "status", target: e.id, status: "defdown", on: true, power });
    }
    /* ---- 수면/마비/공포/중독 (내성 성공 시 무효) ---- */
    const applyCtrl = (id: BattleStatusId, turns: number, power?: number) => {
      if (blocked(id)) { ev.push({ t: "save", target: e.id, status: id }); return; }
      upsertStatus(e.statuses, { id, turns, power });
      ev.push({ t: "status", target: e.id, status: id, on: true, power });
    };
    if (a.sleep) applyCtrl("sleep", a.ctrlTurns ?? 3);
    if (a.paralyze) applyCtrl("paralyze", a.ctrlTurns ?? 2);
    if (a.fear) applyCtrl("fear", a.ctrlTurns ?? 3);
    if (a.poison) {
      if (blocked("poison")) ev.push({ t: "save", target: e.id, status: "poison" });
      else {
        const power = Math.max(1, Math.round(a.poison * mult));
        upsertStatus(e.statuses, { id: "poison", turns: a.ctrlTurns ?? 3, power });
        ev.push({ t: "status", target: e.id, status: "poison", on: true, power });
      }
    }
    if (a.bleed) applyCtrl("bleed", a.ctrlTurns ?? 3, Math.max(1, Math.round(a.bleed * mult)));
    if (a.burn) applyCtrl("burn", a.ctrlTurns ?? 3, Math.max(1, Math.round(a.burn * mult)));
    if (a.slow) applyCtrl("slow", a.ctrlTurns ?? 3, Math.min(75, Math.round(a.slow * (1 + (a.rank - 1) * 0.2))));
    if (a.bind) applyCtrl("bind", a.ctrlTurns ?? 2);
  }

  private execSupport(actor: EngineAlly, a: BattleAbility, targets: EngineAlly[], ev: BattleEvent[]): void {
    const scale = 1 + (a.rank - 1) * 0.35;
    ev.push({ t: "log", text: `${actor.m.name}의 ${a.name}!${a.id ? ` [${RANK_NAME[a.rank]}]` : ""}` });
    for (const target of targets) {
      if (this.isDown(target) && !a.revive) continue;
      if (a.revive && this.isDown(target)) {
        target.m.hp = 1;
        cleanseStatuses(target.statuses);
      }
      if (a.pow > 0) {
        const before = target.m.hp;
        const amt = healAmount(memberStats(actor.m), a, rankMult(a.rank));
        target.m.hp = Math.min(target.m.maxHp, target.m.hp + amt);
        const healed = target.m.hp - before;
        ev.push({ t: "healed", target: target.id, amount: healed, resource: "hp" });
      }
      if (a.cleanse) {
        for (const id of cleanseStatuses(target.statuses)) ev.push({ t: "status", target: target.id, status: id, on: false });
      }
      const turns = a.ctrlTurns ?? 3;
      const put = (id: BattleStatusId, power?: number, res?: ResistTable) => {
        upsertStatus(target.statuses, { id, turns, power, res });
        ev.push({ t: "status", target: target.id, status: id, on: true, power });
      };
      if (a.buffAttack) put("atkup", Math.round(a.buffAttack * scale));
      if (a.buffDefense) put("defup", Math.round(a.buffDefense * scale));
      if (a.buffSpeed) put("speedup", Math.round(a.buffSpeed * scale));
      if (a.barrier) put("barrier", Math.round(a.barrier * scale));
      if (a.resistBuff) put("resistup", undefined, a.resistBuff);
    }
  }

  private execCover(actor: EngineAlly, a: BattleAbility, target: EngineAlly, ev: BattleEvent[]): void {
    upsertStatus(target.statuses, { id: "cover", turns: -1, src: actor.id });
    ev.push({ t: "status", target: target.id, status: "cover", on: true });
    ev.push({ t: "log", text: `${actor.m.name}(이)가 ${target.m.name}의 앞을 가로막는다! (다음 공격 대신 받기)` });
  }

  private execItem(item: ConsumableId, target: EngineAlly, ev: BattleEvent[]): void {
    const def = CONSUMABLES[item];
    this.items[item] = (this.items[item] ?? 0) - 1;
    const revived = target.m.hp <= 0 && !!def.revive;
    const parts: string[] = [];
    if (def.full) {
      const amount = target.m.maxHp - Math.max(0, target.m.hp);
      target.m.hp = target.m.maxHp;
      ev.push({ t: "healed", target: target.id, amount, resource: "hp" });
      parts.push("HP 전부 회복");
    } else if (def.hp) {
      target.m.hp = Math.min(target.m.maxHp, Math.max(0, target.m.hp) + def.hp);
      ev.push({ t: "healed", target: target.id, amount: def.hp, resource: "hp" });
      parts.push(`HP ${def.hp} 회복`);
    }
    if (def.mp) {
      target.m.mp = Math.min(target.m.maxMp, target.m.mp + def.mp);
      ev.push({ t: "healed", target: target.id, amount: def.mp, resource: "mp" });
      parts.push(`MP ${def.mp} 회복`);
    }
    if (revived) cleanseStatuses(target.statuses);
    if (def.cure) {
      const removed = def.cure === "all"
        ? cleanseStatuses(target.statuses)
        : def.cure.filter((id) => !!findStatus(target.statuses, id));
      if (def.cure !== "all") for (const id of removed) removeStatus(target.statuses, id);
      for (const id of removed) ev.push({ t: "status", target: target.id, status: id, on: false });
      parts.push(removed.length
        ? `${removed.map((id) => STATUS_NAME[id]).join("·")} 해제`
        : "해제할 상태가 없다");
    }
    if (def.buff) {
      upsertStatus(target.statuses, { id: def.buff.id, turns: def.buff.turns, power: def.buff.power });
      ev.push({ t: "status", target: target.id, status: def.buff.id, on: true, power: def.buff.power });
      parts.push(`${STATUS_NAME[def.buff.id]} (${def.buff.turns}턴)`);
    }
    ev.push({
      t: "log",
      text: `${target.m.name} — ${def.name}: ${revived ? "일어났다! " : ""}${parts.join(", ")}.`,
    });
  }

  private combinedResist(base: ResistTable | undefined, statuses: StatusInstance[]): ResistTable {
    const out: ResistTable = { ...(base ?? {}) };
    const extra = statusResist(statuses);
    if (extra) for (const key of Object.keys(extra) as (keyof ResistTable)[])
      out[key] = (out[key] ?? 1) * (extra[key] ?? 1);
    return out;
  }

  /** 보호막을 먼저 소모하고 실제 HP 피해를 반환한다. */
  private absorbBarrier(target: EngineUnit, amount: number, ev: BattleEvent[]): number {
    const barrier = findStatus(target.statuses, "barrier");
    if (!barrier || !barrier.power || amount <= 0) return amount;
    const absorbed = Math.min(amount, barrier.power);
    barrier.power -= absorbed;
    if (barrier.power <= 0) {
      removeStatus(target.statuses, "barrier");
      ev.push({ t: "status", target: target.id, status: "barrier", on: false });
    } else {
      ev.push({ t: "status", target: target.id, status: "barrier", on: true, power: barrier.power });
    }
    return amount - absorbed;
  }

  private enemyAct(e: EngineEnemy, ev: BattleEvent[], singleTargets?: EngineAlly[]): void {
    const targets = this.livingAllies();
    if (!targets.length) return;

    /* 마법 봉인 — 이번 행동에서 광역(마법) 불가, 소모됨 */
    const silenced = !!findStatus(e.statuses, "silence");
    if (silenced) removeStatus(e.statuses, "silence");
    const aoe = !silenced && (e.def.tier === "보스" || e.def.tier === "에픽") && this.rng() < 0.35;

    /* 도발 — 시전자가 살아있는 동안 단일 공격은 시전자에게만 */
    let forced: EngineAlly | null = null;
    const taunt = findStatus(e.statuses, "taunt");
    if (taunt?.src) {
      const src = this.unit(taunt.src);
      if (src && src.kind === "ally" && !this.isDown(src)) forced = src;
      else removeStatus(e.statuses, "taunt");
    }

    ev.push({ t: "log", text: aoe ? `${e.def.name}의 광역 공격!` : `${e.def.name}의 공격!` });
    ev.push({ t: "lunge", unit: e.id });

    const feared = isFeared(e.statuses) || !!findStatus(e.statuses, "slow"); // 공포·감속 — 공격이 불리
    /* ---- 진형 — 순수 근접 적의 단일 공격은 전열만 노린다 (전멸 시 후열 노출).
     *  도약형(flank)은 진형을 무시하고, 마법·원거리 공격은 원래 후열까지 닿는다.
     *  독립 전투(next 경로)와 그리드 전투가 같은 규칙을 쓰도록 여기서 판정한다. ---- */
    const provided = singleTargets?.length ? singleTargets : targets;
    let pool = provided;
    const hasBack = provided.some((u) => u.m.back);
    if (!aoe && hasBack && enemyMelee(e.def) && !e.def.flank) {
      const front = provided.filter((u) => !u.m.back);
      if (front.length) {
        pool = front;
        if (!this.rowLogs.block) {
          this.rowLogs.block = true;
          ev.push({ t: "log", text: "근접 공격은 전열에 막힌다 — 후열에는 칼끝이 닿지 않는다!" });
        }
      }
    }
    const victims = aoe ? targets : [forced ?? pool[(this.rng() * pool.length) | 0]];
    /* 진형 돌파 연출 — 도약 적이 후열을 물거나, 원거리 공격이 후열까지 날아든 순간 */
    const single = !aoe ? victims[0] : null;
    if (single?.m.back) {
      if (e.def.flank) ev.push({ t: "log", text: `${e.def.name}이(가) 전열을 뛰어넘어 후열의 ${single.m.name}을(를) 덮친다!` });
      else if (!enemyMelee(e.def) && !this.rowLogs.pierce) {
        this.rowLogs.pierce = true;
        ev.push({ t: "log", text: `원거리 공격이 후열의 ${single.m.name}까지 날아든다!` });
      }
    }
    if (aoe && hasBack && !this.rowLogs.aoe) {
      this.rowLogs.aoe = true;
      ev.push({ t: "log", text: "광역 공격! 후열은 여파만 스쳐 피해가 줄어든다." });
    }
    /* 복수 속성 사용자는 이번 행동의 속성을 무작위로 고른다 (단일 속성은 난수 소모 없음) */
    const types = enemyAttackTypes(e.def);
    const atkDtype: DamageType = types.length > 1 ? types[(this.rng() * types.length) | 0] : types[0];
    for (const v of victims) {
      /* 가로막기 — 유효한 보호자가 있으면 1회 대신 맞는다 */
      let t = v;
      const cov = findStatus(v.statuses, "cover");
      if (cov?.src) {
        const guard = this.unit(cov.src);
        if (guard && guard.kind === "ally" && guard !== v && !this.isDown(guard)) {
          removeStatus(v.statuses, "cover");
          ev.push({ t: "cover", guard: guard.id, covered: v.id });
          t = guard;
        }
      }
      const baseStats = memberStats(t.m);
      const s: Stats = { ...baseStats, def: baseStats.def + defenseStatusBonus(t.statuses) };
      /* 광역 후열 감쇠 — 브레스·폭발의 중심은 전열이다. 후열(실제 피격자 기준)은 60%만 받는다 */
      const rowDamp = aoe && t.m.back ? 0.6 : 1;
      const roll = rollEnemyHit(Math.round(e.atk * attackStatusMult(e.statuses) * rowDamp), s, {
        aoe,
        guarding: !!findStatus(t.statuses, "guard"),
        attackerFeared: feared,
        acc: enemyAcc(e.def),
        targetAC: s.evAC,
        dtype: atkDtype,
        res: this.combinedResist(memberResist(t.m), t.statuses),
      }, this.rng);
      if (!roll.hit) {
        ev.push({ t: "miss", unit: e.id, target: t.id });
        continue;
      }
      const dealt = this.absorbBarrier(t, roll.dmg, ev);
      t.m.hp = Math.max(0, t.m.hp - dealt);
      ev.push({ t: "hit", unit: e.id, target: t.id, amount: dealt, crit: false, mag: false, resist: roll.resist, dtype: atkDtype });
      if (roll.resist === "resist") ev.push({ t: "log", text: `${t.m.name}이(가) 피해를 흘려냈다.` });
      else if (roll.resist === "immune") ev.push({ t: "log", text: `${t.m.name}에게는 통하지 않는다!` });
      else if (roll.resist === "weak") ev.push({ t: "log", text: `${t.m.name}의 약점! 피해가 커졌다!` });
      if (t.m.hp <= 0) {
        ev.push({ t: "death", unit: t.id });
        ev.push({ t: "log", text: `${t.m.name}(이)가 쓰러졌다!` });
      } else {
        if (dealt > 0 && wakeOnDamage(t.statuses)) { // 수면 중 피격 → 각성
          ev.push({ t: "status", target: t.id, status: "sleep", on: false });
          ev.push({ t: "log", text: `${t.m.name}이(가) 잠에서 깨어났다!` });
        }
        if (dealt > 0) this.applyEnemyInflict(e, t, s, ev); // 보호막이 전부 막으면 명중 부가효과도 차단
      }
    }
    ev.push({ t: "return", unit: e.id });
  }

  /** 적 공격이 명중한 아군에게 확률로 상태이상을 건다 (내성 성공 시 무효) */
  private applyEnemyInflict(e: EngineEnemy, t: EngineAlly, s: Stats, ev: BattleEvent[]): void {
    const inf = e.def.inflict;
    if (!inf || this.rng() >= inf.chance) return;
    const saved = rollSave(this.rng, s.mods[inf.save], enemyInflictDC(e.def));
    if (saved) { ev.push({ t: "save", target: t.id, status: inf.status }); return; }
    upsertStatus(t.statuses, { id: inf.status, turns: inf.turns, power: inf.power });
    ev.push({ t: "status", target: t.id, status: inf.status, on: true, power: inf.power });
    ev.push({ t: "log", text: `${t.m.name}이(가) ${STATUS_NAME[inf.status]} 상태가 되었다!` });
  }
}
