# docs — 부서진 왕국의 연대기 개발 문서

이 폴더는 **AI 어시스턴트(Claude Code 등)와 신규 개발자가 코드 수정 전에 게임을 정확히 이해**하도록 작성된 문서 모음입니다. 모든 수치·함수명·파일 경로는 v0.2 코드와 1:1로 일치하도록 관리합니다. **코드를 수정하면 해당 문서도 함께 갱신하세요.**

## 읽는 순서

| 문서 | 내용 | 이럴 때 읽기 |
|---|---|---|
| [01-overview.md](./01-overview.md) | 게임 개요, 4개 모드, 진행 플로우 | 처음 온보딩할 때 |
| [02-systems.md](./02-systems.md) | 클래스/스킬/전투/탐험/필드스킬 규칙과 공식 | 게임 규칙·밸런스를 건드릴 때 |
| [03-architecture.md](./03-architecture.md) | 모듈 구조, nav 라우터, 씬 생명주기, PIXI 패턴 | 코드 구조를 바꾸거나 씬을 만들 때 |
| [04-data-reference.md](./04-data-reference.md) | 전체 데이터 테이블 (몬스터/어빌리티/상점/멤버) | 데이터·수치를 조회/수정할 때 |
| [05-extension-guide.md](./05-extension-guide.md) | 콘텐츠 추가 절차, 백엔드 마이그레이션 지점 | 새 기능을 추가할 때 |

## 프로젝트 한 줄 요약

다크 판타지 웹 RPG 프로토타입. **TypeScript + Next.js 16 (App Router) + PixiJS 7** (Canvas/WebGL 렌더링, React는 마운트 셸만 담당). 4인 파티, 멀티 레인 탐험(갈림길에서만 레인 이동), 이동 없는 순수 턴제 커맨드 전투, 클래스 트리 1→4→8.

## 핵심 불변 규칙 (수정 시 반드시 유지)

1. `src/game/data.ts`와 `src/game/state.ts`는 **PIXI를 import하지 않는다** — 백엔드 이전 대상인 순수 모듈.
2. 씬 전환은 반드시 `core.ts`의 `nav` 라우터 또는 `switchScene()`을 통한다 — 씬 모듈끼리 서로 직접 import해 전환하지 않는다(순환 import 방지).
3. 씬 빌더는 `SceneHandle`(`onKey?`, `dispose?`)을 반환하고, ticker/interval 등 자원은 `dispose`에서 해제한다.
4. 클래스 트리(1→4→8)와 최종 8클래스의 달인/숙련 집합은 **확정 사양** — 변경 시 로직 테스트(02-systems.md §검증 참고)를 다시 통과시켜야 한다.
