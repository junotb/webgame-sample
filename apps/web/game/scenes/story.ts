/* =====================================================================
 * scenes/story.ts — 스토리 이벤트 (프롤로그 / 편지 전달 / 던전 클리어)
 *  메인: 마구간에서 길 사정 확인 → 산적 소탕·길드 보고 → 에버모어 성 편지 전달.
 * ===================================================================== */
import { SceneHandle, nav } from "../core";
import { G } from "../state";
import { questNotify, reportQuest } from "../core/quests";
import { storyEvent } from "../defs";
import { tileTex } from "../tiles";
import { EventNode, eventOverlay } from "./event";

/* ---- 서장: 헤르만의 편지 (크로스베일 도착 후 대화 오버레이) ---- */
export function prologueEvent(): SceneHandle {
  const nodes: EventNode[] = storyEvent("prologue");
  return eventOverlay(nodes);
}

/* ---- 편지 전달: 에버모어 성 알현실 (현재 씬 위 일러스트 오버레이) ---- */
export function letterEvent(): SceneHandle {
  const nodes: EventNode[] = storyEvent("letter");
  return eventOverlay(nodes, () => {
    G.flags.letter = true;
    questNotify({ t: "talk", npc: "federal_lord" });
    reportQuest("main_deliver_hermans_letter");
    nav.town("throne");
  },
    /* 알현실 일러스트 — 왕궁 홀 원화(royal_hall layer_03)의 깃발 걸린 고딕 회랑 */
    { caption: "알현 — 에버모어 성", illustration: tileTex("royal_hall_wall") });
}

/* ---- 그름바크 토벌: 현상금 완수 — 배후의 그림자를 남긴다 (던전 씬 위 오버레이) ---- */
export function endingEvent(): SceneHandle {
  const nodes: EventNode[] = storyEvent("grumbark_ending");
  return eventOverlay(nodes, () => nav.town(), { caption: "지하 알현실 — 지휘관의 최후", dim: true });
}
