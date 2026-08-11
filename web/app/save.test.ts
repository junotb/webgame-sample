import { describe, expect, it } from 'vitest';
import { createInitialState } from './game-state';
import { loadGame, saveGame } from './save';

class MemoryIndexedDB {
  private readonly records = new Map<IDBValidKey, unknown>();
  private storeCreated = false;

  open(): IDBOpenDBRequest {
    const request = {} as IDBOpenDBRequest;
    const database = {
      objectStoreNames: { contains: () => this.storeCreated },
      createObjectStore: () => {
        this.storeCreated = true;
      },
      transaction: () => {
        const transaction = {} as IDBTransaction;
        const store = {
          put: (value: unknown, key: IDBValidKey) => {
            queueMicrotask(() => {
              this.records.set(key, structuredClone(value));
              transaction.oncomplete?.({} as Event);
            });
            return {} as IDBRequest;
          },
          get: (key: IDBValidKey) => {
            const getRequest = {} as IDBRequest;
            queueMicrotask(() => {
              Object.defineProperty(getRequest, 'result', {
                configurable: true,
                value: structuredClone(this.records.get(key)),
              });
              getRequest.onsuccess?.({} as Event);
            });
            return getRequest;
          },
        };
        Object.defineProperty(transaction, 'objectStore', { value: () => store });
        return transaction;
      },
      close: () => undefined,
    } as unknown as IDBDatabase;

    queueMicrotask(() => {
      Object.defineProperty(request, 'result', { configurable: true, value: database });
      request.onupgradeneeded?.({} as IDBVersionChangeEvent);
      request.onsuccess?.({} as Event);
    });
    return request;
  }
}

describe('IndexedDB save', () => {
  it('빈 슬롯은 null을 반환한다', async () => {
    const factory = new MemoryIndexedDB() as unknown as IDBFactory;
    await expect(loadGame(factory)).resolves.toBeNull();
  });

  it('GameState 전체를 저장하고 새로고침 시 복원할 수 있다', async () => {
    const factory = new MemoryIndexedDB() as unknown as IDBFactory;
    const state = createInitialState(77);
    state.self.memory = 1;
    state.world.calendar.day = 2;
    state.world.flags.patched_d5 = 1;

    await saveGame(state, factory);
    const restored = await loadGame(factory);

    expect(restored).toEqual(state);
    expect(restored).not.toBe(state);
  });

  it('IndexedDB가 없는 환경은 명확한 오류를 낸다', async () => {
    await expect(loadGame(undefined)).rejects.toThrow(/IndexedDB/);
  });

  it('구 스키마 세이브(래핑 없는 GameState)는 버리고 null을 반환한다', async () => {
    const factory = new MemoryIndexedDB() as unknown as IDBFactory;
    const legacy = createInitialState(1) as unknown as Record<string, unknown>;
    // v1 세이브 흉내: 래핑 없이 저장돼 있었고 calendar 대신 day를 썼다
    delete (legacy.world as Record<string, unknown>).calendar;
    (legacy.world as Record<string, unknown>).day = 3;
    await new Promise<void>((resolve) => {
      const req = factory.open('shattered-realm', 1);
      req.onsuccess = () => {
        const tx = req.result.transaction('game-state', 'readwrite');
        tx.objectStore('game-state').put(legacy, 'phase0');
        tx.oncomplete = () => resolve();
        queueMicrotask(() => tx.oncomplete?.({} as Event));
      };
      req.onupgradeneeded = () => req.result.createObjectStore('game-state');
    });
    await expect(loadGame(factory)).resolves.toBeNull();
  });

  it('구 스키마 번호의 봉투 세이브도 버린다 — 스키마 4의 문자열 제목 사고 재발 방지', async () => {
    // WorkOrder.title이 string → TextVariant[]로 바뀌었을 때 스키마를 안 올려서,
    // pendingOrders에 문자열 제목이 남은 세이브가 복원돼 selectVariant에서 터졌다.
    const factory = new MemoryIndexedDB() as unknown as IDBFactory;
    const stale = createInitialState(1) as unknown as { world: { pendingOrders: unknown[] } };
    stale.world.pendingOrders = [{ templateId: 'WO-T1', title: '문자열 제목' }];
    await new Promise<void>((resolve) => {
      const req = factory.open('still-here-tomorrow', 1);
      req.onsuccess = () => {
        const tx = req.result.transaction('game-state', 'readwrite');
        tx.objectStore('game-state').put({ schema: 4, state: stale }, 'phase0');
        tx.oncomplete = () => resolve();
        queueMicrotask(() => tx.oncomplete?.({} as Event));
      };
      req.onupgradeneeded = () => req.result.createObjectStore('game-state');
    });
    await expect(loadGame(factory)).resolves.toBeNull();
  });
});
