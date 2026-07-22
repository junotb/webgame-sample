# 01 — 게임 디자인

컨셉·플레이 흐름·시스템 규칙·데이터 기준 파일을 다룬다. 모듈 구조와 계층 규칙은 [02-architecture.md](./02-architecture.md), 콘텐츠 추가 절차는 [03-content-and-assets.md](./03-content-and-assets.md)를 본다.

## 컨셉

**부서진 왕국의 연대기 (Chronicle of the Shattered Realm)**는 1280×720 고정 PixiJS 캔버스에서 진행되는 판타지 웹 RPG다.

- 캐릭터 생성으로 구성하는 4인 파티
- 크로스베일과 에버모어 성을 중심으로 한 거점 플레이
- 마을, 야외 필드, 던전 탐험으로 이어지는 이동 구조
- 전열·후열과 피해 타입·상태이상을 사용하는 턴제 전투
- 클래스 전직, 숙련, 장비, 의뢰를 통한 성장

## 플레이 흐름

```text
타이틀
  → 캐릭터 생성
  → 프롤로그와 마을
  → 야외 필드
  → 던전 탐험과 전투
  → 마을 귀환·성장·의뢰 보고
  → 보스 및 종장
```

### 타이틀과 캐릭터 생성

`game/scenes/title.ts`와 `game/scenes/create.ts`가 담당한다. 이름, 초상화, 기초 직업, 추가 숙련과 능력치를 확정한 뒤 `newGame()`으로 게임 상태를 만든다.

### 마을

`game/scenes/town.ts`가 렌더링과 입력을 담당하고, `game/town/` 아래 모듈이 마을 데이터·검증·시설 동작을 담당한다. 마을 레지스트리와 마을 간 이동 요금은 `game/towns.ts`가 제공한다.

무기점, 방어구점, 도구점, 여관, 마구간, 현상금 길드, 원소 길드, 영혼 길드는 데이터로 정의된다. 마을에 따라 사원·왕좌 같은 추가 시설도 배치할 수 있다.

### 야외 필드

`game/scenes/field.ts`와 `game/fieldmaps.ts`가 마을과 던전 사이의 필드를 구성한다. 맵 정의와 화면 표현을 분리하며, 출구를 통해 다른 장소로 이동한다. 목적지를 예고하는 맵 입구 비주얼은 `game/entrances.ts`가 담당한다. 현재 지역 목록은 [필드와 던전 로스터](#필드와-던전-로스터)를 본다.

### 던전 탐험과 전투

`game/scenes/explore.ts`가 1인칭 탐험 화면을 구성한다. 이동, 시야, 상호작용과 전투 진입은 씬이 처리하고, 전투 판정은 `game/core/battle-engine.ts`와 관련 순수 규칙 모듈이 담당한다. 던전별 맵·테마·POI·이벤트 결선은 `game/dungeons.ts` 레지스트리가 정의하며, 맵 원본 데이터는 `game/goblin-fortress.ts`와 `game/abandoned-temple.ts`에 있다.

### 이벤트

`game/scenes/event.ts`와 `game/scenes/story.ts`가 선택지와 스토리 진행을 담당한다. 씬 이동은 직접 import로 연결하지 않고 `game/core.ts`의 `nav`를 통해 요청한다.

## 월드와 지역

크로스베일을 중심으로 세 방향의 야외 필드가 뻗어 있고, 필드 끝에 던전이 이어진다. 지역의 테마는 타일셋·파사드·프롭 선택의 기준이 된다.

### 마을 테마

| 마을 | 성격 | 표현 단서 |
| --- | --- | --- |
| 크로스베일 | 변경의 개울 마을. 대스승 헤르만의 제자들이 처음 닿는 거점 | 초지·포장로·개울(`ground.png`, `water.png`), 목조 파사드, 남문 밖 계곡길, 중앙 분수 광장과 북단 신전 |
| 에버모어 성 | 연방(3성·1탑·1신전·2숲)의 수도. 알현실에 연방 군주 | 석조 성벽과 대로, 대성당·왕도 시장·대분수·석상, 격식 있는 왕도 분위기 |

두 마을은 마구간의 역마차로 오간다. 새 마을이나 시설의 외관을 고를 때는 이 테마 표에서 실루엣·재질·색 단서를 먼저 정한 뒤 [에셋 규칙](./03-content-and-assets.md#기능성-건물-외관-규칙)을 적용한다.

### 필드와 던전 로스터

| 지역 | 위치 | 종류 | 상태 | 코드 |
| --- | --- | --- | --- | --- |
| 은둔숲 (헤르만의 은둔림) | 크로스베일 동쪽 | 필드 | 구현됨 | `fieldmaps.ts`의 `hermanForest` |
| 계곡길 (고블린 계곡길) | 크로스베일 남쪽 | 필드 | 구현됨 | `fieldmaps.ts`의 `goblinValley` |
| 해안길 (서녘 해안길) | 크로스베일 서쪽 | 필드 | 구현됨 — 모래사장·버려진 어촌·곶 위 사원 정문의 해안 테마 | `fieldmaps.ts`의 `coastRoad` |
| 고블린 요새 | 계곡길 남쪽 끝 | 던전 | 구현됨 | `goblin-fortress.ts` (`dungeons.ts`의 `fortress`) |
| 버려진 사원 | 해안길 서쪽 끝 | 던전 | 구현됨 — 회색 석조 성소, 언데드·교단 로스터, 되살아난 주교 보스 | `abandoned-temple.ts` (`dungeons.ts`의 `temple`) |

미구현 지역을 추가할 때는 [콘텐츠 확장 절차](./03-content-and-assets.md#콘텐츠-확장-절차)를 따르고, 구현 후 이 표의 상태를 갱신한다.

## 조작

| 입력 | 동작 |
| --- | --- |
| W/S | 전진·후진 |
| A/D | 좌우 옆걸음 |
| Q/E 또는 ←/→ | 좌우 회전 |
| Z / 스페이스 | 조사·대화·시설 진입 |
| 마우스/터치 | UI 버튼과 방향 패드 |

화면별 세부 입력은 각 `SceneHandle.onKey`에서 정의한다.

## 게임 시스템

각 시스템의 경계와 유지해야 할 규칙을 설명한다. 정확한 수치와 전체 데이터 목록은 아래 [데이터 레퍼런스](#데이터-레퍼런스)의 기준 파일에서 확인한다.

### 1. 파티와 클래스

- 파티는 네 슬롯으로 구성하며 각 슬롯은 이름, 초상화, 직업, 숙련, 능력치 프리셋을 가진다.
- 클래스 트리는 기초 2종 → 1차 4종 → 2차 8종이다.
- 클래스가 제공하는 숙련, 직접 훈련한 숙련, 캐릭터 생성 시 선택한 추가 숙련은 `memberRanks()`에서 합산하지 않고 가장 높은 랭크로 병합한다.
- 빛·어둠 선택이 필요한 최종 클래스는 멤버의 `ld` 값으로 해당 숙련을 확정한다.
- 전직 가능 여부와 결과는 `game/state.ts`의 `canClassChange()`, `classOptions()`, `doClassChange()`를 통한다.

클래스 정의는 `game/defs/classes.ts`, 숙련 정의는 `game/defs/skills.ts`, 파티 프리셋은 `game/defs/party.ts`가 기준이다.

### 2. 능력치와 성장

기본 능력치는 근력, 지능, 지혜, 체력, 민첩, 운의 여섯 종류다. 장비의 능력치 보너스를 포함한 유효 능력치는 `effectiveAttrs()`에서 만들고, 공격력·방어력·속도·회피·치명타 같은 파생 스탯은 `memberStats()`에서 계산한다.

성장 규칙은 다음 경계를 유지한다.

- 경험치는 파티원별로 기록한다.
- 레벨업은 능력치 포인트와 숙련 포인트를 제공한다.
- 능력치 및 숙련 소비는 `game/state.ts`의 명령 함수를 통해 처리한다.
- UI는 값을 직접 수정하지 않고 상태 명령을 호출한다.
- 레벨·전직 조건과 파생 공식은 `game/__tests__/growth.test.ts`에서 회귀 검증한다.

### 3. 장비, 전리품과 상점

장비 슬롯은 주무기, 보조무기, 투구, 갑옷, 장화, 망토, 목걸이, 반지 2칸으로 구성한다.

- 양손 무기는 보조무기와 동시에 장착할 수 없다.
- 반지는 빈 슬롯을 우선 사용하고 두 칸이 모두 차면 첫 번째 반지를 교체한다.
- 교체된 장비는 가방으로 돌아가며 장착 과정에서 소실되지 않는다.
- 전리품은 희귀도, 감정 여부, 접사와 고유 `uid`를 가진다.
- 미확인 장비는 필요한 식별 숙련을 만족해야 장착할 수 있다.
- 판매와 상점 구매는 `game/state.ts`의 상태 명령을 통해 처리한다.

기준 파일은 `game/defs/equip.ts`, `game/defs/loot.ts`, `game/defs/shop.ts`이며 행동 검증은 `equip.test.ts`와 `loot.test.ts`가 담당한다.

### 4. 전투

실제 플레이와 테스트는 같은 전투 판정 계층을 사용한다.

```text
씬 입력·연출
  → BattleEngine
  → dice / formulas / statuses
  → 상태 변경 결과
  → combat presenter와 HUD
```

핵심 규칙:

- 기본 공격은 명중 굴림을 사용하며, 어빌리티는 각 정의의 효과 규칙을 따른다.
- 물리 공격은 장착 무기의 피해 타입을 사용하고, 마법은 어빌리티나 숙련 계열의 피해 타입을 사용한다.
- 피해 타입은 물리, 원소, 마법 계열로 나뉘며 대상의 저항 배율을 적용한다.
- 전열·후열과 공격 사거리가 유효 대상을 제한한다.
- 중독, 수면, 마비, 공포와 전투용 제어 효과는 `core/statuses.ts`에서 공통 처리한다.
- 게임플레이 난수와 화면 연출 난수는 분리한다. 테스트 가능한 판정에는 주입 가능한 RNG를 사용한다.
- 승리, 도주, 전멸과 보상 처리는 `BattleEngine`의 결과를 통해 일관되게 처리한다.

전투 데이터는 `game/defs/abilities.ts`, `game/defs/damage.ts`, `game/defs/enemies.ts`에 있다. 판정 구현은 `game/core/battle-engine.ts`, `dice.ts`, `formulas.ts`, `statuses.ts`가 기준이다.

### 5. 탐험과 필드

던전 탐험은 `game/scenes/explore.ts`, 야외 필드는 `game/scenes/field.ts`가 담당한다.

- `game/grid.ts`는 방향, 셀 조회, 통행 가능 여부 같은 공통 격자 규칙을 제공한다.
- `game/goblin-fortress.ts`·`game/abandoned-temple.ts`(던전)와 `game/fieldmaps.ts`(필드)가 맵 정의를 제공하고, `game/dungeons.ts`가 던전 레지스트리로 묶는다.
- 씬은 이동·상호작용·연출을 담당하고 전투 판정은 전투 엔진에 위임한다.
- 게임 진행에 영향을 주는 난수는 `game/core/random.ts`의 게임플레이 스트림을 사용한다.

### 6. 마을과 기능성 건물

마을은 데이터와 표현을 분리한다.

- `game/town/crossvale.ts`, `evermore.ts`: 마을별 정적 데이터
- `game/towns.ts`: 마을 레지스트리와 마을 간 이동 규칙
- `game/town/types.ts`: 시설, 장식, 출입구, 구역 타입
- `game/town/compile.ts`: 좌표 충돌, 접근성, 도달 가능성 검증과 조회 구조 생성
- `game/town/content.ts`: 조건부 대화와 시설 담당자 인사
- `game/town/facilities.ts`: 시설 ID와 UI 처리기 연결
- `game/scenes/town.ts`: 렌더링, 이동, 상호작용

**시설 배치 규칙(정본):** 시설은 반드시 문 셀에 연결되고, 플레이어가 접근할 수 있는 정면 칸을 가져야 한다. 시설의 종류는 데이터 ID로 구분하고 외관은 타일·파사드·엠블럼 에셋으로 표현한다. 이 규칙은 `compileTown()`이 마을 진입 시 검증한다.

### 7. 의뢰와 영속성

- 의뢰 정의는 `game/defs/quests.ts`, 판정 규칙은 `game/core/quests.ts`가 담당한다.
- `GameState`에는 파티, 가방, 재화, 탐험 상태, 플래그와 의뢰 상태가 포함된다.
- `game/persistence.ts`는 버전이 포함된 JSON 직렬화·역직렬화와 최소 스키마 검증을 제공한다.
- 세이브 구조를 변경하면 `SAVE_VERSION`과 `persistence.test.ts`를 함께 검토한다.

## 데이터 레퍼런스

데이터 값을 복제한 표 대신, 각 데이터의 기준 파일과 검증 위치를 안내한다. 수치와 항목 개수는 아래 TypeScript 정의를 직접 확인한다.

| 데이터 | 기준 파일 | 주요 검증 |
| --- | --- | --- |
| 능력치 | `game/defs/attrs.ts` | `growth.test.ts`, `equip.test.ts` |
| 숙련과 랭크 | `game/defs/skills.ts` | `growth.test.ts` |
| 클래스 트리 | `game/defs/classes.ts` | `growth.test.ts` |
| 전투 어빌리티 | `game/defs/abilities.ts` | `battle-engine.test.ts` |
| 피해 타입과 저항 | `game/defs/damage.ts` | `damage.test.ts` |
| 적과 몬스터 아이콘 카탈로그 | `game/defs/enemies.ts` | `battle-engine.test.ts`, `assets.test.ts` |
| 장비 슬롯 | `game/defs/equip.ts` | `equip.test.ts` |
| 상점 | `game/defs/shop.ts` | `equip.test.ts`, UI 타입 검사 |
| 희귀도·접사·전리품 | `game/defs/loot.ts` | `loot.test.ts` |
| 파티 슬롯과 프리셋 | `game/defs/party.ts` | `growth.test.ts`, `assets.test.ts` |
| NPC | `game/defs/npcs.ts` | `npcs.test.ts`, `assets.test.ts` |
| 의뢰 | `game/defs/quests.ts` | `quests.test.ts` |
| 파티 상태와 상태 명령 | `game/state.ts` | `store.test.ts` 및 시스템별 테스트 |
| 세이브 스키마 | `game/persistence.ts` | `persistence.test.ts` |
| 던전과 필드 맵 | `game/goblin-fortress.ts`, `game/abandoned-temple.ts`, `game/dungeons.ts`, `game/fieldmaps.ts`, `game/grid.ts` | `grid.test.ts`, `abandoned-temple.test.ts`, `fieldmaps.test.ts` |
| 마을 | `game/towns.ts`, `game/town/crossvale.ts`, `game/town/evermore.ts` | `town-data.test.ts`, `town-compile.test.ts` |
| 기능성 건물 | `game/town/types.ts`, 마을별 `facilities` | `town-content.test.ts`, `town-navigation.test.ts` |
| 타일 시트와 프레임 | `game/tiles.ts` | `assets.test.ts` |
| 초상화 | `game/portraits.ts` | `assets.test.ts` |

모든 정의는 `game/defs/index.ts`에서 재수출한다. 새 정의 파일을 만들었다면 필요한 항목을 이 배럴 파일에 추가한다.

### 안정적으로 유지할 관계

- `ClassId`와 `CLASSES`의 키는 일치해야 한다.
- 클래스의 `from` 연결은 기초 → 1차 → 2차 트리를 이뤄야 한다.
- 어빌리티의 `skill`은 존재하는 `SkillId`를 사용해야 한다.
- 적의 `img`는 `MONSTER_ICONS.nameEn`에 등록되어야 한다.
- NPC와 파티 프리셋의 초상화 인덱스는 실제 파일 범위 안에 있어야 한다.
- 의뢰의 선행 조건과 시설 연결은 존재하는 ID를 참조해야 한다.
- 마을 시설은 [시설 배치 규칙](#6-마을과-기능성-건물)을 만족해야 한다.
- `game/tiles.ts`에 등록한 모든 시트는 `public/assets/`에 존재해야 한다.

### 데이터 변경 절차

1. 기준 정의 파일을 수정한다.
2. 해당 데이터가 참조하는 ID와 에셋 경로를 확인한다.
3. 가장 가까운 단위 테스트를 수정하거나 추가한다.
4. [전체 검증](./README.md#실행과-검증)을 실행한다.
5. 구조나 변경 절차가 달라진 경우에만 이 문서를 수정한다.

밸런스 수치표가 필요하면 문서에 수동 복사하지 않고 정의 파일에서 생성하는 스크립트나 테스트 리포트를 추가하는 방식을 우선한다.

## 불변 조건

다음은 테스트 없이 변경하지 않는다.

- 클래스 트리와 전직 조건
- 장비 교체 및 가방 회수
- 피해 타입과 저항 적용 순서
- 상태이상 지속 시간과 해제 조건
- 마을 시설 접근성과 좌표 중복
- 세이브 버전과 상태 스키마

시스템을 변경하면 범위에 맞는 테스트를 먼저 실행하고 마지막에 [전체 검증](./README.md#실행과-검증)을 수행한다.
