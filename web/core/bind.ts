/**
 * 템플릿 → 구역 바인딩 치환.
 * 지시서 생성기가 WorkOrder를 만들 때 여기서 경로를 확정한다 —
 * 리듀서의 effect 적용기에는 구체 EffectPath만 도달해야 한다.
 */
import type { DistrictId, Effect, EffectPath, TemplateEffect, TemplateEffectPath } from './schema';

export function bindEffectPath(path: TemplateEffectPath, district: DistrictId): EffectPath {
  const bound = path.replaceAll('{district}', district);
  const leftover = bound.match(/\{[^}]*\}/);
  if (leftover) {
    throw new Error(`바인딩 후 알 수 없는 치환자가 남음: ${leftover[0]} (경로: ${path})`);
  }
  return bound as EffectPath;
}

export function bindEffects(effects: TemplateEffect[], district: DistrictId): Effect[] {
  return effects.map((e) => ({ ...e, path: bindEffectPath(e.path, district) }));
}
