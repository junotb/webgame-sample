# 작업 규칙

> **이 파일에는 게임 규칙을 쓰지 않는다.** 어느 문서를 여는지, 어디가 정본인지,
> 무엇을 테스트가 지키는지만 쓴다.
>
> 판별: *이 줄이 게임에 대해 말하는가?* 그렇다면 이 파일이 아니다 —
> 수치·판정식은 `docs/system-rules.md`, 근거는 `docs/design-structure.md`,
> 심볼과 타입은 코드가 스스로 말한다.

@docs/system-rules.md

## 문서 라우팅

| 물음 | 열 문서 |
| --- | --- |
| 수치·판정식·불변식이 무엇인가 | `docs/system-rules.md` (위에서 자동 적재) |
| 왜 그런 규칙인가, 세계·엔딩·비밀·명명 | `docs/design-structure.md` |
| 산문을 어떻게 쓰는가 | `docs/design-structure.md` §12 |
| 1주차 범위, 분량 상한 | `docs/design-structure.md` §11 |
| 남은 미결, 이후 과제 | `docs/design-structure.md` §9 |
| 심볼·상태 경로·타입이 무엇인가 | `web/core/schema.ts` |
| 카드·장면의 실제 목록 | `web/content/content.ep1-slice.json` |
| 위 어디에도 없음 | **미결이다. 추측해서 채우지 말고 물어볼 것** |

과거 사양 문서(`implementation-plan.md`·`content-grid-week1.md`)는 폐기·삭제되었다.
코드 주석·커밋 메시지가 옛 문서를 인용하더라도 위 두 문서가 전부다.

---

## 정본이 어디인가

규칙 문서와 코드가 어긋나면 **규칙이 옳다 — 코드를 고친다.** 아래 넷만 반대다.

| 대상 | 정본 |
| --- | --- |
| 심볼 이름·상태 경로·타입 | `web/core/schema.ts` |
| `SAVE_SCHEMA` 번호 | `web/app/save.ts` |
| 카드·장면의 실제 목록 | `web/content/content.ep1-slice.json` |
| 검증기가 실제로 검사하는 항목 | `web/core/validate.ts` |

이 넷을 문서에 옮겨 적지 않는다. 사본을 만들면 어긋나도 드러나지 않는다.

## 테스트로 고정된 것

명시하지 않으면 자연스러운 구현이 반대쪽으로 가는 성질들이다.
새 코드가 이것을 깨면 테스트가 먼저 깨져야 한다.

| 성질 | 지키는 테스트 |
| --- | --- |
| 과거 문서도 현재 값으로 다시 렌더링된다 | `core/rerender.test.ts` |
| 지명은 어느 변형 축도 타지 않는다 | `core/rerender.test.ts` |
| 주간 합산은 뒤에 붙는 단계에 흔들리지 않는다 | `core/reducer.test.ts` |
| 렌더링된 문장이 세이브에 들어가지 않는다 | `core/rerender.test.ts` |
| 밴드는 저장되지 않고 항상 파생된다 | `core/calendar.test.ts` |
| 프롤로그 완료는 저장되지 않는다 — 첫 저장은 프롤로그 종료 시점, 이어하기는 거치지 않는다 | `app/prologue.test.tsx` |
| 백로그는 드러난 문단까지만 보여준다 — 미리 읽기 없음, 열림 중 진행 차단 | `app/paged-copy.test.tsx` |
| 미니게임 개시는 저장되고, 이탈한 카드는 이어하기가 실패로 반입한다 | `app/resume-fail.test.tsx` |
| 본문 진행은 덧붙임(NVL 누적)이 아니라 문단 단위 전환이다 | `app/paged-copy.test.tsx` |

## 규칙 추가·수정 시

- 수치·판정식이면 `docs/system-rules.md`, 근거가 붙으면 `docs/design-structure.md`.
  **둘 다 아니면 코드에 쓴다** — 심볼의 뜻은 심볼 옆에 적는다
- 규칙 문서 갱신이 먼저다. 코드는 그 뒤에 단방향으로 따라간다
- 여기에 없는 것을 추측으로 채우지 않는다 — 라우팅 표의 마지막 행을 따른다
