# 02 — 게임 시스템

이 문서는 시스템의 경계와 유지해야 할 규칙을 설명한다. 정확한 수치와 전체 데이터 목록은 [04-data-reference.md](./04-data-reference.md)의 기준 파일에서 확인한다.

## 1. 파티와 클래스

- 파티는 네 슬롯으로 구성하며 각 슬롯은 이름, 초상화, 직업, 숙련, 능력치 프리셋을 가진다.
- 클래스 트리는 기초 2종 → 1차 4종 → 2차 8종이다.
- 클래스가 제공하는 숙련, 직접 훈련한 숙련, 캐릭터 생성 시 선택한 추가 숙련은 `memberRanks()`에서 합산하지 않고 가장 높은 랭크로 병합한다.
- 빛·어둠 선택이 필요한 최종 클래스는 멤버의 `ld` 값으로 해당 숙련을 확정한다.
- 전직 가능 여부와 결과는 `game/state.ts`의 `canClassChange()`, `classOptions()`, `doClassChange()`를 통한다.

클래스 정의는 `game/defs/classes.ts`, 숙련 정의는 `game/defs/skills.ts`, 파티 프리셋은 `game/defs/party.ts`가 기준이다.

## 2. 능력치와 성장

기본 능력치는 근력, 지능, 지혜, 체력, 민첩, 운의 여섯 종류다. 장비의 능력치 보너스를 포함한 유효 능력치는 `effectiveAttrs()`에서 만들고, 공격력·방어력·속도·회피·치명타 같은 파생 스탯은 `memberStats()`에서 계산한다.

성장 규칙은 다음 경계를 유지한다.

- 경험치는 파티원별로 기록한다.
- 레벨업은 능력치 포인트와 숙련 포인트를 제공한다.
- 능력치 및 숙련 소비는 `game/state.ts`의 명령 함수를 통해 처리한다.
- UI는 값을 직접 수정하지 않고 상태 명령을 호출한다.
- 레벨·전직 조건과 파생 공식은 `game/__tests__/growth.test.ts`에서 회귀 검증한다.

## 3. 장비, 전리품과 상점

장비 슬롯은 주무기, 보조무기, 투구, 갑옷, 장화, 망토, 목걸이, 반지 2칸으로 구성한다.

- 양손 무기는 보조무기와 동시에 장착할 수 없다.
- 반지는 빈 슬롯을 우선 사용하고 두 칸이 모두 차면 첫 번째 반지를 교체한다.
- 교체된 장비는 가방으로 돌아가며 장착 과정에서 소실되지 않는다.
- 전리품은 희귀도, 감정 여부, 접사와 고유 `uid`를 가진다.
- 미확인 장비는 필요한 식별 숙련을 만족해야 장착할 수 있다.
- 판매와 상점 구매는 `game/state.ts`의 상태 명령을 통해 처리한다.

기준 파일은 `game/defs/equip.ts`, `game/defs/loot.ts`, `game/defs/shop.ts`이며 행동 검증은 `equip.test.ts`와 `loot.test.ts`가 담당한다.

## 4. 전투

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

## 5. 탐험과 필드

던전 탐험은 `game/scenes/explore.ts`, 야외 필드는 `game/scenes/field.ts`가 담당한다.

- `game/grid.ts`는 방향, 셀 조회, 통행 가능 여부 같은 공통 격자 규칙을 제공한다.
- `game/dungeon.ts`와 `game/fieldmaps.ts`는 맵 정의를 제공한다.
- 씬은 이동·상호작용·연출을 담당하고 전투 판정은 전투 엔진에 위임한다.
- 게임 진행에 영향을 주는 난수는 `game/core/random.ts`의 게임플레이 스트림을 사용한다.

## 6. 마을과 기능성 건물

마을은 데이터와 표현을 분리한다.

- `game/town/crossvale.ts`, `evermore.ts`: 마을별 정적 데이터
- `game/town/types.ts`: 시설, 장식, 출입구, 구역 타입
- `game/town/compile.ts`: 좌표 충돌, 접근성, 도달 가능성 검증과 조회 구조 생성
- `game/town/content.ts`: 조건부 대화와 시설 담당자 인사
- `game/town/facilities.ts`: 시설 ID와 UI 처리기 연결
- `game/scenes/town.ts`: 렌더링, 이동, 상호작용

시설은 반드시 문 셀에 연결되고, 플레이어가 접근할 수 있는 정면 칸을 가져야 한다. 시설의 종류는 데이터 ID로 구분하고 외관은 타일·파사드·엠블럼 에셋으로 표현한다.

## 7. 의뢰와 영속성

- 의뢰 정의는 `game/defs/quests.ts`, 판정 규칙은 `game/core/quests.ts`가 담당한다.
- `GameState`에는 파티, 가방, 재화, 탐험 상태, 플래그와 의뢰 상태가 포함된다.
- `game/persistence.ts`는 버전이 포함된 JSON 직렬화·역직렬화와 최소 스키마 검증을 제공한다.
- 세이브 구조를 변경하면 `SAVE_VERSION`과 `persistence.test.ts`를 함께 검토한다.

## 8. 시스템 변경 검증

변경 범위에 맞는 테스트를 먼저 실행하고 마지막에 전체 검증을 수행한다.

```bash
cd apps/web
npm run typecheck
npm run lint
npm test -- --run
npm run build
```

특히 다음 불변 조건은 테스트 없이 변경하지 않는다.

- 클래스 트리와 전직 조건
- 장비 교체 및 가방 회수
- 피해 타입과 저항 적용 순서
- 상태이상 지속 시간과 해제 조건
- 마을 시설 접근성과 좌표 중복
- 세이브 버전과 상태 스키마
