/* =====================================================================
 * state.ts — 게임 상태 (순수 로직, PIXI 비의존 / 백엔드 연동 지점)
 * ===================================================================== */
import {
  ABILITIES, AbilityDef, AttrId, ATTR_IDS, Attrs, CLASSES, ClassId, DamageType, ENEMY_DEFS,
  EQUIP_SLOTS, EquipSlot, Equipped, FIELD_SKILLS, FieldSkillDef, FISTS, GearDef, LD, OwnedGear,
  PARTY_SLOTS, RANK_MULT, Rank, RARITY_META, ResistTable, SkillId, Tier, WeaponReach, WeaponView,
  SKILLS, rollDrop,
} from "./defs";
import { abilityMod } from "./core/dice";
import { Store } from "./core/store";
import { StatusInstance } from "./core/statuses";
import {
  BASEMENT_NORMAL_SPAWNS, BASEMENT_START, BASEMENT_SYMBOL_SPAWNS,
  NORMAL_SPAWNS, START, SYMBOL_SPAWNS, SpawnDef, basementMap, fortressMap,
} from "./goblin-fortress";
import { TEMPLE_NORMAL_SPAWNS, TEMPLE_START, TEMPLE_SYMBOL_SPAWNS, templeMap } from "./abandoned-temple";
import type { TownId } from "./town/types";

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
  /** 장비 슬롯 — 오른손/왼손 무기·투구·갑옷·신발·망토·목걸이·반지×2.
   *  빈 슬롯은 없는 것으로 취급(맨손·무장갑). 양손무기는 mainHand만 채우고 offHand는 비운다. */
  equip: Partial<Record<EquipSlot, Equipped>>;
  /** 진형 — true면 후열(근접 적에게 안 맞지만 근접 공격도 못 함) */
  back: boolean;
  /** 레벨업으로 얻은 미배분 능력치 포인트 */
  apUnspent: number;
  /** 레벨업으로 얻은 미배분 스킬 포인트 */
  spUnspent: number;
  /** 개별 훈련으로 올린 스킬 랭크 (클래스 부여분과 max 병합, 상한=전문가) */
  trained: Partial<Record<SkillId, Rank>>;
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
  symbol?: string;
  /** 전투 상태이상 (중독/수면/마비/공포 등) — 전투 이탈 시 비워진다 */
  statuses: StatusInstance[];
}

export interface ExploreState {
  x: number; y: number;
  /** 0=북 1=동 2=남 3=서 */
  facing: 0 | 1 | 2 | 3;
  /** 맵 w*h flat 배열 — 미니맵 안개 걷힘 */
  explored: boolean[];
  enemies: GridEnemy[];
  /** POI id → 열림 여부 */
  chestOpened: Record<string, boolean>;
  /** 숨김 POI id → 발견 여부 */
  revealed: Record<string, boolean>;
  /** 심볼 id → 영구 처치 여부 */
  defeated: Record<string, boolean>;
  /** 심볼 id → 보스 조우 대화를 본 적 있는가 (재조우 시 대화 생략) */
  introSeen: Record<string, boolean>;
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
  /** 반복 의뢰가 다시 게시되는 월드 날짜 */
  availableAtDay?: number;
}

export interface GameState {
  party: Member[];
  items: { potion: number; mpotion: number };
  /** 획득했지만 미장착인 장비 (드랍·교체품). 미확인 장비는 감정 전까지 여기 머문다 */
  bag: OwnedGear[];
  gold: number;
  blessedNext: boolean;
  /** 현재 머무는 마을 (townScene이 참조) */
  town: TownId;
  /** 마을 방문과 휴식으로 흐르는 월드 시계 (구버전 세이브는 최초 접근 시 생성) */
  townWorld?: { day: number; minuteOfDay: number; visits: Partial<Record<TownId, number>> };
  /** 던전별 탐험 상태 — explore: 고블린 요새 지상 / basement: 요새 지하 / temple: 버려진 사원 */
  explore: ExploreState;
  basement: ExploreState;
  temple: ExploreState;
  /** 필드 배치 전투(정예·퀘스트 몬스터) 처치 기록 — "필드id:데코id" → 처치한 월드 날짜.
   *  respawnDays가 지나면 다시 나타난다. */
  fieldFights: Record<string, number>;
  flags: {
    intro: boolean; ending: boolean; letter: boolean;
    bishopDefeated: boolean; goblinOrders: boolean;
    hostagesRescued: boolean; banditsDefeated: boolean;
    /** 크로스베일 마구간에서 길이 막힌 사정을 들었는가 */
    stableBriefed: boolean;
  };
  quests: Record<string, QuestProgress>;
  _fled?: boolean;
}

const stateStore = new Store<GameState>();

/** 기존 장면 호환용 live binding. 새 도메인 코드는 gameStore 경계를 사용한다. */
export let G: GameState = null as unknown as GameState;
export const gameStore = {
  get: (): GameState => stateStore.get(),
  transaction: <R>(change: (state: GameState) => R): R => stateStore.transaction(change),
  subscribe: (listener: (state: Readonly<GameState>) => void): (() => void) => stateStore.subscribe(listener),
};

/** 세이브 로드처럼 상태 전체를 교체하는 유일한 진입점. */
export function replaceGameState(next: GameState): void {
  G = next;
  stateStore.replace(next);
}

export function maxHpOf(attrs: Attrs): number { return 40 + attrs.vital * 3; }
export function maxMpOf(attrs: Attrs): number { return 4 + attrs.int + attrs.wit; }

/** 캐릭터 생성 화면에서 완성된 구성으로만 시작한다 (슬롯당 1개 필수) */
export function newGame(configs: CreationConfig[]): void {
  replaceGameState({
    party: PARTY_SLOTS.map((s, i) => {
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
        equip: {
          mainHand: { name: "낡은 검", atk: 0, wtype: "slash", reach: "melee" },
          body: { name: "여행자 옷", def: 0 },
        },
        /* 기본 진형: 앞 두 명 전열, 뒤 두 명 후열 */
        back: i >= 2,
        apUnspent: 0, spUnspent: 0, trained: {},
      };
    }),
    items: { potion: 3, mpotion: 2 },
    bag: [],
    gold: 120,
    blessedNext: false,
    town: "crossvale",
    townWorld: { day: 1, minuteOfDay: 8 * 60, visits: {} },
    explore: freshFortressState(),
    basement: freshBasementState(),
    temple: freshTempleState(),
    fieldFights: {},
    flags: {
      intro: false, ending: false, letter: false,
      bishopDefeated: false, goblinOrders: false,
      hostagesRescued: false, banditsDefeated: false, stableBriefed: false,
    },
    quests: {},
  });
}

/** 파티 최고 레벨 — 퀘스트 수주 조건 판정용 */
export function partyLevel(): number {
  return G.party.reduce((s, m) => Math.max(s, m.level), 1);
}

/** 스폰 정의 → 그리드 적 목록. 심볼은 defeated 플래그를 반영해 제외.
 *  (requires 심볼은 그 심볼 처치 후에만 등장 — 던전 씬 진입 시 respawnDungeonEnemies로 갱신) */
export function spawnEnemies(
  normals: readonly SpawnDef[], symbols: readonly SpawnDef[], defeated: ExploreState["defeated"],
): GridEnemy[] {
  const out: GridEnemy[] = [];
  for (const s of normals) {
    out.push({ id: s.id, defId: s.defId, x: s.x, y: s.y, hp: ENEMY_DEFS[s.defId].hp, alive: true, statuses: [] });
  }
  for (const s of symbols) {
    if (s.symbol && defeated[s.symbol]) continue;
    if (s.requires && !defeated[s.requires]) continue;
    out.push({
      id: s.id, defId: s.defId, x: s.x, y: s.y,
      hp: ENEMY_DEFS[s.defId].hp, alive: true, symbol: s.symbol, statuses: [],
    });
  }
  return out;
}

function freshDungeonState(
  map: { w: number; h: number }, start: { x: number; y: number; facing: 0 | 1 | 2 | 3 },
  normals: readonly SpawnDef[], symbols: readonly SpawnDef[],
): ExploreState {
  return {
    x: start.x, y: start.y, facing: start.facing,
    explored: new Array(map.w * map.h).fill(false),
    enemies: spawnEnemies(normals, symbols, {}),
    chestOpened: {}, revealed: {}, defeated: {}, introSeen: {},
    veil: 0,
  };
}

/** 새 게임·구버전 세이브 보강용 초기 던전 상태 */
export function freshFortressState(): ExploreState {
  return freshDungeonState(fortressMap, START, NORMAL_SPAWNS, SYMBOL_SPAWNS);
}
export function freshBasementState(): ExploreState {
  return freshDungeonState(basementMap, BASEMENT_START, BASEMENT_NORMAL_SPAWNS, BASEMENT_SYMBOL_SPAWNS);
}
export function freshTempleState(): ExploreState {
  return freshDungeonState(templeMap, TEMPLE_START, TEMPLE_NORMAL_SPAWNS, TEMPLE_SYMBOL_SPAWNS);
}

/** 마을 → 던전 재진입 시 호출: 일반 몹 전부 리스폰 + 심볼 상태 재계산 */
export function respawnDungeonEnemies(state: ExploreState, normals: readonly SpawnDef[], symbols: readonly SpawnDef[]): void {
  state.enemies = spawnEnemies(normals, symbols, state.defeated);
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
  /* 개별 훈련 랭크 병합 (클래스보다 높으면 반영) */
  for (const k in m.trained) {
    const key = k as SkillId;
    r[key] = Math.max(r[key] ?? 0, m.trained[key] ?? 0) as Rank;
  }
  return r;
}

/* ---- 장비 슬롯 조회·합산 ---- */
/** 오른손 무기의 정규화 뷰 — 비었으면 맨손(FISTS). 사거리·데미지 타입 판정용 */
export function equippedWeapon(m: Member): WeaponView {
  const w = m.equip.mainHand;
  if (!w) return FISTS;
  return {
    name: w.name,
    atk: w.atk ?? 0,
    wtype: w.wtype ?? "bludgeon",
    reach: w.reach ?? "melee",
  };
}
/** 무기 총 공격력 — 오른손 + 왼손(듀얼윌드) 무기 합산 */
export function weaponAtk(m: Member): number {
  return (m.equip.mainHand?.atk ?? 0) + (m.equip.offHand?.atk ?? 0);
}
/** 전 슬롯 방어도(AC) 합 — 방어구·방패·장신구 */
export function equipDefense(m: Member): number {
  let d = 0;
  for (const slot of EQUIP_SLOTS) d += m.equip[slot]?.def ?? 0;
  return d;
}
/** 전 슬롯 능력치 보너스 합 — 목걸이·반지·서클릿 등 */
export function equipAttrs(m: Member): Record<AttrId, number> {
  const out = {} as Record<AttrId, number>;
  for (const k of ATTR_IDS) out[k] = 0;
  for (const slot of EQUIP_SLOTS) {
    const a = m.equip[slot]?.attrs;
    if (!a) continue;
    for (const k of ATTR_IDS) out[k] += a[k] ?? 0;
  }
  return out;
}
/** 장비 보너스가 반영된 유효 능력치 (파생 스탯 계산의 기준) */
export function effectiveAttrs(m: Member): Attrs {
  const bonus = equipAttrs(m);
  const out = {} as Attrs;
  for (const k of ATTR_IDS) out[k] = m.attrs[k] + bonus[k];
  return out;
}

/** 장착 가능한 아이템(상점 GearDef 또는 소유 OwnedGear) 공통 형태 */
export type EquipSource = GearDef | OwnedGear;

/** 아이템을 장착 — 슬롯 배치·양손무기·반지 자동칸을 처리한다.
 *  반지("ring")는 빈 칸(ring1→ring2) 우선, 둘 다 차면 ring1 교체. */
export function equipGear(m: Member, g: EquipSource): EquipSlot {
  const slot: EquipSlot = g.slot === "ring"
    ? (!m.equip.ring1 ? "ring1" : !m.equip.ring2 ? "ring2" : "ring1")
    : (g.slot ?? (g.atk !== undefined ? "mainHand" : "body"));
  const e: Equipped = {
    name: g.name, atk: g.atk, wtype: g.wtype, reach: g.reach,
    twoHanded: g.twoHanded, def: g.def, res: g.res, attrs: g.attrs, price: g.price,
  };
  /* 양손무기를 오른손에 → 왼손 비움. 왼손을 채우려는데 오른손이 양손무기면 → 오른손 해제 */
  if (slot === "mainHand" && e.twoHanded) delete m.equip.offHand;
  if (slot === "offHand" && m.equip.mainHand?.twoHanded) delete m.equip.mainHand;
  m.equip[slot] = e;
  return slot;
}

/* ---- 인벤토리(가방) · 감정 · 판매 ---- */
let ownSeq = 0;
/** 장착 해제된 Equipped를 소유 장비(OwnedGear)로 되돌린다 — 슬롯 교체 시 회수용 */
export function equippedToOwned(e: Equipped, slot: EquipSlot): OwnedGear {
  return {
    uid: `o${ownSeq++}`, base: e.name, name: e.name,
    slot: slot === "ring1" || slot === "ring2" ? "ring" : slot,
    atk: e.atk, def: e.def, wtype: e.wtype, reach: e.reach, twoHanded: e.twoHanded,
    res: e.res, attrs: e.attrs,
    rarity: "common", identified: true, affixes: [], price: e.price ?? 0,
  };
}

/** 파티의 식별(감정) 최고 랭크 */
export function partyIdentifyRank(): Rank { return partyRank("identify"); }

/** 드랍 획득 → 가방에 넣는다. 파티 식별 랭크가 충분하면 즉시 감정된 채 들어온다. */
export function addDrop(o: OwnedGear): void {
  if (!o.identified && partyIdentifyRank() >= RARITY_META[o.rarity].idReq) o.identified = true;
  G.bag.push(o);
}

/** 적 처치 드랍 판정 후 가방에 추가 — 획득한 개체(또는 null) 반환 */
export function rollDropToBag(tier: Tier): OwnedGear | null {
  const o = rollDrop(tier, partyFortune());
  if (o) addDrop(o);
  return o;
}

/** 미확인 장비를 감정한다 — 파티 식별 랭크가 희귀도 요구치 이상이면 성공. */
export function identifyGear(uid: string): boolean {
  const o = G.bag.find((x) => x.uid === uid);
  if (!o || o.identified) return false;
  if (partyIdentifyRank() < RARITY_META[o.rarity].idReq) return false;
  o.identified = true;
  return true;
}

/** 판매가 — 기준 가치의 40% (최소 1) */
export function sellPrice(o: OwnedGear): number { return Math.max(1, Math.floor(o.price * 0.4)); }

/** 가방의 장비를 판매 — 성공 시 획득 골드 반환, 실패 시 0 */
export function sellGear(uid: string): number {
  const idx = G.bag.findIndex((x) => x.uid === uid);
  if (idx < 0) return 0;
  const g = sellPrice(G.bag[idx]);
  G.bag.splice(idx, 1);
  G.gold += g;
  return g;
}

/** 가방의 장비를 멤버에게 장착 — 기존 장비(교체·양손 해제분)는 가방으로 회수.
 *  미확인 장비는 장착 불가. 성공 시 true. */
export function equipFromBag(m: Member, uid: string): boolean {
  const idx = G.bag.findIndex((x) => x.uid === uid);
  if (idx < 0) return false;
  const o = G.bag[idx];
  if (!o.identified) return false;
  const before: Partial<Record<EquipSlot, Equipped>> = { ...m.equip };
  G.bag.splice(idx, 1);
  equipGear(m, o);
  /* before에 있었지만 지금 어느 슬롯에도 없는 장비 = 교체/해제된 것 → 가방으로 회수 */
  for (const s of EQUIP_SLOTS) {
    const prev = before[s];
    if (prev && !EQUIP_SLOTS.some((s2) => m.equip[s2] === prev)) {
      G.bag.push(equippedToOwned(prev, s));
    }
  }
  return true;
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
  const a = effectiveAttrs(m); // 장비 능력치 보너스 반영
  const mods = {} as Record<AttrId, number>;
  for (const k of ATTR_IDS) mods[k] = abilityMod(a[k]);
  /* 맨손 — 무기 공격력이 0일 때(무기 미장착 포함) 랭크당 공격력 +3 */
  const wAtk = weaponAtk(m);
  const unarmedBonus = wAtk === 0 ? (r.unarmed ?? 0) * 3 : 0;
  return {
    atk: a.might + wAtk + unarmedBonus,
    magInt: a.int,
    magWit: a.wit,
    def: Math.floor(a.vital / 2) + equipDefense(m) + (r.armor ?? 0) * 2 + (r.shield ?? 0) * 2,
    spd: a.agi,
    evAC: 10 + mods.agi + (r.dodge ?? 0) * 2,
    crit: a.fortune * 0.01,
    guardCut: 0.06 * (r.shield ?? 0),
    mods,
  };
}

/** 학파 메타데이터에 따른 마법 기반치 — 원소는 지능, 자아·신성은 지혜 */
export function magicBase(s: Stats, skill: SkillId): number {
  return SKILLS[skill].castingAttr === "wit" ? s.magWit : s.magInt;
}

/** 공격의 사거리 — 근접(전열·정면 칸 전용) / 원거리(후열에서도 시야 내 공격).
 *  마법·회복은 원거리, 물리는 기본 공격=무기, 그 외 물리 스킬은 활/투척만 원거리. */
export function attackReach(a: AbilityDef, weapon: WeaponView): WeaponReach {
  if (a.kind !== "phys") return "ranged";
  if (!a.id) return weapon.reach;
  return a.skill === "bow" || a.skill === "thrown" ? "ranged" : "melee";
}

/** 멤버의 타입별 피해 저항 — 직업 고유 × 전 장비 슬롯(곱연산). 미지정 타입은 1.0 */
export function memberResist(m: Member): ResistTable {
  const out: ResistTable = {};
  const merge = (t?: ResistTable) => {
    if (!t) return;
    for (const k in t) {
      const key = k as DamageType;
      out[key] = (out[key] ?? 1) * (t[key] ?? 1);
    }
  };
  merge(CLASSES[m.classId].res);
  for (const slot of EQUIP_SLOTS) merge(m.equip[slot]?.res);
  return out;
}

/** 모든 아군 공격에 공통으로 붙는 기본 명중 보정 (저레벨 숙련 보너스) */
export const PROF_BASE = 3;
/** 아군 명중 보정 = 기본 숙련 + 민첩 수정치 + 기술 숙련(랭크) */
export function allyAccuracy(s: Stats, rank: number): number {
  return PROF_BASE + s.mods.agi + rank;
}

export function expNeed(lv: number): number { return lv * lv * 22; }

/* ---- 성장(레벨업) 배분 시스템 ---- */
/** 레벨업마다 얻는 능력치 포인트 (자유 배분) */
export const LEVEL_AP = 6;
/** 레벨업마다 얻는 스킬 포인트 */
export const LEVEL_SP = 2;
/** 개별 훈련 상한 — 전문가(2). 달인(3)은 클래스 전용 */
export const TRAIN_CAP: Rank = 2;
/** 스킬을 목표 랭크로 올리는 비용 (목표 랭크 = 비용: 노비스 1 · 전문가 2) */
export function trainCost(targetRank: Rank): number { return targetRank; }

/** 능력치 1점 투자 — 체력은 maxHp, 지능/지혜는 maxMp에 즉시 반영. 성공 시 true */
export function spendAttrPoint(m: Member, attr: AttrId): boolean {
  if (m.apUnspent <= 0) return false;
  m.apUnspent--;
  m.attrs[attr]++;
  if (attr === "vital") { m.maxHp += 3; m.hp += 3; }
  else if (attr === "int" || attr === "wit") { m.maxMp += 1; m.mp += 1; }
  return true;
}

/** 이 스킬을 개별 훈련으로 한 단계 더 올릴 수 있으면 {다음 랭크, 비용}, 아니면 null */
export function trainableNext(m: Member, skill: SkillId): { next: Rank; cost: number } | null {
  const cur = memberRanks(m)[skill] ?? 0;
  if (cur >= TRAIN_CAP) return null; // 이미 전문가 이상 (달인은 클래스로만)
  const next = (cur + 1) as Rank;
  return { next, cost: trainCost(next) };
}

/** 스킬 포인트로 훈련 — 성공 시 true */
export function spendSkillPoint(m: Member, skill: SkillId): boolean {
  const t = trainableNext(m, skill);
  if (!t || m.spUnspent < t.cost) return false;
  m.spUnspent -= t.cost;
  m.trained[skill] = t.next; // memberRanks가 max 병합
  return true;
}

/** 전 멤버 경험치 획득. 레벨업한 멤버 이름 배열 반환.
 *  능력치는 자동으로 오르지 않고 배분 포인트(AP/SP)를 지급한다 — 성장은 모험 수첩에서 배분. */
export function gainExpParty(n: number): string[] {
  const ups: string[] = [];
  for (const m of G.party) {
    m.exp += n;
    let up = false;
    while (m.exp >= expNeed(m.level)) {
      m.exp -= expNeed(m.level); m.level++;
      m.maxHp += 10; m.maxMp += 3; // 기본 성장(체력 투자 시 추가로 상승)
      m.apUnspent += LEVEL_AP; m.spUnspent += LEVEL_SP;
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
  if (tier === 0 && m.level >= 3 && G.quests.job_first_promotion?.status === "rewarded") return "t1";
  if (tier === 1 && m.level >= 6 && G.quests.job_final_promotion?.status === "rewarded") return "t2";
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
