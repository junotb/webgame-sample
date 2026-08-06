# 아이콘 어휘 등록부 (Icon Vocabulary)

원칙: **아이콘은 파일이 아니라 의미다.**
코드·콘텐츠·스펙 문서는 이 등록부의 `의미 ID`로만 아이콘을 참조한다. 파일 교체는 이 문서와
`assets/icons/`만 수정하면 되고, 참조하는 쪽은 무변경이어야 한다.

- 출처: game-icons.net (CC BY 3.0) — 파일 확정 시 **작가 열 필수 기입** (CREDITS.md의 원천)
- 색은 파일에 없다: 전부 black/transparent SVG + `currentColor`. 허용 색은 이 문서의 색 토큰 열이 정의
- 하나의 의미 ID에 파일은 하나. 상태 차이는 색 토큰으로만 표현 (아이콘 어휘 = FL 방식)

## 색 토큰 (globals.css의 CSS 변수와 1:1)

| 토큰 | 용도 |
|---|---|
| `--ink` | 기본 (문서 잉크색) |
| `--festival-gold` | 정상 가동, 축제, 밝음의 연출 |
| `--warn` | 노후도 경고, 미처리 |
| `--cold` | 침식, 균열, "설비 이상" 관련 |
| `--muted` | 비활성, 미공개 구역 |

## 등록부

### 지도 마커 = 표면 분류 5종

어휘 크기는 **표면 분류(`CardFace`) 5개와 일대일**이고, 대응 대상은 분류 **필드**이지
얼굴 문구가 아니다 (CLAUDE.md 아이콘 규칙, v3 §4).

> 이전 판은 `marker-main` / `marker-sub` / `marker-daily`라는 **메인·서브·일상** 체계였다.
> 그것은 실제 층(무엇이 벌어지는가)의 분류라 표면 층에 둘 수 없고, 규칙이 확정되기 전의
> 잔재였다. 2026-08-06 교체.

| 의미 ID | 대응 `CardFace` | 용도 | 파일 | 검색 키워드 후보 | 작가 |
|---|---|---|---|---|---|
| `face-inspection` | `inspection` | 점검 | (절차적 폴백) | magnifying-glass, check-mark, inspection | |
| `face-patrol` | `patrol` | 순찰 | (절차적 폴백) | footprints, cycle, route | |
| `face-liaison` | `liaison` | 보고 | (절차적 폴백) | scroll, document, stamp | |
| `face-supply` | `supply` | 자재 | (절차적 폴백) | crate, box, cube | |
| `face-survey` | `survey` | 탐사 | (절차적 폴백) | compass, waypoint, survey-marker | |

- 코드 매핑은 `web/app/face-icons.tsx`의 `FACE_ICON_IDS` (전수 매핑 — 분류가 늘면 타입이 막는다)
- **마커는 상태에 반응해 변하지 않는다.** 노후도가 오르든 재발부든 같은 그림이다.
  처리 완료 표식만이 유일한 상태 표현이며 그것은 아이콘이 아니라 겹쳐지는 도장이다
- 파일은 미정이고 현재는 절차적 SVG 폴백이다. game-icons.net 임포트는 별도 라인 —
  확정 시 `face-icons.tsx`만 교체하면 되고 참조하는 쪽은 무변경이다

### 메나스

| 의미 ID | 용도 | 파일 | 검색 키워드 후보 | 작가 |
|---|---|---|---|---|
| `menace-fatigue` | 피로 | (미정) | tired-eye, sleepy, weight | |
| `menace-scrutiny` | 주목 | (미정) | eye, magnifying-glass, surveillance | |
| `menace-unrest` | 동요 | (미정) | crack, spiral, shaking | |

### 캐릭터 시트

| 의미 ID | 용도 | 파일 | 검색 키워드 후보 | 작가 |
|---|---|---|---|---|
| `stat-repair` | 정비 | (미정) | wrench, gear-hammer | |
| `stat-insight` | 진단 | (미정) | eye-target, inspection | |
| `stat-procedure` | 절차 | (미정) | scroll, stamp, files | |
| `stat-nerve` | 담력 | (미정) | heart-tower, shield | |
| `quality-memory` | 기억 | (미정) | brain, candle-flame, key | |
| `quality-rank` | 직위 | (미정) | epaulette, rank-badge, laurels | |

### 월드/문서 UI

| 의미 ID | 용도 | 파일 | 검색 키워드 후보 | 작가 |
|---|---|---|---|---|
| `world-altitude` | 고도 표시 | (미정) | altimeter, mountain-cave, paper-plane | |
| `district-decay` | 구역 노후도 | (미정) | broken-wall, leaky-pipe | |
| `doc-workorder` | 지시서 문서 헤더 | (미정) | clipboard, document-stamp | |
| `doc-approved` | 승인/완료 도장 | (미정) | check-mark, seal | |

## 규칙

1. **새 아이콘이 필요하면 먼저 여기에 의미 ID를 등록**하고, 파일은 나중에 골라도 된다
   (미정 상태로도 코드는 의미 ID를 참조 가능 — 폴백 아이콘 1개를 `icon-fallback`으로 지정)
2. 파일 확정 시: `assets/icons/`에 원본 커밋 + 이 표의 파일·작가 열 기입 + CREDITS.md 갱신
3. 하나의 파일을 여러 의미 ID가 공유해도 된다 (재사용 장려) — 단 의미 ID는 나누어 둔다
   (나중에 분리 교체 가능하게)
4. 스펙 문서는 아이콘을 이 문서의 의미 ID로만 언급한다. 파일명 직접 언급 금지
5. 콘텐츠 스키마에 아이콘이 들어가는 시점(스토리렛 아이콘 등)이 오면,
   `IconId` 타입을 이 등록부에서 생성한다 (등록부 → 타입 코드 생성 검토)
