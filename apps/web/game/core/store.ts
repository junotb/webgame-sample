export type StoreListener<T> = (state: Readonly<T>) => void;

/** 프레임워크에 의존하지 않는 최소 상태 저장소. */
export class Store<T> {
  private current: T | null = null;
  private listeners = new Set<StoreListener<T>>();

  get(): T {
    if (!this.current) throw new Error("게임 상태가 아직 초기화되지 않았다");
    return this.current;
  }

  replace(next: T): void {
    this.current = next;
    this.emit();
  }

  transaction<R>(change: (state: T) => R): R {
    const result = change(this.get());
    this.emit();
    return result;
  }

  subscribe(listener: StoreListener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const state = this.get();
    this.listeners.forEach((listener) => listener(state));
  }
}
