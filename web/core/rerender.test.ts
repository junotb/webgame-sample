/**
 * 완곡어 재렌더 (세션 ⑤) — `(문서 항목, 현재 상태) → 문장`.
 * 여기서 고정하는 제약: **과거 문서도 현재 기억으로 렌더링한다** (그때 값 금지),
 * 통지서는 등급 상태값으로 본문을 뽑는다, 폐기된 참조는 null로 빠진다.
 */
import { describe, expect, it } from "vitest";
import { renderArchiveEntry } from "./rerender";
import { WEEKLY_CONTENT } from "./test-content";
import type { ContentBundle, GameState } from "./schema";

function makeState(overrides?: {
  memory?: number;
  weekRatings?: GameState["world"]["weekRatings"];
}): GameState {
  return {
    account: { ownedEpisodes: ["ep1"] },
    self: {
      stats: { repair: 40, insight: 35, procedure: 30, nerve: 25 },
      skills: {
        flowsense: 1,
        incantation: 1,
        inscription: 1,
        flame: 1,
        frost: 0,
      },
      skillXp: {
        flowsense: 0,
        incantation: 0,
        inscription: 0,
        flame: 0,
        frost: 0,
      },
      memory: overrides?.memory ?? 0,
      rank: 0,
    },
    world: {
      calendar: { day: 9, weekday: 2 }, // 항목의 day보다 뒤 — 재열람 시점
      assignment: { zone: "d5" },
      weekRatings: overrides?.weekRatings ?? {},
      weekTally: { processed: 0, notPassed: 0, perfect: 0 },
      ending: null,
      weekend: null,
      cardNeglect: {},
      multiday: null,
      archive: [],
      phase: "morning",
      zones: { d2: { stagnation: 3 }, d5: { stagnation: 4 }, d7: { stagnation: 5 } },
      menace: { fatigue: 0, scrutiny: 0, unrest: 0 },
      npcs: { returned: { trust: 0 } },
      flags: {},
      shiftLeft: 2,
      pendingOrders: [],
      seed: 1,
    },
  };
}

const CONTENT: ContentBundle = {
  bundleId: "rerender-test",
  ...WEEKLY_CONTENT,
  version: "0",
  zoneMaps: [],
  encounters: [
    {
      id: "ENC-001",
      title: "설비 이상 확인 요청",
      maxTurns: 4,
      calmToSleep: 2,
      intro: [{ paragraphs: ["갱도 안쪽에서 무언가 움직였다."] }],
      actions: {
        observe: { label: "관찰", check: { kind: "auto" }, successText: "" },
        soothe: { label: "진정", check: { kind: "auto" }, successText: "" },
        burn: { label: "소각", check: { kind: "auto" }, successText: "" },
        withdraw: { label: "이탈", check: { kind: "auto" }, successText: "" },
      },
      outcomes: {
        burned: { effects: [], text: "" },
        soothed: { effects: [], text: "" },
        withdrawn: { effects: [], text: "" },
        expired: { effects: [], text: "" },
      },
    },
  ],
  orderTemplates: [
    {
      id: "WO-R1",
      minStagnation: 0,
      weight: 1,
      kind: "circuit",
      siteId: "s1",
      title: [
        { if: [{ path: "self.memory", gte: 1 }], text: "간헐 명멸 — 그 문구" },
        { text: "간헐 명멸 현상 점검" },
      ],
      body: [
        {
          if: [{ path: "self.memory", gte: 1 }],
          paragraphs: ["이제 이 문구가 무엇의 다른 이름인지 안다."],
        },
        { paragraphs: ["연료 재생률의 자연 변동입니다."] },
      ],
      resultProse: {
        complete: [{ paragraphs: ["완수"] }],
        partial: [{ paragraphs: ["부분"] }],
        fail: [{ paragraphs: ["실패"] }],
      },
    },
  ],
  storylets: [
    {
      id: "EV-001",
      requirements: [],
      body: [{ paragraphs: ["그가 대답했다."] }],
      choices: [],
    },
  ],
};

describe("renderArchiveEntry — 카드", () => {
  const entry = {
    kind: "order",
    day: 1,
    templateId: "WO-R1",
    zone: "d5",
  } as const;
  it("기억 0: 액면 그대로 (기준선)", () => {
    expect(renderArchiveEntry(entry, makeState(), CONTENT)).toEqual({
      title: "간헐 명멸 현상 점검",
      paragraphs: ["연료 재생률의 자연 변동입니다."],
    });
  });
  it("과거 문서도 현재 기억으로 렌더링한다 — day 1의 항목이 기억 1의 문장으로 열린다", () => {
    expect(
      renderArchiveEntry(entry, makeState({ memory: 1 }), CONTENT),
    ).toEqual({
      title: "간헐 명멸 — 그 문구",
      paragraphs: ["이제 이 문구가 무엇의 다른 이름인지 안다."],
    });
  });
  it("폐기된 템플릿 참조는 null — 목록에서 조용히 빠진다", () => {
    expect(
      renderArchiveEntry(
        { kind: "order", day: 1, templateId: "WO-GONE", zone: "d5" },
        makeState(),
        CONTENT,
      ),
    ).toBeNull();
  });
});

describe("renderArchiveEntry — 면담·신고·통지", () => {
  it("스토리렛: 면담록 제목 + 본문", () => {
    expect(
      renderArchiveEntry(
        { kind: "storylet", day: 2, id: "EV-001" },
        makeState(),
        CONTENT,
      ),
    ).toEqual({
      title: "면담록 EV-001",
      paragraphs: ["그가 대답했다."],
    });
  });
  it("조우: 신고서 제목 + intro", () => {
    expect(
      renderArchiveEntry(
        { kind: "encounter", day: 3, id: "ENC-001", zone: "d5" },
        makeState(),
        CONTENT,
      ),
    ).toEqual({
      title: "설비 이상 확인 요청",
      paragraphs: ["갱도 안쪽에서 무언가 움직였다."],
    });
  });
  it("통지서: 등급 상태값(weekRatings)이 본문을 고른다", () => {
    const rendered = renderArchiveEntry(
      { kind: "notice", day: 5, week: 1 },
      makeState({ weekRatings: { 1: "passed" } }),
      CONTENT,
    );
    expect(rendered?.title).toBe("제1주 평가 통지서");
    expect(rendered?.paragraphs).toEqual(["통지: Passed."]);
  });
  it("등급이 없는 주의 통지서는 null", () => {
    expect(
      renderArchiveEntry(
        { kind: "notice", day: 5, week: 2 },
        makeState(),
        CONTENT,
      ),
    ).toBeNull();
  });
});

/**
 * 지명 앵커 (design-structure §1-5, 2026-08-13).
 * 지명·고유명사는 `기억`·`정체` 어느 축으로도 변형되지 않는다.
 * 재렌더 경로가 변형을 고르는 곳이므로 여기서 고정한다.
 */
describe("지명은 변형 축을 타지 않는다 — 앵커", () => {
  const ANCHOR = "그라우포스";
  const ANCHORED: ContentBundle = {
    ...CONTENT,
    orderTemplates: [
      {
        id: "WO-ANCHOR",
        minStagnation: 0,
        weight: 1,
        kind: "patrol",
        siteId: "s1",
        title: [
          {
            if: [{ path: "self.memory", gte: 1 }],
            text: `${ANCHOR} 방면 순시 — 그 문구`,
          },
          { text: `${ANCHOR} 방면 순시` },
        ],
        body: [
          {
            if: [{ path: "world.zones.d5.stagnation", gte: 6 }],
            paragraphs: [`${ANCHOR}로 물이 쏟아졌다. 소리가 달라져 있었다.`],
          },
          { paragraphs: [`${ANCHOR}로 물이 쏟아졌다. 늘 그렇듯 회색이었다.`] },
        ],
        resultProse: {
          complete: [{ paragraphs: ["완수"] }],
          partial: [{ paragraphs: ["부분"] }],
          fail: [{ paragraphs: ["실패"] }],
        },
      },
    ],
  };
  const entry = {
    kind: "order",
    day: 1,
    templateId: "WO-ANCHOR",
    zone: "d5",
  } as const;

  it("기억 축이 움직여도 지명은 그대로다", () => {
    for (const memory of [0, 1, 4]) {
      const r = renderArchiveEntry(entry, makeState({ memory }), ANCHORED)!;
      expect(r.title).toContain(ANCHOR);
      expect(r.paragraphs.join(" ")).toContain(ANCHOR);
    }
  });

  it("정체 밴드가 움직여도 지명은 그대로다 — 악화는 묘사만 바꾼다", () => {
    const low = makeState();
    const high = makeState();
    high.world.zones.d5.stagnation = 9;
    const a = renderArchiveEntry(entry, low, ANCHORED)!;
    const b = renderArchiveEntry(entry, high, ANCHORED)!;
    expect(a.paragraphs).not.toEqual(b.paragraphs); // 변형은 실제로 갈렸다
    expect(a.paragraphs.join(" ")).toContain(ANCHOR);
    expect(b.paragraphs.join(" ")).toContain(ANCHOR);
  });
});
