/* =====================================================================
 * assets.test.ts — 에셋 파일 ↔ 카탈로그 정합성 검증
 * ===================================================================== */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ENEMY_DEFS, MAP_MONSTER_CATEGORIES, MONSTER_ASSET_META, MONSTER_ICONS,
  NPCS, PARTY_SLOTS, SHOP_ARMORS, SHOP_WEAPONS, monsterFitsMap,
} from "../defs";
import { DUNGEONS } from "../dungeons";
import { FIELDS } from "../fieldmaps";
import { GEAR_ICON_FRAMES, SHEET_SRC } from "../item-icons";
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
      (existsSync("public/assets/npcs") ? readdirSync("public/assets/npcs") : [])
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

  it("아이템 아이콘 시트 파일이 존재한다", () => {
    for (const src of Object.values(SHEET_SRC))
      expect(existsSync(`public${src}`), src).toBe(true);
  });

  it("모든 상점 장비는 아이콘 프레임이 있고 시트 범위 안이다", () => {
    for (const g of [...SHOP_WEAPONS, ...SHOP_ARMORS]) {
      const frame = GEAR_ICON_FRAMES[g.name];
      expect(frame, `프레임 없음: ${g.name}`).toBeTruthy();
      expect(frame.x % 32, `${g.name}: x 정렬`).toBe(0);
      expect(frame.y % 32, `${g.name}: y 정렬`).toBe(0);
    }
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

describe("에셋 매니페스트 (docs/04-asset-manifest.md)", () => {
  const doc = readFileSync("docs/04-asset-manifest.md", "utf8");

  /** `## title` 섹션의 표에서 [1열, 2열] 행을 뽑는다. 헤더·구분선은 .png 미포함으로 걸러진다 */
  const tableRows = (title: string): [string, string][] => {
    const start = doc.indexOf(`## ${title}`);
    expect(start, `섹션 없음: ${title}`).toBeGreaterThanOrEqual(0);
    const rest = doc.slice(start);
    const end = rest.indexOf("\n## ", 1);
    return (end === -1 ? rest : rest.slice(0, end))
      .split("\n")
      .filter((l) => l.startsWith("|"))
      .map((l) => l.split("|").map((c) => c.trim()))
      .filter((c) => c[1]?.includes(".png"))
      .map((c) => [c[1], c[2]]);
  };

  const md5 = (p: string) => createHash("md5").update(readFileSync(p)).digest("hex");

  it("확정 매핑: 양쪽 파일이 존재하고 내용(md5)이 동일하다", () => {
    const rows = tableRows("확정 매핑");
    expect(rows.length).toBeGreaterThan(0);
    for (const [rt, src] of rows) {
      const rtPath = `public/assets/${rt}`;
      const srcPath = `assets-source/${src}`;
      expect(existsSync(rtPath), `런타임 없음: ${rt}`).toBe(true);
      expect(existsSync(srcPath), `원본 없음: ${src}`).toBe(true);
      expect(md5(rtPath), `md5 불일치: ${rt} ← ${src}`).toBe(md5(srcPath));
    }
  });

  it("추정 매핑·출처 미확인: 런타임 파일이 존재한다", () => {
    for (const title of ["추정 매핑", "출처 미확인"]) {
      for (const [rt] of tableRows(title)) {
        for (const p of rt.split(",").map((s) => s.trim())) {
          expect(existsSync(`public/assets/${p}`), `런타임 없음: ${p}`).toBe(true);
        }
      }
    }
  });
});
