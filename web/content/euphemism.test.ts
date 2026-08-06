/**
 * 완곡어 증명 시나리오의 성립 보장 (v3 §4 검증 목표 3).
 * 1) EV-001 '묻는다'는 판정 결과와 무관하게 기억 0→1을 부여한다.
 * 2) WO-T3는 배치 구역 노후도 5 이상에서 결정적으로 등장한다 —
 *    시작 4에서 방치·틱으로 오르면 반드시 온다 (변형 확인 지점).
 */
import { describe, expect, it } from 'vitest';
import { generateCards } from '../core/generate';
import type { Effect } from '../core/schema';
import { loadContent } from './loader';

const [bundle] = loadContent();

function grantsMemory(effects: Effect[] | undefined): boolean {
  return (effects ?? []).some((e) => e.path === 'self.memory' && e.op === 'add' && e.value >= 1);
}

function worldAt(decay: number) {
  return {
    assignment: { zone: 'd5' as const },
    zones: { d2: { decay: 3 }, d5: { decay }, d7: { decay: 5 } },
    cardNeglect: {},
  };
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

describe('WO-T3 — 결정적 등장 (도시 상태가 곧 무작위성)', () => {
  it('시작 노후도 4에서는 아직 오지 않는다 (임계 아래의 평온)', () => {
    for (const r of [0, 0.5, 0.999]) {
      const cards = generateCards(worldAt(4), bundle.orderTemplates, () => r);
      expect(cards.some((c) => c.templateId === 'WO-T3')).toBe(false);
    }
  });

  it('노후도 5부터 rng와 무관하게 반드시 온다 (변형 확인 지점)', () => {
    for (const decay of [5, 7, 10]) {
      for (const r of [0, 0.5, 0.999]) {
        const cards = generateCards(worldAt(decay), bundle.orderTemplates, () => r);
        expect(cards.some((c) => c.templateId === 'WO-T3')).toBe(true);
      }
    }
  });

  it('노후도 6(임계)부터 미확인 구간 카드(조우 입구)가 맨 앞에 온다', () => {
    const cards = generateCards(worldAt(6), bundle.orderTemplates, () => 0);
    expect(cards[0].templateId).toBe('WO-T5');
    expect(cards[0].options[0].startsEncounter).toBe('ENC-001');
  });
});
