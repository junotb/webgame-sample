/* =====================================================================
 * index.ts — 게임 진입점 (boot) + nav 배선
 *  React(GameCanvas)에서 동적 import 후 boot(el, fonts) 호출.
 *  반환된 cleanup을 unmount 시 호출하면 PIXI/리스너가 정리된다.
 * ===================================================================== */
import {
  attachInput, destroyPixi, fullFlash, initPixi, nav, switchScene,
} from "./core";
import { loadPortraits } from "./portraits";
import { loadTiles } from "./tiles";
import { titleScene } from "./scenes/title";
import { createScene } from "./scenes/create";
import { townScene } from "./scenes/town";
import { exploreScene } from "./scenes/explore";
import { battleScene, BattleOpts } from "./scenes/battle";
import { endingEvent, epicClearEvent, introEvent } from "./scenes/story";

export async function boot(
  el: HTMLElement,
  fonts: { displayFont: string; bodyFont: string },
): Promise<() => void> {
  await initPixi(el, fonts);
  await Promise.all([loadPortraits(), loadTiles()]);
  attachInput();

  /* nav 배선 — 씬 간 순환 import 방지 라우터 */
  nav.title = () => switchScene(titleScene);
  nav.create = () => switchScene(createScene);
  nav.intro = () => switchScene(introEvent);
  nav.town = () => switchScene(townScene);
  nav.explore = () => switchScene(exploreScene);
  nav.battle = (groupIds: string[], opts: BattleOpts = {}) =>
    fullFlash(0xffffff, 350, () => switchScene(() => battleScene(groupIds, opts)));
  nav.ending = () => switchScene(endingEvent);
  nav.epicClear = () => switchScene(epicClearEvent);

  switchScene(titleScene);

  return () => destroyPixi();
}
