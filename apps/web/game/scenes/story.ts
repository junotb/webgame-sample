/* =====================================================================
 * scenes/story.ts — 스토리 이벤트 (프롤로그 / 편지 전달 / 엔딩 / 에픽 클리어)
 *  프롤로그: 대스승 헤르만이 제자 넷을 크로스베일로 보낸다.
 *  편지 전달: 에버모어 성 알현실에서 연방 군주에게 헤르만의 편지를 전한다.
 * ===================================================================== */
import { SceneHandle, nav } from "../core";
import { G } from "../state";
import { EventNode, eventOverlay, eventScene } from "./event";

/* ---- 서장: 헤르만의 편지 (크로스베일 도착 후 대화 오버레이) ---- */
export function prologueEvent(): SceneHandle {
  const nodes: EventNode[] = [
    {
      text: "오랜 훈련을 마치고, 마침내 세상으로 나왔다.",
    },
    {
      text: "첫 임무는 대스승 헤르만의 편지를 에버모어 왕성에 전달하는 일이다.",
    },
    {
      text: "에버모어로 가는 길은 크로스베일의 마굿간에서 시작된다. 마굿간을 통해 이동하자.",
    },
  ];
  return eventOverlay(nodes);
}

/* ---- 편지 전달: 에버모어 성 알현실 ---- */
export function letterEvent(): SceneHandle {
  const nodes: EventNode[] = [
    {
      name: "연방 군주", portrait: "elder",
      text: "먼 길 왔구나, 헤르만의 제자들이여. 그 노인의 봉인이 틀림없구나 — 어디 보자.",
    },
    {
      name: "연방 군주", portrait: "elder",
      text: "…과연. 세 성의 균형이 흔들리고, 옛 계곡이 다시 깨어난다는 경고로군. 헤르만다운 통찰이다. 잘 전해 주었다.",
    },
    {
      name: "미라", portrait: "hero",
      text: "임무 완수네요. 스승님도 한시름 놓으시겠죠. …돌아가는 길에, 크로스베일 사람들이 걱정하던 계곡도 들여다봐야겠어요.",
    },
  ];
  return eventScene(nodes, () => { G.flags.letter = true; nav.town("throne"); },
    { caption: "알현 — 에버모어 성", bgColor: 0x12102a });
}

/* ---- 엔딩: 보스 처치 → 에픽 해금 ---- */
export function endingEvent(): SceneHandle {
  const nodes: EventNode[] = [
    {
      name: "숲의 군주 그림바크", portrait: "dark",
      text: "훌륭하다… 작은 불꽃들이여. 하나 기억하라 — 나는 겨우 '문지기'였을 뿐. 계곡의 밑바닥에서, 연방을 부술 것이 눈을 뜬다…",
    },
    {
      name: "리엔", portrait: "hero",
      text: "…마력의 흐름이 뒤집히고 있어. 할로우베일 어딘가에서, 아주 오래된 무언가가 깨어났어.",
    },
    {
      name: "에런", portrait: "hero",
      text: "그렇다면 끝까지 간다. 계곡의 안쪽 — 아래쪽 길에 그 기척이 있다. [에픽] 고대 정령 아스테리온… 준비를 마치고 도전하자.",
    },
  ];
  return eventScene(nodes, () => nav.explore(), { caption: "종장 — 그러나 계곡은 끝나지 않았다", bgColor: 0x0e0c1c });
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
      text: "…끝났어. 정말로 끝났어! 돌아가자, 크로스베일로. 다들 기다리고 있을 테니까.",
    },
    {
      text: "— 프로토타입 클리어! 축하합니다 —\n에런·리엔·카시우스·미라의 모험은 여기까지. 이후의 연대기는 다음 버전에서 계속됩니다.",
    },
  ];
  return eventScene(nodes, () => nav.town(), { caption: "외전 — 별을 삼킨 계곡", bgColor: 0x120f26 });
}
