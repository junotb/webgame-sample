/**
 * slice v3 §3 수치와 실제 콘텐츠의 정합 검사.
 * 노후도 증감은 콘텐츠 효과가 아니라 CLOSE_DAY 가중치 정산의 몫이다 —
 * 템플릿에 zone decay 효과가 남아 있으면 이중 계산이므로 여기서 잡는다.
 */
import { describe, expect, it } from 'vitest';
import type { TemplateEffect, WorkOption, WorkOrderTemplate } from '../core/schema';
import { loadContent } from './loader';

const [bundle] = loadContent();

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

describe('가중치 — minDecay가 깊을수록 무겁다 (일일 합 8 전후의 재료)', () => {
  it('WO-T1=1, WO-T2=2, WO-T3=3', () => {
    expect(template('WO-T1').weight).toBe(1);
    expect(template('WO-T2').weight).toBe(2);
    expect(template('WO-T3').weight).toBe(3);
  });
});

describe.each(['WO-T1', 'WO-T2', 'WO-T3'])('%s — v3 정산 규칙 정합', (id) => {
  const t = template(id);

  it('어떤 옵션도 노후도를 직접 건드리지 않는다 (정산 이중화 금지)', () => {
    for (const opt of t.options) {
      expect(hasDecayEffect(opt.onSuccess.effects)).toBe(false);
      expect(hasDecayEffect(opt.onFailure?.effects ?? [])).toBe(false);
    }
  });

  it('임시방편 옵션은 patched 플래그를 남긴다', () => {
    expect(t.options.some((o) => hasPatchedFlag(o.onSuccess.effects))).toBe(true);
  });

  it('실패 분기가 있는 옵션은 피로 +2', () => {
    for (const opt of t.options) {
      if (opt.onFailure) expect(fatigueOnFailure(opt)).toBe(2);
    }
  });
});
