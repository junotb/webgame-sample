import { visualRandom } from "../core/random";
import type { TownContentRequirement, TownKeeperDef } from "./types";

export const keeperSays = (keeper: TownKeeperDef, text: string): string =>
  `${keeper.name}  “${text}”`;

/** 시설에 들어올 때 담당자의 인사 3종 중 하나를 고른다. */
export function pickKeeperGreeting(
  keeper: TownKeeperDef,
  rng: () => number = visualRandom,
): string {
  const index = Math.min(keeper.greetings.length - 1, Math.floor(rng() * keeper.greetings.length));
  return keeper.greetings[index];
}

export interface TownContentContext {
  questCompleted(id: string): boolean;
  flagEnabled(id: "intro" | "ending" | "letter"): boolean;
  partyLevel: number;
}

/** NPC와 시설 콘텐츠가 같은 조건 규칙을 공유한다. */
export function townContentUnlocked(
  requirement: TownContentRequirement | undefined,
  context: TownContentContext,
): boolean {
  if (!requirement) return true;
  if (requirement.minLevel && context.partyLevel < requirement.minLevel) return false;
  if (requirement.quests?.some((id) => !context.questCompleted(id))) return false;
  if (requirement.flags?.some((id) => !context.flagEnabled(id))) return false;
  return true;
}
