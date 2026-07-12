/* =====================================================================
 * state.ts — 게임 상태 (순수 로직, PIXI 비의존 / 백엔드 연동 지점)
 * ===================================================================== */
import {
  ABILITIES, AbilityDef, CLASSES, ClassId, FIELD_SKILLS, FieldSkillDef,
  LD, PARTY_SEEDS, RANK_MULT, Rank, SkillId,
} from "./data";

export interface Member {
  id: string; name: string;
  color: number; accent: number;
  classId: ClassId; ld: LD | null;
  level: number; exp: number;
  hp: number; mp: number; maxHp: number; maxMp: number;
  baseAtk: number; baseMag: number; baseDef: number; baseSpd: number;
  weapon: { name: string; atk: number };
  armor: { name: string; def: number };
}

export interface ExploreState {
  x: number; lane: number;
  chestOpened: { c1: boolean; hidden: boolean };
  revealed: { hidden: boolean };
  defeated: { orc: boolean; lord: boolean; ancient: boolean };
  veil: number;
}

export interface GameState {
  party: Member[];
  items: { potion: number; mpotion: number };
  gold: number;
  blessedNext: boolean;
  explore: ExploreState;
  flags: { intro: boolean; ending: boolean };
  _fled?: boolean;
}

export let G: GameState = null as unknown as GameState;

export function newGame(): void {
  G = {
    party: PARTY_SEEDS.map((s) => ({
      id: s.id, name: s.name, color: s.color, accent: s.accent,
      classId: "novice", ld: null,
      level: 1, exp: 0,
      hp: 70, mp: 24, maxHp: 70, maxMp: 24,
      baseAtk: s.atk, baseMag: s.mag, baseDef: s.def, baseSpd: s.spd,
      weapon: { name: "낡은 검", atk: 0 },
      armor: { name: "여행자 옷", def: 0 },
    })),
    items: { potion: 3, mpotion: 2 },
    gold: 120,
    blessedNext: false,
    explore: {
      x: 180, lane: 1,
      chestOpened: { c1: false, hidden: false },
      revealed: { hidden: false },
      defeated: { orc: false, lord: false, ancient: false },
      veil: 0,
    },
    flags: { intro: false, ending: false },
  };
}

/* ---- 숙련 병합: 클래스 체인을 따라 max 병합, LD는 멤버 선택 반영 ---- */
export function memberRanks(m: Member): Partial<Record<SkillId, Rank>> {
  const r: Partial<Record<SkillId, Rank>> = {};
  const chain: ClassId[] = [];
  let cur: ClassId | undefined = m.classId;
  while (cur) { chain.unshift(cur); cur = CLASSES[cur].from; }
  for (const cid of chain) {
    const c = CLASSES[cid];
    if (c.ranks) for (const k in c.ranks) {
      const key = k as SkillId;
      r[key] = Math.max(r[key] ?? 0, c.ranks[key] ?? 0) as Rank;
    }
    const apply = (list: (SkillId | "LD")[] | undefined, rank: Rank) => {
      if (!list) return;
      for (const s of list) {
        const key = s === "LD" ? m.ld : s;
        if (key) r[key] = Math.max(r[key] ?? 0, rank) as Rank;
      }
    };
    apply(c.masters, 3);
    apply(c.experts, 2);
  }
  return r;
}

export interface Stats {
  atk: number; mag: number; def: number; spd: number;
  evade: number; guardCut: number;
}
export function memberStats(m: Member): Stats {
  const r = memberRanks(m);
  return {
    atk: m.baseAtk + m.weapon.atk + Math.round(m.baseAtk * 0.08 * (r.mastery ?? 0)),
    mag: m.baseMag,
    def: m.baseDef + m.armor.def + (r.armor ?? 0) * 2 + (r.shield ?? 0) * 2,
    spd: m.baseSpd,
    evade: 0.05 * (r.dodge ?? 0),
    guardCut: 0.06 * (r.shield ?? 0),
  };
}

export function expNeed(lv: number): number { return lv * lv * 22; }

/** 전 멤버 경험치 획득. 레벨업한 멤버 이름 배열 반환 */
export function gainExpParty(n: number): string[] {
  const ups: string[] = [];
  for (const m of G.party) {
    m.exp += n;
    let up = false;
    while (m.exp >= expNeed(m.level)) {
      m.exp -= expNeed(m.level); m.level++;
      m.maxHp += 13; m.maxMp += 5;
      m.baseAtk += 2; m.baseMag += 2; m.baseDef += 1; m.baseSpd += 1;
      m.hp = m.maxHp; m.mp = m.maxMp;
      up = true;
    }
    if (up) ups.push(`${m.name} Lv.${m.level}`);
  }
  return ups;
}

export type BattleAbility = AbilityDef & { rank: Rank };
export function memberAbilities(m: Member): BattleAbility[] {
  const r = memberRanks(m);
  return ABILITIES
    .filter((a) => (r[a.skill] ?? 0) >= a.min)
    .map((a) => ({ ...a, rank: (r[a.skill] ?? 0) as Rank }));
}

export function rankMult(rank: Rank): number { return RANK_MULT[rank]; }

/** 필드 스킬: 시전 가능한 멤버(랭크 충족)를 함께 반환 */
export interface FieldSkillEntry { def: FieldSkillDef; caster: Member; }
export function partyFieldSkills(): FieldSkillEntry[] {
  const out: FieldSkillEntry[] = [];
  for (const f of FIELD_SKILLS) {
    const casters = G.party.filter((m) => (memberRanks(m)[f.skill] ?? 0) >= f.min);
    if (!casters.length) continue;
    // MP가 가장 넉넉한 멤버가 시전
    casters.sort((a, b) => b.mp - a.mp);
    out.push({ def: f, caster: casters[0] });
  }
  return out;
}

/** 파티 통합 보조 랭크 (식별/함정해체 등 필드 판정용) */
export function partyRank(skill: SkillId): Rank {
  let best: Rank = 0;
  for (const m of G.party) best = Math.max(best, memberRanks(m)[skill] ?? 0) as Rank;
  return best;
}

export function canClassChange(m: Member): "t1" | "t2" | null {
  const tier = CLASSES[m.classId].tier;
  if (tier === 0 && m.level >= 3) return "t1";
  if (tier === 1 && m.level >= 6) return "t2";
  return null;
}
export function classOptions(m: Member): ClassId[] {
  const tier = CLASSES[m.classId].tier;
  if (tier === 0) return ["warrior", "battlemage", "wizard", "acolyte"];
  if (tier === 1) {
    return (Object.keys(CLASSES) as ClassId[])
      .filter((k) => CLASSES[k].tier === 2 && CLASSES[k].from === m.classId);
  }
  return [];
}
export function doClassChange(m: Member, clsId: ClassId, ld: LD | null = null): void {
  m.classId = clsId;
  if (ld) m.ld = ld;
  m.maxHp += 20; m.maxMp += 10;
  m.hp = m.maxHp; m.mp = m.maxMp;
}
