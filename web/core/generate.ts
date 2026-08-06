/**
 * 지시서 생성기 — 노후도 테이블 × 템플릿 (스펙 2장 morning 단계)
 * 생성 시점에 경로 바인딩·난이도 보정을 전부 끝낸다:
 * 리듀서는 WorkOrder만 보고 처리하며 템플릿을 재조회하지 않는다.
 */
import { bindEffects } from './bind';
import type {
  BoundWorkOption,
  Check,
  ZoneId,
  WorkOption,
  WorkOrder,
  WorkOrderTemplate,
} from './schema';

export function applyDifficultyBonus(check: Check, bonus: number): Check {
  if (check.kind === 'auto') return { ...check };
  return { ...check, difficulty: check.difficulty + bonus };
}

function bindOption(option: WorkOption, zone: ZoneId, bonus: number): BoundWorkOption {
  return {
    label: option.label,
    check: applyDifficultyBonus(option.check, bonus),
    timeCost: option.timeCost,
    onSuccess: { effects: bindEffects(option.onSuccess.effects, zone), text: option.onSuccess.text },
    ...(option.onFailure
      ? { onFailure: { effects: bindEffects(option.onFailure.effects, zone), text: option.onFailure.text } }
      : {}),
  };
}

/** difficultyBonus = minDecay 초과분 — 방치가 깊을수록 어려워진다 (튜닝 대상) */
export function instantiateOrder(
  template: WorkOrderTemplate,
  zone: ZoneId,
  decay: number,
): WorkOrder {
  const difficultyBonus = Math.max(0, decay - template.minDecay);
  return {
    templateId: template.id,
    zone,
    difficultyBonus,
    title: template.title,
    body: template.body.map((v) => ({ ...v })),
    options: template.options.map((o) => bindOption(o, zone, difficultyBonus)),
    resolved: false,
  };
}

/**
 * 구역당 1건 — 슬라이스는 구역 3개로 3건 고정. 후보는 minDecay ≤ decay.
 * 적격 중 최고 minDecay를 우선한다 (동률만 rng) — 노후도가 깊은 구역엔
 * 그에 맞는 지시서가 반드시 온다. 완곡어 시연(스펙 5장)의 WO-T3
 * 재등장 보장이 이 규칙에 의존한다.
 */
export function generateOrders(
  zones: Record<ZoneId, { decay: number }>,
  templates: WorkOrderTemplate[],
  rng: () => number,
): WorkOrder[] {
  return (Object.keys(zones) as ZoneId[]).map((zone) => {
    const { decay } = zones[zone];
    const eligible = templates.filter((t) => t.minDecay <= decay);
    if (eligible.length === 0) {
      throw new Error(`적격 템플릿 없음: 구역 ${zone} (노후도 ${decay})`);
    }
    const maxMinDecay = Math.max(...eligible.map((t) => t.minDecay));
    const severest = eligible.filter((t) => t.minDecay === maxMinDecay);
    const template = severest[Math.floor(rng() * severest.length)];
    return instantiateOrder(template, zone, decay);
  });
}
