/* =====================================================================
 * defs/enemies.ts — 몬스터 아이콘 카탈로그·적 정의
 * ===================================================================== */
import { AttrId } from "./attrs";
import { DamageType, ResistTable } from "./damage";
import { BattleStatusId } from "../core/statuses";

/** 적 공격이 명중 시 확률로 부여하는 상태이상 */
export interface EnemyInflict {
  status: Extract<BattleStatusId, "poison" | "sleep" | "paralyze" | "fear">;
  /** 발동 확률 (0~1) */
  chance: number;
  /** 방어자가 굴리는 내성 능력치 — 성공 시 무효 */
  save: AttrId;
  /** 지속 턴 수 */
  turns: number;
  /** poison 전용 — 턴당 피해 */
  power?: number;
}

/* ---- 몬스터 아이콘 카탈로그 ----
 * assets/monsters/icons/<lowercase nameEn>.png 파일과 1:1 대응 (assets.test가 강제).
 * EnemyDef.img 는 반드시 여기의 nameEn을 사용한다. */
export interface MonsterIconDef {
  nameKo: string;
  nameEn: string;
}

export const MONSTER_ICONS: MonsterIconDef[] = [
  { nameKo: "가위턱버섯",   nameEn: "Shearcap"     },
  { nameKo: "불꽃나무",     nameEn: "Cindertree"   },
  { nameKo: "집게버섯",     nameEn: "Pincercap"    },
  { nameKo: "사람얼굴버섯", nameEn: "Facecap"      },
  { nameKo: "느림보버섯",   nameEn: "Slugcap"      },
  { nameKo: "송장버섯",     nameEn: "Corpsecap"    },
  { nameKo: "더듬이버섯",   nameEn: "Feelercap"    },
  { nameKo: "아홉머리버섯", nameEn: "Manyheadcap"  },
  { nameKo: "독꼬리버섯",   nameEn: "Stingcap"     },
  { nameKo: "엉금버섯",     nameEn: "Crawlcap"     },
  { nameKo: "덥석덩굴",     nameEn: "Snapvine"     },
  { nameKo: "유령풀",       nameEn: "Ghostgrass"   },
  { nameKo: "수정꽃",       nameEn: "Crystalbloom" },
  { nameKo: "거미버섯",     nameEn: "Spidercap"    },
  { nameKo: "송곳니뿌리",   nameEn: "Fangroot"     },
  { nameKo: "호박거미",     nameEn: "Gourdcrawler" },
  { nameKo: "맨드레이크",   nameEn: "Mandrake"     },
  { nameKo: "얼굴꽃",       nameEn: "Facebloom"    },
  { nameKo: "파랑꽃무리",   nameEn: "Bluebloom"    },
  { nameKo: "촉수꽃",       nameEn: "Tendrilbloom" },
  { nameKo: "새싹슬라임",   nameEn: "Sproutslime"  },
  { nameKo: "핏눈슬라임",   nameEn: "Glareslime"   },
  { nameKo: "거품슬라임",   nameEn: "Bubbleslime"  },
  { nameKo: "곤죽슬라임",   nameEn: "Oozeslime"    },
  { nameKo: "냉기망령",     nameEn: "Frostwraith"  },
  { nameKo: "푸딩슬라임",   nameEn: "Puddingslime" },
  { nameKo: "미끌젤리",     nameEn: "Slickjelly"   },
  { nameKo: "울보슬라임",   nameEn: "Weepslime"    },
  { nameKo: "눈알덩이",     nameEn: "Eyeblob"      },
  { nameKo: "방울슬라임",   nameEn: "Dropslime"    },
  { nameKo: "굴쥐",         nameEn: "Burrowrat"    },
  { nameKo: "날개거미",     nameEn: "Wingspider"   },
  { nameKo: "엄니토끼",     nameEn: "Fanghare"     },
  { nameKo: "붉은박쥐",     nameEn: "Redbat"       },
  { nameKo: "사슴벌레",     nameEn: "Stagbeetle"   },
  { nameKo: "점박이거미",   nameEn: "Spotspider"   },
  { nameKo: "짐꾼벌레",     nameEn: "Porterbug"    },
  { nameKo: "어둠박쥐",     nameEn: "Duskbat"      },
  { nameKo: "풀사마귀",     nameEn: "Grassmantis"  },
  { nameKo: "열매뭉치",     nameEn: "Berryclump"   },
  { nameKo: "뚱보새",       nameEn: "Tubbybird"    },
  { nameKo: "창침말벌",     nameEn: "Lancewasp"    },
  { nameKo: "어금니멧돼지", nameEn: "Tuskboar"     },
  { nameKo: "칼잡이난쟁이", nameEn: "Bladedwarf"   },
  { nameKo: "심술호박",     nameEn: "Grumpygourd"  },
  { nameKo: "껑충쥐",       nameEn: "Hopperrat"    },
  { nameKo: "흰깃새",       nameEn: "Whitewing"    },
  { nameKo: "이끼두꺼비",   nameEn: "Mosstoad"     },
  /* ---- 고블린 요새 로스터 (assets-source/characters/sprites/goblins에서 슬라이스) ---- */
  { nameKo: "고블린 전사",   nameEn: "Goblinfighter"   },
  { nameKo: "고블린 늑대기수", nameEn: "Goblinrider"    },
  { nameKo: "고블린 광신도", nameEn: "Goblinfanatic"   },
  { nameKo: "고블린 주술사", nameEn: "Goblinoccultist" },
  { nameKo: "부두 주술사",   nameEn: "Voodooshaman"    },
  /* ---- 버려진 사원 로스터 (goblin_occultist 스프라이트에서 슬라이스) ---- */
  { nameKo: "되살아난 주교", nameEn: "Fallenbishop"    },
];

export type Tier = "일반" | "정예" | "보스" | "에픽";
export type CreatureTag =
  | "living"
  | "humanoid"
  | "beast"
  | "plant"
  | "ooze"
  | "undead"
  | "construct"
  | "spirit"
  | "elemental"
  | "aquatic"
  | "flying"
  | "mindless"
  | "summoned";
/** 단일 프레임 몬스터에 적용하는 코드 기반 움직임 유형 */
export type MonsterMotion = "slime" | "flying" | "plant" | "beast" | "ghost" | "humanoid";
/** 체급 — 표시 크기·1인칭 빌보드 높이를 결정한다. 쥐와 오크가 같은 크기로 보이지 않게 전 몬스터가 필수로 갖는다 */
export type MonsterSize = "small" | "medium" | "large" | "huge";
export interface EnemyDef {
  name: string;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  exp: number;
  gold: number;
  tier: Tier;
  /** 종족·형태 태그 — 특효와 상태 면역의 예측 가능한 근거 */
  tags: CreatureTag[];
  /** 이미지 없을 때의 절차적 그리기 폴백 */
  shape: "slime" | "goblin" | "wolf" | "skel" | "orc" | "lord";
  /** 프레임 시트 없이 몸체 변형으로 표현하는 기본 모션 */
  motion: MonsterMotion;
  /** MONSTER_ICONS.nameEn — assets/monsters/icons/<lowercase nameEn>.png */
  img: string;
  color: number;
  /** 체급 — small(80px)·medium(104)·large(140)·huge(184). huge는 1인칭 복도 천장에 닿는다 */
  size: MonsterSize;
  /** 도약·암습형 — 근접 공격이 진형을 무시하고 후열까지 닿는다 (박쥐 급강하, 늑대 도약 등) */
  flank?: boolean;
  /** 회피도(AC) — 생략 시 tier·speed에서 파생 (enemyAC) */
  ac?: number;
  /** 공격 명중 보정 — 생략 시 파생 (enemyAcc) */
  acc?: number;
  /** 내성(제어기 저항) 보정 — 생략 시 tier에서 파생 (enemySave) */
  save?: number;
  /** 데미지 타입별 배율 — 미지정 타입은 1.0(보통). <1 저항 · >1 약점 · ≤0 무효 */
  res?: ResistTable;
  /** 이 적의 공격이 아군에게 주는 피해 타입 — 미지정 시 때리기(bludgeon) */
  atkType?: DamageType;
  /** 복수 속성 사용자 — 공격마다 이 중 하나를 무작위로 쓴다 (atkType보다 우선) */
  atkTypes?: DamageType[];
  /** 명중 시 확률로 아군에게 거는 상태이상 */
  inflict?: EnemyInflict;
  /** 태그에서 파생되지 않는 개별 상태 면역 */
  statusImmune?: BattleStatusId[];
}

/** 종족 태그 기반 공통 상태 면역. 개별 정의가 있으면 합산한다. */
export function enemyStatusImmune(d: EnemyDef, status: BattleStatusId): boolean {
  if (d.statusImmune?.includes(status)) return true;
  if (d.tags.includes("mindless") && (status === "sleep" || status === "fear" || status === "taunt")) return true;
  if ((d.tags.includes("undead") || d.tags.includes("construct") || d.tags.includes("ooze"))
    && (status === "poison" || status === "bleed")) return true;
  if (d.tags.includes("spirit") && (status === "poison" || status === "bleed" || status === "bind")) return true;
  return false;
}

/* ---- D&D식 판정 파생치 (tier가 성장 없는 적의 bounded accuracy를 담당) ---- */
const TIER_BONUS: Record<Tier, number> = { "일반": 0, "정예": 2, "보스": 3, "에픽": 4 };
/** 적 회피도 — 아군 명중 굴림이 넘어야 할 값 */
export function enemyAC(d: EnemyDef): number {
  return d.ac ?? 10 + TIER_BONUS[d.tier] + Math.floor(d.spd / 6);
}
/** 적 공격 명중 보정 (d20에 가산) */
export function enemyAcc(d: EnemyDef): number {
  return d.acc ?? 3 + TIER_BONUS[d.tier] + Math.floor(d.spd / 8);
}
/** 적 내성 보정 — 도발·마법봉인 등 제어기를 저항할 확률 (보스일수록 높음) */
export function enemySave(d: EnemyDef): number {
  return d.save ?? TIER_BONUS[d.tier];
}
/** 적이 아군에게 거는 상태이상의 내성 DC (아군이 굴려 넘겨야 저항) — 티어가 높을수록 어렵다 */
export function enemyInflictDC(d: EnemyDef): number {
  return 11 + TIER_BONUS[d.tier];
}
/** 이 적이 쓸 수 있는 공격 타입 목록 (atkTypes > atkType > 때리기) */
export function enemyAttackTypes(d: EnemyDef): DamageType[] {
  return d.atkTypes?.length ? d.atkTypes : [d.atkType ?? "bludgeon"];
}
/** 적의 공격이 근접인가 — 물리 타입(베기/찌르기/때리기)만 쓰면 근접이라 전열만 노린다.
 *  원소·영혼 등 마법 타입 공격은 원거리로 후열까지 닿는다. */
export function enemyMelee(d: EnemyDef): boolean {
  return enemyAttackTypes(d).every((t) => t === "slash" || t === "pierce" || t === "bludgeon");
}

/* 4인 파티 기준으로 스케일 조정 */
export const ENEMY_DEFS: Record<string, EnemyDef> = {
  slime: {
    name: "핏눈 슬라임",
    hp: 46,
    atk: 10,
    def: 1,
    spd: 5,
    exp: 16,
    gold: 10,
    tier: "일반",
    tags: ["living", "ooze"],
    shape: "slime",
    motion: "slime",
    img: "Glareslime",
    color: 0x6ea86a,
    size: "small",
    /* 물렁한 몸 — 날붙이·찌르기는 흘리고, 둔기와 불에 약하다 */
    res: { slash: 0.6, pierce: 0.5, bludgeon: 1.4, fire: 1.25, earth: 0.8 },
    atkType: "bludgeon", // 몸통 박치기
    inflict: { status: "poison", chance: 0.3, save: "vital", turns: 3, power: 4 }, // 산성 점액
  },
  goblin: {
    name: "고블린 전사",
    hp: 58,
    atk: 13,
    def: 2,
    spd: 9,
    exp: 22,
    gold: 16,
    tier: "일반",
    tags: ["living", "humanoid"],
    shape: "goblin",
    motion: "humanoid",
    img: "Goblinfighter",
    color: 0x6f8a3c,
    size: "medium",
    /* 금속 방패를 든 동굴 전사 — 전격에 약하고 어둠에 익숙하다 */
    res: { wind: 1.25, dark: 0.85 },
    atkType: "slash", // 이 빠진 칼과 방패
  },
  wolf: {
    name: "고블린 늑대기수",
    hp: 72,
    atk: 16,
    def: 2,
    spd: 13,
    exp: 30,
    gold: 20,
    tier: "일반",
    tags: ["living", "beast", "humanoid"],
    shape: "wolf",
    motion: "beast",
    img: "Goblinrider",
    color: 0x9a9aa0,
    size: "large",
    flank: true, // 굴늑대의 도약 돌격 — 후열까지 문다
    /* 사나운 굴늑대 — 찌르기에 약하고 지면 충격을 흘린다 */
    res: { pierce: 1.35, earth: 0.85 },
    atkType: "pierce", // 늑대의 송곳니 돌격
  },
  skeleton: {
    name: "냉기 망령",
    hp: 66,
    atk: 14,
    def: 4,
    spd: 8,
    exp: 28,
    gold: 22,
    tier: "일반",
    tags: ["undead", "spirit", "mindless"],
    shape: "skel",
    motion: "ghost",
    img: "Frostwraith",
    color: 0x7fc8dc,
    size: "medium",
    /* 냉기 언데드 — 뼈는 둔기에 바스러지고 빛·불에 정화된다. 찌르기·냉기·어둠은 무의미 */
    res: { bludgeon: 1.5, fire: 1.3, light: 1.65, pierce: 0.5, water: 0.25, dark: 0 },
    atkType: "water", // 냉기의 손길
    inflict: { status: "paralyze", chance: 0.25, save: "vital", turns: 2 }, // 얼어붙는 한기
  },
  orc: {
    name: "고블린 광신도",
    hp: 780,
    atk: 32,
    def: 9,
    spd: 10,
    exp: 150,
    gold: 220,
    tier: "정예",
    tags: ["living", "humanoid"],
    shape: "orc",
    motion: "humanoid",
    img: "Goblinfanatic",
    color: 0x8a6a3c,
    size: "large",
    /* 광기에 물든 상위 고블린 — 땅·물·빛에 약하고 어둠 의식에 익숙하다 */
    res: { earth: 1.25, water: 1.2, light: 1.3, dark: 0.8 },
    atkType: "slash", // 제례용 곡도
  },
  /* 그름바크 — 지하 알현실의 고블린 주술사. 파티 Lv6 적정.
   * (defId·심볼 키 "lord"는 세이브 호환을 위해 유지 — 표시명만 주술사) */
  lord: {
    name: "그름바크 (고블린 주술사)",
    hp: 3200,
    atk: 40,
    def: 5,
    spd: 11,
    exp: 450,
    gold: 800,
    tier: "보스",
    tags: ["living", "humanoid"],
    shape: "lord",
    motion: "humanoid",
    img: "Goblinoccultist",
    color: 0xc05a7a,
    size: "huge",
    /* 천 예복의 주술사 — 날붙이·빛·물에 약하고, 제 주술인 불·어둠은 몸에 배어 있다 */
    res: { slash: 1.2, pierce: 1.2, light: 1.35, water: 1.15, fire: 0.6, dark: 0.6 },
    atkTypes: ["fire", "dark"], // 불꽃과 어둠의 주술을 번갈아 퍼붓는다 (단일·전체)
    inflict: { status: "fear", chance: 0.3, save: "wit", turns: 2 }, // 소굴을 짓누르는 위압
  },
  /* 그름바크의 친위대 — 알현실 앞을 막아선 전위. 주술사가 후위에서 주문을 퍼붓는 동안 벽이 된다 */
  guard: {
    name: "고블린 친위대",
    hp: 520,
    atk: 27,
    def: 8,
    spd: 9,
    exp: 90,
    gold: 120,
    tier: "정예",
    tags: ["living", "humanoid"],
    shape: "goblin",
    motion: "humanoid",
    img: "Goblinfighter",
    color: 0x4a5a8a,
    size: "large",
    /* 철갑 방패병 — 전격에 약하고 베기를 방패로 흘린다 */
    res: { wind: 1.25, slash: 0.8, dark: 0.85 },
    atkType: "slash", // 의장용 대검
  },
  /* ---- 버려진 사원 — 언데드·교단의 잔재 (측면 퀘스트 파티 Lv4~5 기준) ---- */
  husk: {
    name: "송장버섯",
    hp: 62,
    atk: 15,
    def: 3,
    spd: 6,
    exp: 26,
    gold: 18,
    tier: "일반",
    tags: ["undead", "plant", "mindless"],
    shape: "slime",
    motion: "plant",
    img: "Corpsecap",
    color: 0x8a9a6a,
    size: "small",
    /* 시신을 먹고 자란 버섯 — 불·빛에 타오르고 날붙이는 무른 몸을 벤다. 어둠은 양분이다 */
    res: { fire: 1.5, light: 1.3, pierce: 0.6, dark: 0.7 },
    atkType: "bludgeon", // 부풀어 오른 몸통 부딪치기
    inflict: { status: "poison", chance: 0.35, save: "vital", turns: 3, power: 5 }, // 송장 포자
  },
  duskbat: {
    name: "어둠박쥐",
    hp: 46,
    atk: 14,
    def: 1,
    spd: 16,
    exp: 24,
    gold: 15,
    tier: "일반",
    tags: ["living", "beast", "flying"],
    shape: "wolf",
    motion: "flying",
    img: "Duskbat",
    color: 0x5a4a7a,
    size: "small",
    flank: true, // 서까래에서 급강하 — 진형을 무시하고 후열을 덮친다
    /* 회랑 서까래의 박쥐 떼 — 빛에 움츠러들고 어둠에 녹아든다 */
    res: { light: 1.3, slash: 1.2, dark: 0.7 },
    atkType: "pierce", // 송곳니 급강하
    inflict: { status: "fear", chance: 0.2, save: "wit", turns: 2 }, // 초음파 비명
  },
  eyeblob: {
    name: "눈알덩이",
    hp: 74,
    atk: 17,
    def: 3,
    spd: 5,
    exp: 34,
    gold: 28,
    tier: "일반",
    tags: ["living", "ooze", "mindless"],
    shape: "slime",
    motion: "slime",
    img: "Eyeblob",
    color: 0x9a4a5a,
    size: "medium",
    /* 의식의 부산물 — 커다란 눈은 찌르기에 약하고, 빛이 스며들면 몸부림친다 */
    res: { pierce: 1.4, light: 1.3, bludgeon: 0.8, dark: 0.6 },
    atkType: "dark", // 최면의 응시
    inflict: { status: "sleep", chance: 0.3, save: "wit", turns: 2 }, // 깜빡이지 않는 눈
  },
  tendril: {
    name: "제단의 촉수꽃",
    hp: 680,
    atk: 30,
    def: 8,
    spd: 9,
    exp: 140,
    gold: 200,
    tier: "정예",
    tags: ["living", "plant"],
    shape: "orc",
    motion: "plant",
    img: "Tendrilbloom",
    color: 0x6a8a4a,
    size: "large",
    /* 제단의 피를 마시고 자란 덩굴 — 불에 약하고 물·땅 기운은 양분으로 삼는다 */
    res: { fire: 1.45, slash: 1.2, water: 0.7, earth: 0.7 },
    atkType: "bludgeon", // 후려치는 덩굴
    inflict: { status: "poison", chance: 0.3, save: "vital", turns: 3, power: 6 }, // 마비 꽃가루
  },
  bishop: {
    name: "되살아난 주교 카르마스",
    hp: 2200,
    atk: 38,
    def: 9,
    spd: 10,
    exp: 380,
    gold: 650,
    tier: "보스",
    tags: ["undead", "humanoid"],
    shape: "lord",
    motion: "humanoid",
    img: "Fallenbishop",
    color: 0x8a3a4a,
    size: "huge",
    /* 알 수 없는 힘으로 일어선 시신 — 빛과 불이 그 힘을 태우고, 어둠은 스며들지 못한다 */
    res: { light: 1.6, fire: 1.25, dark: 0.4, pierce: 0.8, water: 0.9 },
    atkType: "dark", // 거꾸로 된 기도
    inflict: { status: "fear", chance: 0.3, save: "wit", turns: 2 }, // 무덤 너머의 설교
  },
};
