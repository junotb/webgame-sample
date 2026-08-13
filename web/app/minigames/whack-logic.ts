/**
 * 선별 두더지 잡기 로직 (불순물 소각) — 튀어나오는 것 중 태울 것만 태운다.
 * 오인 소각의 대가는 감점이 아니라 산문 한 줄 (성적은 소각률로만 정한다).
 * 난이도(정체)는 템포와 구분의 모호함을 올린다 — 후반엔 거의 같아 보인다.
 */
import { mulberry32 } from "../../core/checks";
import type { MinigameResult } from "../../core/schema";

export const WHACK_HOLES = 9;
export const WHACK_DURATION_MS = 20000;

export interface WhackSpawn {
  at: number; // 등장 시각 (ms)
  life: number; // 노출 시간 (ms)
  hole: number; // 0~8
  kind: "residue" | "keeper";
}

export interface WhackPlan {
  duration: number;
  spawns: WhackSpawn[];
  /** 0(명백히 다름) ~ 1(거의 같음) — 렌더러가 시각 차를 좁히는 데 쓴다 */
  ambiguity: number;
}

export function generateWhackPlan(seed: number, difficulty: number): WhackPlan {
  const rng = mulberry32(seed);
  const interval = Math.max(450, 800 - difficulty * 60);
  const life = Math.max(900, 1500 - difficulty * 80);
  const spawns: WhackSpawn[] = [];
  for (let at = 600; at < WHACK_DURATION_MS - life; at += interval) {
    spawns.push({
      at,
      life,
      hole: Math.floor(rng() * WHACK_HOLES),
      kind: rng() < 0.65 ? "residue" : "keeper",
    });
  }
  return {
    duration: WHACK_DURATION_MS,
    spawns,
    ambiguity: Math.min(1, difficulty / 8),
  };
}

/** 성적은 소각률로만 — 태울 것을 얼마나 태웠는가 */
export function gradeWhack(
  burnedResidue: number,
  totalResidue: number,
): MinigameResult {
  if (totalResidue === 0) return "complete";
  const ratio = burnedResidue / totalResidue;
  if (ratio >= 0.9) return "complete";
  if (ratio >= 0.5) return "partial";
  return "fail";
}
