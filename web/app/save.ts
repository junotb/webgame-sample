import type { GameState } from '../core/schema';

const DATABASE_NAME = 'shattered-realm';
const DATABASE_VERSION = 1;
const STORE_NAME = 'game-state';
const SAVE_KEY = 'phase0';

/**
 * 세이브 스키마 버전 — GameState 구조가 바뀔 때마다 올린다.
 * 불일치 세이브는 복원하지 않고 버린다 (Phase 0: 마이그레이션 없이 새 게임).
 */
export const SAVE_SCHEMA = 2;

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
        // 구 스키마(래핑 없는 GameState 등)는 조용히 폐기 — 새 게임으로 시작
        resolve(isCurrentEnvelope(value) ? structuredClone(value.state) : null);
      };
      request.onerror = () => reject(request.error ?? new Error('세이브 불러오기에 실패했습니다.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('세이브 불러오기가 중단되었습니다.'));
    });
  } finally {
    database.close();
  }
}
