/* =====================================================================
 * defs/quests.ts — 퀘스트 정의 (진행은 G.quests)
 * ===================================================================== */

import questsJson from "../content/quests.json";
import { validateQuests } from "../content/validate";
import type { ConsumableId } from "./consumables";

export type QuestKind = "main" | "side" | "job" | "repeat";
export type ContentLocale = "en" | "ko";

export interface QuestLocaleDef {
  name: string;
  desc: string;
  /** objective id → player-facing instruction */
  objectives: Record<string, string>;
  /** Localized name of the person/place that receives the final report. */
  turnIn?: string;
}

export interface QuestObjectiveDef {
  id: string;
  /** kill: 적 / clear: 우두머리·조우 / reach: POI / talk: NPC / collect·rescue: 월드 대상 */
  type: "kill" | "clear" | "reach" | "talk" | "collect" | "rescue";
  target: string;
  count: number;
  desc: string;
}

export interface QuestTurnInDef {
  type: "npc" | "facility" | "automatic";
  target: string;
  /** Selected-locale display label, populated by content validation. */
  label: string;
}

export interface QuestDef {
  id: string;
  kind: QuestKind;
  name: string;
  desc: string;
  requires?: { quests?: string[]; level?: number };
  giver?: string;
  /** false: a named giver must explicitly offer this main quest. */
  autoStart?: boolean;
  /** Only the first incomplete objective may react to an event. */
  sequential?: boolean;
  turnIn?: QuestTurnInDef;
  objectives: QuestObjectiveDef[];
  /** Both authored scripts are retained for a future language selector. */
  locales: Record<ContentLocale, QuestLocaleDef>;
  rewards: {
    gold?: number;
    exp?: number;
    items?: { id: ConsumableId; n: number }[];
  };
  /** 반복 의뢰를 보고한 날부터 다시 열릴 때까지 필요한 월드 일수 */
  repeatEveryDays?: number;
}

/* 퀘스트 데이터는 content/quests.json — 로드 시 스키마를 검증한다. */
export const QUESTS: QuestDef[] = validateQuests(questsJson);
