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
import { loadTiles } from "./tiles";
import { loadBattleFx } from "./battle-fx";
import { G, newGame } from "./state";
import { titleScene } from "./scenes/title";
import { createScene } from "./scenes/create";
import { townScene } from "./scenes/town";
import { goblinFortressScene } from "./scenes/explore";
import { fieldScene } from "./scenes/field";
import { FieldId } from "./fieldmaps";
import { endingEvent, epicClearEvent, letterEvent, prologueEvent } from "./scenes/story";
import type { TownSpawn } from "./town/types";

export async function boot(
  el: HTMLElement,
  fonts: { displayFont: string; bodyFont: string },
): Promise<() => void> {
  await initPixi(el, fonts);
  await Promise.all([loadPortraits(), loadTiles(), loadMonsterIcons(), loadBattleFx()]);
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
  nav.explore = () => switchScene(goblinFortressScene);
  nav.field = (id: FieldId) => switchScene(() => fieldScene(id));
  nav.ending = () => switchScene(endingEvent);
  nav.epicClear = () => switchScene(epicClearEvent);

  switchScene(titleScene);

  /* 개발 편의: 콘솔에서 씬 이동·즉시 시작 (프로덕션 빌드 제외) */
  if (process.env.NODE_ENV !== "production") {
    (window as unknown as Record<string, unknown>).__game = {
      nav, newGame, state: () => G,
    };
  }

  return () => destroyPixi();
}
