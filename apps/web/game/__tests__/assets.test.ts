/* =====================================================================
 * assets.test.ts — 에셋 파일 ↔ 카탈로그 정합성 검증
 * ===================================================================== */
import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ENEMY_DEFS, MAP_MONSTER_CATEGORIES, MONSTER_ASSET_META, MONSTER_ICONS,
  NPCS, PARTY_SLOTS, monsterFitsMap,
} from "../defs";
import { DUNGEONS } from "../dungeons";
import { FIELDS } from "../fieldmaps";
import { HIRES_MONSTERS } from "../monsters";
import { NPC_SPRITE_SHEETS } from "../npc-sprites";
import { PORTRAITS } from "../portraits";
import { SHEET_FILES } from "../tiles";

describe("몬스터 아이콘 카탈로그", () => {
  it("카탈로그와 assets/monsters 파일은 1:1로 대응한다", () => {
    const files = new Set(
      readdirSync("public/assets/monsters/icons")
        .filter((f) => f.endsWith(".png"))
        .map((f) => f.replace(/\.png$/, "")),
    );
    const names = new Set(MONSTER_ICONS.map((m) => m.nameEn.toLowerCase()));
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

  it("HIRES_MONSTERS는 카탈로그 nameEn을 쓰고 large 파일이 존재한다", () => {
    const names = new Set(MONSTER_ICONS.map((m) => m.nameEn));
    for (const n of HIRES_MONSTERS) {
      expect(names.has(n), `카탈로그에 없음: ${n}`).toBe(true);
      expect(existsSync(`public/assets/monsters/large/${n.toLowerCase()}.png`), n).toBe(true);
    }
  });

  it("모든 몬스터 에셋은 카테고리와 권장 서식지가 있다", () => {
    const names = new Set(MONSTER_ICONS.map((m) => m.nameEn));
    expect(new Set(Object.keys(MONSTER_ASSET_META))).toEqual(names);
    for (const [name, meta] of Object.entries(MONSTER_ASSET_META)) {
      expect(meta.habitats.length, `${name}: 서식지 없음`).toBeGreaterThan(0);
      for (const habitat of meta.habitats) {
        expect(MAP_MONSTER_CATEGORIES[habitat], `${name}: 잘못된 맵 ${habitat}`).toContain(meta.category);
      }
    }
  });

  it("현재 필드·던전 조우는 맵별 몬스터 분류와 일치한다", () => {
    for (const field of Object.values(FIELDS)) {
      const ids = [
        ...field.decos.flatMap((d) => d.fight?.enemies ?? []),
        ...(field.encounters?.groups.flat() ?? []),
      ];
      for (const id of ids) {
        const def = ENEMY_DEFS[id];
        expect(monsterFitsMap(def.img, field.id), `${field.id}: ${id}/${def.img}`).toBe(true);
      }
    }
    for (const dungeon of Object.values(DUNGEONS)) {
      for (const spawn of [...dungeon.normalSpawns, ...dungeon.symbolSpawns]) {
        const def = ENEMY_DEFS[spawn.defId];
        expect(monsterFitsMap(def.img, dungeon.id), `${dungeon.id}: ${spawn.defId}/${def.img}`).toBe(true);
      }
    }
  });
});

describe("NPC 거리 스프라이트", () => {
  it("시트 목록과 assets/npcs 파일은 1:1로 대응한다", () => {
    const files = new Set(
      readdirSync("public/assets/npcs")
        .filter((f) => f.endsWith(".png"))
        .map((f) => f.replace(/\.png$/, "")),
    );
    for (const s of NPC_SPRITE_SHEETS) expect(files.has(s), `파일 없음: ${s}.png`).toBe(true);
    for (const f of files) expect((NPC_SPRITE_SHEETS as readonly string[]).includes(f), `목록 누락: ${f}.png`).toBe(true);
  });

  it("NpcDef.sprite는 시트 목록의 이름만 사용한다", () => {
    for (const n of NPCS) {
      if (!n.sprite) continue;
      expect((NPC_SPRITE_SHEETS as readonly string[]).includes(n.sprite), `${n.id}: ${n.sprite}`).toBe(true);
    }
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
      expect(existsSync(`public/assets/portraits/${name}.png`), name).toBe(true);
    }
  });
});
