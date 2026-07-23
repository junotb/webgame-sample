/* =====================================================================
 * tiles.ts — 던전·마을 타일 텍스처 (public/assets/world에서 슬라이스)
 *  시트(16px 그리드):
 *   tileset_walls_floor        벽·바닥·계단·창/문 파사드
 *   props_door_chest_animation 문 개폐·상자 프레임 (빌보드용)
 *   props_objects              술통·짐짝 등 소품
 *   tileset_water_coast_animation  물
 *   decor_wall/floor_cracks        풍화·포장 데칼 (투명부 있음 — 베이스 위에 겹침)
 *   fx_fire_brazier_animation      횃불 불꽃 6프레임
 *  *_decal 이름은 오버레이 전용: 단독으로 쓰지 말고 베이스 타일 위에 그린다.
 * ===================================================================== */
import * as PIXI from "pixi.js";

export const TILE = 16;

const SHEET_SRC = {
  walls: "/assets/world/tilesets/dungeon/walls_floor.png",
  doorAnim: "/assets/world/props/buildings/door_chest_animation.png",
  props: "/assets/world/props/common/objects.png",
  water: "/assets/world/tilesets/nature/water_coast_animation.png",
  wallCracks: "/assets/world/decals/wall/cracks.png",
  floorCracks: "/assets/world/decals/floor/cracks.png",
  brazier: "/assets/world/effects/fire/brazier_animation.png",
  facilityEmblems: "/assets/world/props/buildings/facility_emblems.png",
  villageFacades: "/assets/world/tilesets/village/facades.png",
  villageGround: "/assets/world/tilesets/village/ground.png",
  villageWater: "/assets/world/tilesets/village/water.png",
  townBackgrounds: "/assets/world/backgrounds/crossvale_valley.png",
  trees: "/assets/world/props/nature/trees.png",
  bushes: "/assets/world/props/nature/bushes.png",
  flowers: "/assets/world/props/nature/flowers.png",
  cave: "/assets/world/tilesets/cave/ground.png",
  fountainProp: "/assets/world/props/structures/fountain.png",
  wellProp: "/assets/world/props/village/well.png",
  goblinSky1: "/assets/world/backgrounds/goblin_valley_sky_01.png",
  goblinSky2: "/assets/world/backgrounds/goblin_valley_sky_02.png",
  goblinSky3: "/assets/world/backgrounds/goblin_valley_sky_03.png",
  barbarianOutpost: "/assets/world/tilesets/outposts/barbarian.png",
  townStructures: "/assets/world/tilesets/town/structures.png",
  stoneGate: "/assets/world/props/buildings/stone_gate_animation.png",
  fenceGate: "/assets/world/props/village/fence_gate_animation.png",
  beachOutpost: "/assets/world/tilesets/outposts/beach.png",
  valleyRocks: "/assets/world/tilesets/nature/rocks.png",
  hunterCamp: "/assets/world/props/outposts/huntercamp_small.png",
  outdoorCampfire: "/assets/world/props/outdoor/campfire_01_animation.png",
  templeInside: "/assets/world/tilesets/temple/inside_01.png",
  templeWalls: "/assets/world/tilesets/temple/walls_grey.png",
  templeGround: "/assets/world/tilesets/temple/ground.png",
  templeOutpost: "/assets/world/tilesets/outposts/temple.png",
  cryptTombs: "/assets/world/tilesets/crypt/tombs.png",
  templeFire: "/assets/world/effects/lights/temple_fire_animation.png",
  sandGround: "/assets/world/tilesets/biomes/sand_ground.png",
  coastSky1: "/assets/world/backgrounds/coast_road_sky_01.png",
  coastSky2: "/assets/world/backgrounds/coast_road_sky_02.png",
  coastSky3: "/assets/world/backgrounds/coast_road_sky_03.png",
  evermoreSky1: "/assets/world/backgrounds/evermore_sky_01.png",
  evermoreSky2: "/assets/world/backgrounds/evermore_sky_02.png",
  royalHallWall: "/assets/world/backgrounds/royal_hall_wall.png",
  royalFountain: "/assets/world/props/structures/royal_fountain.png",
  titleSky1: "/assets/world/backgrounds/title_sky_01.png",
  titleSky2: "/assets/world/backgrounds/title_sky_02.png",
  titleSky3: "/assets/world/backgrounds/title_sky_03.png",
  natureA2: "/assets/world/tilesets/nature/a2_nature.png",
  swampWater: "/assets/world/tilesets/swamp/water_animation.png",
  swampPlants: "/assets/world/tilesets/nature/nature_water_swamp_plants.png",
  swampShrooms: "/assets/world/props/swamp/swamp_mushrooms.png",
  glowForest: "/assets/world/tilesets/nature/nature_glowing_forest.png",
  mushForest: "/assets/world/tilesets/nature/mushroom_forest.png",
  hermanForestBg: "/assets/world/backgrounds/herman_forest.png",
} as const;
type SheetName = keyof typeof SHEET_SRC;

/** 테스트용 — 시트 경로 목록 (public 기준) */
export const SHEET_FILES: string[] = Object.values(SHEET_SRC);

interface FrameDef { s: SheetName; x: number; y: number; w: number; h: number }

const FRAMES = {
  /* ---- 벽·천장 ---- */
  wall: { s: "walls", x: 8, y: 48, w: 32, h: 28 },
  ceiling: { s: "walls", x: 8, y: 8, w: 32, h: 24 },
  wall_worn_decal: { s: "wallCracks", x: 0, y: 224, w: 32, h: 32 },
  wall_worn2_decal: { s: "wallCracks", x: 64, y: 224, w: 32, h: 32 },
  wall_window_decal: { s: "walls", x: 80, y: 336, w: 32, h: 32 },
  /* ---- 바닥 ---- */
  floor: { s: "walls", x: 16, y: 96, w: 16, h: 16 },
  floor_crack: { s: "walls", x: 0, y: 336, w: 16, h: 16 },
  floor_rubble: { s: "walls", x: 176, y: 336, w: 16, h: 16 },
  pave_decal: { s: "floorCracks", x: 0, y: 48, w: 32, h: 32 },
  pave2_decal: { s: "floorCracks", x: 64, y: 48, w: 32, h: 32 },
  stairs_decal: { s: "walls", x: 160, y: 128, w: 16, h: 16 },
  water: { s: "water", x: 96, y: 432, w: 16, h: 16 },
  /* ---- 오브젝트 (빌보드, 발밑 기준으로 쓰려면 anchor(0.5,1)) ---- */
  door_obj: { s: "doorAnim", x: 128, y: 32, w: 32, h: 32 },      // 열린 아치 — 출구 포탈·입구 게이트
  door_closed_obj: { s: "doorAnim", x: 0, y: 96, w: 32, h: 32 }, // 닫힌 목문 — 던전 잠긴 문(+) 칸의 벽면 데칼
  chest_obj: { s: "doorAnim", x: 0, y: 128, w: 32, h: 32 },
  barrel_obj: { s: "props", x: 96, y: 64, w: 16, h: 32 },
  crate_obj: { s: "props", x: 256, y: 0, w: 32, h: 32 },
  /* ---- 마을 기능성 건물 벽면 엠블럼 (4×2, 96×96 프레임) ---- */
  facility_emblem_weapon: { s: "facilityEmblems", x: 0, y: 0, w: 96, h: 96 },
  facility_emblem_armor: { s: "facilityEmblems", x: 96, y: 0, w: 96, h: 96 },
  facility_emblem_item: { s: "facilityEmblems", x: 192, y: 0, w: 96, h: 96 },
  facility_emblem_inn: { s: "facilityEmblems", x: 288, y: 0, w: 96, h: 96 },
  facility_emblem_stable: { s: "facilityEmblems", x: 0, y: 96, w: 96, h: 96 },
  facility_emblem_bounty: { s: "facilityEmblems", x: 96, y: 96, w: 96, h: 96 },
  facility_emblem_elements: { s: "facilityEmblems", x: 192, y: 96, w: 96, h: 96 },
  facility_emblem_spirit: { s: "facilityEmblems", x: 288, y: 96, w: 96, h: 96 },
  /* ---- 마을 외관 (style_48 공통 아틀라스) ---- */
  village_wall_brick: { s: "villageFacades", x: 0, y: 0, w: 96, h: 96 },
  village_wall_plaster: { s: "villageFacades", x: 96, y: 0, w: 96, h: 96 },
  village_wall_stone: { s: "villageFacades", x: 192, y: 0, w: 96, h: 96 },
  village_wall_timber: { s: "villageFacades", x: 288, y: 0, w: 96, h: 96 },
  village_roof_red: { s: "villageFacades", x: 0, y: 96, w: 96, h: 96 },
  village_roof_blue: { s: "villageFacades", x: 96, y: 96, w: 96, h: 96 },
  village_window_arch: { s: "villageFacades", x: 0, y: 480, w: 48, h: 96 },
  village_window_small: { s: "villageFacades", x: 48, y: 528, w: 48, h: 48 },
  village_window_wide: { s: "villageFacades", x: 96, y: 528, w: 96, h: 48 },
  village_window_flower: { s: "villageFacades", x: 0, y: 576, w: 48, h: 96 },
  village_door_wood: { s: "villageFacades", x: 48, y: 576, w: 48, h: 96 },
  village_door_arch: { s: "villageFacades", x: 96, y: 576, w: 48, h: 96 },
  /* ---- 크로스베일 초지·대로·개울 (style_48 48px 그리드) ---- */
  village_grass: { s: "villageGround", x: 0, y: 0, w: 48, h: 48 },
  village_grass_alt: { s: "villageGround", x: 48, y: 48, w: 48, h: 48 },
  village_paving: { s: "villageGround", x: 144, y: 48, w: 48, h: 48 },
  village_cobble: { s: "villageGround", x: 240, y: 48, w: 48, h: 48 },
  village_cobble_alt: { s: "villageGround", x: 192, y: 48, w: 48, h: 48 },
  village_water: { s: "villageWater", x: 0, y: 64, w: 48, h: 48 },
  crossvale_valley_bg: { s: "townBackgrounds", x: 0, y: 0, w: 576, h: 324 },
  /* ---- 목가적 마을·필드 자연물 (종류별 atlas, 프레임은 원본 크기 유지) ---- */
  /* 자연물 프레임은 투명 여백을 잘라낸 실경계 — anchor(0.5,1) 빌보드가 바닥에 붙는다 */
  tree_01: { s: "trees", x: 3, y: 7, w: 91, h: 102 },
  tree_02: { s: "trees", x: 104, y: 1, w: 77, h: 110 },
  tree_03: { s: "trees", x: 19, y: 123, w: 62, h: 90 },
  tree_04: { s: "trees", x: 130, y: 143, w: 29, h: 61 },
  bush_01: { s: "bushes", x: 1, y: 5, w: 30, h: 24 },
  bush_02: { s: "bushes", x: 33, y: 5, w: 30, h: 24 },
  flower_01: { s: "flowers", x: 1, y: 4, w: 14, h: 9 },
  flower_02: { s: "flowers", x: 17, y: 4, w: 13, h: 9 },
  /* ---- 고블린 요새(동굴) 표면 — cave/ground.png의 이음매 없는 암반 블록에서 슬라이스 ---- */
  cave_floor: { s: "cave", x: 88, y: 208, w: 16, h: 16 },   // 회색 암반 바닥
  cave_wall: { s: "cave", x: 272, y: 440, w: 32, h: 28 },   // 갈색 암벽
  cave_ceiling: { s: "cave", x: 80, y: 470, w: 32, h: 24 }, // 어두운 암반 천장
  /* ---- 마을 구조물 프롭 (빌보드) ---- */
  fountain_obj: { s: "fountainProp", x: 0, y: 0, w: 92, h: 68 }, // 둥근 돌 분수 (원본 전체 — 눕힌 느낌은 그릴 때 세로로 눌러서 낸다)
  well_obj: { s: "wellProp", x: 2, y: 8, w: 50, h: 48 },         // 지붕 달린 돌우물 (투명 여백 제외)
  /* ---- 고블린 계곡길 — 야영지·해안 전용 비주얼 ---- */
  goblin_sky_base: { s: "goblinSky1", x: 0, y: 0, w: 576, h: 324 },
  goblin_sky_cloud_back: { s: "goblinSky2", x: 0, y: 0, w: 576, h: 324 },
  goblin_sky_cloud_near: { s: "goblinSky3", x: 0, y: 0, w: 576, h: 324 },
  /* 시트의 이웃 조각을 걸치지 않도록 각 프롭의 실제 그림 경계(연결 픽셀 bbox)로 자른다 */
  bandit_hideout_obj: { s: "hunterCamp", x: 10, y: 28, w: 116, h: 175 }, // 왼쪽 야영 장면만 — 오른쪽 건조대·그루터기는 별개 소품
  goblin_tent_obj: { s: "barbarianOutpost", x: 240, y: 192, w: 140, h: 100 }, // 아래 화살 조각(y292~)은 잘라낸다
  /* 뿔해골 뼈 토템 — 이전 좌표(48,352)는 머리·장대·해골 세 조각을 걸쳐 잘라 조각이 떠 보였다 */
  goblin_totem_obj: { s: "barbarianOutpost", x: 52, y: 628, w: 38, h: 140 }, // 오른쪽 이웃 뼈 기둥 조각 제외
  goblin_bone_gate_obj: { s: "barbarianOutpost", x: 8, y: 480, w: 84, h: 141 }, // 좌우 기둥 발끝(620)까지
  shore_boat_obj: { s: "beachOutpost", x: 628, y: 231, w: 132, h: 49 }, // 선체 밑바닥까지 (이전엔 아래 14px 잘림)
  shore_dock_obj: { s: "beachOutpost", x: 624, y: 576, w: 144, h: 192 }, // 상판 머리까지 (이전엔 위 16px 잘림)
  valley_rock_obj: { s: "valleyRocks", x: 297, y: 6, w: 80, h: 69 }, // 투명 여백 제외
  /* ---- 맵 입구 프롭 (빌보드, 투명 여백 제외 실경계) ---- */
  ruin_column_obj: { s: "townStructures", x: 488, y: 0, w: 37, h: 96 },  // 이끼 낀 홈기둥
  ruin_pillar_obj: { s: "townStructures", x: 488, y: 96, w: 38, h: 96 }, // 이끼 덮인 각기둥
  ruin_stump_obj: { s: "townStructures", x: 385, y: 96, w: 47, h: 48 },  // 부러진 기둥 밑동
  stone_gate_obj: { s: "stoneGate", x: 24, y: 303, w: 100, h: 80 },      // 열린 석문 — 문 안이 뚫려 뒤 풍경이 보인다
  fence_gate_obj: { s: "fenceGate", x: 480, y: 48, w: 48, h: 42 },       // 닫힌 나무 울타리문
  fence_wing_obj: { s: "fenceGate", x: 48, y: 72, w: 48, h: 24 },        // 좌우 울타리 날개 (중앙 빈칸이 문 자리)
  /* 캠프파이어 3프레임 — 흔들림이 안 튀도록 세 프레임 공통 실경계로 자른다 */
  campfire_obj_0: { s: "outdoorCampfire", x: 12, y: 24, w: 22, h: 24 },
  campfire_obj_1: { s: "outdoorCampfire", x: 60, y: 24, w: 22, h: 24 },
  campfire_obj_2: { s: "outdoorCampfire", x: 108, y: 24, w: 22, h: 24 },
  /* ---- 서녘 해안길 — 모래·하늘·버려진 어촌 프롭 ---- */
  sand_floor: { s: "sandGround", x: 0, y: 0, w: 48, h: 48 },        // 물결 모래
  coast_sky_base: { s: "coastSky1", x: 0, y: 0, w: 576, h: 324 },
  coast_sky_cloud_back: { s: "coastSky2", x: 0, y: 0, w: 576, h: 324 },
  coast_sky_cloud_near: { s: "coastSky3", x: 0, y: 0, w: 576, h: 324 },
  shore_netline_obj: { s: "beachOutpost", x: 632, y: 0, w: 136, h: 192 }, // 생선 널린 건조줄
  shore_net_obj: { s: "beachOutpost", x: 520, y: 88, w: 112, h: 80 },    // 낮은 그물 울짱
  /* ---- 에버모어 성 — 푸른 황혼 하늘(정적 베이스 + 흐르는 구름)·왕도 프롭 ---- */
  evermore_sky_base: { s: "evermoreSky1", x: 0, y: 0, w: 576, h: 324 },
  evermore_sky_clouds: { s: "evermoreSky2", x: 0, y: 0, w: 576, h: 324 },
  royal_hall_wall: { s: "royalHallWall", x: 0, y: 0, w: 576, h: 324 },   // 알현실 이벤트 일러스트
  royal_fountain_obj: { s: "royalFountain", x: 0, y: 0, w: 285, h: 171 }, // 왕도 대분수 (배경 원화에서 추출)
  /* ---- 버려진 사원 — 회색 석조 표면 (temple/walls_grey·ground, 48px 그리드) ---- */
  temple_wall: { s: "templeWalls", x: 208, y: 296, w: 32, h: 28 },        // 벽돌 석벽
  temple_wall_ornate: { s: "templeWalls", x: 396, y: 152, w: 32, h: 28 }, // 그리스 문양 벽
  temple_ceiling: { s: "templeWalls", x: 400, y: 8, w: 32, h: 24 },
  temple_floor: { s: "templeGround", x: 120, y: 312, w: 48, h: 48 },       // 매끈한 판석
  temple_floor_crack: { s: "templeGround", x: 120, y: 480, w: 48, h: 48 }, // 갈라진 판석
  /* ---- 사원 프롭 (빌보드, 투명 여백 제외 실경계) ---- */
  temple_gate_obj: { s: "templeOutpost", x: 0, y: 370, w: 340, h: 395 },   // 회색 대신전 정면
  temple_shrine_obj: { s: "templeOutpost", x: 0, y: 150, w: 300, h: 220 }, // 작은 석조 사당
  temple_pillar_obj: { s: "templeInside", x: 194, y: 178, w: 44, h: 174 }, // 홈 파인 석주
  temple_brazier_obj: { s: "templeInside", x: 113, y: 8, w: 55, h: 130 },  // 불 밝힌 성화대
  temple_altar_obj: { s: "templeInside", x: 483, y: 240, w: 139, h: 250 }, // 뱀 문양 옥좌 제단
  temple_relic_obj: { s: "templeInside", x: 640, y: 560, w: 88, h: 100 },  // 둥근 문장 성물
  crypt_tomb_obj: { s: "cryptTombs", x: 577, y: 24, w: 94, h: 69 },        // 뿔 달린 석관
  crypt_cross_obj: { s: "cryptTombs", x: 481, y: 576, w: 55, h: 112 },     // 십자 묘석
  /* 혼불 성화 3프레임 — 푸른 불꽃 받침, 세 프레임 공통 실경계 */
  soulflame_obj_0: { s: "templeFire", x: 298, y: 131, w: 28, h: 61 },
  soulflame_obj_1: { s: "templeFire", x: 346, y: 131, w: 28, h: 61 },
  soulflame_obj_2: { s: "templeFire", x: 394, y: 131, w: 28, h: 61 },
  /* ---- 자연 지표면 (a2_nature 오토타일 — 각 블록의 좌상단 48px이 이음매 없는 채움 타일) ---- */
  forest_grass_floor: { s: "natureA2", x: 0, y: 144, w: 48, h: 48 },  // 짙은 숲그늘 풀
  swamp_mud_floor: { s: "natureA2", x: 0, y: 288, w: 48, h: 48 },     // 검붉은 수렁 진흙
  trunk_wall: { s: "natureA2", x: 592, y: 208, w: 64, h: 64 },        // 빽빽한 나무줄기 벽
  swamp_water: { s: "swampWater", x: 24, y: 64, w: 48, h: 48 },       // 탁한 늪물 (1프레임 내부)
  /* ---- 늪 프롭 (빌보드, 투명 여백 제외 실경계) ---- */
  swamp_willow_obj: { s: "swampPlants", x: 406, y: 148, w: 109, h: 185 },  // 이끼 늘어진 버드나무
  swamp_willow2_obj: { s: "swampPlants", x: 530, y: 155, w: 103, h: 179 }, // 수양버들 (가지 늘어짐)
  swamp_deadtree_obj: { s: "swampPlants", x: 674, y: 170, w: 92, h: 164 }, // 잎 진 고사목
  swamp_snag_obj: { s: "swampPlants", x: 576, y: 625, w: 94, h: 142 },     // 뿌리 드러난 옹이나무
  swamp_lilypad_obj: { s: "swampPlants", x: 99, y: 200, w: 91, h: 70 },    // 큰 수련잎
  swamp_shroom_tall_obj: { s: "swampShrooms", x: 12, y: 32, w: 52, h: 189 },  // 망사 갓 장대버섯
  swamp_shroom_violet_obj: { s: "swampShrooms", x: 129, y: 3, w: 59, h: 93 }, // 보랏빛 삿갓버섯
  swamp_shroom_brown_obj: { s: "swampShrooms", x: 196, y: 6, w: 54, h: 89 },  // 넓적 갈색버섯
  /* ---- 빛숲 프롭 (nature_glowing_forest — 등불 열매·수정·발광 풀) ---- */
  glow_tree_big_obj: { s: "glowForest", x: 98, y: 236, w: 141, h: 194 },     // 등불 열매 큰 나무
  glow_tree_lantern_obj: { s: "glowForest", x: 249, y: 242, w: 127, h: 188 }, // 맨가지 등불나무
  glow_tree_small_obj: { s: "glowForest", x: 1, y: 230, w: 91, h: 106 },      // 작은 등불나무
  glow_crystal_purple_obj: { s: "glowForest", x: 580, y: 217, w: 57, h: 83 },
  glow_crystal_green_obj: { s: "glowForest", x: 674, y: 217, w: 59, h: 83 },
  glow_crystal_blue_obj: { s: "glowForest", x: 722, y: 217, w: 40, h: 83 },
  glow_grass_obj: { s: "glowForest", x: 447, y: 529, w: 115, h: 47 },         // 오색 발광 풀숲
  giant_mushroom_obj: { s: "mushForest", x: 490, y: 29, w: 253, h: 259 },     // 거대 갈색 버섯
  mush_stool_blue_obj: { s: "mushForest", x: 9, y: 480, w: 75, h: 96 },       // 푸른 갓 버섯
  mush_stool_brown_obj: { s: "mushForest", x: 0, y: 576, w: 84, h: 96 },      // 갈색 갓 버섯
  /* ---- 은둔림 배경 — 가을빛 숲 원경 (정적 1장) ---- */
  herman_forest_bg: { s: "hermanForestBg", x: 0, y: 0, w: 576, h: 324 },
  /* ---- 타이틀 — 푸른 달밤 (별하늘 베이스 + 달 프롭 + 흐르는 구름) ---- */
  title_sky_base: { s: "titleSky1", x: 0, y: 0, w: 576, h: 324 },
  title_sky_moon: { s: "titleSky2", x: 216, y: 52, w: 152, h: 164 }, // 달 실경계 + 여유 — 위치를 자유 배치하는 프롭
  title_sky_clouds: { s: "titleSky3", x: 0, y: 0, w: 576, h: 324 },
} as const satisfies Record<string, FrameDef>;
export type TileName = keyof typeof FRAMES;

/* 횃불 불꽃 — fx_fire_brazier 2번째 열(44×48), 세로 6프레임 */
export const FLAME_N = 6;
const flameFrame = (i: number): FrameDef => ({ s: "brazier", x: 44, y: i * 48, w: 44, h: 48 });

const tex: Record<string, PIXI.Texture> = {};
const flameTexs: PIXI.Texture[] = [];

/** boot에서 1회 호출 — 시트 로드 후 프레임 텍스처로 슬라이스 */
export async function loadTiles(): Promise<void> {
  const sheets: Record<string, PIXI.Texture> = await PIXI.Assets.load(
    (Object.keys(SHEET_SRC) as SheetName[]).map((k) => ({
      alias: `tiles-${k}`,
      src: SHEET_SRC[k],
      data: { scaleMode: "nearest" as const },
    })),
  );
  const cut = (f: FrameDef) => new PIXI.Texture({
    source: sheets[`tiles-${f.s}`].source,
    frame: new PIXI.Rectangle(f.x, f.y, f.w, f.h),
  });
  for (const [name, f] of Object.entries(FRAMES)) tex[name] = cut(f);
  flameTexs.length = 0;
  for (let i = 0; i < FLAME_N; i++) flameTexs.push(cut(flameFrame(i)));
}

export function tileTex(name: TileName): PIXI.Texture {
  const t = tex[name];
  if (!t) throw new Error(`tiles: "${name}" 미로드 — boot의 loadTiles() 이후 사용 가능`);
  return t;
}

export function flameTex(i: number): PIXI.Texture {
  if (!flameTexs.length) throw new Error("tiles: 불꽃 미로드 — boot의 loadTiles() 이후 사용 가능");
  return flameTexs[((i % FLAME_N) + FLAME_N) % FLAME_N];
}

export function tileSprite(name: TileName, scale = 2): PIXI.Sprite {
  const s = new PIXI.Sprite(tileTex(name));
  s.scale.set(scale);
  return s;
}
