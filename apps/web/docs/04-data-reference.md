# 04 — 데이터 레퍼런스

이 문서는 데이터 값을 복제한 표 대신, 각 데이터의 기준 파일과 검증 위치를 안내한다. 수치와 항목 개수는 아래 TypeScript 정의를 직접 확인한다.

## 기준 파일

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
| 던전과 필드 맵 | `game/dungeon.ts`, `game/fieldmaps.ts` | `grid.test.ts`, `fieldmaps.test.ts` |
| 마을 | `game/town/crossvale.ts`, `game/town/evermore.ts` | `town-data.test.ts`, `town-compile.test.ts` |
| 기능성 건물 | `game/town/types.ts`, 마을별 `facilities` | `town-content.test.ts`, `town-navigation.test.ts` |
| 타일 시트와 프레임 | `game/tiles.ts` | `assets.test.ts` |
| 초상화 | `game/portraits.ts` | `assets.test.ts` |

모든 정의는 `game/defs/index.ts`에서 재수출한다. 새 정의 파일을 만들었다면 필요한 항목을 이 배럴 파일에 추가한다.

## 안정적으로 유지할 관계

- `ClassId`와 `CLASSES`의 키는 일치해야 한다.
- 클래스의 `from` 연결은 기초 → 1차 → 2차 트리를 이뤄야 한다.
- 어빌리티의 `skill`은 존재하는 `SkillId`를 사용해야 한다.
- 적의 `img`는 `MONSTER_ICONS.nameEn`에 등록되어야 한다.
- NPC와 파티 프리셋의 초상화 인덱스는 실제 파일 범위 안에 있어야 한다.
- 의뢰의 선행 조건과 시설 연결은 존재하는 ID를 참조해야 한다.
- 마을 시설은 문 셀 위에 있고 접근 가능한 정면 칸을 가져야 한다.
- `game/tiles.ts`에 등록한 모든 시트는 `public/assets/`에 존재해야 한다.

## 데이터 변경 절차

1. 기준 정의 파일을 수정한다.
2. 해당 데이터가 참조하는 ID와 에셋 경로를 확인한다.
3. 가장 가까운 단위 테스트를 수정하거나 추가한다.
4. `npm test -- --run`과 `npm run typecheck`를 실행한다.
5. 구조나 변경 절차가 달라진 경우에만 이 문서를 수정한다.

밸런스 수치표가 필요하면 문서에 수동 복사하지 않고 정의 파일에서 생성하는 스크립트나 테스트 리포트를 추가하는 방식을 우선한다.
