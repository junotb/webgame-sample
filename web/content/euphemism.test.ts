/**
 * 스펙 5장 — 완곡어 증명 시나리오의 성립 보장.
 * 1) EV-001 '묻는다'는 판정 결과와 무관하게 기억 0→1을 부여한다.
 * 2) WO-T3는 노후도 5 이상 구역에서 결정적으로 등장한다 (초기 d7=5,
 *    자연 틱으로 감소하지 않으므로 Day 2에도 재등장이 보장된다).
 */
import { describe, expect, it } from 'vitest';
import { generateOrders } from '../core/generate';
import type { Effect } from '../core/schema';
import { loadContent } from './loader';

const [bundle] = loadContent();

function grantsMemory(effects: Effect[] | undefined): boolean {
  return (effects ?? []).some((e) => e.path === 'self.memory' && e.op === 'add' && e.value >= 1);
}

describe('EV-001 — 묻는다 선택의 기억 부여', () => {
  const ev = bundle.storylets.find((s) => s.id === 'EV-001')!;
  const ask = ev.choices.find((c) => c.label.includes('묻는다'))!;

  it('성공 시 기억 +1', () => {
    expect(grantsMemory(ask.onSuccess.effects)).toBe(true);
  });

  it('실패 시에도 기억 +1 (시연이 판정 운에 좌우되지 않는다)', () => {
    expect(grantsMemory(ask.onFailure?.effects)).toBe(true);
  });
});

describe('WO-T3 — 결정적 등장', () => {
  const initialZones = { d2: { decay: 3 }, d5: { decay: 4 }, d7: { decay: 5 } };

  it('초기 노후도에서 d7에 WO-T3가 rng와 무관하게 등장한다 (Day 1)', () => {
    for (const r of [0, 0.5, 0.999]) {
      const orders = generateOrders(initialZones, bundle.orderTemplates, () => r);
      expect(orders.find((o) => o.zone === 'd7')?.templateId).toBe('WO-T3');
    }
  });

  it('노후도가 오른 다음 날에도 재등장한다 (Day 2 — 변형 확인 지점)', () => {
    const day2 = { d2: { decay: 4 }, d5: { decay: 5 }, d7: { decay: 6 } };
    for (const r of [0, 0.5, 0.999]) {
      const orders = generateOrders(day2, bundle.orderTemplates, () => r);
      expect(orders.filter((o) => o.templateId === 'WO-T3').length).toBeGreaterThanOrEqual(2);
    }
  });
});
