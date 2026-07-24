import { ABILITIES, FIELD_SKILLS, isMagicSchool } from "./defs";
import { GameState, Member, gameStore, memberRanks, replaceGameState } from "./state";

export const SAVE_VERSION = 8;
/** 이보다 오래된 세이브는 마이그레이션 경로가 없어 명확한 안내와 함께 거절한다. */
export const MIN_SAVE_VERSION = 6;

/* ---- 마이그레이션 체인 ----
 * 키 n의 함수는 버전 n 상태를 n+1 형태로 고친다. parseSave가
 * 세이브 버전부터 SAVE_VERSION까지 차례로 적용하므로, 상태 형태를
 * 바꿀 때는 SAVE_VERSION을 올리고 여기에 한 단계만 추가하면 된다.
 * 함수 안에서는 아직 구버전 형태이므로 GameState 타입을 단언하지 않는다. */
const MIGRATIONS: Record<number, (state: Record<string, unknown>) => void> = {
  /* v6의 '흔들리는 왕관'은 왕자 발견만으로 done이 되었다.
   * v7은 오르윈 귀환 보고를 별도 목표로 요구한다. */
  6: (state) => {
    if (!isRecord(state.quests)) return;
    const progress = state.quests.main_ch1_wavering_crown;
    if (!isRecord(progress) || progress.status === "rewarded") return;
    const counts = isRecord(progress.counts) ? progress.counts : {};
    progress.counts = counts;
    if (isRecord(state.flags) && state.flags.princeFound === true)
      counts.find_prince = 1;
    if (progress.status === "done") progress.status = "active";
    counts.report_to_orwin ??= 0;
  },
  /* v8: 주문은 길드에서 골드로 습득한다(learnedSpells). 기존 세이브는
   * 지금까지 랭크로 쓸 수 있던 마법을 전부 습득한 것으로 인정한다. */
  7: (state) => {
    if (!Array.isArray(state.party)) return;
    for (const member of state.party) {
      if (!isRecord(member) || Array.isArray(member.learnedSpells)) continue;
      /* 구버전 멤버도 memberRanks가 읽는 필드(classId·ld·bonusSkills·trained)는 동일하다 */
      const ranks = memberRanks(member as unknown as Member);
      member.learnedSpells = [...ABILITIES, ...FIELD_SKILLS]
        .filter((a) => isMagicSchool(a.skill) && !a.starter && (ranks[a.skill] ?? 0) >= a.min)
        .map((a) => a.id);
    }
  },
};

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
  if (parsed.version < MIN_SAVE_VERSION)
    throw new Error(`호환되지 않는 세이브 버전(v${parsed.version}): v${MIN_SAVE_VERSION} 이상만 지원한다`);
  if (parsed.version > SAVE_VERSION)
    throw new Error(`더 새로운 버전의 세이브(v${parsed.version}): 게임을 업데이트해야 한다`);
  if (!isRecord(parsed.state)) throw new Error("세이브 상태가 객체가 아니다");
  const state = structuredClone(parsed.state);
  for (let v = parsed.version; v < SAVE_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`세이브 마이그레이션 경로가 없다: v${v} → v${v + 1}`);
    step(state);
  }
  validateState(state);
  return state;
}

export function loadGame(raw: string): GameState {
  const state = parseSave(raw);
  replaceGameState(state);
  return state;
}

/* ---- 세이브 슬롯 (localStorage) ----
 * 상태에 G.town이 포함되므로 로드 후에는 nav.town()으로 복귀하면 된다. */
export const SAVE_SLOT_COUNT = 3;
const slotKey = (n: number) => `webgame:save:${n}`;

export interface SlotMeta {
  savedAt: string;
  summary: string;
}

function slotStorage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; }
  catch { return null; }
}

/** 슬롯별 메타 — 비어 있으면 null. 손상·구버전 파싱 실패 슬롯도 null로 취급한다. */
export function listSlots(): Array<SlotMeta | null> {
  const store = slotStorage();
  return Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => {
    const raw = store?.getItem(slotKey(i));
    if (!raw) return null;
    try {
      const env = JSON.parse(raw) as SaveEnvelope;
      const state = parseSave(raw);
      const lead = state.party[0];
      return {
        savedAt: env.savedAt,
        summary: `${lead?.name ?? "?"} Lv.${lead?.level ?? "?"} 외 ${Math.max(0, state.party.length - 1)}명 · ${state.gold} G`,
      };
    } catch { return null; }
  });
}

const backupKey = (n: number) => `${slotKey(n)}:prev`;

/** 슬롯 저장 — 직렬화본을 다시 파싱해 검증한 뒤에만 덮어쓰고, 직전 세이브는 백업 키에 남긴다. */
export function saveToSlot(n: number): void {
  const store = slotStorage();
  if (!store) return;
  const raw = serializeGame();
  parseSave(raw); /* 손상된 상태가 멀쩡한 슬롯을 덮지 않게 저장 전에 왕복 검증 */
  const prev = store.getItem(slotKey(n));
  if (prev) store.setItem(backupKey(n), prev);
  store.setItem(slotKey(n), raw);
}

/** 슬롯 로드 — 본 세이브가 손상되었으면 백업으로 한 번 더 시도한다. */
export function loadFromSlot(n: number): boolean {
  const store = slotStorage();
  if (!store) return false;
  for (const key of [slotKey(n), backupKey(n)]) {
    const raw = store.getItem(key);
    if (!raw) continue;
    try { loadGame(raw); return true; }
    catch { /* 다음 후보(백업)로 */ }
  }
  return false;
}

export function deleteSlot(n: number): void {
  slotStorage()?.removeItem(slotKey(n));
  slotStorage()?.removeItem(backupKey(n));
}

export function hasAnySave(): boolean {
  return listSlots().some((s) => s !== null);
}
