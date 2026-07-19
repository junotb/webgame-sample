import type { GameState } from "../state";
import type { TownId } from "./types";

export type TownTimePhase = "day" | "evening" | "night";

export function ensureTownWorld(state: GameState): NonNullable<GameState["townWorld"]> {
  return state.townWorld ??= { day: 1, minuteOfDay: 8 * 60, visits: {} };
}

export function advanceTownTime(state: GameState, minutes: number): void {
  const world = ensureTownWorld(state);
  const total = world.minuteOfDay + minutes;
  world.day += Math.floor(total / 1440);
  world.minuteOfDay = ((total % 1440) + 1440) % 1440;
}

export function enterTown(state: GameState, town: TownId): void {
  const world = ensureTownWorld(state);
  world.visits[town] = (world.visits[town] ?? 0) + 1;
  advanceTownTime(state, 30);
}

export function townTime(state: GameState): { day: number; minuteOfDay: number; phase: TownTimePhase; label: string } {
  const world = ensureTownWorld(state);
  const hour = Math.floor(world.minuteOfDay / 60);
  const minute = world.minuteOfDay % 60;
  const phase: TownTimePhase = hour >= 6 && hour < 17 ? "day"
    : hour >= 17 && hour < 20 ? "evening" : "night";
  return {
    day: world.day,
    minuteOfDay: world.minuteOfDay,
    phase,
    label: `${world.day}일 ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}
