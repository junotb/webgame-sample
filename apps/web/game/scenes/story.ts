/* =====================================================================
 * scenes/story.ts — 스토리 이벤트 (프롤로그 / 편지 전달 / 던전 클리어)
 *  메인: 마구간에서 길 사정 확인 → 산적 소탕·길드 보고 → 에버모어 성 편지 전달.
 * ===================================================================== */
import { SceneHandle, nav } from "../core";
import { G } from "../state";
import { questNotify, reportQuest } from "../core/quests";
import { EventNode, eventOverlay, eventScene } from "./event";

/* ---- 서장: 헤르만의 편지 (크로스베일 도착 후 대화 오버레이) ---- */
export function prologueEvent(): SceneHandle {
  const nodes: EventNode[] = [
    {
      text: "오랜 훈련을 마치고, 마침내 세상으로 나왔다.",
    },
    {
      text: "첫 임무는 대스승 헤르만의 봉인된 편지를 에버모어 성의 연방 군주에게 직접 전달하는 일이다.",
    },
    {
      text: "하지만 지금은 크로스베일 밖으로 나가는 길부터 막혀 있다. 남동쪽 마구간으로 가서 에버모어행 이동편을 알아보자.",
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
      text: "…헤르만의 뜻은 분명히 받았다. 막힌 계곡길까지 직접 뚫고 왔다지. 편지와 함께 그 공도 기억하겠다.",
    },
    {
      name: "미라", portrait: "hero",
      text: "드디어 임무 완수네요. 스승님도 한시름 놓으시겠죠. 이제 다음 소식이 올 때까지 크로스베일 사람들을 도와요.",
    },
  ];
  return eventScene(nodes, () => {
    G.flags.letter = true;
    questNotify({ t: "talk", npc: "federal_lord" });
    reportQuest("main_deliver_hermans_letter");
    nav.town("throne");
  },
    { caption: "알현 — 에버모어 성", bgColor: 0x12102a });
}

/* ---- 엔딩: 보스 처치 → 에픽 해금 ---- */
export function endingEvent(): SceneHandle {
  const nodes: EventNode[] = [
    {
      name: "고블린 로드 그름바크", portrait: "dark",
      text: "훌륭하다… 작은 불꽃들이여. 하나 기억하라 — 나는 겨우 '문지기'였을 뿐. 요새의 밑바닥에서, 연방을 부술 것이 눈을 뜬다…",
    },
    {
      name: "리엔", portrait: "hero",
      text: "…마력의 흐름이 뒤집히고 있어. 고블린 요새 깊은 곳에서, 아주 오래된 무언가가 깨어났어.",
    },
    {
      name: "에런", portrait: "hero",
      text: "그렇다면 끝까지 간다. 요새의 안쪽 — 물의 방에 그 기척이 있다. [에픽] 고대 정령 아스테리온… 준비를 마치고 도전하자.",
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
