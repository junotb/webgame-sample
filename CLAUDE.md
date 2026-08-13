# 작업 규칙 — 코드가 정본인 것

> **이 파일에는 코드가 정본인 사실만 쓴다** — 심볼 이름, 상태 경로, 스키마 번호,
> 테스트로 고정해야 하는 것. 수치·판정식은 `docs/system-rules.md`, 근거는 `docs/design-structure.md`.
>
> 판별: *이 줄이 가리키는 것이 코드에 있는가?* 없으면 이 파일이 아니다.
> 규칙과 코드가 어긋나면 규칙이 옳다 — 코드를 고친다. 단 아래 "코드가 답인 것"은 반대다.

@docs/system-rules.md

## 문서 라우팅

| 물음 | 열 문서 |
| --- | --- |
| 수치·판정식·불변식이 무엇인가 | `docs/system-rules.md` (위에서 자동 적재) |
| 왜 그런 규칙인가, 세계·엔딩·비밀·명명 | `docs/design-structure.md` |
| 산문을 어떻게 쓰는가 | `docs/design-structure.md` §12 |
| 1주차 범위, 분량 상한 | `docs/design-structure.md` §11 |
| 남은 미결, 이후 과제 | `docs/design-structure.md` §9 |
| 카드·장면의 실제 목록 | `web/content/content.ep1-slice.json` |
| 위 어디에도 없음 | **미결이다. 추측해서 채우지 말고 물어볼 것** |

과거 사양 문서(`implementation-plan.md`·`content-grid-week1.md`)는 폐기·삭제되었다.
코드 주석·커밋 메시지가 옛 문서를 인용하더라도 위 세 파일이 전부다.

---

## 코드가 답인 것

규칙 문서가 낡았을 수 있는 값들이다. 어긋나면 코드가 맞고, 문서를 고친다.

- `SAVE_SCHEMA` — 원본은 `web/app/save.ts`
- 콘텐츠 번들의 실제 카드·장면 목록 — `web/content/content.ep1-slice.json`
- 검증기가 실제로 검사하는 항목 — `web/core/validate.ts`

## 상태 경로

- 구역 정체 `world.zones.{zone}.stagnation`
- 소모 수치 `world.menace.{fatigue|scrutiny|unrest}` — 피로/주목/동요.
  `menace`는 QBN 장르 용어이며 "위협"으로 옮기지 않는다
- 신뢰 `world.npcs.returned.trust` — "돌아온 자"(조직의 전령)의 것이다.
  플레이어 자신은 `NpcId`가 아니다
- 기술 경험치 `self.skillXp.{skill}` — **등급(`self.skills.*`)에 직접 쓰는 경로는 없다.**
  승격은 적용기의 몫
- 구역 치환자는 `{zone}`

## 심볼

- 기술 5종: `flowsense` 감류학 / `incantation` 영창술 / `inscription` 각인학 /
  `flame` 화염술 / `frost` 빙결술
- 미니게임 4종: `pipe` / `onestroke` / `block` / `whack`
- 카드 종류 4종: `circuit` / `patrol` / `material` / `incinerate`.
  미니게임과 1:1이며 스키마 명시 필드다
- 엔딩: `retained` / `fired`
- 조우는 `core/encounter.ts` 독립 리듀서. GameState 밖 로컬 상태이며,
  종료 시 `RESOLVE_ENCOUNTER`로만 효과가 반입된다
- 오버레이는 공통 셸(`app/overlay-shell.tsx`)을 쓴다 — 조우·다일·탐사 공용

## 테스트로 고정할 것

새 코드가 이 성질을 깨면 테스트가 먼저 깨져야 한다.

- **과거 문서도 현재 `기억` 값으로 재렌더링한다.** "그때 값으로 렌더링"이 자연스러운
  구현이라 명시하지 않으면 그쪽으로 고쳐진다 — `core/rerender.ts`
- **지명이 치환자 대상에 섞이지 않는다.** `renderArchiveEntry`·완곡어 치환 경로 양쪽
- **주간 합산은 금요일 시점 값을 유지한다** — 주말 단계가 뒤에 붙어도 흔들리지 않는다
- **렌더링된 문장이 세이브에 들어가지 않는다.** 스키마를 바꿀 때마다 재확인
- **밴드는 저장되지 않고 항상 파생된다**

## 규칙 추가·수정 시

- 수치·판정식이면 `docs/system-rules.md`, 근거가 붙으면 `docs/design-structure.md`.
  **이 파일에는 코드에 실재하는 이름만 남긴다**
- 규칙 문서 갱신이 먼저다. 이 파일은 그 뒤에 단방향으로 따라간다
- 여기에 없는 것을 추측으로 채우지 않는다 — 라우팅 표의 마지막 행을 따른다
