export type RandomFn = () => number;

let gameplaySource: RandomFn = () => Math.random();
const visualSource: RandomFn = () => Math.random();

/** 전투·드랍 등 게임 결과에 영향을 주는 난수. */
export const gameplayRandom: RandomFn = () => gameplaySource();
/** 별·피해 숫자 위치처럼 결과에 영향을 주지 않는 난수. */
export const visualRandom: RandomFn = () => visualSource();

export function setGameplayRandom(source: RandomFn): () => void {
  const previous = gameplaySource;
  gameplaySource = source;
  return () => { gameplaySource = previous; };
}

/** Mulberry32 기반의 결정적 32비트 시드 난수원. */
export function seededRandom(seed: number): RandomFn {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
