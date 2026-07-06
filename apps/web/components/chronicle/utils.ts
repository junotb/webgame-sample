import { CLASSES, MONSTER_TIERS } from "./data";
import type { ClassKey, Enemy, Player } from "./types";

export const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
export const pick = <T,>(arr: T[]): T => arr[rand(0, arr.length - 1)];
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const expNeed = (level: number) => 20 + level * 18;

export function pickTier(level: number) {
  const base = Math.floor((level - 1) / 2) + 1;
  const variance = rand(-1, 1);
  return clamp(base + variance, 1, MONSTER_TIERS.length) - 1;
}

export function spawnEnemy(level: number): Enemy {
  const tierIdx = pickTier(level);
  const tier = MONSTER_TIERS[tierIdx];
  const strongChance = clamp(0.2 + level * 0.02, 0.2, 0.55);
  const isStrong = Math.random() < strongChance;
  const template = isStrong ? tier.strong : tier.weak;
  const scale = 1 + (level - 1) * 0.045;
  return {
    name: template.name,
    isStrong,
    tier: tierIdx,
    hp: Math.round(template.hp * scale),
    maxHp: Math.round(template.hp * scale),
    atk: Math.round(template.atk * scale),
    def: Math.round(template.def * scale),
    exp: template.exp,
    gold: template.gold,
  };
}

export function makePlayer(name: string, clsKey: ClassKey): Player {
  const cls = CLASSES[clsKey];
  return {
    name,
    cls: clsKey,
    level: 1,
    exp: 0,
    expNeed: expNeed(1),
    hp: cls.base.hp,
    maxHp: cls.base.hp,
    mp: cls.base.mp,
    maxMp: cls.base.mp,
    atk: cls.base.atk,
    def: cls.base.def,
    mag: cls.base.mag,
    gold: 20,
    potions: 2,
    guarding: false,
  };
}
