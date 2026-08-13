/**
 * 코어 테스트 공용 — 주간 마감 흐름 콘텐츠 최소 그릇.
 * ContentBundle이 총평·통지서·주말 활동·엔딩을 필수로 요구하게 되면서
 * 각 테스트의 번들 리터럴이 전부 깨졌다 — 여기 스프레드 한 벌로 채운다.
 */
import type { ContentBundle } from './schema';

export const WEEKLY_CONTENT: Pick<
  ContentBundle,
  'weeklyDebrief' | 'weeklyNotice' | 'weekendActivities' | 'endings'
> = {
  weeklyDebrief: {
    perfect: [{ paragraphs: ['총평: 전원 규정치 안쪽.'] }],
    passed: [{ paragraphs: ['총평: 통상적인 주.'] }],
    notPassed: [{ paragraphs: ['총평: 규정치 이탈.'] }],
  },
  weeklyNotice: {
    perfect: [{ paragraphs: ['통지: Perfect.'] }],
    passed: [{ paragraphs: ['통지: Passed.'] }],
    notPassed: [{ paragraphs: ['통지: Not Passed.'] }],
  },
  weekendActivities: [
    {
      id: 'WKD-frost',
      label: '마법서를 편다',
      repeatable: true,
      body: [{ paragraphs: ['손끝이 시렸다.'] }],
      effects: [{ path: 'self.skillXp.frost', op: 'add', value: 4 }],
    },
    {
      id: 'WKD-neighbor',
      label: '옆집',
      repeatable: false,
      body: [{ paragraphs: ['축제 장식을 접었다.'] }],
      effects: [{ path: 'world.flags.met_neighbor', op: 'set', value: 1 }],
    },
    {
      id: 'WKD-chief',
      label: '촌장',
      repeatable: false,
      body: [{ paragraphs: ['차를 마셨다.'] }],
      effects: [{ path: 'world.flags.met_chief', op: 'set', value: 1 }],
    },
    {
      id: 'WKD-barkeep',
      label: '술집',
      repeatable: false,
      body: [{ paragraphs: ['소식 한 조각.'] }],
      effects: [{ path: 'world.flags.met_barkeep', op: 'set', value: 1 }],
    },
  ],
  endings: {
    retained: [{ paragraphs: ['배치 유지.'] }],
    fired: [{ paragraphs: ['배치 해제.'] }],
  },
};
