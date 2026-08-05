import { describe, it, expect } from 'vitest';
import { bindEffectPath, bindEffects } from './bind';
import type { TemplateEffect } from './schema';

describe('bindEffectPath — {district} 치환', () => {
  it('구역 노후도 경로를 구체 ID로 치환', () => {
    expect(bindEffectPath('world.districts.{district}.decay', 'd5')).toBe('world.districts.d5.decay');
  });
  it('플래그 경로 안의 치환자도 치환', () => {
    expect(bindEffectPath('world.flags.patched_{district}', 'd7')).toBe('world.flags.patched_d7');
  });
  it('치환자가 여러 번 나와도 전부 치환', () => {
    expect(bindEffectPath('world.flags.{district}_to_{district}', 'd2')).toBe('world.flags.d2_to_d2');
  });
  it('구체 경로는 그대로 통과', () => {
    expect(bindEffectPath('world.menace.fatigue', 'd2')).toBe('world.menace.fatigue');
    expect(bindEffectPath('self.memory', 'd2')).toBe('self.memory');
  });
  it('알 수 없는 치환자가 남으면 throw ({sector} 등 오타 방어)', () => {
    expect(() => bindEffectPath('world.flags.patched_{sector}' as never, 'd2')).toThrow(/\{sector\}/);
  });
});

describe('bindEffects — TemplateEffect[] → Effect[]', () => {
  it('경로만 치환하고 op/value는 보존, 원본은 불변', () => {
    const template: TemplateEffect[] = [
      { path: 'world.districts.{district}.decay', op: 'add', value: -3 },
      { path: 'world.flags.patched_{district}', op: 'add', value: 1 },
      { path: 'world.menace.unrest', op: 'set', value: 2 },
    ];
    const bound = bindEffects(template, 'd5');
    expect(bound).toEqual([
      { path: 'world.districts.d5.decay', op: 'add', value: -3 },
      { path: 'world.flags.patched_d5', op: 'add', value: 1 },
      { path: 'world.menace.unrest', op: 'set', value: 2 },
    ]);
    expect(template[0].path).toBe('world.districts.{district}.decay');
  });
});
