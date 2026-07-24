/* =====================================================================
 * settings.ts — 게임 설정 (세이브와 별개로 localStorage에 보존)
 *  BGM 온·오프처럼 세션·세이브를 가로지르는 환경 설정을 담는다.
 * ===================================================================== */

export interface GameSettings {
  bgmOn: boolean;
}

const STORAGE_KEY = "webgame:settings";
const DEFAULTS: GameSettings = { bgmOn: true };

let settings: GameSettings | null = null;
const listeners = new Set<(s: GameSettings) => void>();

function storage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; }
  catch { return null; }
}

export function getSettings(): GameSettings {
  if (!settings) {
    settings = { ...DEFAULTS };
    const raw = storage()?.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<GameSettings>;
        if (typeof parsed.bgmOn === "boolean") settings.bgmOn = parsed.bgmOn;
      } catch { /* 손상된 설정은 기본값으로 */ }
    }
  }
  return settings;
}

export function updateSettings(patch: Partial<GameSettings>): GameSettings {
  const next = { ...getSettings(), ...patch };
  settings = next;
  storage()?.setItem(STORAGE_KEY, JSON.stringify(next));
  for (const fn of listeners) fn(next);
  return next;
}

/** 설정 변경 구독 — 해제 함수를 반환한다 (audio 등이 사용). */
export function onSettingsChange(fn: (s: GameSettings) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
