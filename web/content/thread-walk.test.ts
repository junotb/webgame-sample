/**
 * 서사 흐름 통합 워크스루 (v3 §4 정정) — 실제 번들로 이틀을 걷는다.
 *
 * 검증하는 것:
 * - day 1: 서사 카드 없음, 빈 저녁이 소프트락 없이 닫힌다 (SKIP_EVENT)
 * - day 2: WO-T6(미대조 항목)가 **맨 앞에** 온다 — 진실이 정렬에 밀리지 않는다
 * - WO-T6를 처리하면 기억이 오르고, 이후 다시 발부되지 않는다
 * - 비밀을 쫓는 데 근무 슬롯이 든다 — 저녁 공짜 서사의 회귀를 막는 못
 */
import { describe, expect, it } from 'vitest';
import { reduce } from '../core/reducer';
import { createInitialState } from '../app/game-state';
import type { GameState } from '../core/schema';
import { loadContent } from './loader';

const [bundle] = loadContent();

function step(state: GameState, action: Parameters<typeof reduce>[1]): GameState {
  return reduce(state, action, bundle).state;
}

describe('이틀 워크스루 — 비밀은 일과 중의 카드에서', () => {
  it('day 1 → day 2에 WO-T6가 맨 앞으로 오고, 처리하면 기억이 남는다', () => {
    let s = createInitialState();

    // ── Day 1 ──
    s = step(s, { type: 'START_DAY' });
    expect(s.world.pendingOrders.some((o) => o.templateId === 'WO-T6')).toBe(false);

    // 근무 2를 소진한다 (0, 1번 카드의 첫 옵션 — 어떤 것이든 슬롯만 쓰면 된다)
    s = step(s, { type: 'RESOLVE_ORDER', orderIndex: 0, optionIndex: pickPlain(s, 0) });
    s = step(s, { type: 'RESOLVE_ORDER', orderIndex: 1, optionIndex: pickPlain(s, 1) });
    expect(s.world.phase).toBe('event');

    // 빈 저녁 — EV-002는 day 2+라 아직 없다. 소프트락 없이 닫힌다
    expect(bundle.storylets.some((st) => st.id === 'EV-001')).toBe(false);
    s = step(s, { type: 'SKIP_EVENT' });
    expect(s.world.phase).toBe('closing');
    s = step(s, { type: 'CLOSE_DAY' });

    // ── Day 2 ──
    expect(s.world.calendar.day).toBe(2);
    s = step(s, { type: 'START_DAY' });
    expect(s.world.pendingOrders[0].templateId).toBe('WO-T6');

    // 비밀을 여는 데 근무 슬롯이 든다 — 이 카드를 고르면 다른 하나를 놓친다
    const t6 = s.world.pendingOrders[0];
    const check = t6.options.findIndex((o) => o.label.includes('대조한다'));
    expect(t6.options[check].timeCost).toBeGreaterThan(0);

    const before = s.self.memory;
    s = step(s, { type: 'RESOLVE_ORDER', orderIndex: 0, optionIndex: check });
    // 성공이든 실패든 기억이 남는다 (euphemism.test와 같은 계약, 여기선 실주행으로)
    expect(s.self.memory).toBe(before + 1);
    expect(s.world.flags['ledger_checked']).toBe(1);

    // ── Day 3: 처리된 서사 카드는 다시 오지 않는다 ──
    s = step(s, { type: 'RESOLVE_ORDER', orderIndex: 1, optionIndex: pickPlain(s, 1) });
    if (s.world.phase === 'event') s = advanceEvening(s);
    s = step(s, { type: 'CLOSE_DAY' });
    s = step(s, { type: 'START_DAY' });
    expect(s.world.pendingOrders.some((o) => o.templateId === 'WO-T6')).toBe(false);
  });
});

/** 조우 진입이 아닌 첫 옵션 index — 워크스루는 조우 리듀서를 거치지 않는다 */
function pickPlain(s: GameState, orderIndex: number): number {
  const i = s.world.pendingOrders[orderIndex].options.findIndex((o) => !o.startsEncounter);
  if (i < 0) throw new Error('일반 옵션이 없는 카드');
  return i;
}

/** 저녁 처리 — 비었으면 닫고, EV-002(사흘 부탁)가 열려 있으면 거절해 점유 없이 닫는다 */
function advanceEvening(s: GameState): GameState {
  try {
    return step(s, { type: 'SKIP_EVENT' });
  } catch {
    const ev = bundle.storylets.find((st) => st.id === 'EV-002')!;
    const decline = ev.choices.findIndex((c) => !c.startsMultiday);
    return step(s, { type: 'CHOOSE_STORYLET', storyletId: ev.id, choiceIndex: decline });
  }
}
