/**
 * 카드 생성기 — 배부 3장 무작위 추첨 (2026-08-11 확정, 고정 배치표 폐기).
 * 생성 시점에 경로·본문 조건 바인딩과 난이도 보정을 전부 끝낸다.
 *
 * 추첨이지만 두 가지를 보장한다:
 * 1) 서사 카드(`thread: true`)는 추첨 위에 선다 — 조건이 맞는 날 운에 밀리면 진실이 멈춘다.
 *    희소성은 requirements가 이미 담당하므로 추첨과 경쟁시키지 않는다 (현재 콘텐츠엔 없음 — 특수 보류)
 * 2) ENC-001 발생 전(`flags.enc001_done` 없음)에는 소각 카드가 매일 1장 포함된다 —
 *    첫 대면(선행 조우)을 무작위가 무기한 미루지 못하게 하는 보장. 발생 후엔 일반 추첨으로
 */
import { bindVariants } from './bind';
import { evalConditions } from './conditions';
import type { GameState, WorkOrder, WorkOrderTemplate, ZoneId } from './schema';

/** 배부 3장(무작위) · 처리 2장 — 남는 1장을 버리는 것이 트리아지 */
export const CARDS_PER_DAY = 3;

/**
 * difficultyBonus = (노후도의 minDecay 초과분) + (방치 누적) —
 * 넘긴 카드는 악화된 채 돌아온다. 미니게임 난이도의 유일한 입력이다.
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
    siteId: template.siteId,
    difficultyBonus,
    weight: template.weight,
    kind: template.kind,
    reissueCount: neglect,
    title: bindVariants(template.title, zone),
    body: bindVariants(template.body, zone),
    resolved: false,
    // 결과 반영 산문 — 성적 3변형도 생성 시점에 구역 바인딩을 끝낸다
    resultProse: {
      complete: bindVariants(template.resultProse.complete, zone),
      partial: bindVariants(template.resultProse.partial, zone),
      fail: bindVariants(template.resultProse.fail, zone),
    },
  };
}

/** rng 기반 제자리 셔플 (Fisher–Yates) — 추첨의 유일한 무작위성 출처 */
function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 배치 구역 하나에서 3장 추첨 (v3 §9: 1주차 한 구역 고정).
 * 조건 평가에 `self.memory`·`self.skills.*`가 필요하므로 world가 아니라 전체 상태를 받는다.
 */
export function generateCards(
  state: GameState,
  templates: WorkOrderTemplate[],
  rng: () => number,
): WorkOrder[] {
  const world = state.world;
  const zone = world.assignment.zone;
  const decay = world.zones[zone].decay;
  const eligible = templates.filter(
    (t) => t.minDecay <= decay && (!t.requirements || evalConditions(state, t.requirements)),
  );
  if (eligible.length === 0) {
    throw new Error(`적격 템플릿 없음: 구역 ${zone} (노후도 ${decay})`);
  }

  const picked: WorkOrderTemplate[] = [];
  const remaining = new Set(eligible);

  // 1) 서사 카드 우선 (현재 콘텐츠엔 없음 — 특수 카드 보류)
  for (const t of eligible) {
    if (t.thread && picked.length < CARDS_PER_DAY) {
      picked.push(t);
      remaining.delete(t);
    }
  }

  // 2) ENC-001 전 소각 보장 — 적격 소각 카드 중 1장을 추첨해 자리 확보
  const enc001Done = (world.flags.enc001_done ?? 0) >= 1;
  if (!enc001Done && picked.length < CARDS_PER_DAY && !picked.some((t) => t.kind === 'incinerate')) {
    const burners = shuffle([...remaining].filter((t) => t.kind === 'incinerate'), rng);
    if (burners.length > 0) {
      picked.push(burners[0]);
      remaining.delete(burners[0]);
    }
  }

  // 3) 나머지 슬롯은 순수 추첨
  for (const t of shuffle([...remaining], rng)) {
    if (picked.length >= CARDS_PER_DAY) break;
    picked.push(t);
  }

  const neglectOf = (t: WorkOrderTemplate) => world.cardNeglect[t.id] ?? 0;
  return picked.map((t) => instantiateCard(t, zone, decay, neglectOf(t)));
}
