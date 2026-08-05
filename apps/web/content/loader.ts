/**
 * 콘텐츠 로더 (D4) — 코드는 콘텐츠를 직접 import하지 않는다.
 * 매니페스트를 경유해 번들을 읽고, 로드 시점에 빌드 검증을 강제한다.
 * 서버 전용 (Node fs) — 클라이언트 컴포넌트에는 props로 전달된다.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ContentBundle } from '../core/schema';
import { validateBundle } from '../core/validate';

interface Manifest {
  bundles: Array<{ id: string; path: string }>;
}

const DEFAULT_DIR = join(process.cwd(), 'content');

export function loadContent(contentDir: string = DEFAULT_DIR): ContentBundle[] {
  const manifest = JSON.parse(readFileSync(join(contentDir, 'manifest.json'), 'utf-8')) as Manifest;

  return manifest.bundles.map((entry) => {
    const bundle = JSON.parse(readFileSync(join(contentDir, entry.path), 'utf-8')) as ContentBundle;
    if (bundle.bundleId !== entry.id) {
      throw new Error(
        `매니페스트 불일치: '${entry.path}'의 bundleId '${bundle.bundleId}' ≠ 매니페스트 id '${entry.id}'`,
      );
    }
    const errors = validateBundle(bundle);
    if (errors.length > 0) {
      throw new Error(`콘텐츠 검증 실패 (${entry.id}):\n- ${errors.join('\n- ')}`);
    }
    return bundle;
  });
}
