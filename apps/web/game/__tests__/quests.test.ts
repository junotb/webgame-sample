/* =====================================================================
 * quests.test.ts — 퀘스트 코어 검증 (PIXI 없이 실행)
 * ===================================================================== */
import { beforeEach, describe, expect, it } from "vitest";
import { PARTY_SLOTS, QUESTS } from "../defs";
import { NORMAL_SPAWNS } from "../dungeon";
import { G, newGame } from "../state";
import {
  acceptQuest, questNotify, questStatus, reportQuest, trackerLines,
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
  it("반복 퀘스트의 kill 대상은 재생성 몬스터(NORMAL_SPAWNS)만", () => {
    const respawning = new Set(NORMAL_SPAWNS.map((s) => s.defId));
    for (const q of QUESTS.filter((q) => q.kind === "repeat")) {
      for (const o of q.objectives) {
        expect(o.type, `${q.id}: 반복 퀘스트는 kill 목표만`).toBe("kill");
        expect(respawning.has(o.target), `${q.id}: ${o.target}는 재생성 몹이 아님`).toBe(true);
      }
    }
  });

  it("메인 체인은 선행 퀘스트로 연결된다", () => {
    const mains = QUESTS.filter((q) => q.kind === "main");
    for (let i = 1; i < mains.length; i++)
      expect(mains[i].requires?.quests).toContain(mains[i - 1].id);
  });
});

describe("퀘스트 진행", () => {
  beforeEach(freshGame);

  it("첫 메인 퀘스트는 자동 수주된다", () => {
    expect(trackerLines().some((l) => l.text.includes("계곡의 이변"))).toBe(true);
    expect(questStatus("m1")).toBe("active");
    expect(questStatus("m2")).toBe("locked"); // 선행 미완
  });

  it("kill 카운트 → 완료 → 보고 → 다음 메인 자동 수주", () => {
    kill("goblin", 2);
    expect(G.quests.m1.counts.kill_goblin).toBe(2);
    expect(questStatus("m1")).toBe("active");
    kill("goblin");
    expect(questStatus("m1")).toBe("done");
    kill("goblin"); // 초과분은 세지 않는다
    expect(G.quests.m1.counts.kill_goblin).toBe(3);

    const gold0 = G.gold;
    const r = reportQuest("m1")!;
    expect(r.gold).toBe(80);
    expect(G.gold).toBe(gold0 + 80);
    expect(questStatus("m1")).toBe("rewarded");
    expect(questStatus("m2")).toBe("active"); // 체인 자동 수주
  });

  it("clear형은 수주 시점의 defeated를 소급 인정한다", () => {
    kill("goblin", 3);
    G.explore.defeated.orc = true; // m2 수주 전에 이미 토벌
    reportQuest("m1");
    expect(questStatus("m2")).toBe("done"); // 수주 즉시 보고 대기
  });

  it("반복 퀘스트: 보고 후 재수주 가능, 완료 횟수 누적", () => {
    expect(acceptQuest("r1")).toBe(true);
    kill("slime", 5);
    expect(questStatus("r1")).toBe("done");
    reportQuest("r1");
    expect(questStatus("r1")).toBe("available"); // 다시 수주 가능
    expect(acceptQuest("r1")).toBe(true);
    expect(G.quests.r1.counts.kill_slime ?? 0).toBe(0); // 카운트 리셋
    expect(G.quests.r1.times).toBe(1);
  });

  it("수주 전의 처치는 세지 않는다", () => {
    kill("slime", 3);
    acceptQuest("r1");
    expect(G.quests.r1.counts.kill_slime ?? 0).toBe(0);
  });

  it("레벨 조건 미달 서브 퀘스트는 잠긴다", () => {
    expect(questStatus("s2")).toBe("locked"); // 파티 Lv1
    expect(acceptQuest("s2")).toBe(false);
    G.party[0].level = 2;
    expect(questStatus("s2")).toBe("available");
    expect(acceptQuest("s2")).toBe(true);
  });

  it("reach형: 숨겨진 보물 도달", () => {
    kill("goblin", 3); reportQuest("m1"); // s1 해금
    acceptQuest("s1");
    questNotify({ t: "reach", poi: "hidden" });
    expect(questStatus("s1")).toBe("done");
  });

  it("트래커는 진행 중·보고 대기 퀘스트를 요약한다", () => {
    kill("goblin", 3);
    const lines = trackerLines();
    expect(lines[0].done).toBe(true);
    expect(lines[0].text).toContain("계곡의 이변");
  });
});
