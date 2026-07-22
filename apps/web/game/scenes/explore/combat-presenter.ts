import * as PIXI from "pixi.js";
import { C, H, W, tween, txt, wait } from "../../core";
import { BattleEvent } from "../../core/battle-engine";
import { DAMAGE_META, ENEMY_DEFS } from "../../defs";
import { STATUS_COLOR, STATUS_NAME } from "../../core/statuses";
import { visualRandom } from "../../core/random";
import { spawnImpactBurst } from "../../battle-fx";
import type { MonsterView } from "../../monsters";
import { monsterPx } from "../../monsters";
import { GridEnemy, Member } from "../../state";
import { LOG_HEAL, LOG_HURT } from "../../ui/battle-log";

export interface EnemyVisualRef { node: PIXI.Container; monster: MonsterView; }

export function createCombatPresenter(opts: {
  root: PIXI.Container;
  enemies: GridEnemy[];
  enemyVisuals: Map<string, EnemyVisualRef>;
  party: Member[];
  log: (text: string, color?: number) => void;
  onEnemyDeath: (enemy: GridEnemy) => void;
}) {
  const { root, enemies, enemyVisuals, party, log, onEnemyDeath } = opts;

  function enemyOf(id: string): GridEnemy | undefined { return enemies.find((enemy) => enemy.id === id); }
  function memberOf(id: string): Member | undefined { return party.find((member) => `ally:${member.id}` === id); }

  function popDamage(enemy: GridEnemy, label: string | number, color = 0xffffff): void {
    const visual = enemyVisuals.get(enemy.id);
    const onScreen = visual && visual.node.parent;
    const x = onScreen ? visual.node.x + (visualRandom() * 26 - 13) : W / 2;
    /* 팝업은 체급별 머리 위 — 거대 몬스터는 몸통에 겹치지 않게 더 높이 */
    const y = onScreen ? visual.node.y - (monsterPx(ENEMY_DEFS[enemy.defId]) + 26) * visual.node.scale.y : 200;
    const text = txt(String(label), 26, color, { weight: "900", shadow: true });
    text.anchor.set(0.5); text.x = x; text.y = y; root.addChild(text);
    tween(text, { y: y - 44, alpha: 0 }, 750, { onDone: () => text.destroy() });
  }

  function flashEnemy(enemy: GridEnemy): void {
    const visual = enemyVisuals.get(enemy.id); if (!visual) return;
    visual.monster.playMotion("hit");
    const nodes: (PIXI.Graphics | PIXI.Sprite)[] = [];
    const walk = (container: PIXI.Container) => container.children.forEach((child) => {
      if (child instanceof PIXI.Graphics || child instanceof PIXI.Sprite) nodes.push(child);
      else if (child instanceof PIXI.Container) walk(child);
    });
    walk(visual.node);
    nodes.forEach((node) => { node.tint = 0xff6666; });
    wait(130, () => nodes.forEach((node) => { if (!node.destroyed) node.tint = 0xffffff; }));
  }

  function partyHitFlash(): void {
    const flash = new PIXI.Graphics();
    flash.rect(0, 0, W, H).fill(0xc03030); flash.alpha = 0.22; root.addChild(flash);
    tween(flash, { alpha: 0 }, 260, { onDone: () => flash.destroy() });
  }

  function presentAlly(events: BattleEvent[]): void {
    for (const event of events) {
      if (event.t === "log") { log(event.text); continue; }
      const enemy = "target" in event ? enemyOf(event.target) : undefined;
      if (event.t === "miss" && enemy) popDamage(enemy, "빗나감!", C.dim);
      else if (event.t === "hit" && enemy) {
        log(`→ ${ENEMY_DEFS[enemy.defId].name} ${event.amount} ${DAMAGE_META[event.dtype].name} 피해${event.crit ? " — 치명타!" : ""}`,
          DAMAGE_META[event.dtype].color);
        if (event.crit) popDamage(enemy, "치명타!", C.border);
        if (event.resist === "weak") popDamage(enemy, "약점!", 0xff8a3c);
        else if (event.resist === "resist") popDamage(enemy, "저항", C.mp);
        else if (event.resist === "immune") popDamage(enemy, "무효!", C.dim);
        popDamage(enemy, event.amount, event.resist === "immune" ? C.dim : event.mag ? 0xb99cff : 0xffffff);
        flashEnemy(enemy);
        const visual = enemyVisuals.get(enemy.id);
        if (visual) spawnImpactBurst(root, visual.node.x, visual.node.y - monsterPx(ENEMY_DEFS[enemy.defId]) * 0.6 * visual.node.scale.y, event.dtype);
      } else if (event.t === "save" && enemy) popDamage(enemy, "내성!", C.epic);
      else if (event.t === "drain") {
        const drained = memberOf(event.unit);
        if (drained) log(`→ ${drained.name} HP +${event.amount} 흡수`, LOG_HEAL);
      } else if (event.t === "status" && enemy) {
        popDamage(enemy, event.on ? STATUS_NAME[event.status] : `${STATUS_NAME[event.status]} 해제`, STATUS_COLOR[event.status] ?? C.epic);
      } else if (event.t === "death") {
        const dead = enemyOf(event.unit);
        if (dead) onEnemyDeath(dead);
      }
    }
  }

  function presentEnemy(events: BattleEvent[], attackerId: string, fallbackName: string): void {
    enemyVisuals.get(attackerId)?.monster.playMotion("attack");
    const lines: { text: string; color?: number }[] = [];
    let headingSeen = false;
    for (const event of events) {
      const member = "target" in event ? memberOf(event.target) : undefined;
      /* 첫 log는 헤딩("○○의 공격!"), 이후 log는 진형 교전 설명(전열 막힘·도약·광역 감쇠) — 버리지 않는다 */
      if (event.t === "log") {
        if (headingSeen) lines.push({ text: event.text, color: C.mp });
        headingSeen = true;
        continue;
      }
      if (event.t === "hit" && member) {
        const tag = event.resist === "weak" ? " 약점!" : event.resist === "resist" ? " 저항" : event.resist === "immune" ? " 무효!" : "";
        lines.push({ text: `${member.name} -${event.amount}${tag}`, color: LOG_HURT });
      } else if (event.t === "miss" && member) lines.push({ text: `${member.name} 회피!` });
      else if (event.t === "death") {
        const down = memberOf(event.unit);
        if (down) lines.push({ text: `${down.name} 전투불능!`, color: LOG_HURT });
      } else if (event.t === "status" && event.on && member)
        lines.push({ text: `${member.name} ${STATUS_NAME[event.status]}!`, color: STATUS_COLOR[event.status] });
      else if (event.t === "status" && !event.on && event.status === "sleep" && member) lines.push({ text: `${member.name} 각성!` });
      else if (event.t === "save" && member) lines.push({ text: `${member.name} 내성!` });
      else if (event.t === "cover") {
        const guard = memberOf(event.guard), covered = memberOf(event.covered);
        if (guard && covered) lines.push({ text: `${guard.name}(이)가 ${covered.name}을(를) 가로막았다!` });
      }
    }
    const heading = events.find((event): event is Extract<BattleEvent, { t: "log" }> => event.t === "log")?.text
      ?? `${fallbackName}의 공격!`;
    log(heading);
    for (const line of lines) log(`→ ${line.text}`, line.color);
    const firstHit = events.find((event): event is Extract<BattleEvent, { t: "hit" }> => event.t === "hit");
    if (firstHit) {
      partyHitFlash();
      spawnImpactBurst(root, W / 2, H / 2, firstHit.dtype);
    }
  }

  return { popDamage, presentAlly, presentEnemy };
}
