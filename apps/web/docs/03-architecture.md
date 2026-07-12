# 03 — 아키텍처

## 레이어 구조

```
React (Next.js App Router)          ← 마운트 셸만 담당. 게임 UI는 전부 PIXI
└── src/components/GameCanvas.tsx   'use client'. useEffect에서 import("@/game") 동적 로드
    └── src/game/index.ts           boot(el, fonts) → cleanup 반환
        ├── core.ts                 PIXI 앱·씬 매니저·트윈·UI 헬퍼·nav 라우터 (허브)
        ├── data.ts / state.ts      ★ 순수 TS (PIXI 비의존) — 백엔드 이전 대상
        ├── monsters.ts             절차적 Graphics 스프라이트
        ├── hud.ts                  파티 HUD·모험 수첩·필드스킬 메뉴·pickMember
        └── scenes/                 title · event · town · explore · battle · story
```

### React ↔ 게임 경계
- PixiJS는 브라우저 전용이므로 `GameCanvas.tsx`가 **동적 import**로만 게임을 로드한다 (SSR 회피).
- `boot()`이 반환한 cleanup을 unmount 시 호출 → React 19 StrictMode의 mount→unmount→mount에도 안전. **게임 쪽에서 React 상태를 참조하지 않는다.**
- 폰트: `src/app/fonts.ts`의 next/font(Noto Sans/Serif KR)에서 `style.fontFamily` 문자열을 props로 내려 `boot`이 `core.FONTS`에 주입. PIXI `txt()`가 이를 사용 (`serif: true` → display 폰트).

## import 방향 규칙 (순환 방지)

```
data ← state ← (core와 무관)
core ← monsters, hud, 모든 scenes, index
event ← town(미사용), explore, story        ※ event는 core/state만 import
battle, explore, town, title, story ←(직접 import 금지)→ 서로 전환은 nav로만
index → 모든 scenes를 import해 nav에 배선
```

- **씬 → 씬 직접 전환 금지.** 예외적으로 `explore.ts`가 보스 사전 이벤트에 `eventScene`(빌더)을 직접 사용하는데, 이는 event.ts가 leaf 모듈(다른 씬을 import하지 않음)이라 순환이 없기 때문.

## nav 라우터 (`core.ts` 선언, `index.ts` 배선)

```ts
nav.title()                          // 타이틀
nav.intro()                          // 서장 이벤트 (newGame은 title에서 호출)
nav.town()                           // 마을
nav.explore()                        // 탐험 (G.explore 상태로 이어서)
nav.battle(groupIds: string[], opts) // 흰 플래시 → battleScene. opts.symbol?: "orc"|"lord"|"ancient"
nav.ending()                         // 보스 처치 종장
nav.epicClear()                      // 에픽 클리어 외전
```

세이브/로드·서버 동기화 훅은 이 배선 지점(`index.ts`) 한 곳에 끼워 넣는 것을 전제로 설계됨.

## 씬 생명주기

```ts
export function someScene(): SceneHandle {
  const root = new PIXI.Container(); sceneRoot.addChild(root);
  // ... 구성 ...
  return {
    onKey(k) { /* 키 입력 (선택) */ },
    dispose() { /* ticker.remove, Text/interval 해제 등 (선택) */ },
  };
}
```

- `switchScene(builder)`: 이전 씬의 `dispose()` 호출 → `sceneRoot` 자식 전부 `destroy({children:true})` → 새 빌더 실행.
- **`overlayRoot`는 씬 전환에도 파괴되지 않는다** — 토스트/플래시/모드 배지/HUD 프롬프트용. 씬이 overlayRoot에 올린 객체는 반드시 `dispose`에서 직접 제거해야 한다 (예: `explore.ts`의 `prompt`, `junctionHint`).
- 키 리스너는 전역 1쌍(`attachInput`)이고 `currentScene.onKey`로 위임 — 씬에서 window 리스너를 직접 달지 않는다.

## core.ts 주요 API

| API | 설명 |
|---|---|
| `W, H` | 1280×720 고정 |
| `C` | 팔레트 (bg/panel/border/text/dim/hp/mp/blood/arcane/elite/boss/epic 등) |
| `tween(obj, to, dur, {ease, onDone})` | 자체 트윈. **대상이 `destroyed`면 자동 스킵** — PIXI 객체 파괴 후 콜백 크래시 방지 |
| `wait(ms, fn)` | tween 기반 타이머 (씬 파괴와 무관하게 1회 실행됨에 유의) |
| `txt(s, size, color, opts)` | PIXI.Text 헬퍼. `opts.serif`=디스플레이 폰트, wrap/lh/ls/shadow |
| `panel(w, h, opts)` / `button(label, w, h, onTap, opts)` | 공용 패널/버튼. 버튼은 `Btn` 타입(`setDisabled`, `labelText`) |
| `toast(msg, color)` / `fullFlash(color, dur, cb)` | 오버레이 연출 |
| `setModeBadge(label, color)` | 좌상단 모드 배지 (null이면 제거) |
| `ui.menuOpen` | 오버레이 메뉴 중복 방지 플래그. 탐험 ticker도 이 플래그로 입력 정지 |
| `keys` | 현재 눌린 키 맵 (탐험 이동은 폴링, 단발 입력은 `onKey`) |

## PIXI 사용 패턴 (프로젝트 컨벤션)

- 스프라이트는 전부 **절차적 Graphics** (`monsters.ts`). 이미지 에셋 없음.
- 동적 커스텀 프로퍼티는 인터페이스 확장 + 캐스트: `const c = new PIXI.Container() as Btn;`, 위치 기억은 `node.baseX/baseY`.
- 색 피격 연출은 Container가 아닌 **자식 Graphics의 `tint`** 를 조작 (`battle.ts flash()` — PIXI7 Container tint 미지원 회피).
- 탐험 루프는 `app.ticker.add(ticker)`로 등록하고 `dispose`에서 `remove` — 씬당 ticker 1개 원칙.

## 상태 모듈 (`state.ts`)

- 전역 단일 `G: GameState` (module-level let). `newGame()`이 재할당.
- `GameState`: `party: Member[4]`, `items`, `gold`, `blessedNext`, `explore`(x/lane/상자/발견/처치/veil), `flags`, `_fled`(보스 이벤트 임시 플래그).
- 규칙 함수는 전부 순수(렌더링 무관): `memberRanks / memberStats / memberAbilities / gainExpParty / partyFieldSkills / partyRank / canClassChange / classOptions / doClassChange / expNeed`.

## 백엔드 마이그레이션 로드맵 (설계 의도)

1. `data.ts` → 마스터 데이터 API(또는 정적 JSON). 타입이 그대로 DTO 스키마.
2. `state.ts`의 `GameState` → 서버 세이브 스키마. `newGame/gainExpParty/doClassChange` 등 뮤테이션 함수 → API 엔드포인트로 치환.
3. 클라이언트는 `nav` 배선 지점에서 저장/로드 호출을 삽입 (씬 코드는 무변경 목표).
