/* =====================================================================
 * data.ts — 순수 데이터 정의 (백엔드 도입 시 이 모듈이 API 계약의 기준)
 * ===================================================================== */

export const RANK_NAME = ["—", "노비스", "숙련", "달인"] as const;
export const RANK_MULT = [0, 1.0, 1.55, 2.3] as const;

export type SkillId =
  | "blade" | "mace" | "spear" | "unarmed" | "bow" | "throw"
  | "armor" | "dodge" | "shield"
  | "elemental" | "spirit" | "light" | "dark"
  | "mastery" | "disarm" | "identify" | "search";

export type LD = "light" | "dark";
export type Rank = 0 | 1 | 2 | 3;

export const SKILLS: Record<SkillId, { name: string; cat: string }> = {
  blade:     { name: "날붙이",      cat: "물리" },
  mace:      { name: "둔기",        cat: "물리" },
  spear:     { name: "창",          cat: "물리" },
  unarmed:   { name: "맨손",        cat: "물리" },
  bow:       { name: "활",          cat: "물리" },
  throw:     { name: "투척",        cat: "물리" },
  armor:     { name: "갑옷",        cat: "방어" },
  dodge:     { name: "회피",        cat: "방어" },
  shield:    { name: "방패",        cat: "방어" },
  elemental: { name: "원소",        cat: "마법" },
  spirit:    { name: "영혼",        cat: "마법" },
  light:     { name: "빛",          cat: "마법" },
  dark:      { name: "어둠",        cat: "마법" },
  mastery:   { name: "무기 숙련",   cat: "보조" },
  disarm:    { name: "함정 해체",   cat: "보조" },
  identify:  { name: "몬스터 식별", cat: "보조" },
  search:    { name: "탐색(발견)",  cat: "보조" },
};

export type ClassId =
  | "novice"
  | "warrior" | "battlemage" | "wizard" | "acolyte"
  | "knight" | "assassin" | "paladin" | "ranger"
  | "archmage" | "druid" | "priest" | "monk";

export interface ClassDef {
  name: string;
  tier: 0 | 1 | 2;
  from?: ClassId;
  desc: string;
  /** 기본 습득 랭크 (1차 이하) */
  ranks?: Partial<Record<SkillId, Rank>>;
  /** 달인(M) — 'LD'는 전직 시 빛or어둠 선택 */
  masters?: (SkillId | "LD")[];
  /** 숙련(E) */
  experts?: (SkillId | "LD")[];
  /** 빛/어둠 선택이 필요한 클래스 */
  ld?: boolean;
}

export const CLASSES: Record<ClassId, ClassDef> = {
  novice: {
    name: "노비스", tier: 0,
    desc: "모든 것의 시작. 기본 소양만을 익힌 견습 모험가.",
    ranks: { blade: 1, elemental: 1, spirit: 1 },
  },
  /* ---- 1차 (4종) ---- */
  warrior: {
    name: "워리어", tier: 1, from: "novice",
    desc: "순수 물리 특화. 모든 무기를 다루는 전열의 기둥.",
    ranks: { blade: 2, spear: 1, mace: 1, throw: 1, armor: 1, shield: 1, dodge: 1 },
  },
  battlemage: {
    name: "배틀메이지", tier: 1, from: "novice",
    desc: "물리와 마법을 함께 다루는 하이브리드.",
    ranks: { mace: 1, bow: 1, blade: 1, armor: 1, shield: 1, dodge: 1, elemental: 2, spirit: 1, light: 1, dark: 1 },
  },
  wizard: {
    name: "위저드", tier: 1, from: "novice",
    desc: "원소 마법 특화. 파괴적인 주문의 탐구자.",
    ranks: { elemental: 2, light: 1, dark: 1, spirit: 1, search: 1, mace: 1 },
  },
  acolyte: {
    name: "애콜라이트", tier: 1, from: "novice",
    desc: "영혼 마법 특화. 정신과 생명을 다루는 수행자.",
    ranks: { spirit: 2, light: 1, dark: 1, unarmed: 1, dodge: 1, shield: 1, blade: 1 },
  },
  /* ---- 2차 (최종 8종) — 확정 트리 ---- */
  knight: {
    name: "기사", tier: 2, from: "warrior",
    desc: "왕국의 검. 날붙이·창·무기 숙련의 달인.",
    masters: ["blade", "spear", "mastery"], experts: ["armor", "shield"],
  },
  assassin: {
    name: "어쌔신", tier: 2, from: "warrior",
    desc: "그림자의 칼날. 함정과 급소를 꿰뚫는 자.",
    masters: ["blade", "throw", "disarm", "dodge"], experts: ["search", "identify"],
  },
  paladin: {
    name: "성기사", tier: 2, from: "battlemage", ld: true,
    desc: "신념의 방벽. 둔기와 방패, 그리고 선택한 신앙.",
    masters: ["mace", "armor", "shield"], experts: ["LD", "spirit"],
  },
  ranger: {
    name: "레인저", tier: 2, from: "battlemage", ld: true,
    desc: "경계의 사냥꾼. 활과 지식으로 야수를 추적한다.",
    masters: ["bow", "identify", "dodge"], experts: ["elemental", "search", "LD"],
  },
  archmage: {
    name: "대마법사", tier: 2, from: "wizard", ld: true,
    desc: "원소의 정점. 빛 혹은 어둠의 비의를 함께 다룬다.",
    masters: ["elemental", "LD"], experts: ["search"],
  },
  druid: {
    name: "드루이드", tier: 2, from: "wizard", ld: true,
    desc: "대지의 현자. 원소와 둔기, 숨겨진 것의 발견자.",
    masters: ["elemental", "mace", "search"], experts: ["LD", "identify"],
  },
  priest: {
    name: "사제", tier: 2, from: "acolyte", ld: true,
    desc: "영혼의 인도자. 선택한 신앙으로 생명을 다룬다.",
    masters: ["spirit", "LD"], experts: ["shield"],
  },
  monk: {
    name: "몽크", tier: 2, from: "acolyte", ld: true,
    desc: "무념의 주먹. 영혼과 육체를 하나로 벼린다.",
    masters: ["spirit", "unarmed", "dodge"], experts: ["LD"],
  },
};

export interface AbilityDef {
  id: string;
  skill: SkillId;
  min: Rank;
  name: string;
  mp: number;
  pow: number;
  hits: number;
  kind: "phys" | "mag" | "heal";
  all?: boolean;
  pierce?: boolean;
  crit?: number;
  drain?: number;
  desc: string;
}

export const ABILITIES: AbilityDef[] = [
  { id: "slash",      skill: "blade",     min: 1, name: "강타",        mp: 3,  pow: 1.4,  hits: 1, kind: "phys", desc: "묵직한 일격" },
  { id: "dblcut",     skill: "blade",     min: 2, name: "이연격",      mp: 6,  pow: 0.95, hits: 2, kind: "phys", desc: "재빠른 2연속 베기" },
  { id: "bladedance", skill: "blade",     min: 3, name: "검무",        mp: 12, pow: 0.85, hits: 3, kind: "phys", desc: "춤추듯 몰아치는 3연격" },
  { id: "crush",      skill: "mace",      min: 1, name: "분쇄격",      mp: 4,  pow: 1.55, hits: 1, kind: "phys", desc: "방어를 부수는 강타" },
  { id: "pierce",     skill: "spear",     min: 1, name: "관통 찌르기", mp: 4,  pow: 1.5,  hits: 1, kind: "phys", pierce: true, desc: "방어력 일부 무시" },
  { id: "flurry",     skill: "unarmed",   min: 1, name: "연환권",      mp: 5,  pow: 0.8,  hits: 2, kind: "phys", desc: "빠른 연속 타격" },
  { id: "fatalpalm",  skill: "unarmed",   min: 3, name: "백보신권",    mp: 11, pow: 2.5,  hits: 1, kind: "phys", desc: "기를 실은 필살의 일장" },
  { id: "aimshot",    skill: "bow",       min: 1, name: "정밀 사격",   mp: 4,  pow: 1.5,  hits: 1, kind: "phys", crit: 0.25, desc: "급소를 노린다 (치명타율↑)" },
  { id: "knife",      skill: "throw",     min: 1, name: "단검 투척",   mp: 3,  pow: 1.25, hits: 1, kind: "phys", desc: "빠르고 정확한 투척" },
  { id: "fireball",   skill: "elemental", min: 1, name: "화염구",      mp: 5,  pow: 1.6,  hits: 1, kind: "mag",  desc: "불꽃의 구체" },
  { id: "chainlt",    skill: "elemental", min: 2, name: "연쇄 번개",   mp: 9,  pow: 1.1,  hits: 1, all: true, kind: "mag", desc: "적 전체에 번개" },
  { id: "meteor",     skill: "elemental", min: 3, name: "메테오",      mp: 16, pow: 1.8,  hits: 1, all: true, kind: "mag", desc: "하늘이 무너진다 (전체)" },
  { id: "psyshock",   skill: "spirit",    min: 1, name: "정신 충격",   mp: 5,  pow: 1.45, hits: 1, kind: "mag",  desc: "영혼을 뒤흔든다" },
  { id: "heal",       skill: "spirit",    min: 1, name: "치유",        mp: 6,  pow: 1.2,  hits: 1, kind: "heal", desc: "아군 한 명의 생명력 회복" },
  { id: "holy",       skill: "light",     min: 1, name: "성스러운 빛", mp: 7,  pow: 1.6,  hits: 1, kind: "mag",  desc: "정화의 광휘" },
  { id: "shadow",     skill: "dark",      min: 1, name: "암흑구",      mp: 6,  pow: 1.7,  hits: 1, kind: "mag",  desc: "응축된 어둠" },
  { id: "drain",      skill: "dark",      min: 2, name: "생명 흡수",   mp: 9,  pow: 1.3,  hits: 1, kind: "mag",  drain: 0.5, desc: "피해의 절반을 흡수" },
];

export interface FieldSkillDef {
  id: "recall" | "bless" | "darkveil" | "seek";
  skill: SkillId;
  min: Rank;
  name: string;
  mp: number;
  desc: string;
}
export const FIELD_SKILLS: FieldSkillDef[] = [
  { id: "recall",   skill: "elemental", min: 2, name: "귀환",        mp: 5, desc: "파티를 마을로 순간이동시킨다." },
  { id: "bless",    skill: "light",     min: 1, name: "축복",        mp: 4, desc: "다음 전투에서 파티 공격력 +25%." },
  { id: "darkveil", skill: "dark",      min: 2, name: "어둠의 장막", mp: 4, desc: "한동안 인카운터율이 크게 감소." },
  { id: "seek",     skill: "search",    min: 1, name: "탐색",        mp: 2, desc: "주변의 숨겨진 것을 발견한다." },
];

export type Tier = "일반" | "정예" | "보스" | "에픽";
export interface EnemyDef {
  name: string; hp: number; atk: number; def: number; spd: number;
  exp: number; gold: number; tier: Tier;
  shape: "slime" | "goblin" | "wolf" | "skel" | "orc" | "lord" | "ancient";
  color: number; big?: number;
}

/* 4인 파티 기준으로 스케일 조정 */
export const ENEMY_DEFS: Record<string, EnemyDef> = {
  slime:    { name: "점액 괴물",           hp: 46,   atk: 10, def: 1, spd: 5,  exp: 16,  gold: 10,  tier: "일반", shape: "slime",   color: 0x6ea86a },
  goblin:   { name: "고블린",             hp: 58,   atk: 13, def: 2, spd: 9,  exp: 22,  gold: 16,  tier: "일반", shape: "goblin",  color: 0x8a9a4a },
  wolf:     { name: "다이어울프",          hp: 72,   atk: 16, def: 2, spd: 13, exp: 30,  gold: 20,  tier: "일반", shape: "wolf",    color: 0x777788 },
  skeleton: { name: "스켈레톤",           hp: 66,   atk: 14, def: 4, spd: 8,  exp: 28,  gold: 22,  tier: "일반", shape: "skel",    color: 0xcfc8b0 },
  orc:      { name: "오크 워로드",         hp: 380,  atk: 22, def: 7, spd: 9,  exp: 150, gold: 220, tier: "정예", shape: "orc",     color: 0x4f7a3e, big: 1.35 },
  lord:     { name: "숲의 군주 그림바크",   hp: 720,  atk: 26, def: 8, spd: 10, exp: 450, gold: 800, tier: "보스", shape: "lord",    color: 0x3e5a3a, big: 1.7 },
  ancient:  { name: "고대 정령 아스테리온", hp: 1100, atk: 32, def: 10, spd: 14, exp: 999, gold: 2000, tier: "에픽", shape: "ancient", color: 0x9a6ff0, big: 1.8 },
};

export interface GearDef { id: string; name: string; atk?: number; def?: number; price: number; desc?: string; }
export const SHOP_WEAPONS: GearDef[] = [
  { id: "w1", name: "강철 검",     atk: 5,  price: 120 },
  { id: "w2", name: "은장 검",     atk: 11, price: 420 },
  { id: "w3", name: "룬 블레이드", atk: 19, price: 980 },
];
export const SHOP_ARMORS: GearDef[] = [
  { id: "a1", name: "사슬 갑옷", def: 4,  price: 110 },
  { id: "a2", name: "판금 갑옷", def: 9,  price: 400 },
  { id: "a3", name: "룬 아머",   def: 15, price: 950 },
];
export const SHOP_ITEMS: GearDef[] = [
  { id: "potion",  name: "치유 물약", price: 30, desc: "아군 1명 HP 60 회복 (전투불능 회복 가능)" },
  { id: "mpotion", name: "마나 물약", price: 45, desc: "아군 1명 MP 25 회복" },
];

/* ---- 파티 멤버 초기 정의 (4인) ---- */
export interface MemberSeed {
  id: string; name: string; color: number; accent: number;
  atk: number; mag: number; def: number; spd: number; note: string;
}
export const PARTY_SEEDS: MemberSeed[] = [
  { id: "aeren",   name: "에런",     color: 0x3a2f52, accent: 0xc9a227, atk: 12, mag: 11, def: 5, spd: 9,  note: "균형형 리더" },
  { id: "lien",    name: "리엔",     color: 0x2f3a56, accent: 0x8f7ff0, atk: 10, mag: 14, def: 4, spd: 9,  note: "마력 우위" },
  { id: "cassius", name: "카시우스", color: 0x54302e, accent: 0xc0503c, atk: 14, mag: 9,  def: 5, spd: 8,  note: "완력 우위" },
  { id: "mira",    name: "미라",     color: 0x2f5240, accent: 0x5e8c5a, atk: 11, mag: 12, def: 4, spd: 12, note: "속도 우위" },
];
