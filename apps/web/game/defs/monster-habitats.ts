/* =====================================================================
 * defs/monster-habitats.ts — 몬스터 에셋 분류와 맵별 서식 규칙
 *
 * 전투 수치(ENEMY_DEFS)와 별개로, 보유 아이콘 전체를 어느 지역에 배치할지
 * 결정하는 콘텐츠 기준이다. 새 몬스터를 추가할 때 카테고리와 권장 서식지를
 * 먼저 정하면 맵의 생태 테마가 무너지지 않는다.
 * ===================================================================== */

export type MonsterCategory =
  | "fungus"
  | "plant"
  | "ooze"
  | "beast"
  | "humanoid"
  | "undead"
  | "spirit";

export const MONSTER_CATEGORY_NAME: Record<MonsterCategory, string> = {
  fungus: "균류",
  plant: "식물",
  ooze: "점액",
  beast: "야수·곤충",
  humanoid: "인간형",
  undead: "언데드",
  spirit: "영체",
};

export type MonsterHabitatId =
  | "coastRoad"
  | "goblinValley"
  | "hermanForest"
  | "fortress"
  | "fortressB1"
  | "temple";

export interface MonsterAssetMeta {
  category: MonsterCategory;
  /** 이 에셋으로 신규 적을 만들 때 우선 배치할 맵 */
  habitats: MonsterHabitatId[];
}

const meta = (category: MonsterCategory, ...habitats: MonsterHabitatId[]): MonsterAssetMeta => ({ category, habitats });

/** MONSTER_ICONS.nameEn을 키로 사용하는 전체 에셋 분류표 */
export const MONSTER_ASSET_META: Record<string, MonsterAssetMeta> = {
  Shearcap: meta("fungus", "temple"),
  Pincercap: meta("fungus", "temple", "coastRoad"),
  Facecap: meta("fungus", "temple"),
  Slugcap: meta("fungus", "coastRoad", "temple"),
  Corpsecap: meta("fungus", "coastRoad", "temple"),
  Feelercap: meta("fungus", "temple"),
  Manyheadcap: meta("fungus", "temple"),
  Stingcap: meta("fungus", "coastRoad", "temple"),
  Crawlcap: meta("fungus", "coastRoad", "temple"),
  Spidercap: meta("fungus", "temple"),

  Cindertree: meta("plant", "hermanForest"),
  Snapvine: meta("plant", "hermanForest"),
  Ghostgrass: meta("plant", "hermanForest", "temple"),
  Crystalbloom: meta("plant", "hermanForest"),
  Fangroot: meta("plant", "hermanForest"),
  Gourdcrawler: meta("plant", "hermanForest"),
  Mandrake: meta("plant", "hermanForest"),
  Facebloom: meta("plant", "hermanForest", "temple"),
  Bluebloom: meta("plant", "hermanForest", "coastRoad"),
  Tendrilbloom: meta("plant", "coastRoad", "temple"),
  Berryclump: meta("plant", "hermanForest"),
  Grumpygourd: meta("plant", "hermanForest"),

  Sproutslime: meta("ooze", "hermanForest"),
  Glareslime: meta("ooze", "hermanForest", "goblinValley", "fortress"),
  Bubbleslime: meta("ooze", "coastRoad"),
  Oozeslime: meta("ooze", "fortress", "temple"),
  Puddingslime: meta("ooze", "hermanForest"),
  Slickjelly: meta("ooze", "coastRoad"),
  Weepslime: meta("ooze", "temple"),
  Eyeblob: meta("ooze", "temple", "fortressB1"),
  Dropslime: meta("ooze", "coastRoad", "hermanForest"),

  Burrowrat: meta("beast", "goblinValley", "fortress"),
  Wingspider: meta("beast", "temple", "fortress"),
  Fanghare: meta("beast", "hermanForest", "goblinValley"),
  Redbat: meta("beast", "coastRoad", "fortress"),
  Stagbeetle: meta("beast", "goblinValley", "hermanForest"),
  Spotspider: meta("beast", "hermanForest", "temple"),
  Porterbug: meta("beast", "goblinValley", "fortress"),
  Duskbat: meta("beast", "coastRoad", "temple", "fortressB1"),
  Grassmantis: meta("beast", "hermanForest"),
  Tubbybird: meta("beast", "coastRoad", "hermanForest"),
  Lancewasp: meta("beast", "coastRoad", "goblinValley"),
  Tuskboar: meta("beast", "goblinValley", "hermanForest"),
  Hopperrat: meta("beast", "goblinValley", "fortress"),
  Whitewing: meta("beast", "coastRoad"),
  Mosstoad: meta("beast", "coastRoad", "hermanForest"),

  Bladedwarf: meta("humanoid", "goblinValley", "fortress"),
  Goblinfighter: meta("humanoid", "goblinValley", "fortress", "fortressB1"),
  Goblinrider: meta("humanoid", "goblinValley", "fortress", "fortressB1"),
  Goblinfanatic: meta("humanoid", "goblinValley", "fortress"),
  Goblinoccultist: meta("humanoid", "fortressB1"),
  Voodooshaman: meta("humanoid", "fortressB1", "temple"),
  Fallenbishop: meta("undead", "temple"),
  Frostwraith: meta("spirit", "fortress", "fortressB1", "temple"),
};

/** 맵의 핵심 생태 테마. 현재 조우뿐 아니라 이후 추가 가능한 범위도 포함한다. */
export const MAP_MONSTER_CATEGORIES: Record<MonsterHabitatId, readonly MonsterCategory[]> = {
  coastRoad: ["fungus", "plant", "ooze", "beast"],
  goblinValley: ["humanoid", "beast", "ooze"],
  hermanForest: ["plant", "ooze", "beast"],
  fortress: ["humanoid", "beast", "ooze", "spirit"],
  fortressB1: ["humanoid", "beast", "ooze", "spirit"],
  temple: ["fungus", "plant", "ooze", "beast", "undead", "spirit", "humanoid"],
};

export function monsterCategory(nameEn: string): MonsterCategory | undefined {
  return MONSTER_ASSET_META[nameEn]?.category;
}

export function monsterFitsMap(nameEn: string, mapId: MonsterHabitatId): boolean {
  const data = MONSTER_ASSET_META[nameEn];
  return !!data && data.habitats.includes(mapId) && MAP_MONSTER_CATEGORIES[mapId].includes(data.category);
}
