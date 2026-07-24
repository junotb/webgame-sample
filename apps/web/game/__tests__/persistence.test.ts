import { beforeEach, describe, expect, it } from "vitest";
import { parseSave, SAVE_VERSION, serializeGame } from "../persistence";
import { PARTY_SLOTS } from "../defs";
import { G, newGame } from "../state";

const configs = PARTY_SLOTS.map((slot, i) => ({
  slotId: slot.id,
  name: slot.name, portrait: i, classId: "fighter" as const, bonusSkills: [],
  attrs: { might: 10, int: 10, wit: 10, vital: 10, agi: 10, fortune: 10 },
}));

describe("버전 세이브", () => {
  beforeEach(() => newGame(configs));

  it("현재 상태를 왕복 직렬화한다", () => {
    G.gold = 777;
    G.townWorld!.day = 3;
    const parsed = parseSave(serializeGame());
    expect(parsed.gold).toBe(777);
    expect(parsed.townWorld?.day).toBe(3);
    expect(parsed.party.map((m) => m.id)).toEqual(PARTY_SLOTS.map((slot) => slot.id));
    expect(parsed).not.toBe(G);
  });

  it("깨진 JSON과 알 수 없는 버전을 거부한다", () => {
    expect(() => parseSave("{")).toThrow("JSON");
    expect(() => parseSave(JSON.stringify({ version: SAVE_VERSION + 1, state: G }))).toThrow("버전");
  });

  it("마이그레이션 경로가 없는 구버전(v6 미만)을 명확한 메시지로 거부한다", () => {
    for (const version of [1, 2, 5]) {
      const legacy = JSON.parse(serializeGame());
      legacy.version = version;
      expect(() => parseSave(JSON.stringify(legacy))).toThrow("호환되지 않는 세이브 버전");
    }
  });

  it("현재 버전 세이브는 마이그레이션 없이 그대로 통과한다", () => {
    const raw = JSON.parse(serializeGame());
    expect(raw.version).toBe(SAVE_VERSION);
    expect(() => parseSave(JSON.stringify(raw))).not.toThrow();
  });

  it("v6에서 완료 대기였던 왕자 수색은 오르윈 보고 단계로 마이그레이션한다", () => {
    const legacy = JSON.parse(serializeGame());
    legacy.version = 6;
    legacy.state.flags.princeFound = true;
    legacy.state.quests.main_ch1_wavering_crown = {
      status: "done", counts: { find_prince: 1 }, times: 0,
    };
    const migrated = parseSave(JSON.stringify(legacy));
    expect(migrated.quests.main_ch1_wavering_crown).toMatchObject({
      status: "active",
      counts: { find_prince: 1, report_to_orwin: 0 },
    });
  });

  it("v7 캐릭터가 당시 사용할 수 있던 비기본 주문을 습득 상태로 보존한다", () => {
    const legacy = JSON.parse(serializeGame());
    legacy.version = 7;
    legacy.state.party[0].trained.fire = 2;
    legacy.state.party[0].trained.wind = 2;
    delete legacy.state.party[0].learnedSpells;

    const migrated = parseSave(JSON.stringify(legacy));
    const learned = migrated.party[0].learnedSpells;
    expect(learned).toContain("ember");
    expect(learned).toContain("fireball");
    expect(learned).toContain("recall");
    expect(learned).not.toContain("firebolt");
    expect(learned).not.toContain("inferno");
  });
});
