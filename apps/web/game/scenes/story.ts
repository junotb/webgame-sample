/* =====================================================================
 * scenes/story.ts — 스토리 이벤트 (엔딩 / 에픽 클리어)
 *  인트로 이벤트는 폐지 — 모험단 결성 직후 마을 분수 앞에서 시작한다.
 * ===================================================================== */
import { SceneHandle, nav } from "../core";
import { EventNode, eventScene } from "./event";

/* ---- 엔딩: 보스 처치 → 에픽 해금 ---- */
export function endingEvent(): SceneHandle {
  const nodes: EventNode[] = [
    {
      name: "숲의 군주 그림바크", portrait: "dark",
      text: "훌륭하다… 작은 불꽃들이여. 하나 기억하라 — 나는 겨우 '문지기'였을 뿐. 숲의 밑바닥에서, 왕국을 부순 것이 눈을 뜬다…",
    },
    {
      name: "리엔", portrait: "hero",
      text: "…마력의 흐름이 뒤집히고 있어. 숲 어딘가에서, 아주 오래된 무언가가 깨어났어.",
    },
    {
      name: "에런", portrait: "hero",
      text: "그렇다면 끝까지 간다. 숲의 안쪽 — 아래쪽 길에 그 기척이 있다. [에픽] 고대 정령 아스테리온… 준비를 마치고 도전하자.",
    },
  ];
  return eventScene(nodes, () => nav.explore(), { caption: "종장 — 그러나 숲은 끝나지 않았다", bgColor: 0x0e0c1c });
}

/* ---- 에픽 클리어 ---- */
export function epicClearEvent(): SceneHandle {
  const nodes: EventNode[] = [
    {
      name: "고대 정령 아스테리온", portrait: "dark",
      text: "……별의 시대 이후, 처음으로 나를 넘어선 자들. 부서진 왕국의 연대기는, 이제 너희 넷의 이름으로 다시 쓰이리라.",
    },
    {
      name: "미라", portrait: "hero",
      text: "…끝났어. 정말로 끝났어! 돌아가자, 리븐홀드로. 다들 기다리고 있을 테니까.",
    },
    {
      text: "— 프로토타입 클리어! 축하합니다 —\n에런·리엔·카시우스·미라의 모험은 여기까지. 이후의 연대기는 다음 버전에서 계속됩니다.",
    },
  ];
  return eventScene(nodes, () => nav.town(), { caption: "외전 — 별을 삼킨 숲", bgColor: 0x120f26 });
}
