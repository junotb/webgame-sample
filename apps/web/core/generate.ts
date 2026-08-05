/**
 * 지시서 생성기 — 노후도 테이블 × 템플릿 (스펙 2장 morning 단계)
 * 생성 시점에 경로 바인딩·난이도 보정을 전부 끝낸다:
 * 리듀서는 WorkOrder만 보고 처리하며 템플릿을 재조회하지 않는다.
 */
import { bindEffects } from './bind';
import type {
  BoundWorkOption,
  Check,
  DistrictId,
  WorkOption,
  WorkOrder,
  WorkOrderTemplate,
} from './schema';

export function applyDifficultyBonus(check: Check, bonus: number): Check {
  if (check.kind === 'auto') return { ...check };
  return { ...check, difficulty: check.difficulty + bonus };
}

function bindOption(option: WorkOption, district: DistrictId, bonus: number): BoundWorkOption {
  return {
    label: option.label,
    check: applyDifficultyBonus(option.check, bonus),
    timeCost: option.timeCost,
    onSuccess: { effects: bindEffects(option.onSuccess.effects, district), text: option.onSuccess.text },
    ...(option.onFailure
      ? { onFailure: { effects: bindEffects(option.onFailure.effects, district), text: option.onFailure.text } }
      : {}),
  };
}

/** difficultyBonus = minDecay 초과분 — 방치가 깊을수록 어려워진다 (튜닝 대상) */
export function instantiateOrder(
  template: WorkOrderTemplate,
  district: DistrictId,
  decay: number,
): WorkOrder {
  const difficultyBonus = Math.max(0, decay - template.minDecay);
  return {
    templateId: template.id,
    district,
    difficultyBonus,
    title: template.title,
    body: template.body.map((v) => ({ ...v })),
    options: template.options.map((o) => bindOption(o, district, difficultyBonus)),
    resolved: false,
  };
}

/** 구역당 1건 — 슬라이스는 구역 3개로 3건 고정. 후보는 minDecay ≤ decay, rng로 선택. */
export function generateOrders(
  districts: Record<DistrictId, { decay: number }>,
  templates: WorkOrderTemplate[],
  rng: () => number,
): WorkOrder[] {
  return (Object.keys(districts) as DistrictId[]).map((district) => {
    const { decay } = districts[district];
    const eligible = templates.filter((t) => t.minDecay <= decay);
    if (eligible.length === 0) {
      throw new Error(`적격 템플릿 없음: 구역 ${district} (노후도 ${decay})`);
    }
    const template = eligible[Math.floor(rng() * eligible.length)];
    return instantiateOrder(template, district, decay);
  });
}
