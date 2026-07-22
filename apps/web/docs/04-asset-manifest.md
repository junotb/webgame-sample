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
| npcs/overworked_villager.png | characters/sprites/humans/overworked_villager_animation.png |
| npcs/adventurous_adolescent.png | characters/sprites/humans/adventurous_adolescent_animation.png |
| npcs/boisterous_youth.png | characters/sprites/humans/boisterous_youth_animation.png |
| npcs/elf_wayfarer.png | characters/sprites/elves/elf_wayfarer_animation.png |
| npcs/elf_enchanter.png | characters/sprites/elves/elf_enchanter_animation.png |

`npcs/` 5장(16×16 idle 시트)은 현재 **보류 상태**다 — 1인칭 근접 배율에서 마을 아트(48px 그리드)와
픽셀 밀도가 5~8배 어긋나 `defs/npcs.ts`의 sprite 지정을 내렸다(절차적 그리기 폴백으로 표시).
32~48px급 NPC 팩을 임포트하면 시트 교체 후 재지정한다. 상세는 `game/npc-sprites.ts` 헤더 참고.

## 추정 매핑 (가공·합성 재료)

| 런타임 (public/assets/) | 추정 원본 (assets-source/) |
| --- | --- |
| world/props/nature/trees.png | world/props/nature/base/tree_01~04.png |
| world/props/nature/bushes.png | world/props/nature/base/bush_01~02.png |
| world/props/nature/flowers.png | world/props/nature/base/flower_01~02.png |
| world/props/nature/mushrooms.png | world/props/nature/base/mushroom_01.png |
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

## 원본 없음 (public/에 직접 추가)

| 런타임 계열 | 비고 |
| --- | --- |
| monsters/icons/*.png (54개) | 완성본을 직접 추가. `game/defs/enemies.ts`의 MONSTER_ICONS 및 `game/defs/monster-habitats.ts`의 카테고리·서식지와 연동 |
| portraits/male_*.png, female_*.png (48개) | `game/portraits.ts`의 개수·인덱스 규칙과 연동 |

## 출처 미확인

| 런타임 (public/assets/) | 메모 |
| --- | --- |
| world/backgrounds/crossvale_valley.png | assets-source 배경 세트와 해시 불일치. 합성 또는 외부 원본 추정 |
| world/props/village/well.png | 대응 원본 미발견 |

## 검증 방법

확정 매핑은 아래로 재검증할 수 있다(양쪽 md5 목록을 만들어 해시 교집합 비교):

```bash
cd apps/web
find assets-source public/assets -type f -exec md5sum {} +
```
