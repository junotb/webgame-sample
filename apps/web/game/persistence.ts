import { GameState, gameStore, replaceGameState } from "./state";

export const SAVE_VERSION = 1;

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
  if (parsed.version !== SAVE_VERSION) throw new Error(`지원하지 않는 세이브 버전: ${parsed.version}`);
  validateState(parsed.state);
  return structuredClone(parsed.state);
}

export function loadGame(raw: string): GameState {
  const state = parseSave(raw);
  replaceGameState(state);
  return state;
}
