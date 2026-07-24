/* =====================================================================
 * defs/npcs.ts — NPC·대화 주제 정의
 * ===================================================================== */
import npcsJson from "../content/npcs.json";
import { validateNpcs } from "../content/validate";
import type { TownId } from "../towns";
import type { TownContentRequirement } from "../town/types";
import type { ContentLocale } from "./quests";

export interface CharacterProfileDef {
  background: string;
  personality: string;
  desire: string;
  fear: string;
  secret: string;
  voice: string;
}

export interface NpcQuestDialogueDef {
  offer: string;
  active: string;
  complete: string;
}

export interface NpcLocaleDef {
  name: string;
  desc: string;
  greeting: string;
  profile: CharacterProfileDef;
  topics: Record<string, { label: string; text: string }>;
  questDialogue: Record<string, NpcQuestDialogueDef>;
}

/* ---- NPC ----
 * 울티마식 주제 대화: 말을 걸면 [의뢰]/[보고](퀘스트) · 대화하기(주제 선택).
 * 초상화는 portraits 폴더 1-based 인덱스 (portraits.ts와 동일 규칙). */
export interface NpcTopicDef {
  id: string;
  /** 주제 선택지에 뜨는 키워드 */
  label: string;
  text: string;
  /** 명시된 퀘스트를 완료(보고)해야 열리는 주제 */
  requires?: TownContentRequirement;
}

export interface NpcDef {
  id: string;
  name: string;
  portrait: number;
  desc: string;
  greeting: string;
  profile: CharacterProfileDef;
  questDialogue: Record<string, NpcQuestDialogueDef>;
  /** English source and Korean localization, kept together by stable ids. */
  locales: Record<ContentLocale, NpcLocaleDef>;
  /** 소속 마을 (생략 시 크로스베일) */
  town?: TownId;
  /** 마을 그리드 좌표 (칸을 점유 — 정면에서 대화) */
  gx: number;
  gy: number;
  /** 거리 스프라이트 이름 (assets/npcs) — 없으면 절차적 그리기 폴백. */
  sprite?: string;
  /** 거리 스프라이트 외투/포인트 색 (미니맵 점·폴백 그리기) */
  color: number;
  accent: number;
  /** 이 NPC가 주는 퀘스트 (수주·보고 모두 이 NPC에게) */
  quests?: string[];
  topics: NpcTopicDef[];
}

/* NPC·대화 데이터는 content/npcs.json — 로드 시 스키마를 검증한다. */
export const NPCS: NpcDef[] = validateNpcs(npcsJson);
