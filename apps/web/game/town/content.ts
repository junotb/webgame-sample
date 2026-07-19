import type { TownContentRequirement } from "./types";

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
