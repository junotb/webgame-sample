import { beforeEach, describe, expect, it } from "vitest";
import { PARTY_SLOTS, QUESTS } from "../defs";
import { NORMAL_SPAWNS } from "../goblin-fortress";
import { G, canClassChange, newGame } from "../state";
import {
  acceptQuest, carriageUnlocked, questNotify, questStatus, repeatCooldownDays, reportQuest, trackerLines,
} from "../core/quests";

function freshGame(): void {
  newGame(PARTY_SLOTS.map((s) => ({
    slotId: s.id,
    name: s.name,
    portrait: s.preset.portrait,
    classId: s.preset.classId,
    bonusSkills: [...s.preset.skills],
    attrs: { ...s.preset.attrs },
  })));
}

const kill = (defId: string, n = 1) => {
  for (let i = 0; i < n; i++) questNotify({ t: "kill", defId });
};

describe("퀘스트 데이터 규칙", () => {
  it("메인·서브·직업·반복 네 종류를 모두 제공한다", () => {
    expect(new Set(QUESTS.map((q) => q.kind))).toEqual(new Set(["main", "side", "job", "repeat"]));
  });

  it("현재 메인은 마구간 확인·산적 소탕·편지 전달과 확장 1장의 네 단계다", () => {
    const mains = QUESTS.filter((q) => q.kind === "main");
    expect(mains.map((q) => q.id)).toEqual([
      "main_hermans_letter",
      "main_clear_evermore_road",
      "main_deliver_hermans_letter",
      "main_ch1_wavering_crown",
    ]);
    expect(mains[0].objectives[0]).toMatchObject({ type: "talk", target: "crossvale_stable" });
    expect(mains[1].objectives[0]).toMatchObject({ type: "clear", target: "valley_bandits" });
    expect(mains[2].objectives[0]).toMatchObject({ type: "talk", target: "federal_lord" });
    expect(mains[3].objectives[0]).toMatchObject({ type: "talk", target: "lost_prince" });
    expect(mains[3].objectives[1]).toMatchObject({ type: "talk", target: "chamberlain" });
    expect(mains[3]).toMatchObject({ autoStart: false, sequential: true });
  });

  it("반복 퀘스트는 재생성 몬스터 처치만 목표로 삼는다", () => {
    const respawning = new Set(NORMAL_SPAWNS.map((s) => s.defId));
    for (const q of QUESTS.filter((q) => q.kind === "repeat")) {
      expect(q.repeatEveryDays).toBeGreaterThan(0);
      for (const o of q.objectives) {
        expect(o.type).toBe("kill");
        expect(respawning.has(o.target), `${q.id}: ${o.target}은 재생성 몬스터가 아님`).toBe(true);
      }
    }
  });
});

describe("퀘스트 진행", () => {
  beforeEach(freshGame);

  it("마구간 확인부터 길드 보고와 편지 전달까지 메인 체인을 순서대로 연다", () => {
    expect(trackerLines()[0].text).toContain("봉인된 편지");
    expect(questStatus("main_hermans_letter")).toBe("active");

    G.flags.stableBriefed = true;
    questNotify({ t: "talk", npc: "crossvale_stable" });
    expect(questStatus("main_hermans_letter")).toBe("done");
    expect(reportQuest("main_hermans_letter")).not.toBeNull();
    expect(questStatus("main_clear_evermore_road")).toBe("active");

    G.flags.banditsDefeated = true;
    questNotify({ t: "clear", symbol: "valley_bandits" });
    expect(questStatus("main_clear_evermore_road")).toBe("done");
    expect(carriageUnlocked()).toBe(false);
    expect(reportQuest("main_clear_evermore_road")).not.toBeNull();
    expect(carriageUnlocked()).toBe(true);
    expect(questStatus("main_deliver_hermans_letter")).toBe("active");

    questNotify({ t: "talk", npc: "federal_lord" });
    expect(questStatus("main_deliver_hermans_letter")).toBe("done");
    expect(reportQuest("main_deliver_hermans_letter")).not.toBeNull();
    expect(questStatus("main_deliver_hermans_letter")).toBe("rewarded");
    expect(questStatus("main_ch1_wavering_crown")).toBe("available");
  });

  it("1장은 오르윈에게 직접 수주하고, 왕자를 찾은 뒤 오르윈에게 보고해 닫는다", () => {
    expect(questStatus("main_ch1_wavering_crown")).toBe("locked");
    G.flags.stableBriefed = true;
    questNotify({ t: "talk", npc: "crossvale_stable" });
    reportQuest("main_hermans_letter");
    G.flags.banditsDefeated = true;
    questNotify({ t: "clear", symbol: "valley_bandits" });
    reportQuest("main_clear_evermore_road");
    questNotify({ t: "talk", npc: "federal_lord" });
    reportQuest("main_deliver_hermans_letter");

    expect(questStatus("main_ch1_wavering_crown")).toBe("available");
    expect(acceptQuest("main_ch1_wavering_crown")).toBe(true);
    expect(questStatus("main_ch1_wavering_crown")).toBe("active");
    G.flags.princeFound = true;
    questNotify({ t: "talk", npc: "lost_prince" });
    expect(questStatus("main_ch1_wavering_crown")).toBe("active");
    expect(trackerLines(5).some((line) => line.text.includes("오르윈에게 보고"))).toBe(true);
    questNotify({ t: "talk", npc: "chamberlain" });
    expect(questStatus("main_ch1_wavering_crown")).toBe("done");
    const reward = reportQuest("main_ch1_wavering_crown");
    expect(reward).not.toBeNull();
    expect(reward!.gold).toBeGreaterThan(0);
    expect(questStatus("main_ch1_wavering_crown")).toBe("rewarded");
  });

  it("문서·인질·주교 목표와 이미 수행한 행동을 소급 인정한다", () => {
    G.flags.goblinOrders = true;
    G.flags.hostagesRescued = true;
    G.flags.bishopDefeated = true;
    expect(acceptQuest("side_goblin_orders")).toBe(true);
    expect(acceptQuest("side_rescue_hostages")).toBe(true);
    expect(acceptQuest("side_ruined_temple")).toBe(true);
    expect(questStatus("side_goblin_orders")).toBe("done");
    expect(questStatus("side_rescue_hostages")).toBe("done");
    expect(questStatus("side_ruined_temple")).toBe("done");
  });

  it("산적 소탕 후 길드에 보고해야 역마차를 해금한다", () => {
    expect(carriageUnlocked()).toBe(false);
    G.flags.stableBriefed = true;
    questNotify({ t: "talk", npc: "crossvale_stable" });
    reportQuest("main_hermans_letter");
    G.flags.banditsDefeated = true;
    questNotify({ t: "clear", symbol: "valley_bandits" });
    expect(questStatus("main_clear_evermore_road")).toBe("done");
    expect(carriageUnlocked()).toBe(false);
    reportQuest("main_clear_evermore_road");
    expect(carriageUnlocked()).toBe(true);
  });

  it("반복 현상금은 보고한 다음 날 다시 열린다", () => {
    expect(acceptQuest("repeat_slimes")).toBe(true);
    kill("slime", 5);
    expect(questStatus("repeat_slimes")).toBe("done");
    reportQuest("repeat_slimes");
    expect(questStatus("repeat_slimes")).toBe("locked");
    expect(repeatCooldownDays("repeat_slimes")).toBe(1);
    G.townWorld!.day++;
    expect(questStatus("repeat_slimes")).toBe("available");
    expect(acceptQuest("repeat_slimes")).toBe(true);
    expect(G.quests.repeat_slimes.counts.kill_slime ?? 0).toBe(0);
    expect(G.quests.repeat_slimes.times).toBe(1);
  });

  it("수주 전에 처치한 일반 몬스터는 현상금에 세지 않는다", () => {
    kill("slime", 3);
    acceptQuest("repeat_slimes");
    expect(G.quests.repeat_slimes.counts.kill_slime ?? 0).toBe(0);
  });

  it("승급 심사를 보고해야 전직 자격이 열린다", () => {
    const member = G.party[0];
    member.level = 3;
    expect(canClassChange(member)).toBeNull();
    acceptQuest("job_first_promotion");
    G.explore.defeated.orc = true;
    questNotify({ t: "clear", symbol: "orc" });
    reportQuest("job_first_promotion");
    expect(canClassChange(member)).toBe("t1");
  });

  it("트래커는 진행 중·보고 대기 퀘스트를 요약한다", () => {
    acceptQuest("side_goblin_orders");
    G.flags.goblinOrders = true;
    questNotify({ t: "collect", item: "goblin_orders" });
    expect(trackerLines(5).some((line) => line.done && line.text.includes("빌린 손으로 쓴 명령"))).toBe(true);
  });
});
