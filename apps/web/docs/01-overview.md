# 01 — 게임 개요와 구조

## 컨셉

**부서진 왕국의 연대기 (Chronicle of the Shattered Realm)** — 1280×720 고정 PIXI 캔버스 기반 다크 판타지 웹 RPG.

- 파티: 캐릭터 생성으로 구성하는 4인 파티
- 거점: 크로스베일 · 에버모어 성
- 필드: 잊힌 사원의 길 · 고블린 계곡길 · 헤르만의 은둔림
- 던전: 할로우베일의 1인칭 그리드 탐험과 인라인 턴제 전투
- 성장: 능력치·스킬 포인트, 2→4→8 클래스 트리, 장비 9슬롯

## 플레이 모드

### 타이틀·캐릭터 생성

`scenes/title.ts` → `scenes/create.ts`. 네 슬롯의 이름·초상화·기초 클래스·추가 기술·능력치를 확정한 뒤 새 게임 상태를 만든다.

### 마을

`scenes/town.ts`. 1인칭 그리드 이동으로 시설과 NPC를 찾아가며 상점·여관·길드·전직·퀘스트를 이용한다. 시설 UI는 `ui/` 아래 독립 모듈로 분리한다.

### 야외 필드

`scenes/field.ts`. 마을·던전을 연결하는 경량 그리드 장면이다. 자연물 조사와 출구 이동을 담당한다.

### 던전 탐험·전투

`scenes/explore.ts`. 이동·시야·어그로·POI를 조율하고, 전투 판정은 `core/battle-engine.ts`에 위임한다. 실제 플레이와 유닛 테스트가 같은 엔진의 공격·방어·회복·아이템·상태이상 규칙을 사용한다.

### 이벤트

`scenes/event.ts`, `scenes/story.ts`. 초상화·타자기 텍스트·선택지 분기와 스토리 진행을 담당한다.

## 아키텍처 경계

```text
defs/              정적 게임 데이터와 타입
core/              PIXI 비의존 규칙, 전투, 퀘스트, 저장소, RNG
state.ts           GameState와 도메인 명령
persistence.ts     버전된 세이브 직렬화·검증·로드
grid/map files     맵 정의와 순수 그리드 계산
scenes/            장면 조율과 PIXI 렌더링
ui/                재사용 가능한 오버레이 UI
```

의존 방향은 가능한 한 `defs → core/state → scenes/ui`를 따른다. 순수 규칙은 PIXI를 import하지 않으며, 장면은 규칙 결과를 화면 이벤트로 표현한다.

## 런타임 원칙

- `SceneScope`: 장면이 등록한 ticker와 정리 작업을 일괄 해제한다.
- 씬 전환 시 이전 씬이 예약한 tween/wait 콜백을 취소한다.
- `GameNavigator`: 장면 이름과 인자를 컴파일 단계에서 검사한다.
- `gameStore`: 상태 조회·트랜잭션·구독 경계를 제공한다. 기존 `G`는 점진적 이전을 위한 호환 API다.
- `gameplayRandom`과 `visualRandom`: 게임 판정과 시각 장식 난수를 분리한다.
- 세이브는 `SAVE_VERSION`을 포함하며 알 수 없는 버전이나 손상된 구조를 거부한다.

## 조작

| 입력 | 동작 |
|---|---|
| W/S | 전진·후진 |
| A/D | 좌우 옆걸음 |
| Q/E 또는 ←/→ | 좌우 회전 |
| Z / 스페이스 | 조사·대화·시설 진입 |
| 마우스/터치 | UI 버튼과 방향 패드 |

## 실행과 검증

```bash
cd apps/web
npm run dev
npm run typecheck
npm run lint
npm test -- --run
npm run build
```
