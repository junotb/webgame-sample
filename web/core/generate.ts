/**
 * 카드 생성기 (v3 §4) — 기존 지시서 생성기의 표현 변경.
 * 무작위성의 출처는 셔플이 아니라 도시 상태다: 어떤 카드가 오는지는
 * 배치 구역의 노후도와 방치 누적이 결정하고, rng는 완전 동률에서만 갈린다.
 * 생성 시점에 경로·본문 조건 바인딩과 난이도 보정을 전부 끝낸다.
 */
import { bindEffects, bindVariants } from './bind';
import type {
  BoundWorkOption,
  Check,
  ZoneId,
  WorkOption,
  WorkOrder,
  WorkOrderTemplate,
  WorldSheet,
} from './schema';

/** 제시 4장 / 처리 2장 (v3 §4) — 방치 2장이 미시 피드백의 재료가 된다 */
export const CARDS_PER_DAY = 4;

export function applyDifficultyBonus(check: Check, bonus: number): Check {
  if (check.kind === 'auto') return { ...check };
  return { ...check, difficulty: check.difficulty + bonus };
}

function bindOption(option: WorkOption, zone: ZoneId, bonus: number): BoundWorkOption {
  return {
    label: option.label,
    check: applyDifficultyBonus(option.check, bonus),
    timeCost: option.timeCost,
    ...(option.startsEncounter ? { startsEncounter: option.startsEncounter } : {}),
    onSuccess: { effects: bindEffects(option.onSuccess.effects, zone), text: option.onSuccess.text },
    ...(option.onFailure
      ? { onFailure: { effects: bindEffects(option.onFailure.effects, zone), text: option.onFailure.text } }
      : {}),
  };
}

/**
 * difficultyBonus = (노후도의 minDecay 초과분) + (방치 누적) —
 * 넘긴 카드는 악화된 채 돌아온다 (v3 §1 놀람의 설계: 귀속).
 */
export function instantiateCard(
  template: WorkOrderTemplate,
  zone: ZoneId,
  decay: number,
  neglect: number,
): WorkOrder {
  const difficultyBonus = Math.max(0, decay - template.minDecay) + neglect;
  return {
    templateId: template.id,
    zone,
    difficultyBonus,
    weight: template.weight,
    face: template.face,
    reissueCount: neglect,
    title: template.title,
    body: bindVariants(template.body, zone),
    options: template.options.map((o) => bindOption(o, zone, difficultyBonus)),
    resolved: false,
  };
}

/**
 * 배치 구역 하나에서 최대 4장 (v3 §9: 1주차 한 구역 고정).
 * 우선순위: 방치 누적 큰 순 → minDecay 깊은 순 → 완전 동률만 rng.
 * 방치한 카드가 다음 날 반드시 다시 올라오는 것이 미시 피드백의 전제다.
 */
export function generateCards(
  world: Pick<WorldSheet, 'assignment' | 'zones' | 'cardNeglect'>,
  templates: WorkOrderTemplate[],
  rng: () => number,
): WorkOrder[] {
  const zone = world.assignment.zone;
  const decay = world.zones[zone].decay;
  const eligible = templates.filter((t) => t.minDecay <= decay);
  if (eligible.length === 0) {
    throw new Error(`적격 템플릿 없음: 구역 ${zone} (노후도 ${decay})`);
  }
  const neglectOf = (t: WorkOrderTemplate) => world.cardNeglect[t.id] ?? 0;
  const jitter = new Map(eligible.map((t) => [t.id, rng()]));
  const sorted = [...eligible].sort((a, b) => {
    if (neglectOf(a) !== neglectOf(b)) return neglectOf(b) - neglectOf(a);
    if (a.minDecay !== b.minDecay) return b.minDecay - a.minDecay;
    return (jitter.get(a.id) ?? 0) - (jitter.get(b.id) ?? 0);
  });
  return sorted.slice(0, CARDS_PER_DAY).map((t) => instantiateCard(t, zone, decay, neglectOf(t)));
}
