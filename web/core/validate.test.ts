import { WEEKLY_CONTENT } from './test-content';
import { describe, expect, it } from 'vitest';
import type { ContentBundle } from './schema';
import { validateBundle } from './validate';

/** 최소 유효 번들 — 각 테스트가 일부만 망가뜨려 사용한다 */
function validBundle(): ContentBundle {
  return {
    bundleId: 'test-bundle',
    ...WEEKLY_CONTENT,
    encounters: [],
    version: '0.0.1',
    orderTemplates: [
      {
        id: 'WO-X1',
        minStagnation: 0,
        weight: 1,
        kind: 'circuit',
        siteId: 'x-site',
        title: [{ text: '테스트 지시서' }],
        body: [
          { if: [{ path: 'self.memory', gte: 1 }], paragraphs: ['변형 본문'] },
          { paragraphs: ['기본 본문'] },
        ],
        resultProse: {
          complete: [{ paragraphs: ['완수 산문'] }],
          partial: [{ paragraphs: ['부분 산문'] }],
          fail: [{ paragraphs: ['실패 산문'] }],
        },
      },
    ],
    storylets: [
      {
        id: 'EV-X1',
        requirements: [{ path: 'world.calendar.day', gte: 1 }],
        body: [{ paragraphs: ['이벤트 본문'] }],
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
    zoneMaps: [
      {
        zone: 'd5',
        title: '테스트 배치도',
        sites: [{ id: 'x-site', label: '시험 지점', x: 50, y: 50 }],
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
      mutate((b) => (b.storylets[0].choices[0].onSuccess.effects[0].path = 'world.zones.d9.stagnation')),
    );
    expect(errs.some((e) => e.includes('d9'))).toBe(true);
  });

  it('알 수 없는 메나스 ID를 잡는다', () => {
    const errs = validateBundle(
      mutate((b) => (b.storylets[0].choices[0].onSuccess.effects[0].path = 'world.menace.doom')),
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
          (b.storylets[0].choices[0].onSuccess.effects[0].path = 'world.zones.{zone}.stagnation'),
      ),
    );
    expect(errs.some((e) => e.includes('{zone}'))).toBe(true);
  });

  it('템플릿 효과의 {zone} 치환자는 허용한다 (유효 번들에 이미 포함)', () => {
    expect(validateBundle(validBundle())).toEqual([]);
  });

  it('조우 outcome 효과에 알 수 없는 치환자가 있으면 잡는다', () => {
    const errs = validateBundle(
      mutate((b) => {
        b.encounters = [
          {
            id: 'ENC-B',
            title: '시험 조우',
            maxTurns: 3,
            calmToSleep: 1,
            intro: [{ paragraphs: ['도입'] }],
            actions: {
              observe: { label: '관찰', check: { kind: 'auto' }, successText: 'x' },
              soothe: { label: '진정', check: { kind: 'auto' }, successText: 'x' },
              burn: { label: '연소', check: { kind: 'auto' }, successText: 'x' },
              withdraw: { label: '철수', check: { kind: 'auto' }, successText: 'x' },
            },
            outcomes: {
              burned: { effects: [{ path: 'world.zones.{sector}.stagnation', op: 'add', value: -1 }], text: 'x' },
              soothed: { effects: [], text: 'x' },
              withdrawn: { effects: [], text: 'x' },
              expired: { effects: [], text: 'x' },
            },
          },
        ];
      }),
    );
    expect(errs.some((e) => e.includes('{sector}'))).toBe(true);
  });
});

describe('validateBundle — 카드 레이어 (v3 §4·§5)', () => {
  it('알 수 없는 카드 종류를 잡는다 (4종 고정)', () => {
    const errs = validateBundle(mutate((b) => (b.orderTemplates[0].kind = 'combat')));
    expect(errs.some((e) => e.includes('combat'))).toBe(true);
  });

  it('resultProse 누락·변형 누락을 잡는다 (성적 3변형 필수)', () => {
    expect(
      validateBundle(mutate((b) => delete b.orderTemplates[0].resultProse)).join(' '),
    ).toContain('resultProse');
    expect(
      validateBundle(mutate((b) => delete b.orderTemplates[0].resultProse.partial)).join(' '),
    ).toContain('resultProse.partial');
  });

  it('weight 범위 밖(0, 4)을 잡는다', () => {
    expect(validateBundle(mutate((b) => (b.orderTemplates[0].weight = 0))).length).toBeGreaterThan(0);
    expect(validateBundle(mutate((b) => (b.orderTemplates[0].weight = 4))).length).toBeGreaterThan(0);
  });

  it('startsMultiday.days가 1~3 밖이면 잡는다', () => {
    const errs = validateBundle(
      mutate((b) => (b.storylets[0].choices[0].startsMultiday = { id: 'x', days: 4 })),
    );
    expect(errs.some((e) => e.includes('days'))).toBe(true);
  });

  it('템플릿 본문 변형 조건의 {zone}은 허용, 스토리렛 조건의 {zone}은 거부', () => {
    const ok = validateBundle(
      mutate((b) => (b.orderTemplates[0].body[0].if = [{ path: 'world.zones.{zone}.stagnation', gte: 6 }])),
    );
    expect(ok).toEqual([]);
    const bad = validateBundle(
      mutate((b) => (b.storylets[0].requirements = [{ path: 'world.zones.{zone}.stagnation', gte: 6 }])),
    );
    expect(bad.some((e) => e.includes('{zone}'))).toBe(true);
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

describe('validateBundle — 판정 (조우·스토리렛만 판정을 갖는다)', () => {
  it('broad 판정의 알 수 없는 스탯을 잡는다', () => {
    const errs = validateBundle(
      mutate((b) => (b.storylets[0].choices[0].check = { kind: 'broad', stat: 'luck', difficulty: 30 })),
    );
    expect(errs.some((e) => e.includes('luck'))).toBe(true);
  });

  it('narrow 판정의 알 수 없는 스킬을 잡는다', () => {
    const errs = validateBundle(
      mutate((b) => (b.storylets[0].choices[0].check = { kind: 'narrow', skill: 'pyromancy', difficulty: 1 })),
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
      mutate((b) => (b.orderTemplates[0].body = [{ if: [{ path: 'self.memory', gte: 1 }], paragraphs: ['변형만'] }])),
    );
    expect(errs.length).toBeGreaterThan(0);
  });

  it('무조건 변형이 중간에 있으면 잡는다 (뒤 변형이 도달 불가)', () => {
    const errs = validateBundle(
      mutate((b) => (b.orderTemplates[0].body = [{ paragraphs: ['기본'] }, { if: [{ path: 'self.memory', gte: 1 }], paragraphs: ['도달 불가'] }])),
    );
    expect(errs.length).toBeGreaterThan(0);
  });
});

describe('validateBundle — 본문 문단 배열 (ui-screen-spec §4)', () => {
  it('문단이 하나도 없는 본문 변형을 잡는다', () => {
    const errs = validateBundle(mutate((b) => (b.orderTemplates[0].body[1].paragraphs = [])));
    expect(errs.some((e) => e.includes('문단이 하나도 없음'))).toBe(true);
  });

  it('빈 문단을 잡는다', () => {
    const errs = validateBundle(mutate((b) => (b.storylets[0].body[0].paragraphs = ['본문', '  '])));
    expect(errs.some((e) => e.includes('빈 문단'))).toBe(true);
  });

  it('문단 안 빈 줄(\\n\\n 관례 잔재)을 잡는다', () => {
    const errs = validateBundle(
      mutate((b) => (b.storylets[0].body[0].paragraphs = ['첫 문단.\n\n둘째 문단.'])),
    );
    expect(errs.some((e) => e.includes('문단 안 빈 줄'))).toBe(true);
  });

  it('구 형식(text 문자열 본문)을 잡는다 — paragraphs 없는 변형', () => {
    const errs = validateBundle(
      mutate((b) => (b.storylets[0].body = [{ text: '구 형식 본문' }])),
    );
    expect(errs.some((e) => e.includes('문단이 하나도 없음'))).toBe(true);
  });
});

describe('validateBundle — 구역 도면 (UI 층위 사양 §7)', () => {
  it('도면이 하나도 없으면 거부한다', () => {
    expect(validateBundle(mutate((b) => (b.zoneMaps = []))).join(' ')).toContain('구역 도면이 하나도 없음');
  });

  it('템플릿의 지점이 도면에 없으면 거부한다', () => {
    const errs = validateBundle(mutate((b) => (b.orderTemplates[0].siteId = 'nowhere')));
    expect(errs.join(' ')).toContain("지점 'nowhere'");
  });

  it('도면이 여럿이면 모든 도면이 모든 템플릿의 지점을 가져야 한다', () => {
    // 배치 구역이 바뀌면 같은 템플릿이 그 도면으로 바인딩된다 —
    // 한 도면이라도 비면 마커 없는 지시서가 조용히 생긴다
    const errs = validateBundle(
      mutate((b) => b.zoneMaps.push({ zone: 'd2', title: '제2구역 배치도', sites: [] })),
    );
    expect(errs.join(' ')).toContain('구역 도면 d2');
  });

  it('중복 지점 id와 범위 밖 좌표를 거부한다', () => {
    expect(
      validateBundle(
        mutate((b) => b.zoneMaps[0].sites.push({ id: 'x-site', label: '중복', x: 10, y: 10 })),
      ).join(' '),
    ).toContain('중복 지점 id');
    expect(validateBundle(mutate((b) => (b.zoneMaps[0].sites[0].x = 140))).join(' ')).toContain('0~100');
    expect(validateBundle(mutate((b) => (b.zoneMaps[0].sites[0].y = -1))).join(' ')).toContain('0~100');
  });

  it('지점명이 비면 거부한다 — 지점명은 표면 층이다', () => {
    expect(validateBundle(mutate((b) => (b.zoneMaps[0].sites[0].label = ''))).join(' ')).toContain('label');
  });
});

describe('validateBundle — 프롤로그 (system-rules §프롤로그)', () => {
  it('prologue가 없으면 거부한다 — 새 게임 흐름이 이 그릇을 무조건 연다', () => {
    expect(validateBundle(mutate((b) => delete b.prologue)).join(' ')).toContain('prologue 누락');
  });

  it('변형이 둘 이상이면 거부한다 — 고정 산문은 무조건 변형 하나뿐이다', () => {
    const errs = validateBundle(mutate((b) => b.prologue.push({ paragraphs: ['둘째 변형'] })));
    expect(errs.join(' ')).toContain('변형 금지');
  });

  it('조건 변형을 거부한다 — 프롤로그는 어느 축도 타지 않는다', () => {
    const errs = validateBundle(
      mutate((b) => (b.prologue = [{ if: [{ path: 'self.memory', gte: 1 }], paragraphs: ['조건 산문'] }])),
    );
    expect(errs.join(' ')).toContain('변형 금지');
  });
});
