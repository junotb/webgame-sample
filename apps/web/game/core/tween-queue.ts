export interface TweenJob {
  obj: object;
  from: Record<string, number>;
  to: Record<string, number>;
  dur: number;
  ease: (t: number) => number;
  onDone?: () => void;
  global: boolean;
}

interface ActiveTween extends TweenJob {
  t: number;
}

/**
 * 프레임 중 완료 콜백이 씬 전환(= 로컬 트윈 일괄 취소)을 일으켜도
 * 현재 순회가 깨지지 않는 트윈 큐.
 */
export class TweenQueue {
  private tweens: ActiveTween[] = [];

  add(job: TweenJob): void {
    this.tweens.push({ ...job, t: 0 });
  }

  cancelSceneTweens(): void {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      if (!this.tweens[i].global) this.tweens.splice(i, 1);
    }
  }

  clear(): void {
    this.tweens.length = 0;
  }

  tick(dt: number): void {
    // 콜백이 큐를 변경할 수 있으므로 이번 프레임의 작업 목록을 고정한다.
    // reverse는 기존의 역순 실행 의미를 보존한다.
    const frameTweens = [...this.tweens].reverse();
    for (const tw of frameTweens) {
      if (!this.tweens.includes(tw)) continue;
      if ((tw.obj as { destroyed?: boolean }).destroyed) {
        this.remove(tw);
        continue;
      }

      tw.t += dt;
      const p = Math.min(1, tw.t / tw.dur);
      const e = tw.ease(p);
      const values = tw.obj as unknown as Record<string, number>;
      for (const k in tw.to) values[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;

      if (p >= 1) {
        this.remove(tw);
        tw.onDone?.();
      }
    }
  }

  private remove(tween: ActiveTween): void {
    const index = this.tweens.indexOf(tween);
    if (index >= 0) this.tweens.splice(index, 1);
  }
}
