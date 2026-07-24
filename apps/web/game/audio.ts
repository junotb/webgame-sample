/* =====================================================================
 * audio.ts — BGM 매니저
 *  - 트랙은 public/audio/bgm에서 스트리밍 재생 (사전 로드 없음).
 *  - playBgm: 같은 트랙이면 무시, 다르면 크로스페이드 전환.
 *  - pushBgm/popBgm: 전투처럼 잠시 덮었다가 원래 곡으로 돌아가는 용도.
 *  - 브라우저 자동재생 정책: 첫 사용자 입력 전의 재생 요청은 보류했다가
 *    installAudioUnlock이 건 첫 제스처에서 이어 재생한다.
 *  - 설정(bgmOn)을 구독해 즉시 켜고 끈다. SFX는 트랙이 준비되면 같은
 *    구조로 sfx 채널을 더한다.
 * ===================================================================== */
import { events } from "./core/events";
import { getSettings, onSettingsChange } from "./settings";

export type BgmId =
  | "title" | "townCrossvale" | "townEvermore"
  | "fieldRoad" | "fieldForest" | "fieldMarsh"
  | "dungeonFortress" | "dungeonTemple" | "dungeonTomb"
  | "battle" | "event";

const BGM_FILES: Record<BgmId, string> = {
  title: "title-enigma-of-eldoria",
  townCrossvale: "town-mystic-meadows",
  townEvermore: "town-discovery",
  fieldRoad: "field-unknown-paths",
  fieldForest: "field-forest-fantasy",
  fieldMarsh: "field-mystic-mists",
  dungeonFortress: "dungeon-dark-rites",
  dungeonTemple: "dungeon-shadows-unknown",
  dungeonTomb: "dungeon-witching-hour",
  battle: "battle-magefire-clash",
  event: "event-chronicles",
};

/* 씬 → 트랙 매핑 — 새 맵을 추가하면 여기서 곡만 정해 주면 된다. */
export function bgmForTown(id: string): BgmId {
  return id === "evermore" ? "townEvermore" : "townCrossvale";
}
export function bgmForField(id: string): BgmId {
  if (id === "gleamwood" || id === "hermanForest") return "fieldForest";
  if (id === "mistmarsh") return "fieldMarsh";
  return "fieldRoad";
}
export function bgmForDungeon(id: string): BgmId {
  if (id === "temple") return "dungeonTemple";
  if (id === "royalTomb") return "dungeonTomb";
  return "dungeonFortress";
}

const BGM_VOLUME = 0.55;
const FADE_MS = 700;

let current: { id: BgmId; el: HTMLAudioElement } | null = null;
let fading: HTMLAudioElement | null = null;
let fadeTimer: ReturnType<typeof setInterval> | null = null;
/** 자동재생이 막혔거나 BGM이 꺼진 동안 기억해 두는 트랙 */
let pendingId: BgmId | null = null;
let unlocked = false;
/** 전투 등 일시 덮어쓰기 이전의 트랙 */
let stackedId: BgmId | null = null;

function stopFade(): void {
  if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
  if (fading) { fading.pause(); fading.src = ""; fading = null; }
}

function crossfade(next: HTMLAudioElement | null): void {
  stopFade();
  const prev = current?.el ?? null;
  if (prev) { fading = prev; }
  if (!prev && !next) return;
  const start = performance.now();
  if (next) next.volume = 0;
  fadeTimer = setInterval(() => {
    const t = Math.min(1, (performance.now() - start) / FADE_MS);
    if (fading) fading.volume = BGM_VOLUME * (1 - t);
    if (next) next.volume = BGM_VOLUME * t;
    if (t >= 1) stopFade();
  }, 50);
}

function startTrack(id: BgmId): void {
  const el = new Audio(`/audio/bgm/${BGM_FILES[id]}.mp3`);
  el.loop = true;
  el.volume = 0;
  const played = el.play();
  played?.catch(() => { /* 자동재생 차단 — 언락 제스처에서 재시도된다 */ });
  crossfade(el);
  current = { id, el };
}

/** 씬 진입 시 호출. 같은 곡이면 그대로 이어진다. */
export function playBgm(id: BgmId): void {
  stackedId = null;
  pendingId = id;
  if (!unlocked || !getSettings().bgmOn) return;
  if (current?.id === id) return;
  startTrack(id);
}

/** 전투 등 일시 트랙 — popBgm으로 이전 곡에 돌아간다. */
export function pushBgm(id: BgmId): void {
  const prev = pendingId;
  playBgm(id);
  stackedId = prev;
}

export function popBgm(): void {
  if (stackedId) playBgm(stackedId);
  stackedId = null;
}

export function stopBgm(): void {
  pendingId = null;
  stackedId = null;
  crossfade(null);
  current = null;
}

function pauseAll(): void {
  stopFade();
  if (current) { current.el.pause(); current.el.src = ""; current = null; }
}

function resumePending(): void {
  if (pendingId && getSettings().bgmOn && current?.id !== pendingId) startTrack(pendingId);
}

/* ---- 탭 블러 일시 정지 — 트랙을 버리지 않고 멈췄다가 이어 재생한다. ---- */
let suspendedByBlur = false;
export function suspendAudio(): void {
  suspendedByBlur = true;
  stopFade();
  current?.el.pause();
}
export function resumeAudio(): void {
  if (!suspendedByBlur) return;
  suspendedByBlur = false;
  if (!getSettings().bgmOn) return;
  if (current) { current.el.volume = BGM_VOLUME; current.el.play().catch(() => {}); }
  else resumePending();
}

/** 이벤트 버스 → BGM 배선. 씬은 scene:enter만 발행하면 곡 선택은 여기서 한다. */
export function installAudioBridge(): () => void {
  const offs = [
    events.on("scene:enter", ({ kind, id }) => {
      if (kind === "title") playBgm("title");
      else if (kind === "event") playBgm("event");
      else if (kind === "town") playBgm(bgmForTown(id ?? ""));
      else if (kind === "field") playBgm(bgmForField(id ?? ""));
      else if (kind === "dungeon") playBgm(bgmForDungeon(id ?? ""));
      /* create: 타이틀 곡을 그대로 잇는다 */
    }),
    events.on("battle:start", () => pushBgm("battle")),
    events.on("battle:end", () => popBgm()),
  ];
  return () => offs.forEach((off) => off());
}

/** 첫 키·포인터 입력에서 오디오를 언락한다 — boot에서 1회 설치. */
export function installAudioUnlock(): () => void {
  const unlock = () => {
    unlocked = true;
    resumePending();
    remove();
  };
  const remove = () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  const offSettings = onSettingsChange((s) => {
    if (s.bgmOn) resumePending();
    else pauseAll();
  });
  return () => { remove(); offSettings(); pauseAll(); };
}
