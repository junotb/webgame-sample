import { describe, expect, it } from "vitest";
import { Store } from "../core/store";

describe("Store", () => {
  it("초기화 전 접근을 막고 replace 이후 상태를 제공한다", () => {
    const store = new Store<{ gold: number }>();
    expect(() => store.get()).toThrow("초기화");
    store.replace({ gold: 10 });
    expect(store.get().gold).toBe(10);
  });

  it("transaction을 적용하고 구독자에게 한 번 알린다", () => {
    const store = new Store<{ gold: number }>();
    store.replace({ gold: 10 });
    const seen: number[] = [];
    const unsubscribe = store.subscribe((state) => seen.push(state.gold));
    const result = store.transaction((state) => { state.gold -= 3; return state.gold; });
    unsubscribe();
    store.transaction((state) => { state.gold += 1; });
    expect(result).toBe(7);
    expect(seen).toEqual([7]);
    expect(store.get().gold).toBe(8);
  });
});
