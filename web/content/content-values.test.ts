/**
 * slice v3 §3 수치와 실제 콘텐츠의 정합 검사.
 * 노후도 증감은 콘텐츠 효과가 아니라 CLOSE_DAY 가중치 정산의 몫이다 —
 * 템플릿에 zone decay 효과가 남아 있으면 이중 계산이므로 여기서 잡는다.
 */
import { describe, expect, it } from 'vitest';
import { generateCards } from '../core/generate';
import type { GameState, TemplateEffect, WorkOption, WorkOrderTemplate } from '../core/schema';
import { loadContent } from './loader';

const [bundle] = loadContent();

function stateAt(decay: number): GameState {
  return {
    account: { ownedEpisodes: ['ep1'] },
    self: {
      stats: { repair: 40, insight: 35, procedure: 30, nerve: 25 },
      skills: { inscription: 1, flowsense: 1 },
      skillXp: { inscription: 0, flowsense: 0 },
      memory: 0,
      rank: 0,
    },
    world: {
      calendar: { day: 1, weekday: 1 },
      assignment: { zone: 'd5' },
      weekRatings: {},
      cardNeglect: {},
      multiday: null,
      archive: [],
      phase: 'morning',
      zones: { d2: { decay: 3 }, d5: { decay }, d7: { decay: 5 } },
      menace: { fatigue: 0, scrutiny: 0, unrest: 0 },
      npcs: { protagonist: { trust: 0 } },
      flags: {},
      shiftLeft: 2,
      pendingOrders: [],
      seed: 42,
    },
  };
}


function template(id: string): WorkOrderTemplate {
  const t = bundle.orderTemplates.find((t) => t.id === id);
  if (!t) throw new Error(`템플릿 없음: ${id}`);
  return t;
}

function hasDecayEffect(effects: TemplateEffect[]): boolean {
  return effects.some((e) => e.path === 'world.zones.{zone}.decay');
}

function hasPatchedFlag(effects: TemplateEffect[]): boolean {
  return effects.some((e) => e.path === 'world.flags.patched_{zone}');
}

function fatigueOnFailure(opt: WorkOption): number | undefined {
  return opt.onFailure?.effects.find((e) => e.path === 'world.menace.fatigue')?.value;
}

describe('가중치 — minDecay가 깊을수록 무겁다 (v3 §3: 하루 4장 합 8 전후)', () => {
  it('WO-T1=1, WO-T2=2, WO-T3=3, WO-T4=2, WO-T5=3', () => {
    expect(template('WO-T1').weight).toBe(1);
    expect(template('WO-T2').weight).toBe(2);
    expect(template('WO-T3').weight).toBe(3);
    expect(template('WO-T4').weight).toBe(2);
    expect(template('WO-T5').weight).toBe(3);
  });
  it('노후도 5, day 1(서사 카드 등장 전)에서 제시 4장의 가중치 합이 8이다', () => {
    // 서사 카드(WO-T6~T8)는 day 2+에 등장한다 — §3 강제값은 일상 덱 기준
    const cards = generateCards(stateAt(5), bundle.orderTemplates, () => 0);
    expect(cards.reduce((s, c) => s + c.weight, 0)).toBe(8);
  });
});

describe('텍스트 변형 축 분리 (v3 §7) — 한 문서에 두 축을 쓰지 않는다', () => {
  it.each(['WO-T1', 'WO-T2', 'WO-T3', 'WO-T4'])('%s: 본문 조건이 기억 축과 노후도 축을 섞지 않는다', (id) => {
    const axes = new Set(
      template(id).body.flatMap((v) => v.if ?? []).map((c) =>
        c.path === 'self.memory' ? 'memory' : c.path.includes('.decay') ? 'decay' : 'other',
      ),
    );
    expect(axes.size).toBeLessThanOrEqual(1);
    expect(axes.has('other')).toBe(false);
  });
});

describe.each(['WO-T1', 'WO-T2', 'WO-T3', 'WO-T4'])('%s — v3 정산 규칙 정합', (id) => {
  const t = template(id);

  it('어떤 옵션도 노후도를 직접 건드리지 않는다 (정산 이중화 금지)', () => {
    for (const opt of t.options) {
      expect(hasDecayEffect(opt.onSuccess.effects)).toBe(false);
      expect(hasDecayEffect(opt.onFailure?.effects ?? [])).toBe(false);
    }
  });

  it('수리 계열 템플릿의 임시방편 옵션은 patched 플래그를 남긴다', () => {
    if (id === 'WO-T4') return; // 자재 수령은 수리가 아니다
    expect(t.options.some((o) => hasPatchedFlag(o.onSuccess.effects))).toBe(true);
  });

  it('실패 분기가 있는 옵션은 피로 +2', () => {
    for (const opt of t.options) {
      if (opt.onFailure) expect(fatigueOnFailure(opt)).toBe(2);
    }
  });
});

describe('선택지 라벨 — 판정 메타와 중복 금지', () => {
  const SKILL_STAT_NAMES = ['각인학', '감류학', '정비', '진단', '절차', '담력'];
  it('라벨 끝의 괄호가 판정 기술·스탯명을 반복하지 않는다 (메타 줄이 이미 말한다)', () => {
    const labels = [
      ...bundle.orderTemplates.flatMap((t) => t.options.map((o) => o.label)),
      ...bundle.encounters.flatMap((e) => Object.values(e.actions).map((a) => a.label)),
    ];
    for (const label of labels) {
      const paren = label.match(/\(([^)]+)\)$/);
      if (paren) expect(SKILL_STAT_NAMES).not.toContain(paren[1]);
    }
  });
});
