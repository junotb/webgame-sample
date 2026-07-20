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
