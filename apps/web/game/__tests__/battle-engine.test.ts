/* =====================================================================
 * battle-engine.test.ts — 순수 전투 엔진 검증 (PIXI 없이 실행)
 * rng를 주입해 결정적으로 판정한다.
 * ===================================================================== */
import { describe, expect, it } from "vitest";
import { ABILITIES, ENEMY_DEFS, Rank } from "../defs";
import { BattleAbility, Member } from "../state";
import { BASIC_ATTACK, BattleEngine, BattleEvent } from "../core/battle-engine";

function mkMember(id: string, over: Partial<Member> = {}): Member {
  return {
    id, name: id, color: 0, accent: 0, portrait: 0,
    classId: "fighter", ld: null,
    attrs: { might: 10, int: 10, wit: 10, vital: 10, agi: 12, fortune: 10 },
    bonusSkills: [],
    level: 1, exp: 0,
    hp: 100, mp: 50, maxHp: 100, maxMp: 50,
    weapon: { name: "", atk: 0 },
    armor: { name: "", def: 0 },
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
  it("도발 — 내성 실패 시 적의 단일 공격이 시전자에게 강제된다", () => {
    const A = mkMember("a"), B = mkMember("b");
    /* rng 순서: [명중 nat12, 편차, 치명, 내성 nat3(실패→도발 적중)]
     *           [적 명중 nat11, 편차] — 도발로 대상 강제라 선택 rng 없음 */
    const engine = new BattleEngine([A, B], ["goblin"], {
      rng: seq(nat(12), 0.5, 0.5, nat(3), nat(11), 0.5),
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
    /* [명중 nat12, 편차, 치명, 내성 nat11(성공→저항)] */
    const engine = new BattleEngine([A, B], ["goblin"], {
      rng: seq(nat(12), 0.5, 0.5, nat(11)),
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
    /* round(10 × 1.3 × 1.55) − 2 + round(20 × 1.2) = 20 − 2 + 24 = 42 */
    const res = engine.act({ type: "ability", ability: ab("slam", 2), target: "enemy:0" });
    expect(A.mp).toBe(0);
    expect(hits(res.events)[0]).toMatchObject({ amount: 42 });
  });

  it("마법 봉인 — 보스의 광역(마법) 공격이 다음 턴에만 막힌다", () => {
    const A = mkMember("a"), B = mkMember("b");
    /* rng 순서:
     *  뇌진탕: [명중 nat12, 편차, 치명, 내성 nat3(실패→봉인 적중)]
     *  보스 1턴(봉인): [대상선택→A, 명중 nat11, 편차]  (봉인이라 광역판정 없음)
     *  보스 2턴(해제): [광역 0.2(<0.35), A명중 2d20, A편차, B명중 2d20, B편차] */
    const engine = new BattleEngine([A, B], ["lord"], {
      rng: seq(
        nat(12), 0.5, 0.5, nat(3),
        nat(1), nat(11), 0.5,
        0.2, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
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
});
