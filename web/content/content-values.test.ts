/**
 * 실제 콘텐츠(1주차 발주분)와 설계 수치의 정합 검사.
 * 카드 리뉴얼 이후: 일상 카드 9장 · 종류 4종 · 결과 산문 3변형이 발주 규격이다
 * (docs/design-structure.md §11·§12 / 정본은 content.ep1-slice.json).
 */
import { describe, expect, it } from "vitest";
import type { CardKind, WorkOrderTemplate } from "../core/schema";
import { loadContent } from "./loader";

const [bundle] = loadContent();

function template(id: string): WorkOrderTemplate {
  const t = bundle.orderTemplates.find((t) => t.id === id);
  if (!t) throw new Error(`템플릿 없음: ${id}`);
  return t;
}

describe("발주 격자 — 일상 카드 9장, 종류 4종", () => {
  it("9장 전부 존재한다", () => {
    expect(bundle.orderTemplates.map((t) => t.id).sort()).toEqual(
      [
        "WO-N1",
        "WO-N2",
        "WO-N3",
        "WO-N4",
        "WO-N5",
        "WO-T1",
        "WO-T2",
        "WO-T3",
        "WO-T4",
      ].sort(),
    );
  });
  it("종류 배분: 점검 3 · 순찰 2 · 자재 1 · 소각 3 (소각은 배부 풀 비중 확보)", () => {
    const byKind = new Map<CardKind, number>();
    for (const t of bundle.orderTemplates)
      byKind.set(t.kind, (byKind.get(t.kind) ?? 0) + 1);
    expect(byKind.get("circuit")).toBe(3);
    expect(byKind.get("patrol")).toBe(2);
    expect(byKind.get("material")).toBe(1);
    expect(byKind.get("incinerate")).toBe(3);
  });
  it("가중치 — minDecay가 깊을수록 무겁다 (v3 §3)", () => {
    expect(template("WO-T1").weight).toBe(1);
    expect(template("WO-T2").weight).toBe(2);
    expect(template("WO-T3").weight).toBe(3);
    expect(template("WO-T4").weight).toBe(2);
    expect(template("WO-N1").weight).toBe(1);
    expect(template("WO-N2").weight).toBe(2);
    expect(template("WO-N3").weight).toBe(2);
    expect(template("WO-N4").weight).toBe(1);
    expect(template("WO-N5").weight).toBe(2);
  });
  it("ENC-001 보장의 전제: minDecay 0인 소각 카드가 존재한다 (첫날부터 배부 가능)", () => {
    expect(
      bundle.orderTemplates.some(
        (t) => t.kind === "incinerate" && t.minDecay === 0,
      ),
    ).toBe(true);
  });
});

describe("결과 반영 산문 — 성적 3변형, 현장·보고 문단 분리", () => {
  it.each(bundle.orderTemplates.map((t) => t.id))(
    "%s: 각 변형이 현장 묘사 + 보고 문구 2문단 이상",
    (id) => {
      const t = template(id);
      for (const result of ["complete", "partial", "fail"] as const) {
        for (const variant of t.resultProse[result]) {
          expect(variant.paragraphs.length).toBeGreaterThanOrEqual(2);
        }
      }
    },
  );
  it("보고 문구에 기억 0 액면('재생률'·'정상 범위')이 심겨 있다", () => {
    const all = bundle.orderTemplates
      .flatMap((t) => Object.values(t.resultProse))
      .flatMap((variants) => variants.flatMap((v) => v.paragraphs))
      .join(" ");
    expect(all).toContain("재생률");
    expect(all).toContain("정상 범위");
  });
});

describe("텍스트 변형 축 분리 (v3 §7) — 한 문서에 두 축을 쓰지 않는다", () => {
  it.each(bundle.orderTemplates.map((t) => t.id))(
    "%s: 본문 조건이 기억 축과 노후도 축을 섞지 않는다",
    (id) => {
      const axes = new Set(
        template(id)
          .body.flatMap((v) => v.if ?? [])
          .map((c) =>
            c.path === "self.memory"
              ? "memory"
              : c.path.includes(".decay")
                ? "decay"
                : "other",
          ),
      );
      expect(axes.size).toBeLessThanOrEqual(1);
      expect(axes.has("other")).toBe(false);
    },
  );
  it("WO-T3: 기억 1부터 본문이 다르게 읽힌다 (재렌더 대조 지점)", () => {
    const t3 = template("WO-T3");
    expect(
      t3.body.some((v) =>
        v.if?.some((c) => c.path === "self.memory" && c.gte === 1),
      ),
    ).toBe(true);
  });
});

describe("조우 — ENC-001 (설명형 선행 조우, 2026-08-11 확정)", () => {
  const enc = () => bundle.encounters.find((e) => e.id === "ENC-001")!;
  it("설명형이다 — 행동·턴 없이 briefing만 있다 (읽고 확인하면 두더지 잡기)", () => {
    expect(enc().briefing).toBeDefined();
    expect(enc().actions).toBeUndefined();
    expect(enc().outcomes).toBeUndefined();
  });
  it("briefing 효과가 enc001_done을 세운다 — 생성기 소각 보장의 해제 조건", () => {
    expect(enc().briefing!.effects).toContainEqual({
      path: "world.flags.enc001_done",
      op: "set",
      value: 1,
    });
  });
  it("공포는 동요다 — briefing이 동요를 1 올린다 (별도 수치 없음, 2026-08-13 확정)", () => {
    expect(enc().briefing!.effects).toContainEqual({
      path: "world.menace.unrest",
      op: "add",
      value: 1,
    });
  });
  it("첫 대면 산문 — 불순물이 무엇인지(서류상 명칭·선별 지침)를 도입이 설명한다", () => {
    const text = enc()
      .intro.flatMap((v) => v.paragraphs)
      .join(" ");
    expect(text).toContain("불순물");
    expect(text).toContain("선별");
  });
});
