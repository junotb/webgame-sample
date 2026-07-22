# 03 — 콘텐츠와 에셋 가이드

콘텐츠 추가 절차와 에셋 관리 규칙을 다룬다. 계층 규칙(정의/규칙/표현의 분리)은 [02-architecture.md](./02-architecture.md#모듈-경계와-계층-규칙-정본)를 따른다.

## 콘텐츠 확장 절차

### 새 몬스터 추가

1. 런타임 아이콘을 `public/assets/monsters/icons/<semantic_name>.png`에 추가한다.
2. `game/defs/enemies.ts`의 `MONSTER_ICONS`에 한글명과 영문명을 등록한다.
3. 같은 파일의 `ENEMY_DEFS`에 스탯, 티어, 아이콘 이름과 공격 규칙을 추가한다.
4. 새 절차적 폴백 외형이 필요하면 `EnemyDef.shape`와 `game/monsters.ts`의 그리기 분기를 함께 확장한다.
5. 출현 위치를 던전·필드·이벤트 데이터에 연결한다.
6. `assets.test.ts`와 `battle-engine.test.ts`를 실행한다.

아이콘 파일명은 `nameEn.toLowerCase()`와 일치해야 한다.

몬스터의 기본 애니메이션은 단일 프레임 아이콘과 `EnemyDef.motion`을 조합한 코드 기반 모션으로 표현한다. `slime`, `flying`, `plant`, `beast`, `ghost`, `humanoid` 유형이 대기·공격·피격·사망 동작을 공유한다. 프레임 시트는 보스처럼 고유 실루엣과 동작이 실제 게임에 채택되고 런타임 프레임 정의까지 함께 추가되는 경우에만 보관한다.

### 새 전투 어빌리티 추가

1. `game/defs/abilities.ts`에 `AbilityDef`을 추가한다.
2. 기존 필드로 표현할 수 없는 효과라면 먼저 `AbilityDef` 타입을 확장한다.
3. 판정은 `game/core/battle-engine.ts`와 필요한 순수 규칙 모듈에 구현한다.
4. 화면 효과와 로그 표현은 `game/scenes/explore/combat-presenter.ts` 또는 관련 UI에 추가한다.
5. 명중, 피해, 상태이상, MP 소비와 대상 선택을 테스트한다.

씬에만 판정 분기를 추가하지 않는다. 플레이와 단위 테스트가 같은 전투 규칙을 사용해야 한다.

### 새 클래스나 숙련 추가

숙련을 추가할 때:

1. `game/defs/skills.ts`의 `SkillId`와 `SKILLS`를 함께 수정한다.
2. 해당 숙련을 사용하는 클래스, 어빌리티, 필드 스킬을 확인한다.
3. `memberRanks()`, 훈련 UI와 성장 테스트의 영향을 검토한다.

클래스를 추가할 때:

1. `game/defs/classes.ts`의 `ClassId`와 `CLASSES`를 함께 수정한다.
2. `from`, `tier`, 기본 숙련 또는 최종 숙련을 정의한다.
3. 빛·어둠 선택이 필요하면 `ld`와 `LD` 숙련을 일관되게 사용한다.
4. 전직 옵션, 성장 경로, 파티 프리셋과 UI를 확인한다.
5. 클래스 트리와 전직 테스트를 갱신한다.

현재 2→4→8 트리는 게임 진행의 핵심 구조이므로 단순 콘텐츠 추가가 아니라 사양 변경으로 취급한다.

### 새 필드 스킬 추가

1. `game/defs/abilities.ts`의 필드 스킬 타입과 정의에 ID를 추가한다.
2. 필드 스킬 메뉴가 사용하는 핸들러 타입을 갱신한다.
3. 해당 씬에서 실제 효과를 구현한다.
4. MP 소비와 사용할 수 없는 조건을 UI가 아닌 공통 규칙으로 검증할 수 있는지 검토한다.
5. 성장 및 탐험 테스트를 추가한다.

### 기존 마을에 시설 추가

1. `game/town/types.ts`의 `TownFacilityId`에 ID를 추가한다.
2. `TownFacilityDef`에 이름, 문 좌표, 담당자와 필요한 콘텐츠를 정의한다.
3. `game/town/crossvale.ts` 또는 `evermore.ts`의 시설 목록에 배치한다.
4. `game/town/facilities.ts`와 `game/scenes/town.ts`의 처리기를 연결한다.
5. 외관이 새 종류라면 `public/assets/world/props/buildings/`에 엠블럼 또는 간판을 추가하고 `game/tiles.ts`에 프레임을 등록한다.
6. 마을 컴파일·콘텐츠·내비게이션 테스트를 실행한다.

시설 좌표는 [시설 배치 규칙](./01-game-design.md#6-마을과-기능성-건물)을 만족해야 하며, 간판이나 엠블럼을 문 위에 덮어씌우지 않는다는 아래 [외관 규칙](#기능성-건물-외관-규칙)도 지킨다.

### 새 마을 추가

1. `game/town/types.ts`의 `TownId`와 필요한 진입 지점을 확장한다.
2. 기존 마을 파일을 참고해 맵, 시설, 장식, 성문과 구역을 정의한다.
3. `compileTown()`을 통과하도록 좌표와 도달 가능성을 맞춘다.
4. NPC와 의뢰의 마을 ID 연결, `game/towns.ts` 레지스트리를 갱신한다.
5. 씬 진입 경로와 월드 상태를 연결한다.
6. 마을 데이터, 컴파일, 콘텐츠, 내비게이션과 월드 상태 테스트를 추가한다.

### 새 씬 추가

1. `game/scenes/<name>.ts`에 `SceneHandle`을 반환하는 빌더를 만든다.
2. ticker, listener와 구독은 `SceneScope`에 등록한다.
3. `game/core.ts`의 `GameNavigator`에 라우트 타입을 추가한다.
4. `game/index.ts`의 `boot()`에서 `switchScene()`으로 배선한다.
5. 다른 씬은 새 씬을 직접 import하지 않고 `nav`를 호출한다.
6. `overlayRoot`에 남기는 객체가 있다면 `dispose()`에서 정리한다.

### 세이브 상태 변경

`GameState`의 저장 형태를 변경하면 다음을 함께 처리한다.

1. 새 게임 생성값과 상태 검증 갱신
2. `SAVE_VERSION` 증가 여부 결정
3. 이전 세이브를 지원한다면 명시적인 마이그레이션 추가
4. 지원하지 않는 버전에 대한 오류 유지
5. `persistence.test.ts`에 직렬화·역직렬화·버전 테스트 추가

## 에셋 관리

### 두 에셋 루트의 역할

| 위치 | 역할 | 브라우저 로드 |
| --- | --- | --- |
| `assets-source/` | 원본, 편집 가능한 개별 이미지, 후보 에셋 | 아니오 |
| `public/assets/` | 게임에서 실제로 사용하는 최종 PNG와 시트 | 예 |

`assets-source/`를 보존하는 이유는 런타임 파일을 다시 합성하거나 픽셀을 수정할 때 원본 품질과 개별 레이어를 잃지 않기 위해서다. 모든 원본을 `public/`에 복사하지 않는다.

예를 들어 나무 개별 원본은 `assets-source/`에 유지할 수 있지만, 게임에서는 관리하기 쉬운 `public/assets/world/props/nature/trees.png` 한 장만 로드한다.

### 디렉터리 분류

```text
assets-source/
├── ambient/                       배경·환경 이미지
├── characters/sprites/            종족별 캐릭터 스프라이트 (elves, goblins, humans …)
├── items/icons/                   장비·재료·소모품 아이콘 (weapon_sets/ 시트 포함)
├── monsters/sprites/              몬스터 스프라이트 원본
├── npcs/                          NPC 원본
└── world/
    ├── backgrounds/               테마별 장면 배경 (테마/scene_XX_이름/ 구조)
    ├── decals/                    바닥·벽 위에 얹는 균열과 흔적
    ├── effects/                   불·빛·마법·물·날씨 효과
    ├── props/                     건물·가구·자연물·차량 등 오브젝트
    └── tilesets/                  지형·건물·지역용 타일 시트

public/assets/
├── monsters/icons/                런타임 몬스터 아이콘
├── portraits/                     파티·NPC 초상화
└── world/
    ├── backgrounds/
    ├── decals/
    ├── effects/
    ├── props/
    └── tilesets/
```

분류는 "이미지에 무엇이 그려졌는가"보다 "게임에서 어떻게 쓰는가"를 우선한다. 불꽃이 포함된 화로 전체 오브젝트라면 prop, 독립적으로 겹쳐 쓰는 불꽃 프레임이라면 effect다.

디렉터리와 파일명은 에셋이 무엇인지(내용·역할)만 표현한다. 공급자·에셋 팩 이름으로 하위 디렉터리를 만들지 않으며, 출처 구분이 필요하면 별도 문서에 기록한다.

### 파일명 규칙

기본 형식은 소문자 `snake_case`다.

```text
material_skull.png
weapon_sword_01.png
consumable_potion_blue_03.png
door_chest_animation.png
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

### 신규 에셋 정리 절차

1. 아직 분류하지 않은 파일은 `assets-source/temp/`에 둔다(없으면 생성).
2. 전체 파일 수, 크기, 투명도와 PNG 디코딩 여부를 확인한다.
3. 접촉 시트나 이미지 검토로 실제 내용을 확인한다.
4. 역할 기반 목적지와 의미 기반 파일명을 먼저 매핑한다.
5. 목적지 충돌과 동일 해시 중복을 검사한다.
6. 원본을 `assets-source/`의 최종 위치로 이동한다.
7. 실제 게임에 필요한 파일만 가공·통합해 `public/assets/`에 둔다.
8. 코드 카탈로그와 프레임 정의를 갱신하고 픽셀 스케일·투명도·프레임 크기·테마 일관성을 확인한다.
9. `assets.test.ts`를 실행하고, `temp/`가 비면 디렉터리를 제거한다.

완전히 동일한 파일이 여러 테마 폴더에 들어 있다면 공용 의미가 가장 명확한 한 위치로 통합한다. 단, 같은 픽셀이더라도 서로 독립적으로 수정될 예정인 원본이라면 별도 원본으로 유지할 수 있다.

배경 원본은 현재 캔버스와 같은 16:9 픽셀아트 1배 원본을 기준으로 선별한다. nearest 확대본(`background_4x.png` 등)은 중복 보관하지 않고, 완성본 `background.png`와 재합성용 `layer_*.png`는 용도가 다르므로 함께 보관할 수 있다. 픽셀 밀도가 크게 다른 고해상도 일러스트는 변환 계획이 있을 때만 후보로 둔다.

### 시트 통합 기준

다음 조건을 만족하면 개별 파일보다 시트가 관리하기 쉽다.

- 같은 역할과 픽셀 배율을 사용한다.
- 프레임 크기와 패딩 규칙을 고정할 수 있다.
- 항상 함께 로드된다.
- 개별 파일보다 시트 프레임 이름으로 참조하는 편이 명확하다.

나무, 덤불, 꽃, 버섯처럼 종류별 사용 방식이나 프레임 크기가 다르면 종류별 시트로 나눈다. 정적 프롭과 애니메이션 프레임도 같은 시트에 섞지 않는 것을 기본으로 한다.

시트를 수정하면 `game/tiles.ts`의 `SHEET_SRC`와 `FRAMES` 좌표를 함께 검토한다.

### 기능성 건물 외관 규칙

기능성 건물은 문 자체보다 파사드와 식별 표식을 통해 역할이 보여야 한다. 타일셋·파사드·프롭을 고르기 전에 해당 지역의 [마을 테마](./01-game-design.md#마을-테마)에서 재질·색 단서를 먼저 확인한다.

- 문 픽셀 위에 팻말을 붙이지 않는다. 문은 출입구로 명확하게 보여야 한다.
- 돌출형 팻말은 건물 전면이나 출입구 옆에서 앞쪽으로 보이게 배치한다.
- 벽부형 표식은 문과 겹치지 않는 파사드에 엠블럼처럼 고정한다.
- 무기점, 방어구점, 도구점, 여관, 마구간, 현상금 길드, 원소 길드, 영혼 길드는 서로 다른 실루엣과 색상 단서를 가져야 한다.
- 동일한 엠블럼 시트를 사용하더라도 건물 재질, 장식 프롭과 조명을 조합해 테마를 구분한다.
- 주변 타일과 팔레트, 광원 방향, 픽셀 밀도가 크게 다른 에셋은 원본을 수정한 뒤 적용한다.

현재 런타임 시설 표식은 `public/assets/world/props/buildings/facility_emblems.png`, 건물 파사드는 `public/assets/world/tilesets/village/facades.png`를 사용하며 프레임은 `game/tiles.ts`에서 등록한다. 크로스베일은 `public/assets/world/tilesets/village/ground.png`과 `water.png`에서 초지·포장·개울 표면을 사용하고, 마을 바깥 풍경은 `public/assets/world/backgrounds/crossvale_valley.png`를 사용한다. 지붕은 전용 박공 세트가 추가되기 전까지 파사드 상단 띠로 표현한다.

#### 현재 알려진 에셋 공백

시점이 지나면 부정확해질 수 있는 목록이므로 해소하거나 변경되면 함께 갱신한다.

- 1인칭 시점에서 지붕 윤곽을 분명히 만드는 박공·처마·모서리 세트
- 흐르는 방향과 강둑 연결을 표현하는 48px 개울 직선·곡선·끝단 애니메이션
- 초지와 포장로 사이의 가장자리·모서리 전환 타일
- 개울가 갈대, 징검돌, 작은 목교와 길가 울타리 같은 변경 마을 프롭

### 런타임 등록

#### 타일과 프롭

1. 최종 파일을 `public/assets/world/` 아래에 둔다.
2. `game/tiles.ts`의 `SHEET_SRC`에 경로를 추가한다.
3. 필요한 영역을 `FRAMES`에 등록한다.
4. nearest 스케일에서 잘림, 패딩과 경계를 확인한다.

#### 몬스터 아이콘

1. `public/assets/monsters/icons/`에 파일을 둔다.
2. `game/defs/enemies.ts`의 `MONSTER_ICONS`와 `ENEMY_DEFS.img`를 연결한다.
3. 영문 카탈로그 이름의 소문자와 파일명이 일치해야 한다.

#### 초상화

초상화는 `male_01.png`, `female_01.png` 형식을 사용하며 `game/portraits.ts`의 개수와 1-based 인덱스 규칙을 따른다.

### 에셋 검증

`assets.test.ts`는 다음을 검증한다.

- 몬스터 카탈로그와 아이콘 파일의 1:1 대응
- `ENEMY_DEFS.img` 참조 유효성
- `game/tiles.ts`에 등록된 시트 파일의 존재
- NPC와 파티 프리셋 초상화 인덱스의 유효성

새 에셋 종류가 코드 카탈로그를 필요로 한다면 같은 테스트 파일에 파일 ↔ 정의 정합성 검사를 추가한다.

## 완료 전 검증

콘텐츠·에셋 작업을 마치면 [전체 검증](./README.md#실행과-검증)을 실행한다.
