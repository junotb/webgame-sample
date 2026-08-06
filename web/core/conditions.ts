/**
 * 조건 평가 + 변형 선택.
 *
 * reducer에 있던 것을 여기로 뺐다: 생성기가 서사 카드의 `requirements`를 평가해야 하는데
 * (v3 §4 정정 — 도시의 비밀은 일과 중의 카드에서 알게 된다) reducer가 생성기를 부르므로
 * 순환 참조가 된다. 둘 다 이 모듈에 의존하면 방향이 한쪽으로만 흐른다.
 */
import type { Condition, GameState, TextVariant } from './schema';

/** 조건·변형 평가용 상태 경로 읽기. 없는 flag 등 미정의 숫자는 0. */
export function getValueAtPath(state: GameState, path: string): number {
  let node: unknown = state;
  for (const seg of path.split('.')) {
    if (typeof node !== 'object' || node === null) return 0;
    node = (node as Record<string, unknown>)[seg];
  }
  return typeof node === 'number' ? node : 0;
}

export function evalConditions(state: GameState, conditions: Condition[]): boolean {
  return conditions.every((c) => {
    const v = getValueAtPath(state, c.path);
    return (c.gte === undefined || v >= c.gte) && (c.lte === undefined || v <= c.lte);
  });
}

/**
 * 첫 매치 우선, 조건 없는 변형이 기본값 (스키마 TextVariant 계약).
 *
 * 카드 제목도 이것을 쓴다 — 단서(v3 §4)가 지금의 기억·기술로 **매번 다시** 판정되므로,
 * 어제 본 제목과 오늘 본 제목이 다를 수 있다. 렌더된 문장은 저장하지 않는다 (v3 §7).
 */
export function selectVariant(state: GameState, variants: TextVariant[]): string {
  const match = variants.find((v) => !v.if || evalConditions(state, v.if));
  return match?.text ?? '';
}
