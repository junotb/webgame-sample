/* =====================================================================
 * assets.test.ts — 에셋 파일 ↔ 카탈로그 정합성 검증
 * ===================================================================== */
import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ENEMY_DEFS, MONSTER_ICONS, NPCS, PARTY_SLOTS } from "../defs";
import { PORTRAITS } from "../portraits";
import { SHEET_FILES } from "../tiles";

describe("몬스터 아이콘 카탈로그", () => {
  it("카탈로그와 assets/monsters 파일은 1:1로 대응한다", () => {
    const files = new Set(
      readdirSync("public/assets/monsters")
        .filter((f) => f.endsWith(".png"))
        .map((f) => f.replace(/\.png$/, "")),
    );
    const names = new Set(MONSTER_ICONS.map((m) => m.nameEn));
    expect(names.size, "nameEn 중복").toBe(MONSTER_ICONS.length);
    for (const n of names) expect(files.has(n), `파일 없음: ${n}.png`).toBe(true);
    for (const f of files) expect(names.has(f), `카탈로그 누락: ${f}.png`).toBe(true);
  });

  it("카탈로그 이름은 비어있지 않고 중복되지 않는다", () => {
    const kos = MONSTER_ICONS.map((m) => m.nameKo);
    const ens = MONSTER_ICONS.map((m) => m.nameEn);
    expect(new Set(kos).size).toBe(kos.length);
    expect(new Set(ens).size).toBe(ens.length);
    for (const m of MONSTER_ICONS) {
      expect(m.nameKo.length).toBeGreaterThan(0);
      expect(m.nameEn.length).toBeGreaterThan(0);
    }
  });

  it("ENEMY_DEFS.img는 카탈로그 nameEn만 사용한다", () => {
    const names = new Set(MONSTER_ICONS.map((m) => m.nameEn));
    for (const [id, d] of Object.entries(ENEMY_DEFS))
      expect(names.has(d.img), `${id}: ${d.img}`).toBe(true);
  });
});

describe("에셋 참조", () => {
  it("타일 시트 파일이 존재한다", () => {
    for (const src of SHEET_FILES)
      expect(existsSync(`public${src}`), src).toBe(true);
  });

  it("NPC·파티 프리셋 초상화 인덱스는 실재 파일을 가리킨다", () => {
    const idxs = [
      ...NPCS.map((n) => n.portrait),
      ...PARTY_SLOTS.map((s) => s.preset.portrait),
    ];
    for (const i of idxs) {
      const name = PORTRAITS[i - 1];
      expect(name, `portrait ${i}`).toBeTruthy();
      expect(existsSync(`public/assets/characters/${name}.png`), name).toBe(true);
    }
  });
});
