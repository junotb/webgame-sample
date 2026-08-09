/**
 * 템플릿 → 구역 바인딩 치환.
 * 지시서 생성기가 WorkOrder를 만들 때 여기서 경로를 확정한다 —
 * 리듀서의 effect 적용기에는 구체 EffectPath만 도달해야 한다.
 */
import type { Condition, ZoneId, Effect, EffectPath, TemplateEffect, TemplateEffectPath } from './schema';

export function bindEffectPath(path: TemplateEffectPath, zone: ZoneId): EffectPath {
  const bound = path.replaceAll('{zone}', zone);
  const leftover = bound.match(/\{[^}]*\}/);
  if (leftover) {
    throw new Error(`바인딩 후 알 수 없는 치환자가 남음: ${leftover[0]} (경로: ${path})`);
  }
  return bound as EffectPath;
}

export function bindEffects(effects: TemplateEffect[], zone: ZoneId): Effect[] {
  return effects.map((e) => ({ ...e, path: bindEffectPath(e.path, zone) }));
}

/**
 * 변형 조건의 `{zone}` 치환 (악화 축, v3 §7) —
 * 카드의 제목·본문은 바인딩 후 항상 구체 경로만 갖는다. 렌더러는 치환을 모른다.
 * 제목(TextVariant)과 본문(ProseVariant)이 조건 계약을 공유하므로 제네릭이다.
 */
export function bindVariants<T extends { if?: Condition[] }>(body: T[], zone: ZoneId): T[] {
  return body.map((v) =>
    v.if
      ? {
          ...v,
          if: v.if.map((c): Condition => ({ ...c, path: bindEffectPath(c.path as TemplateEffectPath, zone) as Condition['path'] })),
        }
      : { ...v },
  );
}
