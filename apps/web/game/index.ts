/* =====================================================================
 * index.ts — 게임 진입점 (boot) + nav 배선
 *  React(GameCanvas)에서 동적 import 후 boot(el, fonts) 호출.
 *  반환된 cleanup을 unmount 시 호출하면 PIXI/리스너가 정리된다.
 * ===================================================================== */
import {
  attachInput, destroyPixi, initPixi, nav, switchScene,
} from "./core";
import { loadPortraits } from "./portraits";
import { loadMonsterIcons } from "./monsters";
import { loadNpcSprites } from "./npc-sprites";
import { loadTiles } from "./tiles";
import { loadBattleFx } from "./battle-fx";
import { loadItemIcons } from "./item-icons";
import { G, newGame } from "./state";
import { PARTY_SLOTS } from "./defs";
import { titleScene } from "./scenes/title";
import { createScene } from "./scenes/create";
import { townScene } from "./scenes/town";
import { dungeonScene } from "./scenes/explore";
import { fieldScene } from "./scenes/field";
import { FieldId } from "./fieldmaps";
import type { DungeonId } from "./dungeons";
import { endingEvent, letterEvent, prologueEvent } from "./scenes/story";
import type { TownSpawn } from "./town/types";

export async function boot(
  el: HTMLElement,
  fonts: { displayFont: string; bodyFont: string },
): Promise<() => void> {
  await initPixi(el, fonts);
  await Promise.all([
    loadPortraits(), loadTiles(), loadMonsterIcons(), loadNpcSprites(), loadBattleFx(), loadItemIcons(),
  ]);
  attachInput();

  /* nav 배선 — 씬 간 순환 import 방지 라우터 */
  nav.title = () => switchScene(titleScene);
  nav.create = () => switchScene(createScene);
  nav.prologue = () => {
    switchScene(() => townScene("fountain"));
    prologueEvent();
  };
  nav.town = (spawn?: TownSpawn) => switchScene(() => townScene(spawn));
  nav.letter = () => switchScene(letterEvent);
  nav.explore = (id: DungeonId, at?: { x: number; y: number; facing: 0 | 1 | 2 | 3 }) =>
    switchScene(() => dungeonScene(id, at));
  nav.field = (id: FieldId) => switchScene(() => fieldScene(id));
  nav.ending = () => switchScene(endingEvent);

  switchScene(titleScene);

  /* 개발 편의: 콘솔에서 씬 이동·즉시 시작 (프로덕션 빌드 제외) */
  if (process.env.NODE_ENV !== "production") {
    (window as unknown as Record<string, unknown>).__game = {
      nav, newGame, state: () => G,
      /* 슬롯 프리셋 그대로 즉시 시작 — 콘솔에서 씬 점검용 */
      quickStart: () => newGame(PARTY_SLOTS.map((s) => ({
        slotId: s.id, name: s.name, portrait: s.preset.portrait,
        classId: s.preset.classId, bonusSkills: [...s.preset.skills],
        attrs: { ...s.preset.attrs },
      }))),
    };
  }

  return () => destroyPixi();
}
