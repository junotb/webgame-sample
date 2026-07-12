/* =====================================================================
 * scenes/story.ts — 스토리 이벤트 (인트로 / 엔딩 / 에픽 클리어)
 * ===================================================================== */
import { SceneHandle, nav } from "../core";
import { G } from "../state";
import { EventNode, eventScene } from "./event";

/* ---- 인트로: 4인 파티의 출발 ---- */
export function introEvent(): SceneHandle {
  const nodes: EventNode[] = [
    {
      name: "장로 카엘", portrait: "elder",
      text: "왕국이 부서진 지 열두 해… 황혼의 숲이 리븐홀드를 삼키려 하네. 숲의 심장에 깃든 '군주'를 베어야 해.",
    },
    {
      name: "에런", portrait: "hero",
      text: "혼자가 아닙니다. 리엔의 마법, 카시우스의 완력, 미라의 발 — 넷이 함께라면 길은 열립니다.",
    },
    {
      name: "장로 카엘", portrait: "elder",
      text: "든든하군. 숲의 길은 여러 갈래로 갈라져 있네. 갈림길에서 위아래 길을 살피게 — 안쪽 길엔 보물이, 바깥 길엔 어둠이 숨어 있으니.",
      choices: [
        { label: "「맡겨 주십시오.」 (마을로)", goto: "end" },
        { label: "「전직이란 무엇입니까?」", goto: 3 },
      ],
    },
    {
      name: "장로 카엘", portrait: "elder",
      text: "경험을 쌓으면(레벨 3) 모험가 길드에서 첫 갈림길을 고를 수 있네 — 워리어·배틀메이지·위저드·애콜라이트. 그 길의 끝(레벨 6)에는 여덟 개의 최종 클래스가 기다리지. 넷이 각자 다른 길을 걸어도 좋아.",
      choices: [{ label: "「맡겨 주십시오.」 (마을로)", goto: "end" }],
    },
  ];
  return eventScene(nodes, () => {
    G.flags.intro = true;
    nav.town();
  }, { caption: "서장 — 네 개의 발자국", bgColor: 0x100d1e });
}

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
