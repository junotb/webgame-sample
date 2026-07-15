/* =====================================================================
 * state.ts — 게임 상태 (순수 로직, PIXI 비의존 / 백엔드 연동 지점)
 * ===================================================================== */
import {
  ABILITIES, AbilityDef, ATTR_BASE, Attrs, CLASSES, ClassId, FIELD_SKILLS,
  FieldSkillDef, LD, PARTY_SLOTS, RANK_MULT, Rank, SkillId,
} from "./data";

export interface Member {
  id: string; name: string;
  color: number; accent: number;
  portrait: number;
  classId: ClassId; ld: LD | null;
  attrs: Attrs;
  /** 생성 시 추가로 익힌 기술 (랭크 1) */
  bonusSkills: SkillId[];
  level: number; exp: number;
  hp: number; mp: number; maxHp: number; maxMp: number;
  weapon: { name: string; atk: number };
  armor: { name: string; def: number };
}

/** 캐릭터 생성 화면 → newGame 으로 전달되는 멤버 구성 */
export interface CreationConfig {
  slotId: string;
  portrait: number;
  classId: ClassId;
  bonusSkills: SkillId[];
  attrs: Attrs;
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

export function maxHpOf(attrs: Attrs): number { return 40 + attrs.vital * 3; }
export function maxMpOf(attrs: Attrs): number { return 4 + attrs.int + attrs.wit; }

/** 캐릭터 생성 화면에서 완성된 구성으로만 시작한다 (슬롯당 1개 필수) */
export function newGame(configs: CreationConfig[]): void {
  G = {
    party: PARTY_SLOTS.map((s) => {
      const cfg = configs.find((c) => c.slotId === s.id);
      if (!cfg) throw new Error(`newGame: missing CreationConfig for slot "${s.id}"`);
      const attrs = { ...cfg.attrs };
      const hp = maxHpOf(attrs), mp = maxMpOf(attrs);
      const cls = CLASSES[cfg.classId];
      return {
        id: s.id, name: s.name, color: cls.color, accent: cls.accent,
        portrait: cfg.portrait,
        classId: cfg.classId, ld: null,
        attrs, bonusSkills: [...cfg.bonusSkills],
        level: 1, exp: 0,
        hp, mp, maxHp: hp, maxMp: mp,
        weapon: { name: "낡은 검", atk: 0 },
        armor: { name: "여행자 옷", def: 0 },
      };
    }),
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

/* ---- 숙련 병합: 클래스 체인 max 병합 + 생성 시 추가 기술, LD는 멤버 선택 반영 ---- */
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
  for (const s of m.bonusSkills) r[s] = Math.max(r[s] ?? 0, 1) as Rank;
  return r;
}

export interface Stats {
  atk: number;
  /** 법사형(원소·빛·어둠) 마법 공격 기반 */
  magInt: number;
  /** 사제형(영혼) 마법 공격 기반 */
  magWit: number;
  def: number; spd: number;
  evade: number; crit: number; guardCut: number;
}
export function memberStats(m: Member): Stats {
  const r = memberRanks(m);
  const a = m.attrs;
  return {
    atk: a.might + m.weapon.atk,
    magInt: a.int,
    magWit: a.wit,
    def: Math.floor(a.vital / 2) + m.armor.def + (r.armor ?? 0) * 2 + (r.shield ?? 0) * 2,
    spd: a.agi,
    evade: 0.05 * (r.dodge ?? 0) + Math.max(0, a.agi - ATTR_BASE) * 0.01,
    crit: a.fortune * 0.01,
    guardCut: 0.06 * (r.shield ?? 0),
  };
}

/** 스킬 계열에 따른 마법 공격 기반치 — 영혼은 지혜, 나머지는 지능 */
export function magicBase(s: Stats, skill: SkillId): number {
  return skill === "spirit" ? s.magWit : s.magInt;
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
      m.attrs.might += 2; m.attrs.int += 2; m.attrs.wit += 2;
      m.attrs.vital += 2; m.attrs.agi += 1; m.attrs.fortune += 1;
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

/** 파티 통합 보조 랭크 (식별/함정 등 필드 판정용) */
export function partyRank(skill: SkillId): Rank {
  let best: Rank = 0;
  for (const m of G.party) best = Math.max(best, memberRanks(m)[skill] ?? 0) as Rank;
  return best;
}

/** 파티 평균 운 (희귀 아이템·랜덤 이벤트 판정용) */
export function partyFortune(): number {
  return G.party.reduce((s, m) => s + m.attrs.fortune, 0) / G.party.length;
}

export function canClassChange(m: Member): "t1" | "t2" | null {
  const tier = CLASSES[m.classId].tier;
  if (tier === 0 && m.level >= 3) return "t1";
  if (tier === 1 && m.level >= 6) return "t2";
  return null;
}
export function classOptions(m: Member): ClassId[] {
  const tier = CLASSES[m.classId].tier;
  if (tier === 0 || tier === 1) {
    return (Object.keys(CLASSES) as ClassId[])
      .filter((k) => CLASSES[k].tier === tier + 1 && CLASSES[k].from === m.classId);
  }
  return [];
}
export function doClassChange(m: Member, clsId: ClassId, ld: LD | null = null): void {
  m.classId = clsId;
  if (ld) m.ld = ld;
  /* 외형도 새 직업의 색으로 */
  m.color = CLASSES[clsId].color;
  m.accent = CLASSES[clsId].accent;
  m.maxHp += 20; m.maxMp += 10;
  m.hp = m.maxHp; m.mp = m.maxMp;
}
