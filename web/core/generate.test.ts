import { describe, it, expect } from 'vitest';
import { applyDifficultyBonus, instantiateOrder, generateOrders } from './generate';
import type { ZoneId, WorkOrderTemplate } from './schema';

const T1: WorkOrderTemplate = {
  id: 'T1',
  minDecay: 0,
  title: '정기 점검',
  body: [{ text: '기본 본문' }],
  options: [
    {
      label: '정석 (narrow)',
      check: { kind: 'narrow', skill: 'inscription', difficulty: 1 },
      timeCost: 1,
      onSuccess: {
        effects: [{ path: 'world.zones.{zone}.decay', op: 'add', value: -3 }],
        text: '성공',
      },
      onFailure: {
        effects: [{ path: 'world.menace.fatigue', op: 'add', value: 2 }],
        text: '실패',
      },
    },
    {
      label: '임시방편 (broad)',
      check: { kind: 'broad', stat: 'repair', difficulty: 30 },
      timeCost: 1,
      onSuccess: {
        effects: [{ path: 'world.flags.patched_{zone}', op: 'add', value: 1 }],
        text: '성공',
      },
    },
  ],
};

const T2: WorkOrderTemplate = {
  id: 'T2',
  minDecay: 4,
  title: '압력 시정',
  body: [{ text: '본문' }],
  options: [
    {
      label: '자동 처리',
      check: { kind: 'auto' },
      timeCost: 1,
      onSuccess: { effects: [], text: '성공' },
    },
  ],
};

const T3: WorkOrderTemplate = { ...T2, id: 'T3', minDecay: 5, title: '명멸 점검' };

const TEMPLATES = [T1, T2, T3];

describe('applyDifficultyBonus', () => {
  it('broad/narrow는 difficulty에 가산', () => {
    expect(applyDifficultyBonus({ kind: 'broad', stat: 'repair', difficulty: 30 }, 5)).toEqual({
      kind: 'broad',
      stat: 'repair',
      difficulty: 35,
    });
    expect(applyDifficultyBonus({ kind: 'narrow', skill: 'flowsense', difficulty: 2 }, 3)).toEqual({
      kind: 'narrow',
      skill: 'flowsense',
      difficulty: 5,
    });
  });
  it('auto는 그대로', () => {
    expect(applyDifficultyBonus({ kind: 'auto' }, 5)).toEqual({ kind: 'auto' });
  });
  it('보정 0이면 원값 유지', () => {
    expect(applyDifficultyBonus({ kind: 'broad', stat: 'nerve', difficulty: 30 }, 0)).toEqual({
      kind: 'broad',
      stat: 'nerve',
      difficulty: 30,
    });
  });
});

describe('instantiateOrder — 완전 구체화', () => {
  it('difficultyBonus = decay − minDecay (초과분)', () => {
    expect(instantiateOrder(T1, 'd7', 5).difficultyBonus).toBe(5);
    expect(instantiateOrder(T3, 'd7', 5).difficultyBonus).toBe(0);
  });
  it('모든 옵션의 check에 보정이 가산된다', () => {
    const order = instantiateOrder(T1, 'd5', 4); // bonus 4
    expect(order.options[0].check).toEqual({ kind: 'narrow', skill: 'inscription', difficulty: 5 });
    expect(order.options[1].check).toEqual({ kind: 'broad', stat: 'repair', difficulty: 34 });
  });
  it('effects 경로가 구역으로 바인딩되어 치환자가 남지 않는다', () => {
    const order = instantiateOrder(T1, 'd5', 3);
    expect(order.options[0].onSuccess.effects).toEqual([
      { path: 'world.zones.d5.decay', op: 'add', value: -3 },
    ]);
    expect(order.options[0].onFailure?.effects).toEqual([
      { path: 'world.menace.fatigue', op: 'add', value: 2 },
    ]);
    expect(order.options[1].onSuccess.effects).toEqual([
      { path: 'world.flags.patched_d5', op: 'add', value: 1 },
    ]);
  });
  it('메타데이터가 채워지고 resolved=false', () => {
    const order = instantiateOrder(T1, 'd2', 3);
    expect(order.templateId).toBe('T1');
    expect(order.zone).toBe('d2');
    expect(order.title).toBe('정기 점검');
    expect(order.body).toEqual([{ text: '기본 본문' }]);
    expect(order.resolved).toBe(false);
  });
  it('원본 템플릿은 불변', () => {
    instantiateOrder(T1, 'd5', 5);
    expect(T1.options[0].check).toEqual({ kind: 'narrow', skill: 'inscription', difficulty: 1 });
    expect(T1.options[0].onSuccess.effects[0].path).toBe('world.zones.{zone}.decay');
  });
});

describe('generateOrders — 노후도 테이블 × 템플릿', () => {
  const zones: Record<ZoneId, { decay: number }> = {
    d2: { decay: 3 },
    d5: { decay: 4 },
    d7: { decay: 5 },
  };

  it('구역당 1건, 3건 고정 생성', () => {
    const orders = generateOrders(zones, TEMPLATES, () => 0);
    expect(orders).toHaveLength(3);
    expect(orders.map((o) => o.zone)).toEqual(['d2', 'd5', 'd7']);
  });
  it('minDecay ≤ decay인 템플릿만 후보가 된다 (decay 3 → T1만)', () => {
    const orders = generateOrders(zones, TEMPLATES, () => 0.99);
    expect(orders[0].templateId).toBe('T1'); // d2: T2/T3 부적격
  });
  it('적격 후보 중 최고 minDecay가 항상 선택된다 (완곡어 시연 보장 — 등장 랜덤성 제거)', () => {
    // d7 decay 5 → T1/T2/T3 전부 적격이지만 rng와 무관하게 T3
    expect(generateOrders(zones, TEMPLATES, () => 0)[2].templateId).toBe('T3');
    expect(generateOrders(zones, TEMPLATES, () => 0.99)[2].templateId).toBe('T3');
    // d5 decay 4 → T1/T2 적격, T2 확정
    expect(generateOrders(zones, TEMPLATES, () => 0)[1].templateId).toBe('T2');
    expect(generateOrders(zones, TEMPLATES, () => 0.99)[1].templateId).toBe('T2');
  });
  it('최고 minDecay 동률은 rng로 갈린다', () => {
    const T3B: WorkOrderTemplate = { ...T3, id: 'T3B' };
    const pool = [...TEMPLATES, T3B];
    expect(generateOrders(zones, pool, () => 0)[2].templateId).toBe('T3');
    expect(generateOrders(zones, pool, () => 0.99)[2].templateId).toBe('T3B');
  });
  it('적격 템플릿이 없으면 throw', () => {
    expect(() => generateOrders({ ...zones, d2: { decay: 3 } }, [T3], () => 0)).toThrow(/적격/);
  });
});
