# docs — 부서진 왕국의 연대기 개발 문서

이 폴더는 신규 개발자와 AI 어시스턴트가 코드를 수정하기 전에 게임의 구조와 변경 규칙을 빠르게 파악하기 위한 문서 모음이다.

수치와 데이터 목록의 원본은 `game/defs/`와 테스트다. 문서에는 설계 의도, 모듈 경계, 확장 절차처럼 코드만 읽어서는 놓치기 쉬운 내용을 기록한다. 코드의 모든 상수와 테이블을 문서에 복제하지 않는다.

## 읽는 순서

| 문서 | 내용 | 이럴 때 읽기 |
| --- | --- | --- |
| [01-game-design.md](./01-game-design.md) | 게임 컨셉·흐름, 시스템 규칙, 데이터 기준 파일 | 처음 온보딩할 때, 게임 규칙·데이터를 수정할 때 |
| [02-architecture.md](./02-architecture.md) | 모듈 구조, 런타임 경계, 씬 생명주기 | 코드 구조나 씬을 변경할 때 |
| [03-content-and-assets.md](./03-content-and-assets.md) | 콘텐츠 추가 절차와 에셋 관리 규칙 | 몬스터·시설·씬·이미지를 추가할 때 |
| [04-asset-manifest.md](./04-asset-manifest.md) | 런타임 에셋 ← 원본 출처 매핑 | 시트를 재합성하거나 원본을 찾을 때 |

## 프로젝트 한 줄 요약

**TypeScript + Next.js 16 + React 19 + PixiJS 8** 기반 판타지 웹 RPG다. React는 게임 캔버스를 마운트하고, PixiJS가 1280×720 게임 화면과 입력·연출을 담당한다.

## 문서 유지 원칙

1. 게임 데이터와 정확한 수치는 `game/defs/`를 기준으로 한다.
2. 게임 규칙은 `game/state.ts`와 `game/core/`의 구현 및 테스트를 기준으로 한다.
3. 런타임 에셋은 `public/assets/`, 편집·보관용 원본은 `assets-source/`를 기준으로 한다.
4. 문서에 버전 번호나 데이터 개수를 불필요하게 고정하지 않는다.
5. 구조나 개발 절차가 바뀌었을 때만 관련 문서를 함께 수정한다.
6. 같은 내용을 여러 문서에 복제하지 않는다. 정본 하나를 두고 나머지는 링크한다.

## 실행과 검증

모든 명령은 `apps/web`에서 실행한다. 다른 문서에서 "전체 검증"은 이 블록을 가리킨다.

```bash
npm run dev          # 개발 서버
npm run typecheck
npm run lint
npm test -- --run
npm run build
```

에셋만 변경했다면 `npm test -- --run game/__tests__/assets.test.ts`로 좁혀 실행할 수 있다.
