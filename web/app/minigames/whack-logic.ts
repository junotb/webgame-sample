/**
 * 선별 두더지 잡기 로직 (불순물 소각) — 튀어나오는 것 중 태울 것만 태운다.
 * 성적은 점수 달성제: 불순물 +1 / 마력 오인 −1, 목표 도달 즉시 종료.
 * 오인 유무가 완수/부분을 가른다 (규칙: system-rules "소각 미니게임").
 * 난이도(정체)는 색 구분의 모호함만 올린다 — 템포·유지시간은 불변.
 */
import { mulberry32 } from "../../core/checks";
import type { MinigameResult } from "../../core/schema";

export const WHACK_HOLES = 9;
export const WHACK_DURATION_MS = 20000;
export const WHACK_LIFE_MS = 1000;
export const WHACK_MAX_CONCURRENT = 5;
export const WHACK_TARGET = 20;
/** 불순물 고정 몫 — 매 스폰 독립 확률이 아니라 전체의 비율. 공급 보장의 근거 */
export const WHACK_RESIDUE_SHARE = 0.7;

/** 관로 형태 — 시드로 고른다. 배치는 난이도 축이 아니다 (system-rules "소각 미니게임") */
export const WHACK_LAYOUTS = ["coil", "zigzag", "horseshoe"] as const;
export type WhackLayoutId = (typeof WHACK_LAYOUTS)[number];

/** 스폰 계획과 같은 시드에서 파생하되 난수열은 공유하지 않는다 — 계획 재현성 보존 */
export function pickWhackLayout(seed: number): WhackLayoutId {
  const rng = mulberry32((seed ^ 0x51ab_c9d3) >>> 0);
  return WHACK_LAYOUTS[Math.floor(rng() * WHACK_LAYOUTS.length)];
}

export interface WhackSpawn {
  at: number; // 등장 시각 (ms)
  life: number; // 노출 시간 (ms) — 전 스폰 동일
  hole: number; // 0~8
  kind: "residue" | "keeper";
  variant: 0 | 1; // 같은 종류 안의 그림 변형 — 판정과 무관
}

export interface WhackPlan {
  duration: number;
  spawns: WhackSpawn[];
  /** 0(명백히 다름) ~ 1(거의 같음) — 렌더러가 두 종류의 색을 좁히는 데 쓴다 */
  ambiguity: number;
}

export function generateWhackPlan(seed: number, difficulty: number): WhackPlan {
  const rng = mulberry32(seed);
  const spawns: WhackSpawn[] = [];
  let t = 600;
  while (t < WHACK_DURATION_MS - WHACK_LIFE_MS) {
    const active = spawns.filter((s) => s.at <= t && t < s.at + s.life);
    if (active.length >= WHACK_MAX_CONCURRENT) {
      // 동시 상한 — 가장 이른 소멸 직후로 미룬다
      t = Math.min(...active.map((s) => s.at + s.life)) + 20;
      continue;
    }
    // 노출 구간이 겹칠 포트는 피한다 — 한 포트에 한 개체
    const busy = new Set(
      spawns
        .filter((s) => t < s.at + s.life && s.at < t + WHACK_LIFE_MS)
        .map((s) => s.hole),
    );
    const free: number[] = [];
    for (let h = 0; h < WHACK_HOLES; h += 1) if (!busy.has(h)) free.push(h);
    if (free.length > 0) {
      spawns.push({
        at: t,
        life: WHACK_LIFE_MS,
        hole: free[Math.floor(rng() * free.length)],
        kind: "residue", // 자리 표시 — 아래에서 고정 몫으로 재배정
        variant: rng() < 0.5 ? 0 : 1,
      });
    }
    t += 240 + Math.floor(rng() * 490);
  }
  // 종류는 고정 몫(불순물 70%)을 시드 셔플로 배정 — 목표 20점의 공급 보장
  const kinds: WhackSpawn["kind"][] = spawns.map((_, i) =>
    i < Math.round(spawns.length * WHACK_RESIDUE_SHARE) ? "residue" : "keeper",
  );
  for (let i = kinds.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  spawns.forEach((s, i) => {
    s.kind = kinds[i];
  });
  return {
    duration: WHACK_DURATION_MS,
    spawns,
    ambiguity: Math.min(1, difficulty / 8),
  };
}

/** 점수 = 소각 − 오인. 목표 도달이 통과, 오인 유무가 완수/부분을 가른다 */
export function gradeWhack(
  burnedResidue: number,
  misburnedKeeper: number,
): MinigameResult {
  if (burnedResidue - misburnedKeeper < WHACK_TARGET) return "fail";
  return misburnedKeeper === 0 ? "complete" : "partial";
}
