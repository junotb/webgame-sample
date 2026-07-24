# 에셋 매니페스트: public/assets ← assets-source 출처 추적

런타임 에셋(`public/assets/`)이 어떤 원본(`assets-source/`)에서 왔는지 기록한다.
새 런타임 에셋을 추가하거나 기존 시트를 재합성할 때 이 문서를 함께 갱신한다.

- **확정**: 파일 내용(md5)이 원본과 동일. 스크립트로 재검증 가능.
- **추정**: 이름·내용상 재료로 판단되나 가공(합성·크롭·리스케일)을 거침. 재합성 시 확인 필요.
- **원본 없음**: 외부에서 완성본으로 들여와 `public/`에 직접 추가된 계열.

경로는 모두 `apps/web/` 기준이며 `assets-source/`, `public/assets/` 접두사는 표에서 생략한다.

## 확정 매핑 (원본과 동일)

| 런타임 (public/assets/) | 원본 (assets-source/) |
| --- | --- |
| world/backgrounds/coast_road_sky_01.png | world/backgrounds/cloud_sky/scene_04_daylight_clouds/layer_01.png |
| world/backgrounds/coast_road_sky_02.png | world/backgrounds/cloud_sky/scene_04_daylight_clouds/layer_02.png |
| world/backgrounds/coast_road_sky_03.png | world/backgrounds/cloud_sky/scene_04_daylight_clouds/layer_03.png |
| world/backgrounds/goblin_valley_sky_01.png | world/backgrounds/cloud_sky/scene_04_daylight_clouds/layer_01.png |
| world/backgrounds/goblin_valley_sky_02.png | world/backgrounds/cloud_sky/scene_04_daylight_clouds/layer_02.png |
| world/backgrounds/goblin_valley_sky_03.png | world/backgrounds/cloud_sky/scene_04_daylight_clouds/layer_03.png |
| world/backgrounds/evermore_sky_01.png | world/backgrounds/cloud_sky/scene_02_blue_twilight/layer_01.png |
| world/backgrounds/evermore_sky_02.png | world/backgrounds/cloud_sky/scene_02_blue_twilight/layer_02.png |
| world/backgrounds/royal_hall_wall.png | world/backgrounds/castle_interior/scene_02_royal_hall/layer_03.png |
| world/effects/lights/temple_fire_animation.png | world/effects/lights/temple_fire_animation.png |
| world/effects/magic/magic_circle_animation.png | world/effects/magic/magic_circle_animation.png |
| world/props/buildings/stone_gate_animation.png | world/props/buildings/doors/gate_03_animation.png |
| world/props/village/fence_gate_animation.png | world/props/buildings/doors/gate_fence_animation.png |
| world/props/outdoor/campfire_01_animation.png | world/props/outdoor/campfire_01_animation.png |
| world/props/structures/fountain_statue.png | world/props/structures/fountain_statue_animation.png |
| world/tilesets/dungeon/props.png | world/tilesets/dungeon/dungeon.png |
| world/props/structures/fountain_statue_adult.png | world/props/structures/fountain_statue_adult_animation.png |
| world/props/outposts/huntercamp_small.png | world/tilesets/buildings/special/huntercamp_small.png |
| world/tilesets/biomes/sand_ground.png | world/tilesets/biomes/snow_desert/a2_snow_desert.png |
| world/tilesets/cave/ground.png | world/tilesets/cave/a2_cave.png |
| world/tilesets/crypt/tombs.png | world/tilesets/crypt/crypt_01.png |
| world/tilesets/nature/rocks.png | world/tilesets/nature/rocks.png |
| world/tilesets/outposts/barbarian.png | world/tilesets/outposts/barbarian.png |
| world/tilesets/outposts/beach.png | world/tilesets/outposts/beach.png |
| world/tilesets/outposts/temple.png | world/tilesets/outposts/temple.png |
| world/tilesets/temple/ground.png | world/tilesets/temple/a2_temple.png |
| world/tilesets/temple/inside_01.png | world/tilesets/temple/temple_inside_01.png |
| world/tilesets/temple/walls_grey.png | world/tilesets/temple/a4_temple_02.png |
| world/tilesets/town/structures.png | world/tilesets/town/structure.png |
| world/tilesets/village/ground.png | world/tilesets/village/style_48/ground.png |
| world/tilesets/village/water.png | world/tilesets/village/style_48/water.png |
| world/tilesets/nature/a2_nature.png | world/tilesets/nature/a2_nature.png |
| world/tilesets/nature/nature_water_swamp_plants.png | world/tilesets/nature/nature_water_swamp_plants.png |
| world/tilesets/nature/nature_glowing_forest.png | world/tilesets/nature/nature_glowing_forest.png |
| world/tilesets/nature/mushroom_forest.png | world/tilesets/nature/mushroom_forest.png |
| world/tilesets/swamp/water_animation.png | world/tilesets/swamp/water_animation.png |
| world/props/swamp/swamp_mushrooms.png | world/props/swamp/swamp_mushrooms.png |
| world/backgrounds/herman_forest.png | world/backgrounds/autumn_forest/scene_03_forest/background.png |
| items/icons/consumables.png | items/icons/item_sets/consumables.png |
| items/icons/misc.png | items/icons/item_sets/misc.png |
| items/icons/gems.png | items/icons/material_sets/gems.png |
| items/icons/plants.png | items/icons/material_sets/plants.png |
| items/icons/monster_parts.png | items/icons/material_sets/monster_parts.png |
| items/icons/weapons.png | items/icons/weapon_sets/uniques.png |
| items/icons/armor_leather.png | items/icons/armor_sets/leather.png |
| items/icons/armor_iron.png | items/icons/armor_sets/iron.png |
| items/icons/armor_steel.png | items/icons/armor_sets/steel.png |
| items/icons/armor_special.png | items/icons/armor_sets/special.png |
| items/icons/armor_unique.png | items/icons/armor_sets/unique.png |
| items/icons/accessories.png | items/icons/accessory_sets/accessories.png |

## 추정 매핑 (가공·합성 재료)

| 런타임 (public/assets/) | 추정 원본 (assets-source/) |
| --- | --- |
| world/props/nature/trees.png | world/props/nature/base/tree_01~04.png |
| world/props/nature/bushes.png | world/props/nature/base/bush_01~02.png |
| world/props/nature/flowers.png | world/props/nature/base/flower_01~02.png |
| world/props/buildings/facility_emblems.png | world/props/buildings/facility_signs.png |
| world/props/buildings/door_chest_animation.png | world/props/buildings/doors/door_animation.png 계열 |
| world/props/structures/fountain.png | world/props/structures/fountain_01/02_animation.png |
| world/props/structures/royal_fountain.png | world/props/structures/fountain_statue_*_animation.png |
| world/props/common/objects.png | world/props/village/style_32/objects.png |
| world/effects/fire/brazier_animation.png | world/effects/fire/ (torch·candle 계열) |
| world/tilesets/dungeon/walls_floor.png | world/tilesets/dungeon/walls_floor_variant.png 등 dungeon 계열 |
| world/tilesets/village/facades.png | world/tilesets/village/style_48/walls·roofs·building_decor.png |
| world/tilesets/nature/water_coast_animation.png | world/effects/water/water_shore_animation.png 계열 |
| world/decals/floor/cracks.png, world/decals/wall/cracks.png | world/decals/ (ground·wall 계열) |
| npcs/kael.png | npcs/town/kael.png (96×96 축소) |
| npcs/lokan.png | npcs/town/lokan.png (96×96 축소) |
| npcs/chamberlain.png | npcs/town/chamberlain.png (96×96 축소) |
| npcs/eldwin.png | npcs/town/eldwin.png (96×96 축소) |
| npcs/sister_lia.png | npcs/town/sister_lia.png (96×96 축소) |

마을 NPC 5명은 초상화와 역할을 기준으로 제작한 투명 고해상도 원본에서
96×96 런타임 스프라이트를 축소 생성했다. 기존 16×16 idle 시트는 픽셀 밀도가
마을 아트와 맞지 않아 NPC 소스·배포본에서 제외했다. 보스용 voodoo 시트는
`assets-source/bosses/voodoo`로 분리했다.

## 원본 없음 (public/에 직접 추가)

| 런타임 계열 | 비고 |
| --- | --- |
| monsters/icons/*.png (54개) | 완성본을 직접 추가. `game/defs/enemies.ts`의 MONSTER_ICONS 및 `game/defs/monster-habitats.ts`의 카테고리·서식지와 연동 |
| monsters/bosses/goblin_*_animation.png (15개) | 고블린 킹·로드·블레이드·자이언트 보스 후보의 런타임 애니메이션 시트. 개별 원본 프레임은 `assets-source/monsters/sprites/goblin_bosses/`에 보존 |
| monsters/large/goblinblade.png, goblinlord.png | `goblin_bosses/goblin_blade/idle/idle_0000.png`·`goblin_lord/idle/idle_0000.png`의 투명 여백을 트리밍한 고해상도 정지컷 (43×80·72×111). 카탈로그 nameEn(Goblinblade·Goblinlord)이 원본 폴더명을 따른다. `game/monsters.ts`의 HIRES_MONSTERS와 연동 |
| portraits/halfling_male_*.png, halfling_female_*.png, goblin_*.png (96개) | `game/portraits.ts`의 개수·인덱스 규칙과 연동 |

## 출처 미확인

| 런타임 (public/assets/) | 메모 |
| --- | --- |
| world/backgrounds/crossvale_valley.png | assets-source 배경 세트와 해시 불일치. 합성 또는 외부 원본 추정 |
| world/props/village/well.png | 대응 원본 미발견 |

## 검증 방법

`game/__tests__/assets.test.ts`의 "에셋 매니페스트" 테스트가 이 문서를 파싱해 자동 검증한다:

- **확정 매핑**: 양쪽 파일 존재 + md5 일치
- **추정 매핑·출처 미확인**: 런타임 파일 존재

표를 갱신하면 `npx vitest run game/__tests__/assets.test.ts`로 확인한다.
