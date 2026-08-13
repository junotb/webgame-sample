import type { GameState } from '../core/schema';

// 구 프로젝트명('shattered-realm') 잔재였다. 스키마 4로 어차피 기존 세이브가
// 버려지는 김에 정리한다 — 이 이름으로는 남은 DB를 알아볼 수 없다.
const DATABASE_NAME = 'still-here-tomorrow';
const DATABASE_VERSION = 1;
const STORE_NAME = 'game-state';
const SAVE_KEY = 'phase0';

/**
 * 세이브 스키마 버전 — GameState 구조가 바뀔 때마다 올린다.
 * 불일치 세이브는 복원하지 않고 버린다 (Phase 0: 마이그레이션 없이 새 게임).
 *
 * 4: ArchiveEntry에 `day` 추가 (서류함 일기화).
 * 5: WorkOrder.title이 string → TextVariant[] (v3 §4 단서 축).
 *    pendingOrders가 세이브에 들어가므로 구 세이브의 문자열 제목이
 *    selectVariant에 도달해 터졌다 — 스키마를 올려 새 게임으로 보낸다.
 *    v3 §8 제약 재확인: title 변형 목록은 조건+원문이지 렌더된 문장이 아니다.
 * 6: CharacterSheet.skillXp 추가 (기술 경험치 — open-questions B 결정).
 * 7: WorkOrder.body가 TextVariant[] → ProseVariant[] (문단 배열, ui-screen-spec §4).
 *    pendingOrders가 세이브에 들어가므로 구 세이브의 body.text가 selectProse에서
 *    빈 본문이 된다 — 스키마를 올려 새 게임으로 보낸다.
 *    v3 §8 제약 재확인: 문단 배열은 조건+원문 목록이지 렌더된 문장이 아니다.
 * 8: WorldSheet.weekTally·ending 추가 (FINAL_WEEK 엔딩 합산 — implementation-plan §6-0).
 *    렌더 문장 미저장 제약 재확인: 저장되는 것은 집계 수치와 엔딩 ID뿐이다.
 * 9: 평가 3등급 축소 — WeeklyRating 4종 → 3종(perfect/passed/notPassed),
 *    weekTally에 perfect 추가 (경계 합산식). 구 세이브의 weekRatings 값이 무효.
 * 10: WorkOrder.outcome이 성공/실패 2값 → 3등급(WeeklyRating). resultProse 추가.
 *    pendingOrders가 세이브에 들어가므로 구 outcome 값이 정산에서 오독된다 — 새 게임으로.
 * 11: 카드 리뉴얼(세션 ③) — face 5종 → kind 4종, options 제거, resultProse 필수.
 *    구 세이브의 pendingOrders가 새 렌더러(kind·작업 개시)에서 깨진다 — 새 게임으로.
 * 12: 주간 마감 흐름 — SkillId에 frost 추가(skills/skillXp 키 증가),
 *    WorldSheet.weekend 추가, DayPhase에 debrief/weekend, ArchiveEntry에 notice.
 *    구 세이브는 frost 키가 없어 효과 적용·렌더에서 깨진다 — 새 게임으로.
 *    렌더 문장 미저장 제약 재확인: 통지서는 {kind:'notice', day, week}만 저장하고
 *    본문은 weekRatings[week] 등급으로 재렌더링한다.
 * 13: 기술 5종 확정 — SkillId에 incantation(영창술)·flame(화염술) 추가
 *    (감류학=듣기 / 영창술=말하기 / 각인학=쓰기 + 화염술 · 빙결술, design-structure §5).
 *    구 세이브는 두 키가 없어 등급 파생·패널 렌더에서 깨진다 — 새 게임으로.
 */
export const SAVE_SCHEMA = 13;

interface SaveEnvelope {
  schema: number;
  state: GameState;
}

function isCurrentEnvelope(value: unknown): value is SaveEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as SaveEnvelope).schema === SAVE_SCHEMA &&
    typeof (value as SaveEnvelope).state?.world?.calendar?.day === 'number'
  );
}

function openDatabase(factory: IDBFactory | undefined): Promise<IDBDatabase> {
  if (!factory) {
    return Promise.reject(new Error('IndexedDB를 사용할 수 없는 환경입니다.'));
  }

  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 열기에 실패했습니다.'));
    request.onblocked = () => reject(new Error('IndexedDB 업그레이드가 차단되었습니다.'));
  });
}

export async function saveGame(
  state: GameState,
  factory: IDBFactory | undefined = globalThis.indexedDB,
): Promise<void> {
  const database = await openDatabase(factory);
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put({ schema: SAVE_SCHEMA, state } satisfies SaveEnvelope, SAVE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('세이브 기록에 실패했습니다.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('세이브 기록이 중단되었습니다.'));
    });
  } finally {
    database.close();
  }
}

/** 세이브 폐기 — 엔딩 도달 시 호출된다. 끝난 기록은 이어할 수 없다 */
export async function clearGame(
  factory: IDBFactory | undefined = globalThis.indexedDB,
): Promise<void> {
  const database = await openDatabase(factory);
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(SAVE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('세이브 폐기에 실패했습니다.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('세이브 폐기가 중단되었습니다.'));
    });
  } finally {
    database.close();
  }
}

export async function loadGame(
  factory: IDBFactory | undefined = globalThis.indexedDB,
): Promise<GameState | null> {
  const database = await openDatabase(factory);
  try {
    return await new Promise<GameState | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(SAVE_KEY);
      request.onsuccess = () => {
        const value: unknown = request.result;
        // 구 스키마(래핑 없는 GameState 등)는 조용히 폐기 — 새 게임으로 시작.
        // 엔딩 도달 세이브도 폐기 대상이다 (ended는 종착 — 이어할 것이 없다)
        resolve(
          isCurrentEnvelope(value) && value.state.world.phase !== 'ended'
            ? structuredClone(value.state)
            : null,
        );
      };
      request.onerror = () => reject(request.error ?? new Error('세이브 불러오기에 실패했습니다.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('세이브 불러오기가 중단되었습니다.'));
    });
  } finally {
    database.close();
  }
}
