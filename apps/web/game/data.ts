/* =====================================================================
 * data.ts — 순수 데이터 정의 (백엔드 도입 시 이 모듈이 API 계약의 기준)
 * ===================================================================== */

export const RANK_NAME = ["—", "노비스", "숙련", "달인"] as const;
export const RANK_MULT = [0, 1.0, 1.55, 2.3] as const;

export type SkillId =
  | "blade"
  | "cudgel"
  | "spear"
  | "unarmed"
  | "bow"
  | "thrown"
  | "armor"
  | "dodge"
  | "shield"
  | "elemental"
  | "spirit"
  | "light"
  | "dark"
  | "trapfinding"
  | "identify"
  | "perception";

export type LD = "light" | "dark";
export type Rank = 0 | 1 | 2 | 3;

export const SKILLS: Record<SkillId, { name: string; cat: string }> = {
  blade: { name: "날붙이", cat: "물리" },
  cudgel: { name: "둔기", cat: "물리" },
  spear: { name: "창", cat: "물리" },
  unarmed: { name: "맨손", cat: "물리" },
  bow: { name: "활", cat: "물리" },
  thrown: { name: "투척", cat: "물리" },
  armor: { name: "갑옷", cat: "방어" },
  dodge: { name: "회피", cat: "방어" },
  shield: { name: "방패", cat: "방어" },
  elemental: { name: "원소", cat: "마법" },
  spirit: { name: "영혼", cat: "마법" },
  light: { name: "빛", cat: "마법" },
  dark: { name: "어둠", cat: "마법" },
  trapfinding: { name: "함정", cat: "보조" },
  identify: { name: "식별", cat: "보조" },
  perception: { name: "인지", cat: "보조" },
};

/* ---- 능력치 (캐릭터 생성 시 분배) ---- */
export type AttrId = "might" | "int" | "wit" | "vital" | "agi" | "fortune";
export type Attrs = Record<AttrId, number>;
export const ATTRS: Record<AttrId, { name: string; abbr: string; desc: string }> = {
  might: { name: "근력", abbr: "Might", desc: "물리 공격력과 소지 무게" },
  int: { name: "지능", abbr: "Int", desc: "법사형 마법 공격, 마력 크기" },
  wit: { name: "지혜", abbr: "Wit", desc: "사제형 마법 공격, 마력량, 저주·공포 저항" },
  vital: { name: "체력", abbr: "Vital", desc: "생명력(HP), 물리 저항, 중독·질병 저항" },
  agi: { name: "민첩", abbr: "Agility", desc: "명중, 회피, 행동 순서" },
  fortune: { name: "운", abbr: "Fortune", desc: "희귀 아이템, 치명타, 랜덤 이벤트" },
};
export const ATTR_IDS = Object.keys(ATTRS) as AttrId[];
export const ATTR_BASE = 10;
export const ATTR_MIN = 8;
export const ATTR_MAX = 18;
export const CREATE_POINTS = 10;
/** 생성 시 추가로 고를 수 있는 기술 수 */
export const CREATE_SKILL_PICKS = 2;

export type ClassId =
  | "fighter"
  | "scholar"
  | "swordman"
  | "spellsword"
  | "mage"
  | "acolyte"
  | "swordmaster"
  | "assassin"
  | "paladin"
  | "ranger"
  | "archmage"
  | "druid"
  | "priest"
  | "monk";

/** 캐릭터 생성 시 선택 가능한 기초 직업 */
export const BASE_CLASSES: ClassId[] = ["fighter", "scholar"];

export interface ClassDef {
  name: string;
  tier: 0 | 1 | 2;
  from?: ClassId;
  desc: string;
  /** 모험가 스프라이트 외투/포인트 색 (전직 시 외형도 바뀐다) */
  color: number;
  accent: number;
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
  /* ---- 기초 (생성 시 선택, 2종) ---- */
  fighter: {
    name: "파이터",
    tier: 0,
    desc: "물리의 기초를 닦은 견습 전사. 날붙이와 갑옷을 다룬다.",
    color: 0x54302e, accent: 0xc0503c,
    ranks: { blade: 1, armor: 1 },
  },
  scholar: {
    name: "스콜라",
    tier: 0,
    desc: "마법의 기초를 닦은 견습 학자. 원소와 영혼을 다룬다.",
    color: 0x2f3a56, accent: 0x8f7ff0,
    ranks: { elemental: 1, spirit: 1 },
  },
  /* ---- 1차 (4종) ---- */
  swordman: {
    name: "소드맨",
    tier: 1,
    from: "fighter",
    desc: "순수 물리 특화. 모든 무기를 다루는 전열의 기둥.",
    color: 0x5a3a2a, accent: 0xd88a3a,
    ranks: {
      blade: 2,
      spear: 1,
      cudgel: 1,
      thrown: 1,
      armor: 1,
      shield: 1,
      dodge: 1,
    },
  },
  spellsword: {
    name: "스펠소드",
    tier: 1,
    from: "fighter",
    desc: "물리와 마법을 함께 다루는 하이브리드.",
    color: 0x3a2f52, accent: 0xc9a227,
    ranks: {
      cudgel: 1,
      bow: 1,
      blade: 1,
      armor: 1,
      shield: 1,
      dodge: 1,
      elemental: 2,
      spirit: 1,
      light: 1,
      dark: 1,
    },
  },
  mage: {
    name: "메이지",
    tier: 1,
    from: "scholar",
    desc: "원소 마법 특화. 파괴적인 주문의 탐구자.",
    color: 0x342a5e, accent: 0x9a6ff0,
    ranks: { elemental: 2, light: 1, dark: 1, spirit: 1, perception: 1, cudgel: 1 },
  },
  acolyte: {
    name: "애콜라이트",
    tier: 1,
    from: "scholar",
    desc: "영혼 마법 특화. 정신과 생명을 다루는 수행자.",
    color: 0x2f5240, accent: 0x5e8c5a,
    ranks: {
      spirit: 2,
      light: 1,
      dark: 1,
      unarmed: 1,
      dodge: 1,
      shield: 1,
      blade: 1,
    },
  },
  /* ---- 2차 (최종 8종) — 확정 트리 ---- */
  swordmaster: {
    name: "소드마스터",
    tier: 2,
    from: "swordman",
    desc: "왕국의 검. 날붙이와 창의 달인.",
    color: 0x4a3a2a, accent: 0xe8b84a,
    masters: ["blade", "spear"],
    experts: ["armor", "shield"],
  },
  assassin: {
    name: "어쌔신",
    tier: 2,
    from: "swordman",
    desc: "그림자의 칼날. 함정과 급소를 꿰뚫는 자.",
    color: 0x241f2e, accent: 0x8a8a99,
    masters: ["blade", "thrown", "trapfinding", "dodge"],
    experts: ["perception", "identify"],
  },
  paladin: {
    name: "성기사",
    tier: 2,
    from: "spellsword",
    ld: true,
    desc: "신념의 방벽. 둔기와 방패, 그리고 선택한 신앙.",
    color: 0x5a4a2a, accent: 0xe8dcc0,
    masters: ["cudgel", "armor", "shield"],
    experts: ["LD", "spirit"],
  },
  ranger: {
    name: "레인저",
    tier: 2,
    from: "spellsword",
    ld: true,
    desc: "경계의 사냥꾼. 활과 지식으로 야수를 추적한다.",
    color: 0x2f5240, accent: 0x8fb04a,
    masters: ["bow", "identify", "dodge"],
    experts: ["elemental", "perception", "LD"],
  },
  archmage: {
    name: "대마법사",
    tier: 2,
    from: "mage",
    ld: true,
    desc: "원소의 정점. 빛 혹은 어둠의 비의를 함께 다룬다.",
    color: 0x2a2450, accent: 0xb46ff0,
    masters: ["elemental", "LD"],
    experts: ["perception"],
  },
  druid: {
    name: "드루이드",
    tier: 2,
    from: "mage",
    ld: true,
    desc: "대지의 현자. 원소와 둔기, 숨겨진 것의 발견자.",
    color: 0x3d4a2a, accent: 0x9a8f4a,
    masters: ["elemental", "cudgel", "perception"],
    experts: ["LD", "identify"],
  },
  priest: {
    name: "사제",
    tier: 2,
    from: "acolyte",
    ld: true,
    desc: "영혼의 인도자. 선택한 신앙으로 생명을 다룬다.",
    color: 0x4a4458, accent: 0xd8cba0,
    masters: ["spirit", "LD"],
    experts: ["shield"],
  },
  monk: {
    name: "몽크",
    tier: 2,
    from: "acolyte",
    ld: true,
    desc: "무념의 주먹. 영혼과 육체를 하나로 벼린다.",
    color: 0x54302e, accent: 0xd8a531,
    masters: ["spirit", "unarmed", "dodge"],
    experts: ["LD"],
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
  {
    id: "slash",
    skill: "blade",
    min: 1,
    name: "강타",
    mp: 3,
    pow: 1.4,
    hits: 1,
    kind: "phys",
    desc: "묵직한 일격",
  },
  {
    id: "dblcut",
    skill: "blade",
    min: 2,
    name: "이연격",
    mp: 6,
    pow: 0.95,
    hits: 2,
    kind: "phys",
    desc: "재빠른 2연속 베기",
  },
  {
    id: "bladedance",
    skill: "blade",
    min: 3,
    name: "검무",
    mp: 12,
    pow: 0.85,
    hits: 3,
    kind: "phys",
    desc: "춤추듯 몰아치는 3연격",
  },
  {
    id: "crush",
    skill: "cudgel",
    min: 1,
    name: "분쇄격",
    mp: 4,
    pow: 1.55,
    hits: 1,
    kind: "phys",
    desc: "방어를 부수는 강타",
  },
  {
    id: "pierce",
    skill: "spear",
    min: 1,
    name: "관통 찌르기",
    mp: 4,
    pow: 1.5,
    hits: 1,
    kind: "phys",
    pierce: true,
    desc: "방어력 일부 무시",
  },
  {
    id: "flurry",
    skill: "unarmed",
    min: 1,
    name: "연환권",
    mp: 5,
    pow: 0.8,
    hits: 2,
    kind: "phys",
    desc: "빠른 연속 타격",
  },
  {
    id: "fatalpalm",
    skill: "unarmed",
    min: 3,
    name: "백보신권",
    mp: 11,
    pow: 2.5,
    hits: 1,
    kind: "phys",
    desc: "기를 실은 필살의 일장",
  },
  {
    id: "aimshot",
    skill: "bow",
    min: 1,
    name: "정밀 사격",
    mp: 4,
    pow: 1.5,
    hits: 1,
    kind: "phys",
    crit: 0.25,
    desc: "급소를 노린다 (치명타율↑)",
  },
  {
    id: "knife",
    skill: "thrown",
    min: 1,
    name: "단검 투척",
    mp: 3,
    pow: 1.25,
    hits: 1,
    kind: "phys",
    desc: "빠르고 정확한 투척",
  },
  {
    id: "fireball",
    skill: "elemental",
    min: 1,
    name: "화염구",
    mp: 5,
    pow: 1.6,
    hits: 1,
    kind: "mag",
    desc: "불꽃의 구체",
  },
  {
    id: "chainlt",
    skill: "elemental",
    min: 2,
    name: "연쇄 번개",
    mp: 9,
    pow: 1.1,
    hits: 1,
    all: true,
    kind: "mag",
    desc: "적 전체에 번개",
  },
  {
    id: "meteor",
    skill: "elemental",
    min: 3,
    name: "메테오",
    mp: 16,
    pow: 1.8,
    hits: 1,
    all: true,
    kind: "mag",
    desc: "하늘이 무너진다 (전체)",
  },
  {
    id: "psyshock",
    skill: "spirit",
    min: 1,
    name: "정신 충격",
    mp: 5,
    pow: 1.45,
    hits: 1,
    kind: "mag",
    desc: "영혼을 뒤흔든다",
  },
  {
    id: "heal",
    skill: "spirit",
    min: 1,
    name: "치유",
    mp: 6,
    pow: 1.2,
    hits: 1,
    kind: "heal",
    desc: "아군 한 명의 생명력 회복",
  },
  {
    id: "holy",
    skill: "light",
    min: 1,
    name: "성스러운 빛",
    mp: 7,
    pow: 1.6,
    hits: 1,
    kind: "mag",
    desc: "정화의 광휘",
  },
  {
    id: "shadow",
    skill: "dark",
    min: 1,
    name: "암흑구",
    mp: 6,
    pow: 1.7,
    hits: 1,
    kind: "mag",
    desc: "응축된 어둠",
  },
  {
    id: "drain",
    skill: "dark",
    min: 2,
    name: "생명 흡수",
    mp: 9,
    pow: 1.3,
    hits: 1,
    kind: "mag",
    drain: 0.5,
    desc: "피해의 절반을 흡수",
  },
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
  {
    id: "recall",
    skill: "elemental",
    min: 2,
    name: "귀환",
    mp: 5,
    desc: "파티를 마을로 순간이동시킨다.",
  },
  {
    id: "bless",
    skill: "light",
    min: 1,
    name: "축복",
    mp: 4,
    desc: "다음 전투에서 파티 공격력 +25%.",
  },
  {
    id: "darkveil",
    skill: "dark",
    min: 2,
    name: "어둠의 장막",
    mp: 4,
    desc: "한동안 인카운터율이 크게 감소.",
  },
  {
    id: "seek",
    skill: "perception",
    min: 1,
    name: "탐색",
    mp: 2,
    desc: "주변의 숨겨진 것을 발견한다.",
  },
];

export type Tier = "일반" | "정예" | "보스" | "에픽";
export interface EnemyDef {
  name: string;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  exp: number;
  gold: number;
  tier: Tier;
  shape: "slime" | "goblin" | "wolf" | "skel" | "orc" | "lord" | "ancient";
  color: number;
  big?: number;
}

/* 4인 파티 기준으로 스케일 조정 */
export const ENEMY_DEFS: Record<string, EnemyDef> = {
  slime: {
    name: "점액 괴물",
    hp: 46,
    atk: 10,
    def: 1,
    spd: 5,
    exp: 16,
    gold: 10,
    tier: "일반",
    shape: "slime",
    color: 0x6ea86a,
  },
  goblin: {
    name: "고블린",
    hp: 58,
    atk: 13,
    def: 2,
    spd: 9,
    exp: 22,
    gold: 16,
    tier: "일반",
    shape: "goblin",
    color: 0x8a9a4a,
  },
  wolf: {
    name: "다이어울프",
    hp: 72,
    atk: 16,
    def: 2,
    spd: 13,
    exp: 30,
    gold: 20,
    tier: "일반",
    shape: "wolf",
    color: 0x777788,
  },
  skeleton: {
    name: "스켈레톤",
    hp: 66,
    atk: 14,
    def: 4,
    spd: 8,
    exp: 28,
    gold: 22,
    tier: "일반",
    shape: "skel",
    color: 0xcfc8b0,
  },
  orc: {
    name: "오크 워로드",
    hp: 780,
    atk: 32,
    def: 9,
    spd: 10,
    exp: 150,
    gold: 220,
    tier: "정예",
    shape: "orc",
    color: 0x4f7a3e,
    big: 1.35,
  },
  lord: {
    name: "숲의 군주 그림바크",
    hp: 3400,
    atk: 42,
    def: 10,
    spd: 11,
    exp: 450,
    gold: 800,
    tier: "보스",
    shape: "lord",
    color: 0x3e5a3a,
    big: 1.7,
  },
  ancient: {
    name: "고대 정령 아스테리온",
    hp: 6000,
    atk: 50,
    def: 12,
    spd: 15,
    exp: 999,
    gold: 2000,
    tier: "에픽",
    shape: "ancient",
    color: 0x9a6ff0,
    big: 1.8,
  },
};

export interface GearDef {
  id: string;
  name: string;
  atk?: number;
  def?: number;
  price: number;
  desc?: string;
}
export const SHOP_WEAPONS: GearDef[] = [
  { id: "w1", name: "강철 검", atk: 5, price: 120 },
  { id: "w2", name: "은장 검", atk: 11, price: 420 },
  { id: "w3", name: "룬 블레이드", atk: 19, price: 980 },
];
export const SHOP_ARMORS: GearDef[] = [
  { id: "a1", name: "사슬 갑옷", def: 4, price: 110 },
  { id: "a2", name: "판금 갑옷", def: 9, price: 400 },
  { id: "a3", name: "룬 아머", def: 15, price: 950 },
];
export const SHOP_ITEMS: GearDef[] = [
  {
    id: "potion",
    name: "치유 물약",
    price: 30,
    desc: "아군 1명 HP 60 회복 (전투불능 회복 가능)",
  },
  { id: "mpotion", name: "마나 물약", price: 45, desc: "아군 1명 MP 25 회복" },
];

/* ---- 파티 슬롯 (4인) — 구성은 전부 캐릭터 생성 화면에서 정한다 ---- */
export interface PartySlot {
  id: string;
  name: string;
}
export const PARTY_SLOTS: PartySlot[] = [
  { id: "aeren", name: "에런" },
  { id: "lien", name: "리엔" },
  { id: "cassius", name: "카시우스" },
  { id: "mira", name: "미라" },
];
