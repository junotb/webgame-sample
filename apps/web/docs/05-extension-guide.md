# 05 — 확장 가이드

새 콘텐츠를 추가할 때의 표준 절차. **공통 원칙: 데이터는 `data.ts`, 규칙은 `state.ts`, 연출은 씬** — 이 분리를 깨지 않는다.

## 새 몬스터 추가

1. `data.ts` `ENEMY_DEFS`에 항목 추가 (id, 스탯, `tier`, `shape`, `big?`).
2. 새 실루엣이 필요하면 `monsters.ts` `drawMonster()`에 shape 분기 추가 (기존 shape 재사용 가능).
3. 등장 경로 연결:
   - 랜덤 조우: `explore.ts` `randomGroup()`의 레벨별 pool에 id 추가.
   - 심볼(정예/보스/에픽): `explore.ts`에서 `symbolNode(ENEMY_DEFS.신규id)` + `addObj({... lane, x, act: () => nav.battle([...], { symbol?: ... }) })`. 처치 플래그가 필요하면 `state.ts` `ExploreState.defeated`에 키 추가.
4. 4인 파티 기준 밸런스 확인: 일반 몹 HP 45~75선, 심볼은 광역기(35%, ×0.65)가 자동 적용됨.

## 새 전투 어빌리티 추가

1. `data.ts` `ABILITIES`에 추가 — `skill`(17종 중 하나)과 `min`(요구 랭크)만 맞추면 **해당 랭크 보유 멤버에게 자동 노출**된다 (`memberAbilities`).
2. 사용 가능한 필드: `pow/hits/all/pierce/crit/drain`, `kind: "phys"|"mag"|"heal"`. 새 특수 효과가 필요하면 `battle.ts` `execAllyAttack()`(공격) 또는 `onAllyTap()`(치유 계열)에 분기 추가.
3. `heal` kind는 아군 대상 선택 플로우를 자동으로 탄다. `all`은 대상 선택 없이 전체 적에 즉시 발동.

## 새 클래스/스킬 변경 (⚠️ 확정 사양 — 변경 전 합의 필요)

- 클래스: `data.ts` `CLASSES`에 추가. `from`으로 트리 연결, `masters/experts`(+`"LD"`), `ld: true` 여부. `classOptions()`는 `tier===2 && from===현재클래스`로 자동 탐색하므로 별도 등록 불필요.
- 변경 후 반드시 [02-systems.md §7](./02-systems.md)의 로직 테스트를 갱신·재실행할 것.

## 새 필드 스킬 추가

1. `data.ts` `FIELD_SKILLS`에 정의 (id, 요구 skill/min, mp).
2. `state.ts` `FieldSkillEntry`의 id 유니온과 `hud.ts` `FieldHandlers` 타입에 id 추가.
3. `explore.ts` `buildPartyHUD(..., { fieldHandlers: { 신규id() {...} } })`에 핸들러 구현. MP 차감은 메뉴(`openFieldSkillMenu`)가 처리하므로 핸들러에서 하지 않는다.

## 새 씬(모드) 추가

1. `scenes/신규.ts`에 `export function 신규Scene(...): SceneHandle` 빌더 작성 (03-architecture.md 생명주기 준수 — overlayRoot에 올린 건 dispose에서 제거, ticker는 remove).
2. `index.ts`에서 `nav.신규 = (...args) => switchScene(() => 신규Scene(...args));` 배선.
3. 다른 씬에서는 `nav.신규(...)`로만 호출. **씬 파일을 직접 import하지 않는다.**

## 맵 확장 (레인/갈림길/오브젝트)

- `explore.ts` 상단 상수만으로 조정 가능: `WORLD_W`, `LANE_Y`/`LANE_SCALE`(레인 수 변경 시 `tryLane` 클램프 `0~2`와 터치 버튼도 수정), `JUNCTIONS`(x, w).
- 오브젝트는 `addObj({ id, x, lane, node, radius, prompt, act, hidden?, bob? })`. **상호작용은 같은 레인에서만** 판정됨을 잊지 말 것. 숨김 오브젝트는 `hidden()` + seek 핸들러에 발견 로직 추가.
- 신규 맵(스테이지)을 만들려면 exploreScene을 맵 정의 파라미터를 받는 형태로 일반화하는 것을 권장 (`ExploreState`에 맵 id 추가).

## 세이브/로드·백엔드 연동 (다음 단계 권장 구현)

- 직렬화 대상은 `G: GameState` 하나로 완결 (PIXI 참조 없음). `JSON.stringify(G)` 가능.
- 삽입 지점: `index.ts`의 nav 배선을 감싸 씬 전환 시 자동 저장, `boot()`에서 로드 후 `nav.town()` 재개.
- .NET 백엔드 도입 시: `data.ts` 타입 → 마스터 데이터 DTO, `GameState` → 세이브 스키마, `gainExpParty/doClassChange` 등 뮤테이션 → API 호출로 치환.

## 알려진 제약 (v0.2)

- 저장 기능 없음 — 새로고침 시 초기화.
- 모바일: 터치 패드로 플레이 가능하나 레이아웃 최적화 미완.
- `wait()`는 씬이 파괴되어도 콜백이 1회 실행됨 — 콜백 안에서 파괴된 객체를 만질 경우 `destroyed` 체크 필요 (tween은 자동 가드).
- 장비 슬롯은 무기/방어구 각 1개, 인벤토리·되팔기 없음.
- 적은 광역 외 스킬/상태이상 없음. 아군 버프는 축복(공격 ×1.25)뿐.
