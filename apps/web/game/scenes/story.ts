/* =====================================================================
 * scenes/story.ts — 스토리 이벤트 (프롤로그 / 편지 전달 / 던전 클리어)
 *  메인: 마구간에서 길 사정 확인 → 산적 소탕·길드 보고 → 에버모어 성 편지 전달.
 * ===================================================================== */
import { SceneHandle, nav } from "../core";
import { G } from "../state";
import { questNotify, reportQuest } from "../core/quests";
import { tileTex } from "../tiles";
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
    /* 알현실 일러스트 — 왕궁 홀 원화(royal_hall layer_03)의 깃발 걸린 고딕 회랑 */
    { caption: "알현 — 에버모어 성", bgColor: 0x12102a, illustration: tileTex("royal_hall_wall") });
}

/* ---- 그름바크 토벌: 현상금 완수 — 배후의 그림자를 남긴다 ---- */
export function endingEvent(): SceneHandle {
  const nodes: EventNode[] = [
    {
      name: "그름바크 (고블린 주술사)", portrait: "dark",
      text: "쿨럭… 작은 불꽃들이, 제법이구나. 하나 기억해 두어라 — 크로스베일을 원한 건, 내가 아니다…. 인장의 주인은, 계곡 너머에서 지켜보고 있다…",
    },
    {
      name: "리엔", portrait: "hero",
      text: "작전 문서의 그 인장…. 고블린들을 움직인 건 따로 있었던 거야. 이 계곡은 시작에 불과했는지도 몰라.",
    },
    {
      name: "에런", portrait: "hero",
      text: "지휘관이 쓰러졌으니 요새와 평야의 고블린들도 곧 흩어질 거다. 크로스베일로 돌아가 현상금 길드에 보고하자.",
    },
  ];
  return eventScene(nodes, () => nav.town(), { caption: "지하 알현실 — 지휘관의 최후", bgColor: 0x0e0c1c });
}
