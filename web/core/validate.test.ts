import { describe, expect, it } from 'vitest';
import type { ContentBundle } from './schema';
import { validateBundle } from './validate';

/** 최소 유효 번들 — 각 테스트가 일부만 망가뜨려 사용한다 */
function validBundle(): ContentBundle {
  return {
    bundleId: 'test-bundle',
    version: '0.0.1',
    orderTemplates: [
      {
        id: 'WO-X1',
        minDecay: 0,
        title: '테스트 지시서',
        body: [
          { if: [{ path: 'self.memory', gte: 1 }], text: '변형 본문' },
          { text: '기본 본문' },
        ],
        options: [
          {
            label: '정석',
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
            label: '임시방편',
            check: { kind: 'broad', stat: 'repair', difficulty: 30 },
            timeCost: 1,
            onSuccess: {
              effects: [
                { path: 'world.zones.{zone}.decay', op: 'add', value: -1 },
                { path: 'world.flags.patched_{zone}', op: 'add', value: 1 },
              ],
              text: '성공',
            },
          },
        ],
      },
    ],
    storylets: [
      {
        id: 'EV-X1',
        requirements: [{ path: 'world.day', gte: 1 }],
        body: [{ text: '이벤트 본문' }],
        choices: [
          {
            label: '묻는다',
            check: { kind: 'broad', stat: 'nerve', difficulty: 30 },
            onSuccess: {
              effects: [{ path: 'self.memory', op: 'add', value: 1 }],
              text: '성공',
            },
          },
          {
            label: '지나친다',
            check: { kind: 'auto' },
            onSuccess: { effects: [], text: '지나쳤다' },
          },
        ],
      },
    ],
  };
}

/** JSON 경유로 깊은 복사 후 자유 변형 (타입 제약 우회 — 잘못된 콘텐츠를 흉내내기 위함) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mutate(fn: (b: any) => void): ContentBundle {
  const b = JSON.parse(JSON.stringify(validBundle()));
  fn(b);
  return b as ContentBundle;
}

describe('validateBundle — 정상 번들', () => {
  it('유효한 번들은 오류가 없다', () => {
    expect(validateBundle(validBundle())).toEqual([]);
  });
});

describe('validateBundle — 식별자·구조', () => {
  it('bundleId가 비어 있으면 오류', () => {
    const errs = validateBundle(mutate((b) => (b.bundleId = '')));
    expect(errs.length).toBeGreaterThan(0);
  });

  it('지시서 템플릿 id 중복을 잡는다', () => {
    const errs = validateBundle(
      mutate((b) => b.orderTemplates.push(JSON.parse(JSON.stringify(b.orderTemplates[0])))),
    );
    expect(errs.some((e) => e.includes('WO-X1'))).toBe(true);
  });

  it('스토리렛 id 중복을 잡는다', () => {
    const errs = validateBundle(
      mutate((b) => b.storylets.push(JSON.parse(JSON.stringify(b.storylets[0])))),
    );
    expect(errs.some((e) => e.includes('EV-X1'))).toBe(true);
  });
});

describe('validateBundle — 효과 경로 무결성', () => {
  it('알 수 없는 구역 ID를 잡는다', () => {
    const errs = validateBundle(
      mutate((b) => (b.storylets[0].choices[0].onSuccess.effects[0].path = 'world.zones.d9.decay')),
    );
    expect(errs.some((e) => e.includes('d9'))).toBe(true);
  });

  it('알 수 없는 메나스 ID를 잡는다', () => {
    const errs = validateBundle(
      mutate((b) => (b.orderTemplates[0].options[0].onFailure.effects[0].path = 'world.menace.doom')),
    );
    expect(errs.some((e) => e.includes('doom'))).toBe(true);
  });

  it('경로 최상위가 스키마에 없으면 잡는다', () => {
    const errs = validateBundle(
      mutate((b) => (b.storylets[0].choices[0].onSuccess.effects[0].path = 'world.weather.rain')),
    );
    expect(errs.length).toBeGreaterThan(0);
  });

  it('스토리렛 효과에 {zone} 치환자가 있으면 잡는다 (바인딩 대상 아님)', () => {
    const errs = validateBundle(
      mutate(
        (b) =>
          (b.storylets[0].choices[0].onSuccess.effects[0].path = 'world.zones.{zone}.decay'),
      ),
    );
    expect(errs.some((e) => e.includes('{zone}'))).toBe(true);
  });

  it('템플릿 효과의 {zone} 치환자는 허용한다 (유효 번들에 이미 포함)', () => {
    expect(validateBundle(validBundle())).toEqual([]);
  });

  it('템플릿 효과에 알 수 없는 치환자가 있으면 잡는다', () => {
    const errs = validateBundle(
      mutate((b) => (b.orderTemplates[0].options[0].onSuccess.effects[0].path = 'world.zones.{sector}.decay')),
    );
    expect(errs.some((e) => e.includes('{sector}'))).toBe(true);
  });
});

describe('validateBundle — 기억 비가역 (D4)', () => {
  it('self.memory 감소(add 음수)를 거부한다', () => {
    const errs = validateBundle(
      mutate((b) => (b.storylets[0].choices[0].onSuccess.effects[0] = { path: 'self.memory', op: 'add', value: -1 })),
    );
    expect(errs.some((e) => e.includes('memory') || e.includes('기억'))).toBe(true);
  });

  it('self.memory에 대한 set 연산을 거부한다 (감소 가능성 정적 배제)', () => {
    const errs = validateBundle(
      mutate((b) => (b.storylets[0].choices[0].onSuccess.effects[0] = { path: 'self.memory', op: 'set', value: 3 })),
    );
    expect(errs.some((e) => e.includes('memory') || e.includes('기억'))).toBe(true);
  });
});

describe('validateBundle — 판정', () => {
  it('broad 판정의 알 수 없는 스탯을 잡는다', () => {
    const errs = validateBundle(
      mutate((b) => (b.orderTemplates[0].options[1].check = { kind: 'broad', stat: 'luck', difficulty: 30 })),
    );
    expect(errs.some((e) => e.includes('luck'))).toBe(true);
  });

  it('narrow 판정의 알 수 없는 스킬을 잡는다', () => {
    const errs = validateBundle(
      mutate((b) => (b.orderTemplates[0].options[0].check = { kind: 'narrow', skill: 'pyromancy', difficulty: 1 })),
    );
    expect(errs.some((e) => e.includes('pyromancy'))).toBe(true);
  });
});

describe('validateBundle — 조건·텍스트 변형', () => {
  it('조건 경로가 스키마에 없으면 잡는다', () => {
    const errs = validateBundle(
      mutate((b) => (b.orderTemplates[0].body[0].if[0].path = 'self.mood')),
    );
    expect(errs.some((e) => e.includes('self.mood'))).toBe(true);
  });

  it('gte/lte가 둘 다 없는 조건을 잡는다', () => {
    const errs = validateBundle(
      mutate((b) => (b.orderTemplates[0].body[0].if[0] = { path: 'self.memory' })),
    );
    expect(errs.length).toBeGreaterThan(0);
  });

  it('무조건 기본 변형이 마지막에 없으면 잡는다 (첫 매치 우선 규칙)', () => {
    const errs = validateBundle(
      mutate((b) => (b.orderTemplates[0].body = [{ if: [{ path: 'self.memory', gte: 1 }], text: '변형만' }])),
    );
    expect(errs.length).toBeGreaterThan(0);
  });

  it('무조건 변형이 중간에 있으면 잡는다 (뒤 변형이 도달 불가)', () => {
    const errs = validateBundle(
      mutate((b) => (b.orderTemplates[0].body = [{ text: '기본' }, { if: [{ path: 'self.memory', gte: 1 }], text: '도달 불가' }])),
    );
    expect(errs.length).toBeGreaterThan(0);
  });
});
