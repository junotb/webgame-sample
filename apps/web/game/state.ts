/* =====================================================================
 * state.ts — 게임 상태 (순수 로직, PIXI 비의존 / 백엔드 연동 지점)
 * ===================================================================== */
import {
  ABILITIES, AbilityDef, AttrId, ATTR_IDS, Attrs, CLASSES, ClassId, ENEMY_DEFS,
  FIELD_SKILLS, FieldSkillDef, LD, PARTY_SLOTS, RANK_MULT, Rank, SkillId,
} from "./defs";
import { abilityMod } from "./core/dice";
import { NORMAL_SPAWNS, START, SYMBOL_SPAWNS, dungeonMap } from "./dungeon";

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
  name: string;
  portrait: number;
  classId: ClassId;
  bonusSkills: SkillId[];
  attrs: Attrs;
}

/** 그리드 위의 적 개체 (일반 몹은 재진입 시 리스폰, 심볼은 defeated로 영구 처치) */
export interface GridEnemy {
  id: string; defId: string;
  x: number; y: number;
  hp: number; alive: boolean;
  symbol?: "orc" | "lord" | "ancient";
}

export interface ExploreState {
  x: number; y: number;
  /** 0=북 1=동 2=남 3=서 */
  facing: 0 | 1 | 2 | 3;
  /** 맵 w*h flat 배열 — 미니맵 안개 걷힘 */
  explored: boolean[];
  enemies: GridEnemy[];
  chestOpened: { c1: boolean; hidden: boolean };
  revealed: { hidden: boolean };
  defeated: { orc: boolean; lord: boolean; ancient: boolean };
  /** 보스 조우 대화를 본 적 있는가 (재조우 시 대화 생략) */
  lordIntroSeen: boolean;
  /** 어둠의 장막 남은 턴 수 (어그로 반경 축소) */
  veil: number;
}

/** 퀘스트 진행 — 정의(QUESTS)와 분리, 수주한 것만 기록 */
export interface QuestProgress {
  status: "active" | "done" | "rewarded";
  /** objectiveId → 누적 카운트 */
  counts: Record<string, number>;
  /** 반복 퀘스트 완료(보고) 횟수 */
  times: number;
}

export interface GameState {
  party: Member[];
  items: { potion: number; mpotion: number };
  gold: number;
  blessedNext: boolean;
  explore: ExploreState;
  flags: { intro: boolean; ending: boolean };
  quests: Record<string, QuestProgress>;
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
        id: s.id, name: cfg.name.trim() || s.name, color: cls.color, accent: cls.accent,
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
      x: START.x, y: START.y, facing: START.facing,
      explored: new Array(dungeonMap.w * dungeonMap.h).fill(false),
      enemies: spawnEnemies({ orc: false, lord: false, ancient: false }),
      chestOpened: { c1: false, hidden: false },
      revealed: { hidden: false },
      defeated: { orc: false, lord: false, ancient: false },
      lordIntroSeen: false,
      veil: 0,
    },
    flags: { intro: false, ending: false },
    quests: {},
  };
}

/** 파티 최고 레벨 — 퀘스트 수주 조건 판정용 */
export function partyLevel(): number {
  return G.party.reduce((s, m) => Math.max(s, m.level), 1);
}

/** 스폰 정의 → 그리드 적 목록. 심볼은 defeated 플래그를 반영해 제외.
 *  (ancient는 lord 처치 후에만 등장 — explore 씬 진입 시 respawnEnemies로 갱신) */
export function spawnEnemies(defeated: ExploreState["defeated"]): GridEnemy[] {
  const out: GridEnemy[] = [];
  for (const s of NORMAL_SPAWNS) {
    out.push({ id: s.id, defId: s.defId, x: s.x, y: s.y, hp: ENEMY_DEFS[s.defId].hp, alive: true });
  }
  for (const s of SYMBOL_SPAWNS) {
    if (s.symbol && defeated[s.symbol]) continue;
    if (s.symbol === "ancient" && !defeated.lord) continue;
    out.push({
      id: s.id, defId: s.defId, x: s.x, y: s.y,
      hp: ENEMY_DEFS[s.defId].hp, alive: true, symbol: s.symbol,
    });
  }
  return out;
}

/** 마을 → 던전 재진입 시 호출: 일반 몹 전부 리스폰 + 심볼 상태 재계산 */
export function respawnEnemies(): void {
  G.explore.enemies = spawnEnemies(G.explore.defeated);
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
  /** 회피도 (Armor Class 유사) — 상대 명중 굴림이 넘어야 할 값 */
  evAC: number;
  crit: number; guardCut: number;
  /** 능력치 수정치 (±5 캡) — 명중·내성 굴림용 */
  mods: Record<AttrId, number>;
}
export function memberStats(m: Member): Stats {
  const r = memberRanks(m);
  const a = m.attrs;
  const mods = {} as Record<AttrId, number>;
  for (const k of ATTR_IDS) mods[k] = abilityMod(a[k]);
  /* 맨손 — 무기를 들고 있지 않을 때(무기 공격력 0) 랭크당 공격력 +3 */
  const unarmedBonus = m.weapon.atk === 0 ? (r.unarmed ?? 0) * 3 : 0;
  return {
    atk: a.might + m.weapon.atk + unarmedBonus,
    magInt: a.int,
    magWit: a.wit,
    def: Math.floor(a.vital / 2) + m.armor.def + (r.armor ?? 0) * 2 + (r.shield ?? 0) * 2,
    spd: a.agi,
    evAC: 10 + mods.agi + (r.dodge ?? 0) * 2,
    crit: a.fortune * 0.01,
    guardCut: 0.06 * (r.shield ?? 0),
    mods,
  };
}

/** 스킬 계열에 따른 마법 공격 기반치 — 영혼은 지혜, 나머지는 지능 */
export function magicBase(s: Stats, skill: SkillId): number {
  return skill === "spirit" ? s.magWit : s.magInt;
}

/** 모든 아군 공격에 공통으로 붙는 기본 명중 보정 (저레벨 숙련 보너스) */
export const PROF_BASE = 3;
/** 아군 명중 보정 = 기본 숙련 + 민첩 수정치 + 기술 숙련(랭크) */
export function allyAccuracy(s: Stats, rank: number): number {
  return PROF_BASE + s.mods.agi + rank;
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
