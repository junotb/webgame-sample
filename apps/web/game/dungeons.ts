/* =====================================================================
 * dungeons.ts — 던전 레지스트리 (맵·테마·POI·이벤트 결선)
 *  탐험 씬(scenes/explore.ts)은 이 정의만 보고 어느 던전이든 굴린다.
 *  맵·스폰 원본 데이터는 goblin-fortress.ts / abandoned-temple.ts가 담당.
 * ===================================================================== */
import { C, nav } from "./core";
import { GameEvent } from "./core/quests";
import type { FPTheme } from "./fpview";
import type { Facing, GridMap } from "./grid";
import {
  BASEMENT_NORMAL_SPAWNS, BASEMENT_POIS, BASEMENT_START, BASEMENT_SYMBOL_SPAWNS,
  NORMAL_SPAWNS, POIS, PoiDef, START, SYMBOL_SPAWNS, SpawnDef,
  basementMap, fortressMap, mossAt, torchAt,
} from "./goblin-fortress";
import {
  TEMPLE_NORMAL_SPAWNS, TEMPLE_POIS, TEMPLE_PROPS, TEMPLE_START, TEMPLE_SYMBOL_SPAWNS,
  TemplePropDef, templeFloorVariant, templeMap, templeOrnateAt, templeTorchAt,
} from "./abandoned-temple";
import { ExploreState, G } from "./state";
import type { EventNode } from "./scenes/event";

export type DungeonId = "fortress" | "fortressB1" | "temple";

/** 장식 소품 — 칸을 점유하는 빌보드. 정면에서 조사하면 text를 보여준다.
 *  frames를 주면 씬 ticker가 프레임을 순환시킨다 (혼불 성화 등). */
export type DungeonProp = TemplePropDef;

/** 상자 정의 — loot()는 상태를 바꾸고 표시할 문구를 돌려준다 */
export interface DungeonChest {
  poi: string;
  /** 해체 실패 시 파티 전원이 받는 피해 (함정 숙련으로 해체) */
  trapDmg?: number;
  loot: () => { text: string; color?: number }[];
  notify?: GameEvent;
}

/** 심볼 조우 대화 — near칸 이내 + 시야에 들어오면 1회 재생 */
export interface DungeonIntro {
  symbol: string;
  caption: string;
  near: number;
  nodes: EventNode[];
  /** '물러난다' 선택 시 후퇴 위치 (G._fled) */
  retreat?: { x: number; y: number; facing: Facing };
}

/** 심볼 처치 후속 — toast 문구·플래그·씬 전환 */
export interface SymbolOutcome {
  toast?: { text: string; color: number };
  onKilled?: () => void;
  /** 처치 연출 후 씬을 끝내는 전환 (보스 격파 등) */
  finish?: () => void;
}

export interface DungeonDef {
  id: DungeonId;
  name: string;
  badge: string;
  enterLog: string;
  map: GridMap;
  start: { x: number; y: number; facing: Facing };
  normalSpawns: readonly SpawnDef[];
  symbolSpawns: readonly SpawnDef[];
  pois: readonly PoiDef[];
  props: readonly DungeonProp[];
  theme: () => FPTheme;
  signText: string;
  /** 계단 칸 조사 문구 — stairs가 없을 때만 쓰인다 (봉인된 계단 등) */
  stairsText?: string;
  /** 계단 칸에서 [Z]로 다른 층으로 이동 */
  stairs?: { prompt: string; go: () => void };
  chests: Record<string, DungeonChest>;
  /** 인지(Seek)로 발견하는 숨김 상자 POI id */
  hiddenChestId?: string;
  intros: DungeonIntro[];
  symbols: Record<string, SymbolOutcome>;
  /** 이 던전의 영속 상태 (G.explore / G.basement / G.temple) */
  state: () => ExploreState;
  exit: { prompt: string; go: () => void };
}

/** 고블린 요새 테마 — 동굴 암반 표면 + 횃불 밝힌 소굴 */
function fortressTheme(): FPTheme {
  return {
    floorAt: () => ({ base: "cave_floor" }),
    wallAt: (x, y) => (mossAt(x, y) ? { base: "cave_wall", decal: "wall_worn_decal" } : { base: "cave_wall" }),
    doorAt: () => ({ base: "cave_wall", decal: "door_closed_obj" }),
    torchAt,
    ceiling: "cave_ceiling",
    water: "water",
    stairs: { base: "cave_floor", decal: "stairs_decal" },
    floorTint: 0xb0a58c, waterTint: 0x5a7a86, wallTint: 0xc79a63, ceilingTint: 0x6b5a44,
  };
}

/** 요새 지하 테마 — 같은 암반이되 빛이 닿지 않아 어둡고 차다 */
function basementTheme(): FPTheme {
  const t = fortressTheme();
  return {
    ...t,
    floorTint: 0x8a8070, wallTint: 0x9a7448, ceilingTint: 0x4a3e30, waterTint: 0x3e5a66,
  };
}

/** 버려진 사원 테마 — 회색 석조 회랑. 그리스 문양 벽과 갈라진 판석,
 *  차고 푸른 색조로 바닷바람이 스미는 정적을 낸다. */
function templeTheme(): FPTheme {
  return {
    floorAt: (x, y) => ({ base: templeFloorVariant(x, y) }),
    wallAt: (x, y) => (templeOrnateAt(x, y)
      ? { base: "temple_wall_ornate" }
      : { base: "temple_wall", decal: (x * 11 + y * 5) % 7 === 0 ? "wall_worn_decal" : undefined }),
    doorAt: () => ({ base: "temple_wall", decal: "door_closed_obj" }),
    torchAt: templeTorchAt,
    ceiling: "temple_ceiling",
    water: "village_water",
    stairs: { base: "temple_floor", decal: "stairs_decal" },
    floorTint: 0x9aa4b0, wallTint: 0xa8b2c2, ceilingTint: 0x525a6e, waterTint: 0x3e6272,
  };
}

export const DUNGEONS: Record<DungeonId, DungeonDef> = {
  fortress: {
    id: "fortress",
    name: "고블린 요새",
    badge: "탐험 모드 — 고블린 요새",
    enterLog: "일행이 던전에 발을 들였다. 발소리가 어둠 속으로 스며든다…",
    map: fortressMap,
    start: START,
    normalSpawns: NORMAL_SPAWNS,
    symbolSpawns: SYMBOL_SPAWNS,
    pois: POIS,
    props: [],
    theme: fortressTheme,
    signText: "「북서쪽 방에 나그네의 보물이. 북동쪽 심부의 계단 아래, 지하 알현실에 주술사가 도사린다」",
    stairs: { prompt: "[Z] 지하로 내려간다 — 그름바크의 알현실", go: () => nav.explore("fortressB1") },
    chests: {
      c1: {
        poi: "c1",
        loot: () => {
          G.flags.goblinOrders = true;
          G.gold += 60; G.items.potion++;
          return [{ text: "일행은 60 G와 치유 물약, 봉인된 「고블린 작전 문서」를 손에 넣었다! 서명 대신 낯선 인장만 찍혀 있다…", color: C.border }];
        },
        notify: { t: "collect", item: "goblin_orders" },
      },
      hidden: {
        poi: "hidden",
        trapDmg: 22,
        loot: () => {
          G.gold += 240; G.items.mpotion++;
          return [{ text: "일행은 240 G와 마나 물약을 손에 넣었다!", color: C.border }];
        },
        notify: { t: "reach", poi: "hidden" },
      },
    },
    hiddenChestId: "hidden",
    intros: [],
    symbols: {
      orc: { toast: { text: "일행이 길목을 지키던 정예를 물리쳤다!", color: C.elite } },
      sentry: { toast: { text: "일행이 지하 계단을 지키던 파수병을 쓰러뜨렸다. 계단이 열렸다!", color: C.elite } },
    },
    state: () => G.explore,
    exit: { prompt: "[Z] 마을로 돌아간다", go: () => nav.town() },
  },
  fortressB1: {
    id: "fortressB1",
    name: "고블린 요새 지하",
    badge: "탐험 모드 — 고블린 요새 지하",
    enterLog: "계단 아래는 공기부터 다르다. 향 타는 냄새와 낮은 주문 소리가 통로를 타고 흐른다…",
    map: basementMap,
    start: BASEMENT_START,
    normalSpawns: BASEMENT_NORMAL_SPAWNS,
    symbolSpawns: BASEMENT_SYMBOL_SPAWNS,
    pois: BASEMENT_POIS,
    props: [],
    theme: basementTheme,
    signText: "「서쪽 알현실 — 그름바크 님 외 출입 금지. 공물은 문 앞에 두고 물러날 것」",
    chests: {
      b1: {
        poi: "b1",
        loot: () => {
          G.gold += 220; G.items.potion++;
          return [{ text: "일행은 알현실의 공물 궤에서 220 G와 치유 물약을 손에 넣었다!", color: C.border }];
        },
      },
      vault: {
        poi: "vault",
        trapDmg: 26,
        loot: () => {
          G.gold += 420; G.items.mpotion++;
          return [{ text: "일행은 밀실의 사물함에서 420 G와 마나 물약을 손에 넣었다!", color: C.border }];
        },
        notify: { t: "reach", poi: "vault" },
      },
    },
    hiddenChestId: "vault",
    intros: [{
      symbol: "lord",
      caption: "지하 알현실",
      near: 2,
      retreat: { x: 12, y: 3, facing: 1 },
      nodes: [
        { name: "???", portrait: "dark", text: "향 연기 너머, 천 예복의 고블린이 지팡이를 짚고 몸을 돌린다. 「…쥐새끼들이 알현실까지 기어들어 왔군.」" },
        {
          text: "마을을 약탈하고 사람들을 가둔 원흉 — 이 소굴의 주인이 모습을 드러냈다. 저 주술사를 쓰러뜨리면 크로스베일의 위협도 끝난다.",
          choices: [
            { label: "무기를 뽑는다 (전투 개시)", goto: 2 },
            { label: "물러난다", effect: () => { G._fled = true; }, goto: "end" },
          ],
        },
        { name: "그름바크 (고블린 주술사)", portrait: "dark", text: "친위대여, 앞을 막아라! 크로스베일을 삼키기 전에… 먼저 너희를 불꽃과 어둠에 바치마!" },
      ],
    }],
    symbols: {
      guard1: { toast: { text: "친위대 하나가 무너졌다!", color: C.elite } },
      guard2: { toast: { text: "친위대 하나가 무너졌다!", color: C.elite } },
      lord: {
        finish: () => {
          if (!G.flags.ending) { G.flags.ending = true; nav.ending(); }
          else nav.town();
        },
      },
    },
    state: () => G.basement,
    exit: { prompt: "[Z] 계단을 올라 지상으로", go: () => nav.explore("fortress", { x: 21, y: 3, facing: 2 }) },
  },
  temple: {
    id: "temple",
    name: "버려진 사원",
    badge: "탐험 모드 — 버려진 사원",
    enterLog: "일행이 무너진 정문을 지나 성소에 들어섰다. 파도 소리가 돌벽 너머에서 웅웅 울린다…",
    map: templeMap,
    start: TEMPLE_START,
    normalSpawns: TEMPLE_NORMAL_SPAWNS,
    symbolSpawns: TEMPLE_SYMBOL_SPAWNS,
    pois: TEMPLE_POIS,
    props: TEMPLE_PROPS,
    theme: templeTheme,
    signText: "「순례자여, 서쪽 회랑은 바다에 잠겼다. 북쪽 제단에는… (뒷글자는 검게 지워져 있다)」",
    chests: {
      reliquary: {
        poi: "reliquary",
        loot: () => {
          G.gold += 180; G.items.potion++;
          return [{ text: "일행은 물때 낀 성물함에서 180 G와 치유 물약을 건져 냈다!", color: C.border }];
        },
      },
      crypt_cache: {
        poi: "crypt_cache",
        trapDmg: 20,
        loot: () => {
          G.gold += 320; G.items.mpotion++;
          return [{ text: "일행은 교단이 감춘 헌금 궤에서 320 G와 마나 물약을 손에 넣었다!", color: C.border }];
        },
        notify: { t: "reach", poi: "crypt_cache" },
      },
    },
    hiddenChestId: "crypt_cache",
    intros: [{
      symbol: "fallen_bishop",
      caption: "버려진 사원의 제단",
      near: 2,
      retreat: { x: 8, y: 5, facing: 1 },
      nodes: [
        { name: "???", portrait: "dark", text: "갈라진 제단 앞에서 썩은 향 냄새와 함께 검은 예복의 사제가 몸을 일으킨다." },
        {
          name: "되살아난 주교 카르마스", portrait: "dark", text: "산 자들이 진실을 탐하다니… 이 사원의 마지막 기도에 너희 이름도 새겨 주마.",
          choices: [
            { label: "무기를 든다 (전투 개시)", goto: 2 },
            { label: "물러난다", effect: () => { G._fled = true; }, goto: "end" },
          ],
        },
        { text: "일행이 무기를 고쳐 잡고 제단 앞으로 나섰다. 되살아난 주교의 의식을 여기서 끊어야 한다." },
      ],
    }],
    symbols: {
      warden: { toast: { text: "일행이 제단을 지키던 촉수꽃을 베어 냈다!", color: C.elite } },
      fallen_bishop: {
        onKilled: () => { G.flags.bishopDefeated = true; },
        toast: {
          text: "주교를 붙들던 힘이 흩어졌다. 일행은 제단 아래에서 교단과 희생자들의 기록을 확보했다 — 에버모어 성에 보고해야 한다.",
          color: C.boss,
        },
      },
    },
    state: () => G.temple,
    exit: { prompt: "[Z] 해안길로 나간다", go: () => nav.field("coastRoad") },
  },
};
