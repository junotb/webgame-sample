/* =====================================================================
 * battle-engine.test.ts — 순수 전투 엔진 검증 (PIXI 없이 실행)
 * rng를 주입해 결정적으로 판정한다.
 * ===================================================================== */
import { describe, expect, it } from "vitest";
import { ABILITIES, ENEMY_DEFS, Rank } from "../defs";
import { BattleAbility, GridEnemy, Member, attackReach, canSwapRow, rowBlocked } from "../state";
import { BASIC_ATTACK, BattleEngine, BattleEvent } from "../core/battle-engine";

function mkMember(id: string, over: Partial<Member> = {}): Member {
  return {
    id, name: id, color: 0, accent: 0, portrait: 0,
    classId: "fighter", ld: null,
    attrs: { might: 10, int: 10, wit: 10, vital: 10, agi: 12, fortune: 10 },
    bonusSkills: [],
    level: 1, exp: 0,
    hp: 100, mp: 50, maxHp: 100, maxMp: 50,
    equip: {
      mainHand: { name: "검", atk: 0, wtype: "slash", reach: "melee" },
      body: { name: "", def: 0 },
    },
    back: false,
    apUnspent: 0, spUnspent: 0, trained: {}, learnedSpells: [],
    ...over,
  };
}

const ab = (id: string, rank: Rank): BattleAbility => {
  const def = ABILITIES.find((a) => a.id === id);
  if (!def) throw new Error(`unknown ability: ${id}`);
  return { ...def, rank };
};

/** 항상 같은 값을 돌려주는 rng */
const flat = (x: number) => () => x;
/** 주어진 값들을 순환하는 rng */
const seq = (...v: number[]) => {
  let i = 0;
  return () => v[i++ % v.length];
};
/** floor(x*20)+1 = n 이 되는 rng 입력값 — d20 자연값 n을 지정 */
const nat = (n: number) => (n - 1) / 20 + 1e-6;

const hits = (evs: BattleEvent[]) => evs.filter((e) => e.t === "hit");

describe("BattleEngine", () => {
  it("그리드 어댑터 — 실제 월드 적 객체의 HP·상태를 같은 엔진에서 직접 갱신한다", () => {
    const A = mkMember("a");
    const enemy: GridEnemy = {
      id: "grid:goblin", defId: "goblin", x: 2, y: 3,
      hp: ENEMY_DEFS.goblin.hp, alive: true, statuses: [],
    };
    const engine = new BattleEngine([A], [enemy], { rng: flat(0.5) });
    engine.gridEnter();

    const events = engine.gridOffense(A.id, ab("armorbreak", 1), [enemy.id]);

    expect(enemy.hp).toBeLessThan(ENEMY_DEFS.goblin.hp);
    expect(enemy.statuses.some((s) => s.id === "defdown")).toBe(true);
    expect(events.some((e) => e.t === "status" && e.status === "defdown")).toBe(true);
  });

  it("그리드 어댑터 — 가로막기와 적 공격도 실제 파티 상태를 사용한다", () => {
    const A = mkMember("a"), B = mkMember("b");
    const enemy: GridEnemy = {
      id: "grid:goblin", defId: "goblin", x: 2, y: 3,
      hp: ENEMY_DEFS.goblin.hp, alive: true, statuses: [],
    };
    const engine = new BattleEngine([A, B], [enemy], { rng: seq(0.9, 0.5) });
    engine.gridEnter();
    engine.gridCover(A.id, ab("intervene", 3), B.id);

    const events = engine.gridEnemyAct(enemy.id, [B.id]);

    expect(events.some((e) => e.t === "cover" && e.guard === "ally:a" && e.covered === "ally:b")).toBe(true);
    expect(A.hp).toBeLessThan(A.maxHp);
    expect(B.hp).toBe(B.maxHp);
  });

  it("도발 — 내성 실패 시 적의 단일 공격이 시전자에게 강제된다", () => {
    const A = mkMember("a"), B = mkMember("b");
    /* rng 순서: [편차, 치명, 내성 nat3(실패→도발 적중)]  (기술은 명중 굴림 제외 — 자동 명중)
     *           [적 명중 nat11, 편차] — 도발로 대상 강제라 선택 rng 없음 */
    const engine = new BattleEngine([A, B], ["goblin"], {
      rng: seq(0.5, 0.5, nat(3), nat(11), 0.5),
    });

    let ts = engine.next();
    expect(ts.kind).toBe("player"); // A의 턴
    let res = engine.act({ type: "ability", ability: ab("provoke", 1), target: "enemy:0" });
    expect(res.events.some((e) => e.t === "status" && e.status === "taunt")).toBe(true);

    ts = engine.next(); // B의 턴
    res = engine.act({ type: "guard" });

    /* 적 턴: 도발 성공으로 A(index 0)에게 강제 */
    ts = engine.next();
    const enemyHits = hits(ts.events).filter((e) => e.t === "hit" && e.unit === "enemy:0");
    expect(enemyHits).toHaveLength(1);
    expect(enemyHits[0]).toMatchObject({ target: "ally:a" });
  });

  it("내성 성공 — 도발을 저항하면 save 이벤트만 나고 상태이상은 붙지 않는다", () => {
    const A = mkMember("a"), B = mkMember("b");
    /* [편차, 치명, 내성 nat11(성공→저항)]  (기술은 자동 명중) */
    const engine = new BattleEngine([A, B], ["goblin"], {
      rng: seq(0.5, 0.5, nat(11)),
    });
    engine.next();
    const res = engine.act({ type: "ability", ability: ab("provoke", 1), target: "enemy:0" });
    expect(res.events.some((e) => e.t === "save" && e.status === "taunt")).toBe(true);
    expect(res.events.some((e) => e.t === "status" && e.status === "taunt")).toBe(false);
  });

  it("빗나감 — 명중 굴림 실패 시 miss 이벤트가 나고 피해가 없다", () => {
    const A = mkMember("a");
    /* 명중 nat3 → 3 + 명중보정(민첩+1, 랭크1)=2 = 5 < 고블린 회피도 11 → 빗나감 */
    const engine = new BattleEngine([A], ["goblin"], { rng: seq(nat(3)) });
    engine.next();
    const res = engine.act({ type: "ability", ability: BASIC_ATTACK, target: "enemy:0" });
    expect(res.events.some((e) => e.t === "miss" && e.target === "enemy:0")).toBe(true);
    expect(hits(res.events)).toHaveLength(0);
  });

  it("가로막기 — 다음 공격 1회만 보호자가 대신 맞는다", () => {
    const A = mkMember("a"), B = mkMember("b");
    /* 적 턴 rng: 대상 0.6→B 선택, 회피 0.9→실패, 편차 0.5 */
    const engine = new BattleEngine([A, B], ["goblin"], { rng: seq(0.6, 0.9, 0.5) });

    engine.next(); // A의 턴
    engine.act({ type: "ability", ability: ab("intervene", 3), target: "ally:b" });
    engine.next(); // B의 턴
    engine.act({ type: "guard" });

    /* 1차 적 공격: B를 노렸지만 A가 가로막는다 */
    let ts = engine.next();
    expect(ts.events.some((e) => e.t === "cover" && e.guard === "ally:a" && e.covered === "ally:b")).toBe(true);
    expect(hits(ts.events)[0]).toMatchObject({ target: "ally:a" });

    engine.act({ type: "guard" }); // A (2라운드)
    engine.next();
    engine.act({ type: "guard" }); // B

    /* 2차 적 공격: 가로막기는 소모되어 B가 맞는다 */
    ts = engine.next();
    expect(ts.events.some((e) => e.t === "cover")).toBe(false);
    expect(hits(ts.events)[0]).toMatchObject({ target: "ally:b" });
  });

  it("갑옷 부수기 — 랭크 배율로 방어력이 깎이고 후속 피해가 늘어난다", () => {
    const A = mkMember("a"), B = mkMember("b");
    const engine = new BattleEngine([A, B], ["orc"], { rng: flat(0.5) });

    engine.next(); // A의 턴
    /* 달인(랭크 3): 감소량 = round(2 × 2.3) = 5 (오크 방어 9 → 실효 4) */
    const res = engine.act({ type: "ability", ability: ab("armorbreak", 3), target: "enemy:0" });
    expect(res.events.some((e) => e.t === "status" && e.status === "defdown" && e.power === 5)).toBe(true);

    engine.next(); // B의 턴
    /* 기본 공격: atk 10 × 1.0 − (9−5) = 6 */
    const res2 = engine.act({ type: "ability", ability: BASIC_ATTACK, target: "enemy:0" });
    expect(hits(res2.events)[0]).toMatchObject({ amount: 6 });
  });

  it("강타 — 모든 MP를 소모하고 소모량에 비례한 추가 피해", () => {
    const A = mkMember("a", { mp: 20 });
    const engine = new BattleEngine([A], ["goblin"], { rng: flat(0.5) });

    engine.next();
    /* round(10 × 1.1 × 1.55) − 2 + round(20 × 0.9) = 17 − 2 + 18 = 33 */
    const res = engine.act({ type: "ability", ability: ab("slam", 2), target: "enemy:0" });
    expect(A.mp).toBe(0);
    expect(hits(res.events)[0]).toMatchObject({ amount: 33 });
  });

  it("마법 봉인 — 보스의 광역(마법) 공격이 다음 턴에만 막힌다", () => {
    const A = mkMember("a"), B = mkMember("b");
    /* rng 순서 (기술은 자동 명중, lord는 명중 시 공포 부여 chance 0.99로 항상 실패시켜 rng 1개만 소모):
     *  뇌진탕: [편차, 치명, 내성 nat3(실패→봉인 적중)]
     *  보스 1턴(봉인): [대상선택→A, 속성선택 0.4(fire), 명중 nat11, 편차, 공포 chance 0.99(실패)]  (봉인이라 광역판정 없음)
     *  보스 2턴(해제): [광역 0.2(<0.35), 속성선택 0.4(fire),
     *                   A(방어 중 불리 2d20 0.9·0.9, 편차, 공포 0.99),
     *                   B(방어 중 불리 2d20 0.9·0.9, 편차, 공포 0.99)] */
    const engine = new BattleEngine([A, B], ["lord"], {
      rng: seq(
        0.5, 0.5, nat(3),
        nat(1), 0.4, nat(11), 0.5, 0.99,
        0.2, 0.4,
        0.9, 0.9, 0.5, 0.99,
        0.9, 0.9, 0.5, 0.99,
      ),
    });

    engine.next(); // A의 턴
    engine.act({ type: "ability", ability: ab("concuss", 2), target: "enemy:0" });
    engine.next(); // B의 턴

    /* 봉인된 턴: 광역이 아닌 단일 공격 1회 */
    const acted1 = engine.act({ type: "guard" });
    const ts = acted1.kind === "acted" ? engine.next() : acted1;
    const firstTurnHits = hits(ts.events).filter((e) => e.t === "hit" && e.unit === "enemy:0");
    expect(firstTurnHits).toHaveLength(1);
    expect(ts.events.some((e) => e.t === "log" && e.text.includes("광역"))).toBe(false);

    engine.act({ type: "guard" }); // A (2라운드)
    engine.next();

    /* 봉인 해제된 턴: 광역 공격으로 파티 전원이 맞는다 */
    const ts2 = engine.act({ type: "guard" });
    const ts3 = ts2.kind === "acted" ? engine.next() : ts2;
    const secondTurnHits = hits(ts3.events).filter((e) => e.t === "hit" && e.unit === "enemy:0");
    expect(ts3.events.some((e) => e.t === "log" && e.text.includes("광역"))).toBe(true);
    expect(secondTurnHits).toHaveLength(2);
  });

  it("승리 — 마지막 적 처치 시 end 이벤트와 결과를 낸다", () => {
    const A = mkMember("a");
    const engine = new BattleEngine([A], ["goblin"], { rng: flat(0.5) });
    engine.enemies[0].hp = 3;

    engine.next();
    const res = engine.act({ type: "ability", ability: BASIC_ATTACK, target: "enemy:0" });
    expect(res.kind).toBe("over");
    if (res.kind === "over") expect(res.result).toBe("victory");
    expect(res.events.some((e) => e.t === "death" && e.unit === "enemy:0")).toBe(true);
    expect(res.events.some((e) => e.t === "end" && e.result === "victory")).toBe(true);
    expect(engine.result).toBe("victory");
  });

  it("전멸 — 아군 전원이 쓰러지면 defeat", () => {
    const A = mkMember("a", { hp: 1 });
    const engine = new BattleEngine([A], ["goblin"], { rng: flat(0.5) });

    engine.next();
    engine.act({ type: "guard" });
    const ts = engine.next(); // 적 공격 → A 전투불능
    expect(ts.kind).toBe("over");
    if (ts.kind === "over") expect(ts.result).toBe("defeat");
  });

  it("도망 — 일반 전투에서만, 성공 시 fled로 종료", () => {
    const A = mkMember("a");
    const normal = new BattleEngine([A], ["goblin"], { rng: flat(0.5) });
    expect(normal.canFlee).toBe(true);
    normal.next();
    const res = normal.act({ type: "flee" }); // 0.5 < 0.6 → 성공
    expect(res.kind).toBe("over");
    if (res.kind === "over") expect(res.result).toBe("fled");

    const boss = new BattleEngine([mkMember("b")], ["lord"]);
    expect(boss.canFlee).toBe(false);
  });

  it("검증용 데이터 전제 — 적 정의가 테스트 가정과 일치", () => {
    expect(ENEMY_DEFS.goblin.def).toBe(2);
    expect(ENEMY_DEFS.orc.def).toBe(9);
    expect(ENEMY_DEFS.lord.tier).toBe("보스");
  });

  it("중독 — 부여 후 대상의 턴 시작에 지속 피해가 들어간다", () => {
    const A = mkMember("a");
    /* 맹독(자동 명중): [편차, 치명, 내성 nat3(실패→중독)] · 이후 고블린 턴 진행분 */
    const engine = new BattleEngine([A], ["goblin"], {
      rng: seq(0.5, 0.5, nat(3), 0.5, nat(11), 0.5),
    });
    engine.next();
    engine.act({ type: "ability", ability: ab("venom", 1), target: "enemy:0" });
    expect(engine.enemies[0].statuses.some((s) => s.id === "poison")).toBe(true);

    const ts = engine.next(); // 고블린 턴 시작 — 중독 발동
    const tick = ts.events.find((e) => e.t === "tick");
    expect(tick).toMatchObject({ status: "poison", amount: 5, unit: "enemy:0" });
  });

  it("수면 — 대상은 턴을 건너뛰고, 피해를 받으면 깨어난다", () => {
    const A = mkMember("a");
    /* 잠재우기(자동 명중): [편차, 치명, 내성 nat3(실패)] · 기본공격(명중 굴림): [nat12, 편차, 치명] */
    const engine = new BattleEngine([A], ["goblin"], {
      rng: seq(0.5, 0.5, nat(3), nat(12), 0.5, 0.5),
    });
    engine.next();
    engine.act({ type: "ability", ability: ab("sleephex", 2), target: "enemy:0" });
    expect(engine.enemies[0].statuses.some((s) => s.id === "sleep")).toBe(true);

    const ts = engine.next(); // 고블린 턴 — 수면으로 건너뜀
    expect(ts.events.some((e) => e.t === "incap" && e.status === "sleep")).toBe(true);
    expect(ts.kind).toBe("player"); // 다시 A의 턴

    const res = engine.act({ type: "ability", ability: BASIC_ATTACK, target: "enemy:0" });
    expect(res.events.some((e) => e.t === "status" && e.status === "sleep" && !e.on)).toBe(true);
    expect(engine.enemies[0].statuses.some((s) => s.id === "sleep")).toBe(false);
  });

  it("마비 — 턴을 건너뛰되 피해로는 풀리지 않는다", () => {
    const A = mkMember("a");
    const engine = new BattleEngine([A], ["goblin"], {
      rng: seq(0.5, 0.5, nat(3), nat(12), 0.5, 0.5),
    });
    engine.next();
    engine.act({ type: "ability", ability: ab("holdperson", 2), target: "enemy:0" });
    expect(engine.enemies[0].statuses.some((s) => s.id === "paralyze")).toBe(true);

    const ts = engine.next();
    expect(ts.events.some((e) => e.t === "incap" && e.status === "paralyze")).toBe(true);

    engine.act({ type: "ability", ability: BASIC_ATTACK, target: "enemy:0" });
    expect(engine.enemies[0].statuses.some((s) => s.id === "paralyze")).toBe(true); // 여전히 마비
  });

  it("공포 — 공포에 걸린 적은 불리하게 굴려 빗나간다", () => {
    const A = mkMember("a");
    /* 공포(자동 명중): [편차, 치명, 내성 nat3(실패)]
     * 고블린 턴: [대상선택 0.5→A, 불리 2d20 = 0.9(19)·0.05(1) → 자연1 자동 빗나감] */
    const engine = new BattleEngine([A], ["goblin"], {
      rng: seq(0.5, 0.5, nat(3), 0.5, 0.9, 0.05),
    });
    engine.next();
    engine.act({ type: "ability", ability: ab("terror", 2), target: "enemy:0" });
    expect(engine.enemies[0].statuses.some((s) => s.id === "fear")).toBe(true);

    const ts = engine.next(); // 고블린 공격 — 공포로 불리 → 빗나감
    expect(ts.events.some((e) => e.t === "miss" && e.unit === "enemy:0")).toBe(true);
  });

  it("적의 상태이상 부여 — 명중 시 확률로 아군을 중독시킨다 (슬라임)", () => {
    const A = mkMember("a");
    /* A 기본공격: [nat12, 편차, 치명]
     * 슬라임 턴: [대상 0.5→A, 명중 nat12, 편차, 중독 chance 0.1(<0.3), 내성 nat3(실패)] */
    const engine = new BattleEngine([A], ["slime"], {
      rng: seq(nat(12), 0.5, 0.5, 0.5, nat(12), 0.5, 0.1, nat(3)),
    });
    engine.next();
    engine.act({ type: "ability", ability: BASIC_ATTACK, target: "enemy:0" });

    const ts = engine.next(); // 슬라임 공격 → 산성 점액으로 중독
    expect(ts.events.some((e) => e.t === "status" && e.status === "poison" && e.target === "ally:a" && e.on)).toBe(true);
    const AA = engine.allies[0];
    expect(AA.statuses.some((s) => s.id === "poison")).toBe(true);
  });

  it("기술·마법은 명중 굴림에서 제외 — 자동 명중 (기본 공격만 빗나간다)", () => {
    /* 기본 공격: 자연1 → 자동 빗나감 */
    const eng1 = new BattleEngine([mkMember("a")], ["orc"], { rng: seq(nat(1)) });
    eng1.next();
    const r1 = eng1.act({ type: "ability", ability: BASIC_ATTACK, target: "enemy:0" });
    expect(r1.events.some((e) => e.t === "miss")).toBe(true);
    expect(hits(r1.events)).toHaveLength(0);

    /* 화염구: 같은 자연1이라도 기술·마법은 명중 굴림을 하지 않아 반드시 명중 */
    const eng2 = new BattleEngine([mkMember("a")], ["orc"], { rng: seq(nat(1), 0.5, 0.5) });
    eng2.next();
    const r2 = eng2.act({ type: "ability", ability: ab("fireball", 2), target: "enemy:0" });
    expect(hits(r2.events).length).toBeGreaterThan(0);
    expect(r2.events.some((e) => e.t === "miss")).toBe(false);
  });

  it("출혈·화상 — 서로 독립된 지속 피해로 턴마다 적용된다", () => {
    const A = mkMember("a");
    const engine = new BattleEngine([A], ["goblin"], { rng: flat(0) });
    engine.gridEnter();
    engine.gridOffense(A.id, ab("doublecut", 1), ["enemy:0"]);
    engine.gridOffense(A.id, ab("fireball", 2), ["enemy:0"]);
    expect(engine.enemies[0].statuses.some((s) => s.id === "bleed")).toBe(true);
    expect(engine.enemies[0].statuses.some((s) => s.id === "burn")).toBe(true);

    const events = engine.gridUpkeep();
    const dots = events.filter((e) => e.t === "tick");
    expect(dots.some((e) => e.t === "tick" && e.status === "bleed")).toBe(true);
    expect(dots.some((e) => e.t === "tick" && e.status === "burn")).toBe(true);
  });

  it("종족 태그 — 정신 없는 언데드는 독·출혈·공포를 무효화한다", () => {
    const A = mkMember("a");
    const engine = new BattleEngine([A], ["skeleton"], { rng: flat(0) });
    engine.gridEnter();
    engine.gridOffense(A.id, ab("venom", 1), ["enemy:0"]);
    engine.gridOffense(A.id, ab("doublecut", 1), ["enemy:0"]);
    engine.gridOffense(A.id, ab("terror", 2), ["enemy:0"]);
    const ids = engine.enemies[0].statuses.map((s) => s.id);
    expect(ids).not.toContain("poison");
    expect(ids).not.toContain("bleed");
    expect(ids).not.toContain("fear");
  });

  it("지원 주문 — 보호막은 HP보다 먼저 피해를 받고 정화는 해로운 상태를 제거한다", () => {
    const A = mkMember("a");
    const engine = new BattleEngine([A], ["goblin"], { rng: flat(0.9) });
    engine.gridEnter();
    engine.gridSupport(A.id, ab("soulward", 1), A.id);
    const barrier = engine.allies[0].statuses.find((s) => s.id === "barrier");
    expect(barrier?.power).toBe(18);
    engine.gridEnemyAct("enemy:0", [A.id]);
    expect(A.hp).toBe(A.maxHp);
    expect(engine.allies[0].statuses.find((s) => s.id === "barrier")?.power).toBeLessThan(18);

    engine.allies[0].statuses.push({ id: "poison", turns: 3, power: 5 }, { id: "fear", turns: 2 });
    engine.gridSupport(A.id, ab("purify", 1), A.id);
    expect(engine.allies[0].statuses.some((s) => s.id === "poison" || s.id === "fear")).toBe(false);
  });

  it("부활 — 쓰러진 아군만 다시 전투에 복귀시킬 수 있다", () => {
    const A = mkMember("a"), B = mkMember("b", { hp: 0 });
    const engine = new BattleEngine([A, B], ["goblin"], { rng: flat(0.5) });
    engine.gridEnter();
    engine.gridSupport(A.id, ab("resurrection", 3), B.id);
    expect(B.hp).toBeGreaterThan(0);
    expect(B.hp).toBeLessThanOrEqual(B.maxHp);
  });

  it("처형 — 임계 HP 이하의 일반 적을 즉시 쓰러뜨리지만 보스에게는 통하지 않는다", () => {
    const A = mkMember("a");
    const normal = new BattleEngine([A], ["goblin"], { rng: flat(0.5) });
    normal.enemies[0].hp = 8;
    normal.gridOffense(A.id, ab("execution", 3), ["enemy:0"]);
    expect(normal.enemies[0].alive).toBe(false);

    const boss = new BattleEngine([mkMember("b")], ["lord"], { rng: flat(0.5) });
    boss.enemies[0].hp = Math.floor(boss.enemies[0].maxHp * 0.1);
    boss.gridOffense("b", ab("execution", 3), ["enemy:0"]);
    expect(boss.enemies[0].alive).toBe(true);
  });

  it("진형 — formation 액션은 전열↔후열을 토글하고 턴을 소모한다", () => {
    const A = mkMember("a"), B = mkMember("b", { back: true });
    const engine = new BattleEngine([A, B], ["goblin"], { rng: flat(0.5) });

    const ts = engine.next();
    expect(ts.kind).toBe("player"); // A의 턴
    const res = engine.act({ type: "formation" });

    expect(A.back).toBe(true);
    expect(res.kind).toBe("acted"); // 행동으로 처리되어 턴이 넘어간다
    expect(res.events.some((e) => e.t === "log" && e.text.includes("후열"))).toBe(true);

    /* 다음 아군 턴에 다시 전열로 복귀 */
    engine.next(); // B의 턴 (적 턴이 끼면 이벤트만 소비)
    engine.act({ type: "formation" });
    expect(B.back).toBe(false);
  });

  it("진형 — 전열 최소 한 명 규칙 (canSwapRow)", () => {
    const A = mkMember("a"), B = mkMember("b", { back: true });
    expect(canSwapRow(A, [A, B])).toBe(false); // 마지막 전열은 물러날 수 없다
    expect(canSwapRow(B, [A, B])).toBe(true);  // 후열→전열은 항상 가능
    expect(canSwapRow(A, [A, mkMember("c")])).toBe(true);
  });

  it("진형 — gridSwapRow는 그리드 전투에서 같은 규칙으로 동작한다", () => {
    const A = mkMember("a");
    const engine = new BattleEngine([A], ["goblin"], { rng: flat(0.5) });
    engine.gridEnter();
    const events = engine.gridSwapRow(A.id);
    expect(A.back).toBe(true);
    expect(events.some((e) => e.t === "log" && e.text.includes("후열"))).toBe(true);
    engine.gridSwapRow(A.id);
    expect(A.back).toBe(false);
  });

  it("진형 — 근접 적의 단일 공격은 전열만 노린다 (엔진이 직접 판정)", () => {
    const A = mkMember("a"), B = mkMember("b", { back: true });
    /* rng: [대상 0.9(필터 없으면 B 선택), 명중 nat11, 편차 0.5] — goblin은 단일 속성이라 타입 rng 없음 */
    const engine = new BattleEngine([A, B], ["goblin"], { rng: seq(0.9, nat(11), 0.5) });
    engine.gridEnter();
    const events = engine.gridEnemyAct("enemy:0", [A.id, B.id]);
    expect(B.hp).toBe(B.maxHp); // 후열은 무사하다
    expect(events.some((e) => e.t === "hit" && e.target === "ally:a")).toBe(true);
    expect(events.some((e) => e.t === "log" && e.text.includes("전열에 막힌다"))).toBe(true);
  });

  it("진형 — 도약(flank) 적은 전열을 뛰어넘어 후열을 덮친다", () => {
    const A = mkMember("a"), B = mkMember("b", { back: true });
    /* rng: [대상 0.9→B, 명중 nat15, 편차 0.5, 공포 부여 0.9(발동 안 함)] */
    const engine = new BattleEngine([A, B], ["duskbat"], { rng: seq(0.9, nat(15), 0.5, 0.9) });
    engine.gridEnter();
    const events = engine.gridEnemyAct("enemy:0", [A.id, B.id]);
    expect(B.hp).toBeLessThan(B.maxHp); // 후열도 안전하지 않다
    expect(events.some((e) => e.t === "log" && e.text.includes("뛰어넘어"))).toBe(true);
  });

  it("진형 — 광역 공격은 후열 피해를 감쇠한다", () => {
    const A = mkMember("a"), B = mkMember("b", { back: true });
    /* rng: [광역 0.1(<0.35 발동), 속성 0.0(fire),
     *       A: 명중 nat15·편차 0.5·상태 0.9 / B: 동일] — 같은 굴림이라 차이는 감쇠뿐 */
    const engine = new BattleEngine([A, B], ["lord"], {
      rng: seq(0.1, 0.0, nat(15), 0.5, 0.9, nat(15), 0.5, 0.9),
    });
    engine.gridEnter();
    const events = engine.gridEnemyAct("enemy:0", [A.id, B.id]);
    const hitA = hits(events).find((e) => e.target === "ally:a");
    const hitB = hits(events).find((e) => e.target === "ally:b");
    expect(hitA && hitB).toBeTruthy();
    expect(hitB!.amount).toBeLessThan(hitA!.amount);
  });

  it("후열 조준 — 원거리 공격은 후열에서 명중 +2를 받는다", () => {
    /* acc 5(숙련3+민첩1+랭크1) vs goblin AC 11 — nat4는 전열이면 9<11 빗나감, 후열이면 +2로 11≥11 명중 */
    const bow = { name: "활", atk: 9, wtype: "pierce" as const, reach: "ranged" as const };
    const F = mkMember("f", { equip: { mainHand: bow } });
    const front = new BattleEngine([F], ["goblin"], { rng: seq(nat(4)) });
    front.gridEnter();
    expect(front.gridOffense(F.id, { ...BASIC_ATTACK }, ["enemy:0"])
      .some((e) => e.t === "miss")).toBe(true);

    const K = mkMember("k", { back: true, equip: { mainHand: bow } });
    const back = new BattleEngine([K], ["goblin"], { rng: seq(nat(4), 0.5, 0.5) });
    back.gridEnter();
    expect(back.gridOffense(K.id, { ...BASIC_ATTACK }, ["enemy:0"])
      .some((e) => e.t === "hit")).toBe(true);
  });

  it("리치 무기 — 창은 후열에서도 근접 판정이 가능하다", () => {
    const spear = { name: "강철 창", atk: 6, wtype: "pierce" as const, reach: "reach" as const };
    const sword = { name: "검", atk: 5, wtype: "slash" as const, reach: "melee" as const };
    expect(attackReach(BASIC_ATTACK, spear)).toBe("reach");
    expect(attackReach(ab("impale", 1), spear)).toBe("reach"); // 창 기술 + 리치 무기
    expect(attackReach(ab("impale", 1), sword)).toBe("melee"); // 창 기술도 일반 무기면 근접
    const B = mkMember("b", { back: true });
    expect(rowBlocked(B, "reach")).toBe(false); // 후열에서 창은 찌를 수 있다
    expect(rowBlocked(B, "melee")).toBe(true);
  });
});
