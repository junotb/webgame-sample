export type ClassKey = "warrior" | "archer" | "cleric" | "mage";

export interface Stats {
  hp: number;
  mp: number;
  atk: number;
  def: number;
  mag: number;
}

export interface Skill {
  id: string;
  name: string;
  mp: number;
  type: "attack" | "heal";
  calc: (p: Player) => number;
  ignoreDef?: number;
  desc: string;
}

export interface ClassDef {
  key: ClassKey;
  name: string;
  initial: string;
  tagline: string;
  desc: string;
  base: Stats;
  growth: Stats;
  skills: Skill[];
}

export interface MonsterTemplate {
  name: string;
  hp: number;
  atk: number;
  def: number;
  exp: number;
  gold: number;
}

export interface MonsterTier {
  weak: MonsterTemplate;
  strong: MonsterTemplate;
}

export interface Enemy {
  name: string;
  isStrong: boolean;
  tier: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  exp: number;
  gold: number;
}

export interface Player {
  name: string;
  cls: ClassKey;
  level: number;
  exp: number;
  expNeed: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  mag: number;
  gold: number;
  potions: number;
  guarding: boolean;
}

export interface ShopItem {
  id: "potion" | "weapon" | "armor";
  name: string;
  cost: number;
  desc: string;
}

export type LogKind = "sys" | "combat" | "loot" | "danger" | "npc";

export interface LogEntry {
  id: number;
  text: string;
  kind: LogKind;
}

export type View = "create" | "game";
export type Mode = "explore" | "combat" | "shop" | "smith" | "gameover";
