import type { ClassKey, ClassDef, MonsterTier, ShopItem } from "./types";

export const CLASSES: Record<ClassKey, ClassDef> = {
  warrior: {
    key: "warrior",
    name: "전사",
    initial: "戰",
    tagline: "근거리 물리 딜러",
    desc: "튼튼한 갑주와 검을 다루는 전방의 방패. 높은 체력과 방어력으로 전선을 지킨다.",
    base: { hp: 34, mp: 6, atk: 9, def: 7, mag: 1 },
    growth: { hp: 7, mp: 1, atk: 2, def: 2, mag: 0 },
    skills: [
      {
        id: "strike",
        name: "강타",
        mp: 3,
        type: "attack",
        calc: (p) => p.atk * 1.8,
        desc: "혼신의 힘을 실은 일격.",
      },
    ],
  },
  archer: {
    key: "archer",
    name: "궁수",
    initial: "弓",
    tagline: "원거리 물리 딜러",
    desc: "정확한 눈과 빠른 손으로 적의 급소를 노린다. 방어는 약하나 화력이 날카롭다.",
    base: { hp: 27, mp: 8, atk: 8, def: 4, mag: 2 },
    growth: { hp: 5, mp: 1, atk: 2, def: 1, mag: 0 },
    skills: [
      {
        id: "pierce",
        name: "관통 사격",
        mp: 4,
        type: "attack",
        calc: (p) => p.atk * 1.6,
        ignoreDef: 0.5,
        desc: "갑옷의 틈을 꿰뚫는 화살.",
      },
    ],
  },
  cleric: {
    key: "cleric",
    name: "성직자",
    initial: "聖",
    tagline: "영혼 마법 사용자",
    desc: "빛과 영혼의 힘을 다루어 아군을 치유하고 언데드를 심판한다.",
    base: { hp: 25, mp: 17, atk: 4, def: 5, mag: 7 },
    growth: { hp: 4, mp: 3, atk: 1, def: 1, mag: 2 },
    skills: [
      {
        id: "smite",
        name: "심판의 빛",
        mp: 6,
        type: "attack",
        calc: (p) => p.mag * 1.6,
        desc: "성스러운 빛으로 적을 태운다.",
      },
      {
        id: "heal",
        name: "신성한 치유",
        mp: 5,
        type: "heal",
        calc: (p) => p.mag * 2.2 + 8,
        desc: "상처를 빛으로 봉합한다.",
      },
    ],
  },
  mage: {
    key: "mage",
    name: "마법사",
    initial: "魔",
    tagline: "원소 마법 사용자",
    desc: "불과 얼음을 다루는 파괴적인 힘. 체력은 낮지만 화력은 최강.",
    base: { hp: 21, mp: 19, atk: 3, def: 3, mag: 9 },
    growth: { hp: 3, mp: 3, atk: 0, def: 1, mag: 3 },
    skills: [
      {
        id: "fireball",
        name: "화염구",
        mp: 6,
        type: "attack",
        calc: (p) => p.mag * 2.0,
        desc: "폭발하는 불덩이를 날린다.",
      },
      {
        id: "icelance",
        name: "얼음창",
        mp: 4,
        type: "attack",
        calc: (p) => p.mag * 1.3,
        desc: "날카로운 얼음 창으로 꿰뚫는다.",
      },
    ],
  },
};

// 몬스터 티어: [약체, 강체]
export const MONSTER_TIERS: MonsterTier[] = [
  {
    weak: { name: "고블린", hp: 16, atk: 5, def: 2, exp: 10, gold: 5 },
    strong: { name: "고블린 마법사", hp: 14, atk: 8, def: 1, exp: 16, gold: 9 },
  },
  {
    weak: { name: "박쥐", hp: 13, atk: 6, def: 1, exp: 14, gold: 6 },
    strong: { name: "흡혈귀", hp: 30, atk: 9, def: 3, exp: 30, gold: 18 },
  },
  {
    weak: { name: "오크", hp: 34, atk: 10, def: 4, exp: 32, gold: 16 },
    strong: { name: "트롤", hp: 55, atk: 13, def: 6, exp: 55, gold: 30 },
  },
  {
    weak: { name: "오우거", hp: 60, atk: 15, def: 7, exp: 70, gold: 40 },
    strong: { name: "미노타우로스", hp: 82, atk: 19, def: 9, exp: 100, gold: 60 },
  },
  {
    weak: { name: "스켈레톤", hp: 50, atk: 14, def: 8, exp: 90, gold: 45 },
    strong: { name: "리치", hp: 112, atk: 22, def: 10, exp: 160, gold: 100 },
  },
  {
    weak: { name: "드래곤", hp: 165, atk: 28, def: 14, exp: 300, gold: 200 },
    strong: { name: "드래곤로드", hp: 245, atk: 35, def: 18, exp: 500, gold: 400 },
  },
];

export const FLAVOR: Record<"encounter" | "treasure" | "trap" | "rest", string[]> = {
  encounter: [
    "어둠 속에서 낮은 숨소리가 들려온다...",
    "발밑의 나뭇가지가 부러지는 소리와 함께 그림자가 움직인다.",
    "차가운 바람이 스치고, 무언가 이빨을 드러낸다.",
    "썩은 냄새와 함께 적의가 다가온다.",
  ],
  treasure: [
    "낡은 궤짝을 발견했다.",
    "이끼 낀 바위 틈에서 무언가 반짝인다.",
    "여행자의 유해 곁에 놓인 주머니를 발견했다.",
  ],
  trap: [
    "발밑이 꺼지며 함정이 발동한다!",
    "숨겨진 화살이 날아든다!",
    "독가스가 스며 나온다...",
  ],
  rest: [
    "작은 샘터를 발견해 잠시 목을 축인다.",
    "무너진 사당의 그늘 아래에서 숨을 돌린다.",
    "모닥불의 흔적 곁에서 잠시 쉬어간다.",
  ],
};

export const SHOP_ITEMS: ShopItem[] = [
  { id: "potion", name: "치유의 물약", cost: 15, desc: "HP 30 회복 (전투 중 사용 가능)" },
];

export const SMITH_ITEMS: ShopItem[] = [
  { id: "weapon", name: "무기 벼리기", cost: 30, desc: "공격력 +3 (영구)" },
  { id: "armor", name: "방어구 강화", cost: 30, desc: "방어력 +3 (영구)" },
];

export const INN_REST_COST = 15;
