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
    state.world.flags.saw_rhythm = 1;

    await saveGame(state, factory);
    const restored = await loadGame(factory);

    expect(restored).toEqual(state);
    expect(restored).not.toBe(state);
  });

  it('IndexedDB가 없는 환경은 명확한 오류를 낸다', async () => {
    await expect(loadGame(undefined)).rejects.toThrow(/IndexedDB/);
  });
});
