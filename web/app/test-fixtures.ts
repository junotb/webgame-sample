/**
 * UI 테스트 공용 픽스처 — 순수 데이터만 둔다 (DOM 의존 없음).
 * 마크업 테스트(node 환경)와 상호작용 테스트(jsdom 환경)가 함께 쓴다.
 */
import type { ContentBundle, WorkOrder } from '../core/schema';

export const ORDER: WorkOrder = {
  templateId: 'WO-TEST',
  zone: 'd5',
  difficultyBonus: 0,
  weight: 1,
  face: 'inspection',
  siteId: 'test-site',
  reissueCount: 0,
  title: '간헐 명멸 현상 점검',
  body: [
    { if: [{ path: 'self.memory', gte: 1 }], text: '당신은 이 문구가 무언가를 감추고 있음을 안다.' },
    { text: '이상 없음으로 처리하십시오.' },
  ],
  options: [
    {
      label: '표준 절차로 처리',
      check: { kind: 'auto' },
      timeCost: 1,
      onSuccess: { effects: [], text: '완료' },
    },
  ],
  resolved: false,
};

export const CONTENT: ContentBundle = {
  bundleId: 'ui-test',
  encounters: [],
  version: '1',
  zoneMaps: [
    {
      zone: 'd5',
      title: '제5구역 · 시설 배치도',
      sites: [{ id: 'test-site', label: '제3중계실', x: 40, y: 55 }],
    },
  ],
  orderTemplates: [
    {
      id: 'WO-TEST',
      minDecay: 0,
      weight: 1,
      face: 'inspection',
      siteId: 'test-site',
      title: '간헐 명멸 현상 점검',
      body: ORDER.body,
      options: [
        {
          label: '표준 절차로 처리',
          check: { kind: 'auto' },
          timeCost: 1,
          onSuccess: { effects: [], text: '완료' },
        },
      ],
    },
  ],
  storylets: [
    {
      id: 'EV-001',
      requirements: [{ path: 'world.calendar.day', gte: 1 }],
      body: [{ text: '귀환자가 서류를 내려다본다.' }],
      choices: [
        {
          label: '무엇이 문제인지 묻는다',
          check: { kind: 'auto' },
          onSuccess: { effects: [], text: '그가 대답했다.' },
        },
      ],
    },
  ],
};
