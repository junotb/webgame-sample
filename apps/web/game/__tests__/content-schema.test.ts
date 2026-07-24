import { describe, expect, it } from "vitest";
import questsJson from "../content/quests.json";
import npcsJson from "../content/npcs.json";
import dialogueJson from "../content/town-dialogue.json";
import storyJson from "../content/story.json";
import { validateNpcs, validateQuests, validateStory, validateTownDialogue } from "../content/validate";
import { QUESTS } from "../defs/quests";
import { NPCS } from "../defs/npcs";
import { CROSSVALE_FACILITIES } from "../town/crossvale";
import { EVERMORE_FACILITIES } from "../town/evermore";

describe("콘텐츠 JSON 스키마", () => {
  it("배포된 콘텐츠 파일이 모두 스키마를 통과한다", () => {
    expect(validateQuests(questsJson).length).toBeGreaterThan(0);
    expect(validateNpcs(npcsJson).length).toBeGreaterThan(0);
    expect(Object.keys(validateStory(storyJson).events)).toContain("letter");
    expect(Object.keys(validateTownDialogue(dialogueJson))).toEqual(
      expect.arrayContaining(["crossvale", "evermore"]));
  });

  it("defs가 JSON에서 로드된다 — 색상은 숫자로 변환된다", () => {
    expect(QUESTS.some((q) => q.id === "main_hermans_letter")).toBe(true);
    for (const npc of NPCS) {
      expect(typeof npc.color).toBe("number");
      expect(typeof npc.accent).toBe("number");
    }
  });

  it("모든 마을 시설에 대화 콘텐츠가 결합된다", () => {
    for (const f of [...CROSSVALE_FACILITIES, ...EVERMORE_FACILITIES]) {
      expect(f.keeper.greetings).toHaveLength(3);
      expect(f.keeper.name.length).toBeGreaterThan(0);
    }
  });

  it("모든 퀘스트와 NPC 대사를 영어 원문·한국어 번역으로 함께 보관한다", () => {
    for (const q of QUESTS) {
      expect(q.locales.en.name.length).toBeGreaterThan(0);
      expect(q.locales.ko.name).toBe(q.name);
      expect(Object.keys(q.locales.en.objectives).sort())
        .toEqual(q.objectives.map((objective) => objective.id).sort());
    }
    for (const npc of NPCS) {
      expect(npc.locales.en.profile.background.length).toBeGreaterThan(0);
      expect(npc.locales.ko.profile.voice.length).toBeGreaterThan(0);
      for (const questId of npc.quests ?? []) {
        expect(npc.locales.en.questDialogue[questId].offer.length).toBeGreaterThan(0);
        expect(npc.questDialogue[questId].complete.length).toBeGreaterThan(0);
      }
    }
  });

  it("잘못된 형태를 경로가 담긴 오류로 거부한다", () => {
    expect(() => validateQuests({ quests: [{ id: "x" }] })).toThrow("quests[0]");
    const invalidNpcs = structuredClone(npcsJson);
    invalidNpcs.npcs[0].color = "red";
    expect(() => validateNpcs(invalidNpcs)).toThrow("color");
    expect(() => validateTownDialogue({ crossvale: { inn: { keeper: { name: "a", role: "b", portrait: 1, greetings: ["하나", "둘"] } } } }))
      .toThrow("greetings");
  });
});
