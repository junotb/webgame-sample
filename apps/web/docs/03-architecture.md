# 03 — 아키텍처

## 디렉터리 구조

```text
apps/web/
├── app/                    Next.js App Router와 폰트
├── components/             React 캔버스 마운트 셸
├── game/
│   ├── defs/               정적 정의와 타입
│   ├── core/               전투·주사위·상태·난수 등 순수 규칙
│   ├── scenes/             PixiJS 화면과 입력
│   ├── town/               마을 데이터·컴파일·시설 규칙
│   ├── ui/                 재사용 오버레이 UI
│   ├── __tests__/          규칙·데이터·에셋 회귀 테스트
│   ├── core.ts             PixiJS 앱, 씬 생명주기, nav, UI 헬퍼
│   ├── index.ts            boot와 nav 배선
│   ├── state.ts            GameState와 상태 명령
│   └── persistence.ts      세이브 직렬화·검증
├── public/assets/          브라우저가 실제로 로드하는 에셋
├── assets-source/          편집·보관용 원본 에셋
├── docs/                   개발 문서
└── scripts/                에셋 생성·보조 스크립트
```

## React와 게임 런타임 경계

React는 게임 캔버스의 생명주기만 관리한다. 게임 모듈은 클라이언트에서 동적으로 로드되고 `game/index.ts`의 `boot(element, fonts)`를 호출한다.

`boot()`의 순서:

1. PixiJS 애플리케이션과 루트 컨테이너 초기화
2. 초상화, 타일 시트, 몬스터 아이콘 프리로드
3. 키보드 입력 연결
4. `nav` 라우터에 씬 빌더 배선
5. 타이틀 씬 진입

반환된 cleanup은 입력, PixiJS 애플리케이션과 관련 런타임 자원을 해제한다. React 상태를 게임의 프레임 단위 상태 저장소로 사용하지 않는다.

## 모듈 경계

### `game/defs/`

게임의 마스터 데이터와 타입을 보관한다. 가능한 한 PixiJS와 브라우저 API에 의존하지 않는다. 백엔드나 외부 데이터 소스로 이전할 때 계약의 기준이 되는 계층이다.

### `game/core/`

주사위, 전투 공식, 상태이상, 의뢰, 난수, 트윈 큐처럼 독립적으로 테스트 가능한 규칙을 둔다. 화면 객체를 직접 만들지 않는다.

루트의 `game/core.ts`는 이름이 비슷하지만 PixiJS 런타임 모듈이다. 순수 규칙을 추가할 때는 `game/core/` 아래에 둔다.

### `game/state.ts`

현재 `GameState`, `gameStore`, 파생 조회와 상태 변경 명령을 제공한다. UI나 씬은 상태 객체를 임의로 변경하기보다 이 계층의 명령을 호출한다.

### `game/scenes/`와 `game/ui/`

씬은 화면 구성, 입력과 연출을 담당한다. 여러 씬에서 재사용되는 상점, 인벤토리, 성장, 훈련 UI는 `game/ui/`에 둔다.

### `game/town/`

마을별 데이터와 공통 검증을 씬에서 분리한다. `compileTown()`은 잘못된 시설 좌표, 배치 중복, 접근 불가능한 통행 칸을 마을 진입 시 즉시 발견한다.

## 의존 방향

```text
defs ───────────────┐
                    ├→ state ─┐
core 규칙 ──────────┘         ├→ scenes / ui
town 데이터·규칙 ─────────────┘

core.ts(PixiJS 런타임) ─→ scenes / ui
index.ts ─→ 모든 씬을 조립하고 nav를 배선
```

유지할 규칙:

- `defs/`에 PixiJS 표현 코드를 넣지 않는다.
- 씬끼리 서로 import해 전환하지 않는다.
- 씬 전환은 `nav`를 통해 요청하고 실제 배선은 `game/index.ts`에서 한다.
- 데이터 검증이 가능한 경우 렌더링 전에 순수 함수에서 실패시킨다.
- 게임 판정용 난수와 장식용 난수를 섞지 않는다.

## nav 라우터

`GameNavigator`는 `game/core.ts`에서 타입을 선언하고 `game/index.ts`가 실제 씬 빌더를 연결한다. 현재 라우트에는 타이틀, 생성, 프롤로그, 마을, 편지 이벤트, 탐험, 필드, 엔딩과 에픽 클리어가 포함된다.

새 라우트를 추가할 때:

1. `GameNavigator`에 타입 추가
2. `boot()`에서 `switchScene()`을 이용해 구현 연결
3. 호출부는 `nav.<route>()`만 사용

## 씬 생명주기

씬 빌더는 `SceneHandle`을 반환한다.

```ts
export function exampleScene(): SceneHandle {
  const scope = new SceneScope();
  const root = new PIXI.Container();
  sceneRoot.addChild(root);

  return {
    onKey(key) {
      // 화면별 입력
    },
    dispose() {
      scope.dispose();
    },
  };
}
```

`switchScene()`은 이전 씬의 `dispose()`를 호출하고, 씬 전용 tween을 취소한 뒤 `sceneRoot`의 자식을 파괴한다.

- ticker, DOM listener와 구독은 `SceneScope`에 등록한다.
- `overlayRoot`에 추가한 객체는 씬 전환으로 자동 제거되지 않으므로 `dispose()`에서 직접 제거한다.
- 전역 연출이 아닌 예약 callback은 기본적으로 씬 전환 시 취소되어야 한다.

## 에셋 로딩

런타임 에셋은 `public/assets/`에서만 로드한다.

- `game/tiles.ts`: `SHEET_SRC`와 `FRAMES`로 타일 시트를 등록하고 슬라이스
- `game/monsters.ts`: 몬스터 아이콘 카탈로그를 프리로드
- `game/portraits.ts`: 규칙 기반 파일명을 프리로드
- `game/__tests__/assets.test.ts`: 파일과 카탈로그의 정합성 검증

`assets-source/`는 브라우저에서 직접 참조하지 않는다. 자세한 규칙은 [06-assets.md](./06-assets.md)를 따른다.

## 검증 계층

- `defs` 데이터의 중복과 연결 관계
- 순수 전투 및 성장 공식
- 마을 좌표와 도달 가능성
- 의뢰와 월드 상태
- 런타임 에셋 파일 존재 및 카탈로그 정합성
- 씬·마을 모듈의 TypeScript 컴파일

구조 변경 후에는 `typecheck`, `lint`, 전체 테스트와 프로덕션 빌드를 실행한다.
