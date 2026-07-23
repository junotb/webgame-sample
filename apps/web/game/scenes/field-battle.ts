/* =====================================================================
 * scenes/field-battle.ts — 필드 조우 전투 오버레이 (DQ식 정면 전투)
 *  필드 씬 위에 겹쳐 파티 vs 적 무리를 클래식 턴제로 굴린다.
 *  판정은 BattleEngine의 next()/act()가 전담 — 여기는 입력과 연출만 담당.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import {
  C, H, SceneScope, W, button, panel, sceneRoot, setModeBadge, toast, tween, txt, ui, wait,
} from "../core";
import {
  BASIC_ATTACK, BattleEngine, BattleEvent, BattleResult, TurnState,
} from "../core/battle-engine";
import { CONSUMABLES, CONSUMABLE_IDS, DAMAGE_META, ENEMY_DEFS, SKILLS } from "../defs";
import { STATUS_COLOR, STATUS_NAME } from "../core/statuses";
import { spawnImpactBurst } from "../battle-fx";
import { visualRandom } from "../core/random";
import { drawMonster, MonsterView, monsterPx } from "../monsters";
import {
  BattleAbility, GridEnemy, Member, attackReach, canSwapRow, equippedWeapon, memberAbilities, rowBlocked,
} from "../state";
import { G } from "../state";
import { buildPartyHUD } from "../hud";
import { LOG_HEAL, LOG_HURT, createBattleLog } from "../ui/battle-log";

export interface FieldBattleHandle {
  dispose(): void;
  /** L 키 — 전투 기록 펼치기/접기 (키 입력은 필드 씬이 소유) */
  toggleLog(): void;
}

interface EnemyView {
  e: GridEnemy;
  node: PIXI.Container;
  monster: MonsterView;
  label: PIXI.Text;
  hpT: PIXI.Text;
}

/** 필드 조우 전투를 시작한다. onEnd는 승리/패배/도주 시 1회 호출된다. */
export function fieldBattleOverlay(opts: {
  enemies: string[];
  caption: string;
  prevBadge: string;
  onEnd: (result: BattleResult) => void;
}): FieldBattleHandle {
  const scope = new SceneScope();
  const root = new PIXI.Container();
  sceneRoot.addChild(root);
  setModeBadge("전투! — " + opts.caption, C.blood);
  ui.inBattle = true;

  /* 어두운 장막 — 필드 배경 위에 전장을 깐다 */
  const veil = new PIXI.Graphics();
  veil.rect(0, 0, W, H).fill({ color: 0x0a0912, alpha: 0.78 });
  root.addChild(veil);

  /* ---- 적 무리 — 엔진과 같은 GridEnemy 객체를 공유해 HP가 동기화된다 ---- */
  const gridEnemies: GridEnemy[] = opts.enemies.map((defId, i) => ({
    id: `enemy:${i}`, defId, x: 0, y: 0,
    hp: ENEMY_DEFS[defId].hp, alive: true, statuses: [],
  }));
  const views = new Map<string, EnemyView>();
  const groundY = 470;
  const spacing = Math.min(300, (W - 320) / Math.max(1, gridEnemies.length - 1) || 0);
  const startX = W / 2 - spacing * (gridEnemies.length - 1) / 2;
  gridEnemies.forEach((e, i) => {
    const def = ENEMY_DEFS[e.defId];
    const node = new PIXI.Container();
    node.x = startX + spacing * i;
    node.y = groundY + (i % 2) * 26; // 지그재그로 겹침 완화
    const monster = drawMonster(def);
    node.addChild(monster);
    const label = txt(def.tier === "일반" ? def.name : `◆ ${def.tier} — ${def.name}`, 14,
      def.tier === "정예" ? C.elite : def.tier === "보스" ? C.boss : C.text,
      { weight: "700", shadow: true });
    label.anchor.set(0.5); label.y = -(monsterPx(def) + 28); node.addChild(label);
    const hpT = txt(`HP ${e.hp}/${def.hp}`, 12, C.dim, { shadow: true });
    hpT.anchor.set(0.5); hpT.y = label.y + 17; node.addChild(hpT);
    root.addChild(node);
    views.set(e.id, { e, node, monster, label, hpT });
  });

  /* ---- 전투 기록 로그 + 파티 HUD ---- */
  const battleLog = createBattleLog(W - 32);
  battleLog.node.x = 16; battleLog.node.y = 14; root.addChild(battleLog.node);
  const log = (text: string, color?: number) => battleLog.push(text, color);
  const memberOf = (id: string) => G.party.find((m) => `ally:${m.id}` === id);
  const hud = buildPartyHUD(root);

  const engine = new BattleEngine(G.party, gridEnemies, {
    bless: G.blessedNext, items: G.items,
  });
  if (G.blessedNext) { G.blessedNext = false; toast("축복의 가호! 이번 전투 파티 공격력 +25%", C.border); }

  let finished = false;
  let cmdRoot: PIXI.Container | null = null;

  function closeCmds(): void { cmdRoot?.destroy({ children: true }); cmdRoot = null; }

  /** 피해·상태 팝업 — 몬스터 체급에 따라 머리 위에 뜨도록 뷰에서 높이를 얻는다 */
  function popHeight(v: EnemyView | undefined): number {
    return v ? monsterPx(ENEMY_DEFS[v.e.defId]) + 36 : 140;
  }
  function popOn(node: PIXI.Container, label: string | number, color = 0xffffff, yOff = 140): void {
    const t = txt(String(label), 26, color, { weight: "900", shadow: true });
    t.anchor.set(0.5);
    t.x = node.x + (visualRandom() * 26 - 13);
    t.y = node.y - yOff;
    root.addChild(t);
    tween(t, { y: t.y - 44, alpha: 0 }, 750, { onDone: () => t.destroy() });
  }
  function partyFlash(): void {
    const f = new PIXI.Graphics();
    f.rect(0, 0, W, H).fill(0xc03030); f.alpha = 0.22; root.addChild(f);
    tween(f, { alpha: 0 }, 260, { onDone: () => f.destroy() });
  }

  /** 엔진 이벤트 → 연출. 로그는 그대로, 피해·사망은 팝업과 모션으로. */
  function present(events: BattleEvent[]): void {
    for (const ev of events) {
      if (ev.t === "log") log(ev.text);
      else if (ev.t === "hit") {
        const v = "target" in ev ? views.get(ev.target) : undefined;
        if (v) {
          log(`→ ${ENEMY_DEFS[v.e.defId].name} ${ev.amount} ${DAMAGE_META[ev.dtype].name} 피해${ev.crit ? " — 치명타!" : ""}`,
            DAMAGE_META[ev.dtype].color);
          const yOff = popHeight(v);
          if (ev.crit) popOn(v.node, "치명타!", C.border, yOff);
          if (ev.resist === "weak") popOn(v.node, "약점!", 0xff8a3c, yOff);
          else if (ev.resist === "resist") popOn(v.node, "저항", C.mp, yOff);
          else if (ev.resist === "immune") popOn(v.node, "무효!", C.dim, yOff);
          popOn(v.node, ev.amount, ev.mag ? 0xb99cff : 0xffffff, yOff);
          v.monster.playMotion("hit");
          spawnImpactBurst(root, v.node.x, v.node.y - Math.round(monsterPx(ENEMY_DEFS[v.e.defId]) * 0.6), ev.dtype);
        } else {
          log(`→ ${memberOf(ev.target)?.name ?? "아군"} ${ev.amount} 피해`, LOG_HURT);
          partyFlash();
        }
      } else if (ev.t === "miss") {
        const v = views.get(ev.target);
        if (v) popOn(v.node, "빗나감!", C.dim, popHeight(v));
        else log(`→ ${memberOf(ev.target)?.name ?? "아군"} 회피!`);
      } else if (ev.t === "healed") {
        /* 물약은 엔진 로그 문장에 수치가 있어 스킬 회복만 기록한다 */
        const m = memberOf(ev.target);
        if (m && !events.some((e2) => e2.t === "log" && e2.text.includes("회복")))
          log(`→ ${m.name} ${ev.resource === "hp" ? "HP" : "MP"} +${ev.amount}`, LOG_HEAL);
      } else if (ev.t === "drain") {
        const m = memberOf(ev.unit);
        if (m) log(`→ ${m.name} HP +${ev.amount} 흡수`, LOG_HEAL);
      } else if (ev.t === "save") {
        const v = views.get(ev.target);
        if (v) popOn(v.node, "내성!", C.epic, popHeight(v));
      } else if (ev.t === "status") {
        const v = views.get(ev.target);
        if (v) popOn(v.node, ev.on ? STATUS_NAME[ev.status] : `${STATUS_NAME[ev.status]} 해제`,
          STATUS_COLOR[ev.status] ?? C.epic, popHeight(v));
      } else if (ev.t === "death") {
        const v = views.get(ev.unit);
        if (v) {
          v.label.visible = false; v.hpT.visible = false;
          v.monster.playMotion("death");
        }
      } else if (ev.t === "lunge") {
        const v = views.get(ev.unit);
        v?.monster.playMotion("attack");
      }
    }
    for (const v of views.values()) {
      if (v.e.alive) v.hpT.text = `HP ${v.e.hp}/${ENEMY_DEFS[v.e.defId].hp}`;
    }
    hud.redraw();
  }

  function finish(result: BattleResult): void {
    if (finished) return;
    finished = true;
    closeCmds();
    ui.inBattle = false;
    setModeBadge(opts.prevBadge, C.green);
    wait(650, () => {
      scope.dispose();
      root.destroy({ children: true });
      opts.onEnd(result);
    });
  }

  function handle(ts: TurnState): void {
    present(ts.events);
    if (ts.kind === "over") { finish(ts.result); return; }
    const member = G.party.find((m) => `ally:${m.id}` === ts.unit);
    if (!member) { finish("defeat"); return; }
    wait(280, () => { if (!finished) showCmds(member); });
  }

  function act(action: Parameters<BattleEngine["act"]>[0]): void {
    closeCmds();
    const res = engine.act(action);
    present(res.events);
    if (res.kind === "over") { finish(res.result); return; }
    if (res.events.some((ev) => ev.t === "flee" && ev.ok)) { finish("fled"); return; }
    wait(420, () => { if (!finished) handle(engine.next()); })
  }

  /* ---- 커맨드 UI ---- */
  function pickEnemy(onPick: (id: string) => void): void {
    closeCmds();
    cmdRoot = new PIXI.Container(); root.addChild(cmdRoot);
    const alive = engine.aliveEnemies();
    const p = panel(360, 52 + alive.length * 46, { alpha: 0.97 });
    p.x = W / 2 - 180; p.y = H - 130 - 52 - alive.length * 46; cmdRoot.addChild(p);
    const tt = txt("대상 선택", 14, C.border, { weight: "700" }); tt.x = p.x + 14; tt.y = p.y + 10; cmdRoot.addChild(tt);
    alive.forEach((e, i) => {
      const b = button(`${e.def.name}  (HP ${e.hp})`, 330, 38, () => onPick(e.id), { size: 14 });
      b.x = p.x + 14; b.y = p.y + 40 + i * 46; cmdRoot!.addChild(b);
    });
  }
  function pickAlly(title: string, includeDown: boolean, onPick: (m: Member) => void): void {
    closeCmds();
    cmdRoot = new PIXI.Container(); root.addChild(cmdRoot);
    const pool = G.party.filter((m) => includeDown || m.hp > 0);
    const p = panel(400, 52 + pool.length * 46, { alpha: 0.97 });
    p.x = W / 2 - 200; p.y = H - 130 - 52 - pool.length * 46; cmdRoot.addChild(p);
    const tt = txt(title, 14, C.border, { weight: "700" }); tt.x = p.x + 14; tt.y = p.y + 10; cmdRoot.addChild(tt);
    pool.forEach((m, i) => {
      const b = button(`${m.name}  HP ${m.hp}/${m.maxHp} · MP ${m.mp}/${m.maxMp}`, 370, 38,
        () => onPick(m), { size: 13 });
      b.x = p.x + 14; b.y = p.y + 40 + i * 46; cmdRoot!.addChild(b);
    });
  }
  /** 공격형인가 (지원·회복이 아니면 적 대상) */
  const offensive = (a: BattleAbility) =>
    a.kind !== "heal" && !a.buffAttack && !a.buffDefense && !a.buffSpeed
    && !a.barrier && !a.resistBuff && !a.cleanse && !a.revive && !a.cover;

  function useAbility(m: Member, a: BattleAbility): void {
    if (offensive(a)) {
      if (rowBlocked(m, attackReach(a, equippedWeapon(m)))) {
        toast("후열에서는 근접 기술을 쓸 수 없다. (창 기술·활·마법은 가능)", C.dim); return;
      }
      if (a.all) { act({ type: "ability", ability: a }); return; }
      const alive = engine.aliveEnemies();
      if (alive.length === 1) { act({ type: "ability", ability: a, target: alive[0].id }); return; }
      pickEnemy((id) => act({ type: "ability", ability: a, target: id }));
      return;
    }
    if (a.allAllies || a.target === "self") { act({ type: "ability", ability: a }); return; }
    pickAlly(`${a.name} — 대상 선택`, !!a.revive, (t) => act({ type: "ability", ability: a, target: `ally:${t.id}` }));
  }

  function openSkillMenu(m: Member): void {
    closeCmds();
    cmdRoot = new PIXI.Container(); root.addChild(cmdRoot);
    const abilities = memberAbilities(m);
    const p = panel(520, 56 + Math.ceil(abilities.length / 2) * 46, { alpha: 0.97 });
    p.x = W / 2 - 260; p.y = H - 130 - 56 - Math.ceil(abilities.length / 2) * 46; cmdRoot.addChild(p);
    const tt = txt(`${m.name} — 스킬 (MP ${m.mp})`, 14, C.border, { weight: "700" });
    tt.x = p.x + 14; tt.y = p.y + 10; cmdRoot.addChild(tt);
    abilities.forEach((a, i) => {
      const school = SKILLS[a.skill];
      const b = button(`${school.icon ? `${school.icon} ` : ""}${a.name} (MP ${a.mp})`, 240, 38,
        () => useAbility(m, a), {
          size: 13,
          border: school.color,
        });
      if (m.mp < a.mp) b.setDisabled(true);
      b.x = p.x + 14 + (i % 2) * 252; b.y = p.y + 44 + Math.floor(i / 2) * 46; cmdRoot!.addChild(b);
    });
    const cb = button("닫기", 70, 30, () => showCmds(m), { size: 12 });
    cb.x = p.x + 520 - 84; cb.y = p.y + 8; cmdRoot.addChild(cb);
  }

  function openItemMenu(m: Member): void {
    closeCmds();
    cmdRoot = new PIXI.Container(); root.addChild(cmdRoot);
    const owned = CONSUMABLE_IDS.filter((id) => G.items[id] > 0);
    const rows = Math.max(1, owned.length);
    const p = panel(560, 60 + rows * 50, { alpha: 0.97 });
    p.x = W / 2 - 280; p.y = H - 130 - 60 - rows * 50; cmdRoot.addChild(p);
    const tt = txt("아이템", 14, C.border, { weight: "700" }); tt.x = p.x + 14; tt.y = p.y + 10; cmdRoot.addChild(tt);
    if (!owned.length) {
      const t = txt("쓸 수 있는 아이템이 없다.", 13, C.dim);
      t.x = p.x + 14; t.y = p.y + 52; cmdRoot.addChild(t);
    }
    owned.forEach((id, i) => {
      const def = CONSUMABLES[id];
      const b = button(`${def.name} ×${G.items[id]}`, 220, 40, () => {
        pickAlly(`${def.name} — 대상 선택`, !!def.revive, (t) => act({ type: "item", item: id, target: `ally:${t.id}` }));
      }, { size: 13 });
      b.x = p.x + 14; b.y = p.y + 44 + i * 50; cmdRoot!.addChild(b);
      const d = txt(def.desc, 12, C.dim, { wrap: 280 });
      d.x = p.x + 248; d.y = p.y + 52 + i * 50; cmdRoot!.addChild(d);
    });
    const cb = button("닫기", 70, 30, () => showCmds(m), { size: 12 });
    cb.x = p.x + 560 - 84; cb.y = p.y + 8; cmdRoot.addChild(cb);
  }

  function showCmds(m: Member): void {
    closeCmds();
    cmdRoot = new PIXI.Container(); root.addChild(cmdRoot);
    const p = panel(W - 32, 64, { alpha: 0.95 }); p.x = 16; p.y = H - 130; cmdRoot.addChild(p);
    const name = txt(`${m.name}의 턴`, 15, C.border, { weight: "700" });
    name.x = p.x + 16; name.y = p.y + 22; cmdRoot.addChild(name);
    const defs: [string, () => void, boolean?][] = [
      ["공격", () => {
        if (rowBlocked(m, attackReach(BASIC_ATTACK, equippedWeapon(m)))) {
          toast("후열에서는 근접 공격을 할 수 없다. (창·활을 들거나 '진형' 커맨드)", C.dim); return;
        }
        const alive = engine.aliveEnemies();
        if (alive.length === 1) act({ type: "ability", ability: BASIC_ATTACK, target: alive[0].id });
        else pickEnemy((id) => act({ type: "ability", ability: BASIC_ATTACK, target: id }));
      }],
      ["스킬", () => openSkillMenu(m)],
      ["아이템", () => openItemMenu(m)],
      ["방어", () => act({ type: "guard" })],
      ["진형", () => {
        if (!canSwapRow(m)) { toast("전열이 최소 한 명은 있어야 한다.", C.dim); return; }
        act({ type: "formation" });
      }],
      ["도주", () => act({ type: "flee" }), !engine.canFlee],
    ];
    defs.forEach(([label, fn, disabled], i) => {
      const b = button(label as string, 130, 44, fn as () => void, { size: 15 });
      if (disabled) b.setDisabled(true);
      b.x = p.x + 190 + i * 146; b.y = p.y + 10; cmdRoot!.addChild(b);
    });
  }

  scope.ticker((t: PIXI.Ticker) => {
    for (const v of views.values()) v.monster.tickMotion(t.deltaMS);
  });

  /* 첫 턴 개시 */
  handle(engine.next());

  return {
    dispose() {
      finished = true;
      closeCmds();
      ui.inBattle = false;
      scope.dispose();
      root.destroy({ children: true });
    },
    toggleLog: () => battleLog.toggle(),
  };
}
