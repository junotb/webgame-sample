# 06 — 에셋 관리 가이드

## 두 에셋 루트의 역할

| 위치 | 역할 | 브라우저 로드 |
| --- | --- | --- |
| `assets-source/` | 원본, 편집 가능한 개별 이미지, 후보 에셋과 공급자별 자료 | 아니오 |
| `public/assets/` | 게임에서 실제로 사용하는 최종 PNG와 시트 | 예 |

`assets-source/`를 보존하는 이유는 런타임 파일을 다시 합성하거나 픽셀을 수정할 때 원본 품질과 개별 레이어를 잃지 않기 위해서다. 모든 원본을 `public/`에 복사하지 않는다.

예를 들어 나무 개별 원본은 `assets-source/`에 유지할 수 있지만, 게임에서는 관리하기 쉬운 `public/assets/world/props/nature/trees.png` 한 장만 로드한다.

## 디렉터리 분류

```text
assets-source/
├── ambient/                       배경·환경 이미지
├── characters/sprites/            캐릭터 스프라이트와 애니메이션
├── items/icons/                   장비·재료·소모품 아이콘
├── monsters/                      몬스터 원본
├── npcs/                          NPC 원본
└── world/
    ├── backgrounds/                장면용 배경 완성본과 합성 레이어
    ├── decals/                    바닥·벽 위에 얹는 균열과 흔적
    ├── effects/                   불·빛·마법·물·날씨 효과
    ├── props/                     건물·가구·자연물·차량 등 오브젝트
    └── tilesets/                  지형·건물·지역용 타일 시트

public/assets/
├── monsters/icons/                런타임 몬스터 아이콘
├── portraits/                     파티·NPC 초상화
└── world/
    ├── decals/
    ├── effects/
    ├── props/
    └── tilesets/
```

분류는 “이미지에 무엇이 그려졌는가”보다 “게임에서 어떻게 쓰는가”를 우선한다. 불꽃이 포함된 화로 전체 오브젝트라면 prop, 독립적으로 겹쳐 쓰는 불꽃 프레임이라면 effect다.

공급자나 에셋 팩 구분이 필요하면 `assets-source/`의 역할 디렉터리 아래에 `rasak/` 같은 공급자 하위 디렉터리를 둔다. 공급자명은 런타임 파일명에 반복하지 않는다.

## 파일명 규칙

기본 형식은 소문자 `snake_case`다.

```text
material_skull.png
basic_humanoid_set_01_2x.png
door_chest_animation.png
a4_temple_02.png
facility_emblems.png
```

규칙:

1. 이름만 보고 용도를 알 수 있는 의미 기반 명칭을 사용한다.
2. 디렉터리가 이미 `icons/`라면 의미 없는 `icon_` 접두사를 붙이지 않는다.
3. 숫자 변형은 `_01`, `_02`처럼 두 자리로 맞춘다.
4. 여러 프레임이 들어 있는 애니메이션 시트는 `_animation` 접미사를 사용한다.
5. 같은 종류를 모은 정적 시트는 `trees.png`, `flowers.png`처럼 복수 집합명을 사용한다.
6. 공급자명, `tileset_`, 임시 작업명과 원본의 오타를 최종 파일명에 남기지 않는다.
7. 픽셀 배율이 실제 구분에 필요하면 `_1x`, `_2x`, `_4x`를 마지막에 둔다.

피해야 할 예:

```text
Icon12.png
new_asset_final2.png
Tilesets_Tempel_Rasak.png
tree.PNG
```

## 신규 에셋 정리 절차

1. 아직 분류하지 않은 파일은 `assets-source/temp/`에 둔다.
2. 전체 파일 수, 크기, 투명도와 PNG 디코딩 여부를 확인한다.
3. 접촉 시트나 이미지 검토로 실제 내용을 확인한다.
4. 역할 기반 목적지와 의미 기반 파일명을 먼저 매핑한다.
5. 목적지 충돌과 동일 해시 중복을 검사한다.
6. 원본을 `assets-source/`의 최종 위치로 이동한다.
7. 실제 게임에 필요한 파일만 가공·통합해 `public/assets/`에 둔다.
8. 코드 카탈로그와 프레임 정의를 갱신하고 테스트한다.
9. `temp/`가 비면 디렉터리를 제거한다.

완전히 동일한 파일이 여러 테마 폴더에 들어 있다면 공용 의미가 가장 명확한 한 위치로 통합한다. 단, 같은 픽셀이더라도 서로 독립적으로 수정될 예정인 원본이라면 공급자 원본으로 유지할 수 있다.

## 시트 통합 기준

다음 조건을 만족하면 개별 파일보다 시트가 관리하기 쉽다.

- 같은 역할과 픽셀 배율을 사용한다.
- 프레임 크기와 패딩 규칙을 고정할 수 있다.
- 항상 함께 로드된다.
- 개별 파일보다 시트 프레임 이름으로 참조하는 편이 명확하다.

나무, 덤불, 꽃, 버섯처럼 종류별 사용 방식이나 프레임 크기가 다르면 종류별 시트로 나눈다. 정적 프롭과 애니메이션 프레임도 같은 시트에 섞지 않는 것을 기본으로 한다.

시트를 수정하면 `game/tiles.ts`의 `SHEET_SRC`와 `FRAMES` 좌표를 함께 검토한다.

## 기능성 건물 외관 규칙

기능성 건물은 문 자체보다 파사드와 식별 표식을 통해 역할이 보여야 한다.

- 문 픽셀 위에 팻말을 붙이지 않는다. 문은 출입구로 명확하게 보여야 한다.
- 돌출형 팻말은 건물 전면이나 출입구 옆에서 앞쪽으로 보이게 배치한다.
- 벽부형 표식은 문과 겹치지 않는 파사드에 엠블럼처럼 고정한다.
- 무기점, 방어구점, 도구점, 여관, 마구간, 현상금 길드, 원소 길드, 영혼 길드는 서로 다른 실루엣과 색상 단서를 가져야 한다.
- 동일한 엠블럼 시트를 사용하더라도 건물 재질, 장식 프롭과 조명을 조합해 테마를 구분한다.
- 주변 타일과 팔레트, 광원 방향, 픽셀 밀도가 크게 다른 에셋은 원본을 수정한 뒤 적용한다.

현재 런타임 시설 표식은 `public/assets/world/props/buildings/facility_emblems.png`, 건물 파사드는 `public/assets/world/tilesets/village/facades.png`를 사용하며 프레임은 `game/tiles.ts`에서 등록한다.

크로스베일은 `public/assets/world/tilesets/village/ground.png`과 `water.png`에서 초지·포장·개울 표면을 사용한다. 현재 에셋만으로 부족한 부분은 다음과 같다.

- 1인칭 시점에서 지붕 윤곽을 분명히 만드는 박공·처마·모서리 세트
- 흐르는 방향과 강둑 연결을 표현하는 48px 개울 직선·곡선·끝단 애니메이션
- 초지와 포장로 사이의 가장자리·모서리 전환 타일
- 개울가 갈대, 징검돌, 작은 목교와 길가 울타리 같은 변경 마을 프롭

지붕은 전용 박공 세트가 추가되기 전까지 파사드 상단 띠로 표현한다. 마을 바깥 풍경은 `assets-source/world/backgrounds/mountain_peak/craftpix/scene_02_alpine_meadow/background.png`를 선별해 `public/assets/world/backgrounds/crossvale_valley.png`로 배포한다.

### 배경 원본 선별

- 기본 장면 배경은 현재 캔버스와 같은 16:9 픽셀아트인 576×324 원본을 기준으로 한다.
- 픽셀 밀도와 안티앨리어싱 방식이 크게 다른 고해상도 일러스트는 바로 보관하지 않고, 게임 팔레트와 픽셀 밀도에 맞게 변환할 계획이 있을 때만 후보로 둔다.
- `background_4x.png`, `background_8x.png`처럼 1배 원본을 nearest 방식으로 확대한 파일은 중복 보관하지 않는다. 필요 배율은 런타임이나 편집 과정에서 다시 만들 수 있다.
- 완성본 `background.png`와 개별 `layer_*.png`는 용도가 다르므로 함께 보관할 수 있다. 전자는 즉시 선별·배포할 때, 후자는 패럴랙스와 재합성 작업에 사용한다.

## 런타임 등록

### 타일과 프롭

1. 최종 파일을 `public/assets/world/` 아래에 둔다.
2. `game/tiles.ts`의 `SHEET_SRC`에 경로를 추가한다.
3. 필요한 영역을 `FRAMES`에 등록한다.
4. nearest 스케일에서 잘림, 패딩과 경계를 확인한다.

### 몬스터 아이콘

1. `public/assets/monsters/icons/`에 파일을 둔다.
2. `game/defs/enemies.ts`의 `MONSTER_ICONS`와 `ENEMY_DEFS.img`를 연결한다.
3. 영문 카탈로그 이름의 소문자와 파일명이 일치해야 한다.

몬스터의 기본 애니메이션은 단일 프레임 아이콘과 `EnemyDef.motion`을 조합한 코드 기반 모션으로 표현한다. `slime`, `flying`, `plant`, `beast`, `ghost`, `humanoid` 유형이 대기·공격·피격·사망 동작을 공유한다.

프레임 시트는 보스처럼 고유 실루엣과 동작이 실제 게임에 채택되고 런타임 프레임 정의까지 함께 추가되는 경우에만 보관한다. 카탈로그와 연결되지 않은 후보 프레임 시트는 `assets-source/`에 누적하지 않는다.

### 초상화

초상화는 `male_01.png`, `female_01.png` 형식을 사용하며 `game/portraits.ts`의 개수와 1-based 인덱스 규칙을 따른다.

## 검증

```bash
cd apps/web
npm test -- --run game/__tests__/assets.test.ts
npm run typecheck
npm run build
```

`assets.test.ts`는 다음을 검증한다.

- 몬스터 카탈로그와 아이콘 파일의 1:1 대응
- `ENEMY_DEFS.img` 참조 유효성
- `game/tiles.ts`에 등록된 시트 파일의 존재
- NPC와 파티 프리셋 초상화 인덱스의 유효성

새 에셋 종류가 코드 카탈로그를 필요로 한다면 같은 테스트 파일에 파일 ↔ 정의 정합성 검사를 추가한다.
