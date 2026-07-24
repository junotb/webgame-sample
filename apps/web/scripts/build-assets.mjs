/* =====================================================================
 * build-assets.mjs — 런타임 에셋을 원본에서 결정적으로 재생성한다.
 *
 *  대상 1: docs/04-asset-manifest.md의 "확정 매핑" 표
 *          (public/assets ← assets-source, 내용 동일 복사)
 *  대상 2: scripts/audio-manifest.json의 BGM 매핑
 *          (public/audio/bgm ← assets-source/audio/bgm-library)
 *
 *  사용법:
 *    node scripts/build-assets.mjs          원본 → 런타임 복사(재생성)
 *    node scripts/build-assets.mjs --check  복사 없이 md5 일치만 검증 (CI용)
 *
 *  "추정" 매핑(합성·크롭을 거친 시트)은 이 스크립트 범위 밖이다 —
 *  그 계열은 문서와 회귀 테스트(assets.test.ts)로 추적한다.
 * ===================================================================== */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

function md5(path) {
  return createHash("md5").update(readFileSync(path)).digest("hex");
}

/** 04-asset-manifest.md의 "확정 매핑" 섹션 표를 [런타임, 원본] 쌍으로 파싱한다. */
function parseConfirmedMappings() {
  const doc = readFileSync(join(root, "docs/04-asset-manifest.md"), "utf8");
  const section = doc.split("## 확정 매핑")[1]?.split(/\n## /)[0];
  if (!section) throw new Error("04-asset-manifest.md에서 '확정 매핑' 섹션을 찾지 못했다");
  const pairs = [];
  for (const raw of section.split("\n")) {
    const m = raw.trim().match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/);
    if (!m || m[1].startsWith("---") || m[1].startsWith("런타임")) continue;
    pairs.push([join(root, "public/assets", m[1]), join(root, "assets-source", m[2])]);
  }
  return pairs;
}

function audioMappings() {
  const manifest = JSON.parse(readFileSync(join(root, "scripts/audio-manifest.json"), "utf8"));
  return Object.entries(manifest.bgm).map(([out, src]) => [
    join(root, "public/audio/bgm", `${out}.mp3`),
    join(root, "assets-source/audio/bgm-library", src),
  ]);
}

let copied = 0, ok = 0, mismatched = 0, missing = 0;
for (const [runtime, source] of [...parseConfirmedMappings(), ...audioMappings()]) {
  if (!existsSync(source)) {
    console.error(`원본 없음: ${source}`);
    missing++;
    continue;
  }
  const same = existsSync(runtime) && md5(runtime) === md5(source);
  if (same) { ok++; continue; }
  if (checkOnly) {
    console.error(`불일치: ${runtime}`);
    mismatched++;
  } else {
    mkdirSync(dirname(runtime), { recursive: true });
    copyFileSync(source, runtime);
    console.log(`복사: ${runtime}`);
    copied++;
  }
}

console.log(`\n일치 ${ok}건${checkOnly ? `, 불일치 ${mismatched}건` : `, 복사 ${copied}건`}, 원본 없음 ${missing}건`);
if (missing > 0 || mismatched > 0) process.exit(1);
