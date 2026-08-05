/**
 * 스펙 4장 수치 표와 실제 콘텐츠의 정합 검사.
 * 정석 수리 성공 −3 / 임시방편 성공 −1 + patched 플래그 / 수리 실패 피로 +2.
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

function decayValue(effects: TemplateEffect[]): number | undefined {
  return effects.find((e) => e.path === 'world.districts.{district}.decay')?.value;
}

function hasPatchedFlag(effects: TemplateEffect[]): boolean {
  return effects.some((e) => e.path === 'world.flags.patched_{district}');
}

function fatigueOnFailure(opt: WorkOption): number | undefined {
  return opt.onFailure?.effects.find((e) => e.path === 'world.menace.fatigue')?.value;
}

describe.each(['WO-T1', 'WO-T2', 'WO-T3'])('%s — 스펙 수치 표 정합', (id) => {
  const t = template(id);
  const proper = t.options.find((o) => decayValue(o.onSuccess.effects) === -3);
  const makeshift = t.options.find((o) => hasPatchedFlag(o.onSuccess.effects));

  it('정석 수리 성공 시 노후도 −3인 옵션이 있다', () => {
    expect(proper).toBeDefined();
  });

  it('정석 수리 실패 시 피로 +2', () => {
    expect(fatigueOnFailure(proper!)).toBe(2);
  });

  it('임시방편 성공 시 노후도 −1 + patched 플래그', () => {
    expect(makeshift).toBeDefined();
    expect(decayValue(makeshift!.onSuccess.effects)).toBe(-1);
  });

  it('수리 실패 시 노후도 변화가 없다 (모든 옵션)', () => {
    for (const opt of t.options) {
      expect(decayValue(opt.onFailure?.effects ?? [])).toBeUndefined();
    }
  });
});
