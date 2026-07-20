# docs — 부서진 왕국의 연대기 개발 문서

이 폴더는 신규 개발자와 AI 어시스턴트가 코드를 수정하기 전에 게임의 구조와 변경 규칙을 빠르게 파악하기 위한 문서 모음이다.

수치와 데이터 목록의 원본은 `game/defs/`와 테스트다. 문서에는 설계 의도, 모듈 경계, 확장 절차처럼 코드만 읽어서는 놓치기 쉬운 내용을 기록한다. 코드의 모든 상수와 테이블을 문서에 복제하지 않는다.

## 읽는 순서

| 문서 | 내용 | 이럴 때 읽기 |
| --- | --- | --- |
| [01-overview.md](./01-overview.md) | 게임 흐름과 주요 화면 | 처음 온보딩할 때 |
| [02-systems.md](./02-systems.md) | 파티·성장·전투·탐험의 핵심 규칙 | 게임 규칙을 수정할 때 |
| [03-architecture.md](./03-architecture.md) | 현재 모듈 구조와 런타임 경계 | 코드 구조나 씬을 변경할 때 |
| [04-data-reference.md](./04-data-reference.md) | 데이터별 기준 파일과 검증 테스트 | 정의와 수치를 찾을 때 |
| [05-extension-guide.md](./05-extension-guide.md) | 콘텐츠 추가 절차 | 몬스터·시설·씬을 추가할 때 |
| [06-assets.md](./06-assets.md) | 에셋 디렉터리·명명·런타임 반영 규칙 | 이미지와 타일셋을 다룰 때 |

## 프로젝트 한 줄 요약

**TypeScript + Next.js 16 + React 19 + PixiJS 8** 기반 판타지 웹 RPG다. React는 게임 캔버스를 마운트하고, PixiJS가 1280×720 게임 화면과 입력·연출을 담당한다.

## 문서 유지 원칙

1. 게임 데이터와 정확한 수치는 `game/defs/`를 기준으로 한다.
2. 게임 규칙은 `game/state.ts`와 `game/core/`의 구현 및 테스트를 기준으로 한다.
3. 런타임 에셋은 `public/assets/`, 편집·보관용 원본은 `assets-source/`를 기준으로 한다.
4. 문서에 버전 번호나 데이터 개수를 불필요하게 고정하지 않는다.
5. 구조나 개발 절차가 바뀌었을 때만 관련 문서를 함께 수정한다.

## 실행과 검증

`apps/web`에서 실행한다.

```bash
npm run dev
npm run typecheck
npm run lint
npm test -- --run
npm run build
```
