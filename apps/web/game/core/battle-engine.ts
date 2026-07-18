/* =====================================================================
 * core/battle-engine.ts — 순수 전투 엔진 (PIXI 비의존)
 * 상태 + 행동 → BattleEvent 배열. 연출/입력은 scenes/battle.ts가 담당.
 * Member(HP/MP)와 items는 참조로 받아 직접 갱신한다 (기존 동작 유지).
 * ===================================================================== */
import { ENEMY_DEFS, EnemyDef, RANK_NAME, Tier } from "../defs";
import { BattleAbility, Member, memberStats, rankMult } from "../state";
import { healAmount, rollAllyHit, rollEnemyHit } from "./formulas";
import { BattleStatusId, StatusInstance, findStatus, removeStatus, upsertStatus } from "./statuses";

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
  | { t: "hit"; unit: UnitId; target: UnitId; amount: number; crit: boolean; mag: boolean }
  | { t: "evade"; target: UnitId }
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
  | { type: "item"; item: "potion" | "mpotion"; target: UnitId }
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

  private items: { potion: number; mpotion: number };
  private rng: () => number;
  private queue: UnitId[] = [];
  private qi = 0;
  private current: EngineAlly | null = null;
  private ended: BattleResult | null = null;

  constructor(
    party: Member[],
    groupIds: string[],
    opts: { bless?: boolean; items?: { potion: number; mpotion: number }; rng?: () => number } = {},
  ) {
    this.allies = party.map((m) => ({ kind: "ally", id: `ally:${m.id}`, m, statuses: [] }));
    this.enemies = groupIds.map((defId, i) => {
      const d = ENEMY_DEFS[defId];
      return {
        kind: "enemy" as const, id: `enemy:${i}`, defId, def: d,
        hp: d.hp, maxHp: d.hp, atk: d.atk, defv: d.def, spd: d.spd,
        alive: true, statuses: [],
      };
    });
    this.tier = ENEMY_DEFS[groupIds[0]].tier;
    this.blessMult = opts.bless ? 1.25 : 1;
    this.items = opts.items ?? { potion: 0, mpotion: 0 };
    this.rng = opts.rng ?? Math.random;
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
        removeStatus(u.statuses, "guard"); // 방어 태세는 자신의 다음 턴 시작까지
        this.current = u;
        ev.push({ t: "turn", unit: u.id });
        ev.push({ t: "log", text: `${u.m.name}의 턴. 행동을 선택하세요.` });
        return { kind: "player", unit: u.id, events: ev };
      }
      if (!u.alive) continue;
      this.enemyAct(u, ev);
      const end2 = this.checkEnd(ev);
      if (end2) return { kind: "over", result: end2, events: ev };
    }
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
        else if (a.kind === "heal") this.execHeal(actor, a, this.allyOf(action.target!), ev);
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
      case "flee": {
        if (this.canFlee && this.rng() < 0.6) {
          ev.push({ t: "log", text: "파티는 무사히 도망쳤다!" });
          ev.push({ t: "flee", ok: true });
          this.ended = "fled";
          return { kind: "over", result: "fled", events: ev };
        }
        ev.push({ t: "log", text: "도망칠 수 없다!" });
        ev.push({ t: "flee", ok: false });
        break;
      }
    }

    const end = this.checkEnd(ev);
    if (end) return { kind: "over", result: end, events: ev };
    return { kind: "acted", events: ev };
  }

  /* ---- 내부 ---- */
  private allyOf(id: UnitId): EngineAlly {
    const u = this.unit(id);
    if (!u || u.kind !== "ally") throw new Error(`아군이 아니다: ${id}`);
    return u;
  }
  private enemyOf(id: UnitId): EngineEnemy {
    const u = this.unit(id);
    if (!u || u.kind !== "enemy") throw new Error(`적이 아니다: ${id}`);
    return u;
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
      ...this.livingAllies().map((u) => ({ id: u.id, spd: memberStats(u.m).spd, ally: true })),
      ...this.aliveEnemies().map((e) => ({ id: e.id, spd: e.spd, ally: false })),
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
    ev.push({ t: "log", text: `${actor.m.name}의 ${a.name}!${a.id ? ` [${RANK_NAME[a.rank]}]` : ""}` });
    ev.push({ t: "lunge", unit: actor.id });
    for (let hit = 1; hit <= a.hits; hit++) {
      let totalDealt = 0;
      for (const e of targets) {
        if (!e.alive) continue;
        const roll = rollAllyHit(s, a, {
          mult,
          bless: this.blessMult,
          enemyDef: e.defv,
          defDown: findStatus(e.statuses, "defdown")?.power ?? 0,
          bonus: a.manaBurn ? Math.round(spentMp * a.manaBurn) : 0,
        }, this.rng);
        e.hp -= roll.dmg;
        totalDealt += roll.dmg;
        ev.push({ t: "hit", unit: actor.id, target: e.id, amount: roll.dmg, crit: roll.crit, mag: a.kind === "mag" });
        if (e.hp <= 0) {
          e.hp = 0;
          e.alive = false;
          ev.push({ t: "death", unit: e.id });
          ev.push({ t: "log", text: `${e.def.name}을(를) 쓰러뜨렸다!` });
        } else if (hit === 1) {
          this.applyOnHitStatuses(actor, a, mult, e, ev);
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

  /** 적중 시 부가 효과 — 첫 타에 1회 (대상 생존 시) */
  private applyOnHitStatuses(actor: EngineAlly, a: BattleAbility, mult: number, e: EngineEnemy, ev: BattleEvent[]): void {
    if (a.taunt) {
      upsertStatus(e.statuses, { id: "taunt", turns: -1, src: actor.id });
      ev.push({ t: "status", target: e.id, status: "taunt", on: true });
    }
    if (a.silence) {
      upsertStatus(e.statuses, { id: "silence", turns: 1 });
      ev.push({ t: "status", target: e.id, status: "silence", on: true });
    }
    if (a.defDown) {
      const cur = findStatus(e.statuses, "defdown")?.power ?? 0;
      const power = Math.min(e.defv, Math.max(cur, Math.round(a.defDown * mult)));
      upsertStatus(e.statuses, { id: "defdown", turns: -1, power });
      ev.push({ t: "status", target: e.id, status: "defdown", on: true, power });
    }
  }

  private execHeal(actor: EngineAlly, a: BattleAbility, target: EngineAlly, ev: BattleEvent[]): void {
    const amt = healAmount(memberStats(actor.m), a, rankMult(a.rank));
    target.m.hp = Math.min(target.m.maxHp, target.m.hp + amt);
    ev.push({ t: "healed", target: target.id, amount: amt, resource: "hp" });
    ev.push({ t: "log", text: `${actor.m.name}의 ${a.name}! ${target.m.name} HP ${amt} 회복.` });
  }

  private execCover(actor: EngineAlly, a: BattleAbility, target: EngineAlly, ev: BattleEvent[]): void {
    upsertStatus(target.statuses, { id: "cover", turns: -1, src: actor.id });
    ev.push({ t: "status", target: target.id, status: "cover", on: true });
    ev.push({ t: "log", text: `${actor.m.name}(이)가 ${target.m.name}의 앞을 가로막는다! (다음 공격 대신 받기)` });
  }

  private execItem(item: "potion" | "mpotion", target: EngineAlly, ev: BattleEvent[]): void {
    if (item === "potion") {
      this.items.potion--;
      const revived = target.m.hp <= 0;
      target.m.hp = Math.min(target.m.maxHp, Math.max(0, target.m.hp) + 60);
      ev.push({ t: "healed", target: target.id, amount: 60, resource: "hp" });
      ev.push({ t: "log", text: revived ? `${target.m.name}(이)가 일어났다! HP 60 회복.` : `${target.m.name} HP 60 회복.` });
    } else {
      this.items.mpotion--;
      target.m.mp = Math.min(target.m.maxMp, target.m.mp + 25);
      ev.push({ t: "healed", target: target.id, amount: 25, resource: "mp" });
      ev.push({ t: "log", text: `${target.m.name} MP 25 회복.` });
    }
  }

  private enemyAct(e: EngineEnemy, ev: BattleEvent[]): void {
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

    const victims = aoe ? targets : [forced ?? targets[(this.rng() * targets.length) | 0]];
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
      const s = memberStats(t.m);
      const roll = rollEnemyHit(e.atk, s, { aoe, guarding: !!findStatus(t.statuses, "guard") }, this.rng);
      if (roll.evaded) {
        ev.push({ t: "evade", target: t.id });
        continue;
      }
      t.m.hp = Math.max(0, t.m.hp - roll.dmg);
      ev.push({ t: "hit", unit: e.id, target: t.id, amount: roll.dmg, crit: false, mag: false });
      if (t.m.hp <= 0) {
        ev.push({ t: "death", unit: t.id });
        ev.push({ t: "log", text: `${t.m.name}(이)가 쓰러졌다!` });
      }
    }
    ev.push({ t: "return", unit: e.id });
  }
}
