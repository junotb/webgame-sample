/**
 * 하루 상태 기계 — morning → field → event → closing (스펙 2장)
 * 순수 리듀서: PRNG는 world.seed로 재현, 매 판정 후 seed 전진.
 * 트리아지 장치: shiftLeft(근무 시간 2)로 3건 중 2건만 처리 가능.
 */
import { bandOf, RATING_LABELS, ratingOfBand, weekOf, WORKDAYS_PER_WEEK } from './calendar';
import { mulberry32, rollCheck } from './checks';
import { applyEffects } from './effects';
import { generateCards } from './generate';
import { resolveOption } from './resolve';
import type { ArchiveEntry, Condition, ZoneId, GameState, MenaceId, Reducer, SkillId, StatId, StepResult, TextVariant } from './schema';

export const SHIFT_PER_DAY = 2;
/** 다일 이벤트 점유 중의 근무 슬롯 (v3 §5) — 처리 1장/방치 3장, 노후도 급등의 근원 */
export const MULTIDAY_SHIFT = 1;
export const MENACE_CAP = 8;
export const BASE_ALTITUDE = 8000;
export const ALTITUDE_PER_DECAY = 120;
const MAX_DECAY = 10;

function clampDecay(value: number): number {
  return Math.max(0, Math.min(MAX_DECAY, value));
}

/** 고도 = 8000 − 120 × Σ노후도 (m) — 하루 요약에 숫자로만 표기 */
export function altitude(zones: Record<ZoneId, { decay: number }>): number {
  const total = Object.values(zones).reduce((sum, d) => sum + d.decay, 0);
  return BASE_ALTITUDE - ALTITUDE_PER_DECAY * total;
}

/** 조건·변형 평가용 상태 경로 읽기. 없는 flag 등 미정의 숫자는 0. */
export function getValueAtPath(state: GameState, path: string): number {
  let node: unknown = state;
  for (const seg of path.split('.')) {
    if (typeof node !== 'object' || node === null) return 0;
    node = (node as Record<string, unknown>)[seg];
  }
  return typeof node === 'number' ? node : 0;
}

export function evalConditions(state: GameState, conditions: Condition[]): boolean {
  return conditions.every((c) => {
    const v = getValueAtPath(state, c.path);
    return (c.gte === undefined || v >= c.gte) && (c.lte === undefined || v <= c.lte);
  });
}

/** 완곡어 변형 선택 — 첫 매치 우선, 조건 없는 변형이 기본값 (스키마 TextVariant 계약) */
export function selectVariant(state: GameState, variants: TextVariant[]): string {
  const match = variants.find((v) => !v.if || evalConditions(state, v.if));
  return match?.text ?? '';
}

const MENACE_LABELS: Record<MenaceId, string> = { fatigue: '피로', scrutiny: '주목', unrest: '동요' };
export const SKILL_LABELS: Record<SkillId, string> = { inscription: '각인학', flowsense: '감류학' };
export const STAT_LABELS: Record<StatId, string> = { repair: '정비', insight: '진단', procedure: '절차', nerve: '담력' };

/**
 * 기술·스탯 상승 노티 (경험치 수치 노출 없음 — 등급이 오른 순간만 알린다).
 * 성장 시스템 자체는 콘텐츠 효과의 몫이고, 여기는 통보만 한다.
 */
export function growthNotes(prev: GameState, next: GameState): string[] {
  const notes: string[] = [];
  for (const skill of Object.keys(SKILL_LABELS) as SkillId[]) {
    if (next.self.skills[skill] > prev.self.skills[skill]) {
      notes.push(`「${SKILL_LABELS[skill]}」 ${next.self.skills[skill]}등급이 되었다.`);
    }
  }
  for (const stat of Object.keys(STAT_LABELS) as StatId[]) {
    if (next.self.stats[stat] > prev.self.stats[stat]) {
      notes.push(`${STAT_LABELS[stat]}이(가) ${next.self.stats[stat]}에 이르렀다.`);
    }
  }
  // 재열람 안내 (v3 §7): 기억이 오른 사실만 알린다 — 무엇이 달라졌는지는 말하지 않는다
  if (next.self.memory > prev.self.memory) {
    notes.push(`기억이 남았다 (${next.self.memory}/7). 서류함의 옛 문서를 다시 열 수 있다.`);
  }
  return notes;
}

/**
 * 서류함 기록 — 중복 없이 뒤에 쌓는다 (본문은 렌더 시점에 콘텐츠에서 다시 뽑는다).
 * 동일성 판정에서 `day`는 뺀다: 같은 문서를 다른 날 다시 겪어도 항목은 하나이고,
 * 남는 일차는 **처음 겪은 날**이다.
 */
function archiveKey(entry: ArchiveEntry): string {
  if (entry.kind === 'order') return `order:${entry.templateId}:${entry.zone}`;
  if (entry.kind === 'storylet') return `storylet:${entry.id}`;
  return `encounter:${entry.id}:${entry.zone}`;
}

function archiveAdd(archive: ArchiveEntry[], entry: ArchiveEntry): void {
  const key = archiveKey(entry);
  if (!archive.some((e) => archiveKey(e) === key)) archive.push(entry);
}

/**
 * 메나스 상한 경고 (스펙 4장) — 도달 시 텍스트 경고만, 강제 이동 콘텐츠 없음.
 * 이번 스텝에 새로 상한에 닿은 메나스만 경고한다 (이미 상한이면 침묵).
 */
export function menaceWarnings(prev: GameState, next: GameState): string[] {
  return (Object.keys(MENACE_LABELS) as MenaceId[])
    .filter((m) => prev.world.menace[m] < MENACE_CAP && next.world.menace[m] >= MENACE_CAP)
    .map((m) => `⚠ ${MENACE_LABELS[m]}이(가) 한계에 달했다 (${MENACE_CAP}/${MENACE_CAP}).`);
}

function advanceSeed(rng: () => number): number {
  return Math.floor(rng() * 4294967296);
}

function assertPhase(state: GameState, expected: GameState['world']['phase'], actionType: string): void {
  if (state.world.phase !== expected) {
    throw new Error(`${actionType}은 ${expected} 단계에서만 가능 (현재: ${state.world.phase})`);
  }
}

export const reduce: Reducer = (state, action, content): StepResult => {
  switch (action.type) {
    case 'START_DAY': {
      assertPhase(state, 'morning', 'START_DAY');
      const rng = mulberry32(state.world.seed);
      const orders = generateCards(state.world, content.orderTemplates, rng);
      const next = structuredClone(state);
      next.world.pendingOrders = orders;
      next.world.phase = 'field';
      next.world.seed = advanceSeed(rng);
      const today = next.world.calendar.day;
      for (const o of orders) archiveAdd(next.world.archive, { kind: 'order', day: today, templateId: o.templateId, zone: o.zone });
      // 제목을 나열하지 않는다 (UI 층위 사양 §5): 로그가 먼저 읽어 주면 무대를 열 이유가 준다.
      // 무엇이 왔는지는 지시서를 열어서 안다 — v3 §4가 카드 이중 구조로 노린 그 지점이다.
      const log = [`지시서 ${orders.length}건 발부.`];
      // 다일 이벤트 점유 (v3 §5): 오늘 하루를 소모하고 근무 슬롯이 줄어든다
      if (next.world.multiday) {
        next.world.multiday.daysLeft -= 1;
        next.world.shiftLeft = MULTIDAY_SHIFT;
        log.push('오늘도 약속된 일정이 근무의 대부분을 가져간다.');
      }
      return { state: next, log };
    }

    case 'RESOLVE_ORDER': {
      assertPhase(state, 'field', 'RESOLVE_ORDER');
      const order = state.world.pendingOrders[action.orderIndex];
      if (!order) throw new Error(`지시서 없음: index ${action.orderIndex}`);
      if (order.resolved) throw new Error(`이미 처리한 지시서: ${order.templateId} (${order.zone})`);
      const option = order.options[action.optionIndex];
      if (!option) throw new Error(`옵션 없음: index ${action.optionIndex}`);
      if (option.startsEncounter) {
        throw new Error(`조우 진입 옵션은 조우 리듀서를 거쳐야 함: ${option.startsEncounter} (RESOLVE_ENCOUNTER로 반입)`);
      }
      if (state.world.shiftLeft < option.timeCost) {
        throw new Error(`근무 시간 부족: 잔여 ${state.world.shiftLeft}, 필요 ${option.timeCost}`);
      }
      const rng = mulberry32(state.world.seed);
      const result = resolveOption(state, option, rng);
      const next = result.state === state ? structuredClone(state) : result.state;
      next.world.pendingOrders[action.orderIndex].resolved = true;
      next.world.pendingOrders[action.orderIndex].outcome = result.success ? 'success' : 'failure';
      next.world.shiftLeft -= option.timeCost;
      if (next.world.shiftLeft <= 0) next.world.phase = 'event';
      next.world.seed = advanceSeed(rng);
      const log = [result.success ? '처리 완료.' : '처리 실패.'];
      if (result.text) log.push(result.text);
      log.push(...growthNotes(state, next), ...menaceWarnings(state, next));
      return { state: next, log };
    }

    case 'RESOLVE_ENCOUNTER': {
      assertPhase(state, 'field', 'RESOLVE_ENCOUNTER');
      const order = state.world.pendingOrders[action.orderIndex];
      if (!order) throw new Error(`지시서 없음: index ${action.orderIndex}`);
      if (order.resolved) throw new Error(`이미 처리한 지시서: ${order.templateId} (${order.zone})`);
      const entry = order.options.find((o) => o.startsEncounter);
      if (!entry) throw new Error(`조우 진입 옵션이 없는 지시서: ${order.templateId}`);
      if (state.world.shiftLeft < entry.timeCost) {
        throw new Error(`근무 시간 부족: 잔여 ${state.world.shiftLeft}, 필요 ${entry.timeCost}`);
      }
      const next = applyEffects(state, action.effects);
      // burned/soothed = 처리 성공 (−w 정산), withdrawn/expired = 처리 실패 (시간만 소모)
      const success = action.outcome === 'burned' || action.outcome === 'soothed';
      next.world.pendingOrders[action.orderIndex].resolved = true;
      next.world.pendingOrders[action.orderIndex].outcome = success ? 'success' : 'failure';
      next.world.shiftLeft -= entry.timeCost;
      if (next.world.shiftLeft <= 0) next.world.phase = 'event';
      archiveAdd(next.world.archive, { kind: 'encounter', day: next.world.calendar.day, id: entry.startsEncounter!, zone: order.zone });
      const log = [action.text, '보고서 제출: 설비 이상 점검 완료.'];
      log.push(...growthNotes(state, next), ...menaceWarnings(state, next));
      return { state: next, log };
    }

    case 'SKIP_TO_EVENT': {
      assertPhase(state, 'field', 'SKIP_TO_EVENT');
      const next = structuredClone(state);
      next.world.shiftLeft = 0;
      next.world.phase = 'event';
      return { state: next, log: ['남은 근무 시간을 접고 사무소로 돌아간다.'] };
    }

    case 'CHOOSE_STORYLET': {
      assertPhase(state, 'event', 'CHOOSE_STORYLET');
      const storylet = content.storylets.find((s) => s.id === action.storyletId);
      if (!storylet) throw new Error(`스토리렛 없음: ${action.storyletId}`);
      if (!evalConditions(state, storylet.requirements)) {
        throw new Error(`스토리렛 조건 미충족: ${storylet.id}`);
      }
      const choice = storylet.choices[action.choiceIndex];
      if (!choice) throw new Error(`선택지 없음: index ${action.choiceIndex}`);
      if (choice.startsMultiday && state.world.multiday) {
        throw new Error(`다일 이벤트 중복 점유 불가: ${state.world.multiday.id} 진행 중`);
      }
      const rng = mulberry32(state.world.seed);
      const { success } = rollCheck(choice.check, state.self.stats, state.self.skills, rng);
      const branch = success ? choice.onSuccess : choice.onFailure;
      const next = branch ? applyEffects(state, branch.effects) : structuredClone(state);
      if (choice.startsMultiday) {
        // 점유는 판정과 무관한 선언 — 내일 아침부터 근무 슬롯이 줄어든다
        next.world.multiday = { id: choice.startsMultiday.id, daysLeft: choice.startsMultiday.days };
        next.world.flags[`md_${choice.startsMultiday.id}_started`] = 1;
      }
      archiveAdd(next.world.archive, { kind: 'storylet', day: next.world.calendar.day, id: storylet.id });
      next.world.phase = 'closing';
      next.world.seed = advanceSeed(rng);
      const log = branch?.text ? [branch.text] : [];
      log.push(...growthNotes(state, next), ...menaceWarnings(state, next));
      return { state: next, log };
    }

    case 'CLOSE_DAY': {
      assertPhase(state, 'closing', 'CLOSE_DAY');
      const next = structuredClone(state);
      // 가중치 정산 (v3 §3): 처리 성공 −w / 처리 실패 0 / 방치 +w, 자연 틱 +1/일.
      // 하루치 증감을 합산한 뒤 한 번만 클램프한다 (중간 클램프는 −분을 잘라먹는다)
      const delta: Partial<Record<ZoneId, number>> = {};
      for (const order of next.world.pendingOrders) {
        if (!order.resolved) {
          delta[order.zone] = (delta[order.zone] ?? 0) + order.weight;
          // 미시 피드백 장부: 방치 누적 — 내일 재발부 우선순위·난이도 보정의 근거
          next.world.cardNeglect[order.templateId] = (next.world.cardNeglect[order.templateId] ?? 0) + 1;
        } else if (order.outcome === 'success') {
          delta[order.zone] = (delta[order.zone] ?? 0) - order.weight;
          delete next.world.cardNeglect[order.templateId];
        }
      }
      for (const [zoneId, z] of Object.entries(next.world.zones) as [ZoneId, { decay: number }][]) {
        z.decay = clampDecay(z.decay + (delta[zoneId] ?? 0) + 1);
      }
      // 고도는 실패 상태로 쓰지 않는다 (2026-08-06 Juno): 일과 결과의 압박은
      // 주간 평가(조직 인사)가 담당하고, 고도는 에피소드 스케일 장치로 남긴다
      const { day, weekday } = next.world.calendar;
      const log = [`Day ${day} 종료.`];
      // 다일 이벤트 종료 판정 — 마지막 점유일의 저녁에 끝난다
      if (next.world.multiday && next.world.multiday.daysLeft <= 0) {
        next.world.flags[`md_${next.world.multiday.id}_done`] = 1;
        log.push('약속했던 일정이 끝났다. 내일부터는 다시 온전한 하루다.');
        next.world.multiday = null;
      }
      if (weekday === WORKDAYS_PER_WEEK) {
        // 금요일: 배치 구역의 정산 후 밴드가 곧 주간 평가 (별도 산식 없음)
        const band = bandOf(next.world.zones[next.world.assignment.zone].decay);
        const rating = ratingOfBand(band);
        next.world.weekRatings[weekOf(day)] = rating;
        log.push(`본부 주간 평가: ${RATING_LABELS[rating]}.`, '이틀의 휴일이 지나간다.');
        next.world.calendar = { day: day + 3, weekday: 1 };
      } else {
        next.world.calendar = { day: day + 1, weekday: weekday + 1 };
      }
      next.world.phase = 'morning';
      next.world.shiftLeft = SHIFT_PER_DAY;
      next.world.pendingOrders = [];
      return { state: next, log };
    }
  }
};
