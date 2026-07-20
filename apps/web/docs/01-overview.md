# 01 — 게임 개요와 흐름

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

`game/scenes/town.ts`가 렌더링과 입력을 담당하고, `game/town/` 아래 모듈이 마을 데이터·검증·시설 동작을 담당한다.

무기점, 방어구점, 도구점, 여관, 마구간, 현상금 길드, 원소 길드, 영혼 길드는 데이터로 정의된다. 마을에 따라 사원·왕좌 같은 추가 시설도 배치할 수 있다.

### 야외 필드

`game/scenes/field.ts`와 `game/fieldmaps.ts`가 마을과 던전 사이의 필드를 구성한다. 맵 정의와 화면 표현을 분리하며, 출구를 통해 다른 장소로 이동한다.

### 던전 탐험과 전투

`game/scenes/explore.ts`가 1인칭 탐험 화면을 구성한다. 이동, 시야, 상호작용과 전투 진입은 씬이 처리하고, 전투 판정은 `game/core/battle-engine.ts`와 관련 순수 규칙 모듈이 담당한다.

### 이벤트

`game/scenes/event.ts`와 `game/scenes/story.ts`가 선택지와 스토리 진행을 담당한다. 씬 이동은 직접 import로 연결하지 않고 `game/core.ts`의 `nav`를 통해 요청한다.

## 코드 경계

```text
game/defs/          정적 게임 정의와 타입
game/core/          전투·주사위·상태이상·난수 등 순수 규칙
game/state.ts       GameState, 파생 상태, 상태 변경 함수
game/persistence.ts 세이브 직렬화와 버전 검증
game/town/          마을 데이터, 컴파일 검증, 시설·콘텐츠 규칙
game/scenes/        PixiJS 화면과 입력
game/ui/            재사용 가능한 오버레이 UI
game/core.ts        PixiJS 초기화, 씬 생명주기, 공용 UI, nav
game/index.ts       boot와 nav 배선
```

정적 정의와 순수 규칙에는 PixiJS 표현 로직을 넣지 않는다. 씬과 UI는 규칙의 결과를 화면에 표현하고 사용자 입력을 명령으로 변환한다.

## 조작

| 입력 | 동작 |
| --- | --- |
| W/S | 전진·후진 |
| A/D | 좌우 옆걸음 |
| Q/E 또는 ←/→ | 좌우 회전 |
| Z / 스페이스 | 조사·대화·시설 진입 |
| 마우스/터치 | UI 버튼과 방향 패드 |

화면별 세부 입력은 각 `SceneHandle.onKey`에서 정의한다.

## 실행과 검증

```bash
cd apps/web
npm run dev
npm run typecheck
npm run lint
npm test -- --run
npm run build
```
