/**
 * 하루 상태 기계 — morning → field → event → closing (스펙 2장)
 * 순수 리듀서: PRNG는 world.seed로 재현, 매 판정 후 seed 전진.
 * 트리아지 장치: shiftLeft(근무 시간 2)로 3건 중 2건만 처리 가능.
 */
import { FINAL_WEEK, RATING_LABELS, summarizeWeek, weekOf, WORKDAYS_PER_WEEK } from './calendar';
import { evalConditions, selectProse } from './conditions';
import { mulberry32, rollCheck } from './checks';
import { applyEffects } from './effects';
import { generateCards } from './generate';
import { gradeOf } from './minigame';
import type { ArchiveEntry, ContentBundle, ZoneId, GameState, MenaceId, Reducer, SkillId, StatId, StepResult } from './schema';

// 조건 평가는 core/conditions로 옮겼다 (생성기와의 순환 참조 회피). 기존 import 경로는 유지한다.
export { evalConditions, getValueAtPath, selectProse, selectVariant } from './conditions';

export const SHIFT_PER_DAY = 2;
/** 미니게임 카드 처리의 근무 슬롯 비용 — 카드 리뉴얼 후 옵션별 timeCost를 대체한다 */
export const MINIGAME_TIME_COST = 1;
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

const MENACE_LABELS: Record<MenaceId, string> = { fatigue: '피로', scrutiny: '주목', unrest: '동요' };
export const SKILL_LABELS: Record<SkillId, string> = { inscription: '각인학', flowsense: '감류학', frost: '빙결술' };
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
  if (entry.kind === 'notice') return `notice:${entry.week}`;
  return `encounter:${entry.id}:${entry.zone}`;
}

function archiveAdd(archive: ArchiveEntry[], entry: ArchiveEntry): void {
  const key = archiveKey(entry);
  if (!archive.some((e) => archiveKey(e) === key)) archive.push(entry);
}

/**
 * 메나스 상한 도달 감지 (스펙 4장) — 강제 이동 콘텐츠는 없다.
 * 이번 스텝에 **새로** 닿은 것만 돌려준다 (이미 상한이면 침묵).
 *
 * 예전에는 여기서 `⚠ 주목이 한계에 달했다` 같은 로그 한 줄을 만들어 흘려보냈다.
 * 그래서 존재감이 없었고, 정작 "경고"라는 이름은 사무소 장면이 달고 있었다.
 * 이제 무엇이 닿았는지만 알리고 통지의 서식은 UI가 쓴다 (UI 층위 사양 §6).
 */
export function cappedMenaces(prev: GameState, next: GameState): MenaceId[] {
  return (Object.keys(MENACE_LABELS) as MenaceId[])
    .filter((m) => prev.world.menace[m] < MENACE_CAP && next.world.menace[m] >= MENACE_CAP);
}

function advanceSeed(rng: () => number): number {
  return Math.floor(rng() * 4294967296);
}

/**
 * 근무 종료 후 갈 곳 — 조건 맞는 저녁 장면(관계 이벤트)이 있을 때만 event를 연다.
 * 빈 저녁은 화면을 세우지 않고 곧장 정산이다 ("일과 뒤" 무조건 경유는 폐기 — 2026-08-11).
 */
function afterFieldPhase(state: GameState, content: ContentBundle): 'event' | 'closing' {
  return content.storylets.some((s) => evalConditions(state, s.requirements)) ? 'event' : 'closing';
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
      const orders = generateCards(state, content.orderTemplates, rng);
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

    case 'RESOLVE_ENCOUNTER': {
      // 조우는 카드 성적·근무 슬롯에 관여하지 않는다 (확정 — implementation-plan §6-5).
      // 효과 반입과 재열람 등록만 하고, 카드는 이어지는 미니게임(RESOLVE_MINIGAME)이 닫는다.
      assertPhase(state, 'field', 'RESOLVE_ENCOUNTER');
      const next = applyEffects(state, action.effects);
      archiveAdd(next.world.archive, { kind: 'encounter', day: next.world.calendar.day, id: action.encounterId, zone: action.zone });
      const log = [action.text];
      log.push(...growthNotes(state, next));
      return { state: next, log, notices: cappedMenaces(state, next) };
    }

    case 'RESOLVE_MINIGAME': {
      assertPhase(state, 'field', 'RESOLVE_MINIGAME');
      const order = state.world.pendingOrders[action.orderIndex];
      if (!order) throw new Error(`지시서 없음: index ${action.orderIndex}`);
      if (order.resolved) throw new Error(`이미 처리한 지시서: ${order.templateId} (${order.zone})`);
      if (state.world.shiftLeft < MINIGAME_TIME_COST) {
        throw new Error(`근무 시간 부족: 잔여 ${state.world.shiftLeft}, 필요 ${MINIGAME_TIME_COST}`);
      }
      const next = structuredClone(state);
      const grade = gradeOf(action.result);
      next.world.pendingOrders[action.orderIndex].resolved = true;
      next.world.pendingOrders[action.orderIndex].outcome = grade;
      next.world.shiftLeft -= MINIGAME_TIME_COST;
      if (next.world.shiftLeft <= 0) next.world.phase = afterFieldPhase(next, content);
      // 결과 반영 산문 — 성적 3변형에서 현재 상태로 선택 (인터랙션 순서: 미니게임 → 산문)
      const prose = order.resultProse ? selectProse(next, order.resultProse[action.result]) : [];
      const log = [...prose];
      log.push(...growthNotes(state, next));
      return { state: next, log, notices: cappedMenaces(state, next) };
    }

    case 'SKIP_TO_EVENT': {
      assertPhase(state, 'field', 'SKIP_TO_EVENT');
      const next = structuredClone(state);
      next.world.shiftLeft = 0;
      next.world.phase = afterFieldPhase(next, content);
      return { state: next, log: ['남은 근무 시간을 접고 사무소로 돌아간다.'] };
    }

    case 'SKIP_EVENT': {
      assertPhase(state, 'event', 'SKIP_EVENT');
      const open = content.storylets.find((s) => evalConditions(state, s.requirements));
      if (open) {
        throw new Error(`저녁 장면이 남아 있어 건너뛸 수 없음: ${open.id}`);
      }
      const next = structuredClone(state);
      next.world.phase = 'closing';
      return { state: next, log: ['사무소에는 아무도 없었다. 불을 끄고 정산 서류를 꺼낸다.'] };
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
      log.push(...growthNotes(state, next));
      return { state: next, log, notices: cappedMenaces(state, next) };
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
        } else {
          // 주간 합산 장부 — 처리한 장수와 성적을 센다. 방치는 노후도로만 값을 치른다
          next.world.weekTally.processed += 1;
          if (order.outcome === 'perfect') next.world.weekTally.perfect += 1;
          if (order.outcome === 'notPassed') {
            next.world.weekTally.notPassed += 1;
          } else {
            // 노후도 정산: notPassed 외(perfect·passed)는 처리 성공 −w (성적별 차등은 미결)
            delta[order.zone] = (delta[order.zone] ?? 0) - order.weight;
            delete next.world.cardNeglect[order.templateId];
          }
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
        // 금요일: 주간 등급 = 경계 합산식 (미니게임 성적 기반 — 구 밴드 파생 방식은 폐기).
        // 흐름 확정(2026-08-11): 일과 종료 → 총평 장면(debrief) → 주말 2일 → 엔딩.
        // 등급·통지서는 여기서 확정되고, 엔딩 확정은 주말 뒤(CHOOSE_WEEKEND)로 미뤄진다.
        const rating = summarizeWeek(next.world.weekTally);
        const week = weekOf(day);
        next.world.weekRatings[week] = rating;
        // 통지서 발행 — 총평 장면에 동반된다. 등급은 weekRatings가 들고, 본문은 재렌더링
        archiveAdd(next.world.archive, { kind: 'notice', day, week });
        log.push(`본부 주간 평가: ${RATING_LABELS[rating]}.`, '평가 통지서가 서류함에 등록되었다.');
        next.world.pendingOrders = [];
        // 해고(주 Not Passed)는 총평 장면 없이 곧장 엔딩 — 화면 깊이를 늘리지 않는다 (2026-08-11)
        if (week >= FINAL_WEEK && rating === 'notPassed') {
          next.world.ending = 'fired';
          next.world.phase = 'ended';
          log.push('통지: 배치 해제.');
          return { state: next, log };
        }
        next.world.phase = 'debrief';
        return { state: next, log };
      }
      next.world.calendar = { day: day + 1, weekday: weekday + 1 };
      next.world.phase = 'morning';
      next.world.shiftLeft = SHIFT_PER_DAY;
      next.world.pendingOrders = [];
      return { state: next, log };
    }

    case 'CONFIRM_DEBRIEF': {
      // 해고는 debrief에 도달하지 않는다 (CLOSE_DAY에서 곧장 ended) — 여기는 유임 경로다
      assertPhase(state, 'debrief', 'CONFIRM_DEBRIEF');
      const next = structuredClone(state);
      // 토요일 진입 — 주말 2일 × 택2 (weekday 6=토, 7=일)
      next.world.calendar = { day: next.world.calendar.day + 1, weekday: 6 };
      next.world.phase = 'weekend';
      next.world.weekend = { slotsLeft: 2, doneToday: [], done: [] };
      return { state: next, log: ['주말이다. 이틀 동안, 하루에 두 가지를 할 수 있다.'] };
    }

    case 'CHOOSE_WEEKEND': {
      assertPhase(state, 'weekend', 'CHOOSE_WEEKEND');
      const weekend = state.world.weekend;
      if (!weekend || weekend.slotsLeft <= 0) throw new Error('주말 슬롯이 없음');
      const def = content.weekendActivities.find((a) => a.id === action.activityId);
      if (!def) throw new Error(`주말 활동 없음: ${action.activityId}`);
      if (weekend.doneToday.includes(def.id)) {
        throw new Error(`오늘 이미 한 활동: ${def.id}`);
      }
      if (!def.repeatable && weekend.done.includes(def.id)) {
        throw new Error(`이번 주말에 이미 겪은 장면: ${def.id}`);
      }
      const next = applyEffects(state, def.effects);
      const wk = next.world.weekend!;
      wk.slotsLeft -= 1;
      wk.doneToday.push(def.id);
      wk.done.push(def.id);
      const log = [...selectProse(next, def.body)];
      log.push(...growthNotes(state, next));
      if (wk.slotsLeft <= 0) {
        const { day, weekday } = next.world.calendar;
        if (weekday === 6) {
          // 일요일로 — 하루 제한(doneToday)만 풀린다
          next.world.calendar = { day: day + 1, weekday: 7 };
          next.world.weekend = { slotsLeft: 2, doneToday: [], done: wk.done };
          log.push('토요일이 저물었다.');
        } else if (weekOf(day) >= FINAL_WEEK) {
          // 엔딩 — 해고는 총평 직후 이미 빠졌으므로 주말을 마친 자는 유임이다
          next.world.ending = 'retained';
          next.world.phase = 'ended';
          next.world.weekend = null;
          log.push('통지: 배치 유지.');
        } else {
          // 월요일 롤오버 (FINAL_WEEK 확장 시 경로)
          next.world.calendar = { day: day + 1, weekday: 1 };
          next.world.weekend = null;
          next.world.weekTally = { processed: 0, notPassed: 0, perfect: 0 };
          next.world.phase = 'morning';
          next.world.shiftLeft = SHIFT_PER_DAY;
          log.push('주말이 끝났다.');
        }
      }
      return { state: next, log, notices: cappedMenaces(state, next) };
    }
  }
};
