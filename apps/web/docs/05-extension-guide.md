# 05 — 확장 가이드

공통 원칙은 **정의는 `game/defs/`, 규칙은 `game/core/`와 `game/state.ts`, 표현은 `game/scenes/`와 `game/ui/`**에 둔다는 것이다.

## 새 몬스터 추가

1. 런타임 아이콘을 `public/assets/monsters/icons/<semantic_name>.png`에 추가한다.
2. `game/defs/enemies.ts`의 `MONSTER_ICONS`에 한글명과 영문명을 등록한다.
3. 같은 파일의 `ENEMY_DEFS`에 스탯, 티어, 아이콘 이름과 공격 규칙을 추가한다.
4. 새 절차적 폴백 외형이 필요하면 `EnemyDef.shape`와 `game/monsters.ts`의 그리기 분기를 함께 확장한다.
5. 출현 위치를 던전·필드·이벤트 데이터에 연결한다.
6. `assets.test.ts`와 `battle-engine.test.ts`를 실행한다.

아이콘 파일명은 `nameEn.toLowerCase()`와 일치해야 한다. 파일명 규칙은 [06-assets.md](./06-assets.md)를 따른다.

## 새 전투 어빌리티 추가

1. `game/defs/abilities.ts`에 `AbilityDef`을 추가한다.
2. 기존 필드로 표현할 수 없는 효과라면 먼저 `AbilityDef` 타입을 확장한다.
3. 판정은 `game/core/battle-engine.ts`와 필요한 순수 규칙 모듈에 구현한다.
4. 화면 효과와 로그 표현은 `game/scenes/explore/combat-presenter.ts` 또는 관련 UI에 추가한다.
5. 명중, 피해, 상태이상, MP 소비와 대상 선택을 테스트한다.

씬에만 판정 분기를 추가하지 않는다. 플레이와 단위 테스트가 같은 전투 규칙을 사용해야 한다.

## 새 클래스나 숙련 추가

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

## 새 필드 스킬 추가

1. `game/defs/abilities.ts`의 필드 스킬 타입과 정의에 ID를 추가한다.
2. 필드 스킬 메뉴가 사용하는 핸들러 타입을 갱신한다.
3. 해당 씬에서 실제 효과를 구현한다.
4. MP 소비와 사용할 수 없는 조건을 UI가 아닌 공통 규칙으로 검증할 수 있는지 검토한다.
5. 성장 및 탐험 테스트를 추가한다.

## 기존 마을에 시설 추가

1. `game/town/types.ts`의 `TownFacilityId`에 ID를 추가한다.
2. `TownFacilityDef`에 이름, 문 좌표, 담당자와 필요한 콘텐츠를 정의한다.
3. `game/town/crossvale.ts` 또는 `evermore.ts`의 시설 목록에 배치한다.
4. `game/town/facilities.ts`와 `game/scenes/town.ts`의 처리기를 연결한다.
5. 외관이 새 종류라면 `public/assets/world/props/buildings/`에 엠블럼 또는 간판을 추가하고 `game/tiles.ts`에 프레임을 등록한다.
6. 마을 컴파일·콘텐츠·내비게이션 테스트를 실행한다.

시설 좌표는 반드시 문 셀이어야 하고 인접한 접근 가능 바닥이 있어야 한다. 간판이나 엠블럼을 문 위에 덮어씌우지 않는다는 시각 규칙도 지킨다.

## 새 마을 추가

1. `game/town/types.ts`의 `TownId`와 필요한 진입 지점을 확장한다.
2. 기존 마을 파일을 참고해 맵, 시설, 장식, 성문과 구역을 정의한다.
3. `compileTown()`을 통과하도록 좌표와 도달 가능성을 맞춘다.
4. NPC와 의뢰의 마을 ID 연결을 갱신한다.
5. 씬 진입 경로와 월드 상태를 연결한다.
6. 마을 데이터, 컴파일, 콘텐츠, 내비게이션과 월드 상태 테스트를 추가한다.

## 새 씬 추가

1. `game/scenes/<name>.ts`에 `SceneHandle`을 반환하는 빌더를 만든다.
2. ticker, listener와 구독은 `SceneScope`에 등록한다.
3. `game/core.ts`의 `GameNavigator`에 라우트 타입을 추가한다.
4. `game/index.ts`의 `boot()`에서 `switchScene()`으로 배선한다.
5. 다른 씬은 새 씬을 직접 import하지 않고 `nav`를 호출한다.
6. `overlayRoot`에 남기는 객체가 있다면 `dispose()`에서 정리한다.

## 새 에셋 추가

1. 원본을 `assets-source/temp/`에서 검토한다.
2. 의미 기반 파일명과 역할 기반 디렉터리로 `assets-source/`에 정리한다.
3. 실제 게임에 필요한 가공본만 `public/assets/`에 둔다.
4. 타일·몬스터·초상화 카탈로그 중 해당 등록 지점을 갱신한다.
5. 픽셀 스케일, 투명도, 프레임 크기와 테마 일관성을 확인한다.
6. `assets.test.ts`를 실행한다.

상세 기준은 [06-assets.md](./06-assets.md)를 따른다.

## 세이브 상태 변경

`GameState`의 저장 형태를 변경하면 다음을 함께 처리한다.

1. 새 게임 생성값과 상태 검증 갱신
2. `SAVE_VERSION` 증가 여부 결정
3. 이전 세이브를 지원한다면 명시적인 마이그레이션 추가
4. 지원하지 않는 버전에 대한 오류 유지
5. `persistence.test.ts`에 직렬화·역직렬화·버전 테스트 추가

## 완료 전 검증

```bash
cd apps/web
npm run typecheck
npm run lint
npm test -- --run
npm run build
```
