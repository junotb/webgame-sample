import { GameState, gameStore, replaceGameState } from "./state";

export const SAVE_VERSION = 2;

export interface SaveEnvelope {
  version: number;
  savedAt: string;
  state: GameState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateState(value: unknown): asserts value is GameState {
  if (!isRecord(value)) throw new Error("세이브 상태가 객체가 아니다");
  if (!Array.isArray(value.party) || !Array.isArray(value.bag)) throw new Error("파티 또는 가방 데이터가 잘못되었다");
  if (!isRecord(value.items) || typeof value.gold !== "number") throw new Error("재화 데이터가 잘못되었다");
  if (!isRecord(value.explore) || !isRecord(value.flags) || !isRecord(value.quests))
    throw new Error("진행 데이터가 잘못되었다");
}

export function serializeGame(state: GameState = gameStore.get()): string {
  const envelope: SaveEnvelope = { version: SAVE_VERSION, savedAt: new Date().toISOString(), state };
  return JSON.stringify(envelope);
}

export function parseSave(raw: string): GameState {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error("세이브 JSON을 읽을 수 없다"); }
  if (!isRecord(parsed) || typeof parsed.version !== "number") throw new Error("세이브 형식이 잘못되었다");
  if (parsed.version !== 1 && parsed.version !== SAVE_VERSION) throw new Error(`지원하지 않는 세이브 버전: ${parsed.version}`);
  validateState(parsed.state);
  const state = structuredClone(parsed.state);
  /* v1의 통합 원소/영혼 숙련을 v2의 9개 개별 학파로 확장한다. */
  if (parsed.version === 1) {
    for (const member of state.party) {
      const oldBonus = member.bonusSkills as string[];
      const expanded: string[] = [];
      for (const skill of oldBonus) {
        if (skill === "elemental") expanded.push("fire", "water", "earth", "wind");
        else if (skill === "spirit") expanded.push("spirit", "mind", "body");
        else expanded.push(skill);
      }
      member.bonusSkills = [...new Set(expanded)] as typeof member.bonusSkills;
      const trained = member.trained as Record<string, number | undefined>;
      const elemental = trained.elemental;
      if (elemental) for (const school of ["fire", "water", "earth", "wind"]) trained[school] ??= elemental;
      const selfMagic = trained.spirit;
      if (selfMagic) for (const school of ["spirit", "mind", "body"]) trained[school] ??= selfMagic;
      delete trained.elemental;
    }
  }
  /* v1 안에서 추가된 퀘스트 월드 플래그는 구 세이브에 안전한 기본값을 보충한다. */
  state.flags.bishopDefeated ??= false;
  state.flags.goblinOrders ??= state.explore.chestOpened.c1;
  state.flags.hostagesRescued ??= false;
  state.flags.banditsDefeated ??= false;
  state.flags.stableBriefed ??= state.flags.banditsDefeated || state.flags.letter;
  /* 산적 소탕이 서브 의뢰였던 구 세이브를 새 메인 체인으로 이어 준다.
   * 새 세이브의 '소탕 완료, 보고 전' 상태는 route 진행값이 있으므로 건드리지 않는다. */
  const oldLetter = state.quests.main_hermans_letter;
  if (oldLetter && !("ask_stable" in oldLetter.counts) && state.flags.stableBriefed) {
    state.quests.main_hermans_letter = { status: "rewarded", counts: { ask_stable: 1 }, times: Math.max(1, oldLetter.times ?? 0) };
  }
  if (state.flags.banditsDefeated && !state.quests.main_clear_evermore_road) {
    state.quests.main_hermans_letter = { status: "rewarded", counts: { ask_stable: 1 }, times: 1 };
    state.quests.main_clear_evermore_road = { status: "rewarded", counts: { clear_bandits: 1 }, times: 1 };
  }
  if (state.flags.letter && !state.quests.main_deliver_hermans_letter) {
    state.quests.main_hermans_letter = { status: "rewarded", counts: { ask_stable: 1 }, times: 1 };
    state.quests.main_clear_evermore_road = { status: "rewarded", counts: { clear_bandits: 1 }, times: 1 };
    state.quests.main_deliver_hermans_letter = { status: "rewarded", counts: { deliver_letter: 1 }, times: 1 };
  }
  for (const progress of Object.values(state.quests)) progress.times ??= 0;
  return state;
}

export function loadGame(raw: string): GameState {
  const state = parseSave(raw);
  replaceGameState(state);
  return state;
}
