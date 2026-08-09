import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadContent } from './loader';

const tempDirs: string[] = [];

function makeContentDir(files: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), 'content-loader-'));
  tempDirs.push(dir);
  for (const [name, data] of Object.entries(files)) {
    writeFileSync(join(dir, name), JSON.stringify(data), 'utf-8');
  }
  return dir;
}

afterEach(() => {
  while (tempDirs.length) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

const minimalBundle = {
  bundleId: 'ep-test',
  encounters: [],
  version: '0.0.1',
  orderTemplates: [
    {
      id: 'WO-M1',
      minDecay: 0,
      weight: 1,
      face: 'inspection',
      siteId: 'm-site',
      title: [{ text: '지시서' }],
      body: [{ paragraphs: ['본문'] }],
      options: [
        {
          label: '처리',
          check: { kind: 'auto' },
          timeCost: 1,
          onSuccess: { effects: [], text: '완료' },
        },
      ],
    },
  ],
  storylets: [],
  zoneMaps: [
    { zone: 'd5', title: '시험 배치도', sites: [{ id: 'm-site', label: '시험 지점', x: 50, y: 50 }] },
  ],
};

describe('loadContent — 매니페스트 경유 로딩', () => {
  it('매니페스트에 등록된 번들을 로드한다', () => {
    const dir = makeContentDir({
      'manifest.json': { bundles: [{ id: 'ep-test', path: 'bundle.json' }] },
      'bundle.json': minimalBundle,
    });
    const bundles = loadContent(dir);
    expect(bundles).toHaveLength(1);
    expect(bundles[0].bundleId).toBe('ep-test');
  });

  it('매니페스트가 없으면 throw', () => {
    const dir = makeContentDir({});
    expect(() => loadContent(dir)).toThrow();
  });

  it('매니페스트 id와 번들 bundleId 불일치 시 throw', () => {
    const dir = makeContentDir({
      'manifest.json': { bundles: [{ id: 'other-id', path: 'bundle.json' }] },
      'bundle.json': minimalBundle,
    });
    expect(() => loadContent(dir)).toThrow(/other-id/);
  });

  it('검증 실패 번들은 오류 목록과 함께 throw', () => {
    const bad = JSON.parse(JSON.stringify(minimalBundle));
    bad.storylets = [
      {
        id: 'EV-BAD',
        requirements: [],
        body: [{ paragraphs: ['x'] }],
        choices: [
          {
            label: 'x',
            check: { kind: 'auto' },
            onSuccess: {
              effects: [{ path: 'self.memory', op: 'add', value: -1 }],
              text: 'x',
            },
          },
        ],
      },
    ];
    const dir = makeContentDir({
      'manifest.json': { bundles: [{ id: 'ep-test', path: 'bundle.json' }] },
      'bundle.json': bad,
    });
    expect(() => loadContent(dir)).toThrow(/기억|memory/);
  });
});

describe('loadContent — 실제 콘텐츠 무결성 (빌드 검증)', () => {
  it('저장소의 실제 매니페스트·번들이 검증을 통과한다', () => {
    const bundles = loadContent();
    expect(bundles.length).toBeGreaterThan(0);
    expect(bundles.some((b) => b.bundleId === 'ep1-slice')).toBe(true);
  });
});
