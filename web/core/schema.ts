/**
 * Phase 0 스키마 v1 — 3시트 상태 + 콘텐츠 규격
 * 원칙: 순수 리듀서 코어 (프레임워크·저장소 무의존)
 * 이 파일이 AI 에이전트 콘텐츠 작성의 작업 규격이다 (가이드라인 D4)
 */

// ─────────────────────────────────────────────
// 식별자
// ─────────────────────────────────────────────
export type ZoneId = "d2" | "d5" | "d7"; // 제2·5·7구역 (가칭)
export type NpcId = "protagonist"; // Ep1 주인공 ("돌아온 자")
export type StatId = "repair" | "insight" | "procedure" | "nerve"; // 정비/진단/절차/담력
/**
 * 각인학/감류학 + 빙결술 (2026-08-11 확정 — 어머니의 유산 경로).
 * frost는 시작 등급 0 (미습득): 주말 마법서 학습(skillXp)이 첫 승격을 만든다.
 */
export type SkillId = "inscription" | "flowsense" | "frost";
export type MenaceId = "fatigue" | "scrutiny" | "unrest"; // 피로/주목/동요

// ─────────────────────────────────────────────
// 미니게임 (세션 ② 셸)
// ─────────────────────────────────────────────
/** 일반 카드 4종과 1:1 — 파이프 퍼즐 / 기사의 여행 / 블록 퍼즐 / 선별 두더지 */
export type MinigameId = "pipe" | "knight" | "block" | "whack";
/** 미니게임 성적 3값 — 완수/부분/실패. 성적 귀속(gradeOf)으로 3등급이 된다 */
export type MinigameResult = "complete" | "partial" | "fail";

// ─────────────────────────────────────────────
// 3시트 상태 (세이브 = 이 객체 그대로)
// ─────────────────────────────────────────────
export interface AccountSheet {
  ownedEpisodes: string[]; // 슬라이스: ['ep1']
  // 여력(액션)은 Phase 1에서 추가 — 가이드라인 확정사항
}

export interface CharacterSheet {
  stats: Record<StatId, number>; // 0~100
  /** 기술 등급 0~7 — **파생 캐시.** skillXp에서 승격되며 직접 쓰는 효과 경로는 없다 */
  skills: Record<SkillId, number>;
  /** 기술 경험치 — 원본. 비가역 (core/skills.ts). 콘텐츠 효과는 여기에만 쓴다 */
  skillXp: Record<SkillId, number>;
  memory: number; // 기억 0~7, 비가역 (감소 이펙트 금지 — 빌드 검증 대상)
  rank: number; // 직위 (슬라이스: 0 고정)
}

/**
 * 평가 3등급 (2026-08-11 확정) — 카드 성적과 주간 평가가 같은 3값을 쓴다.
 * 카드: 미니게임 완수→perfect / 부분→passed / 실패→notPassed.
 * 주간: 경계 합산식 (calendar.summarizeWeek) — 구 4종(완벽/양호/염려/경고)은 폐기.
 */
export type WeeklyRating = "perfect" | "passed" | "notPassed";

/** 엔딩 (implementation-plan §6-0) — Not Passed가 처리 장수의 절반 이상이면 해고, 그 외 유임 */
export type EndingId = "retained" | "fired";

/**
 * 재열람 항목 — 구역 바인딩이 필요한 문서는 구역을 함께 기억한다.
 * `day`는 **처음 겪은 일차**다. 같은 문서가 재발부되어도 항목은 늘지 않으므로
 * (v3 §7 "중복도 없다") 나중 일차로 덮어쓰지 않는다.
 * 일차는 상태값이지 렌더된 문장이 아니라서 "렌더 문장 미저장" 제약에 걸리지 않는다.
 */
export type ArchiveEntry =
  | { kind: "order"; day: number; templateId: string; zone: ZoneId }
  | { kind: "storylet"; day: number; id: string }
  | { kind: "encounter"; day: number; id: string; zone: ZoneId }
  /**
   * 평가 통지서 (금요일 총평 장면에서 발행) — 재열람 목록의 주 단위 구분선.
   * 등급은 저장하지 않는다: weekRatings[week]가 상태값이고 본문은 현재 상태로 재렌더링된다.
   */
  | { kind: "notice"; day: number; week: number };

export interface WorldSheet {
  calendar: {
    day: number; // 통산 일차 (주말 포함, day 1 = 1주차 월요일)
    weekday: number; // 주중 일차 1~5 (금요일 = 5)
  };
  assignment: { zone: ZoneId }; // 현재 배치 구역 — 1주차는 한 구역 고정 (v3 §9)
  weekRatings: Record<number, WeeklyRating>; // 주차 → 주간 평가
  /**
   * 주간 합산 장부 — 이번 주에 처리(resolved)한 장수와 그중 실패(Not Passed)·완수(Perfect) 장수.
   * CLOSE_DAY마다 누적, 주가 넘어가면 리셋. 방치는 처리 장수에 들어가지 않는다.
   * perfect는 미니게임 도입 전까지 항상 0 (현행 성공은 전부 Passed 취급).
   */
  weekTally: { processed: number; notPassed: number; perfect: number };
  /** 엔딩 확정값 — FINAL_WEEK 주말이 끝날 때 기록된다 (등급 자체는 금요일 정산 값). null = 진행 중 */
  ending: EndingId | null;
  /**
   * 주말 상태 (주간 마감 흐름 확정 2026-08-11) — 주말 2일에 매일 택2, 주당 4슬롯.
   * doneToday는 오늘 고른 것(하루 중복 방지), done은 주말 전체 누적(인물 1회 제한).
   * 요일은 calendar.weekday(6=토, 7=일)가 든다. null = 주말이 아니다.
   */
  weekend: { slotsLeft: number; doneToday: string[]; done: string[] } | null;
  /** 템플릿별 방치 누적 — 미시 피드백의 근거. 처리 성공 시 리셋 (v3 §2 미시 층) */
  cardNeglect: Record<string, number>;
  /** 다일 이벤트 점유 (v3 §5) — 점유 중 근무 슬롯 축소. daysLeft는 남은 점유 근무일 */
  multiday: { id: string; daysLeft: number } | null;
  /**
   * 재열람 서류함 (v3 §7) — 한 번 제시된 문서의 목록. 본문은 저장하지 않고
   * 콘텐츠에서 현재 상태로 다시 렌더링한다: 같은 문서가 기억에 따라 다르게 읽힌다.
   * 강조는 답을 주고, 재열람은 질문을 준다.
   */
  archive: ArchiveEntry[];
  phase: DayPhase;
  zones: Record<ZoneId, { decay: number }>; // 노후도 0~10
  menace: Record<MenaceId, number>; // 0~8
  npcs: Record<NpcId, { trust: number }>; // 신뢰 0~7
  flags: Record<string, number>; // 서사 플래그 (patched_d5 등)
  shiftLeft: number; // 근무 시간 잔여 (슬라이스의 트리아지 장치)
  pendingOrders: WorkOrder[]; // 오늘 생성된 지시서
  seed: number; // PRNG 상태 (재현성)
}

export interface GameState {
  account: AccountSheet;
  self: CharacterSheet;
  world: WorldSheet;
}

/**
 * 'debrief' = 금요일 일과 종료 직후의 주간 총평 장면 (상사 구두 — 통지서는 이때 발행됨).
 * 'weekend' = 주말 2일 택2 활동. 'ended' = 엔딩 확정 후 종착 상태 — 어떤 액션도 받지 않는다.
 */
export type DayPhase =
  | "morning"
  | "field"
  | "event"
  | "closing"
  | "debrief"
  | "weekend"
  | "ended";

// ─────────────────────────────────────────────
// 판정
// ─────────────────────────────────────────────
export type Check =
  | { kind: "broad"; stat: StatId; difficulty: number } // p = 0.6·stat/diff
  | { kind: "narrow"; skill: SkillId; difficulty: number } // p = 0.5+(skill−diff)·0.1
  | { kind: "auto" }; // 판정 없음

// ─────────────────────────────────────────────
// 효과 — QBN 스타일 경로 기반 (기억 감소는 빌드 검증에서 거부)
// ─────────────────────────────────────────────
export type EffectPath =
  | `self.stats.${StatId}`
  | `self.skillXp.${SkillId}` // 등급(self.skills.*)에 직접 쓰는 경로는 없다 — 승격은 적용기의 몫
  | "self.memory"
  | `world.zones.${ZoneId}.decay`
  | `world.menace.${MenaceId}`
  | `world.npcs.${NpcId}.trust`
  | `world.flags.${string}`;

export interface Effect {
  path: EffectPath;
  op: "add" | "set";
  value: number;
}

/**
 * 지시서 템플릿 전용 경로 — 템플릿은 구역 바인딩 전이므로 `{zone}` 치환자를 허용.
 * 생성기가 WorkOrder로 바인딩할 때 실제 ZoneId로 치환되며,
 * 리듀서의 effect 적용기에는 항상 구체 EffectPath만 도달한다.
 */
export type TemplateEffectPath =
  | EffectPath
  | "world.zones.{zone}.decay"
  | `world.flags.${string}{zone}${string}`;

export interface TemplateEffect {
  path: TemplateEffectPath;
  op: "add" | "set";
  value: number;
}

// ─────────────────────────────────────────────
// 조건 + 완곡어 텍스트 변형
// ─────────────────────────────────────────────
/**
 * 조건 경로. `world.zones.{zone}.decay`는 지시서 템플릿 본문 변형에서만 허용 —
 * 생성기가 카드로 바인딩할 때 구체 경로로 치환된다 (악화 축, v3 §7).
 * 스토리렛에서의 사용은 빌드 검증이 거부한다.
 */
export interface Condition {
  /** 조건은 등급(`self.skills.*`)을 읽을 수 있다 — 쓰기만 경험치 경유다 */
  path:
    | EffectPath
    | `self.skills.${SkillId}`
    | "world.calendar.day"
    | "world.zones.{zone}.decay";
  gte?: number;
  lte?: number;
}

/** 첫 매치 우선. 조건 없는 변형이 기본값(맨 뒤에 배치). 제목·라벨 등 한 줄 텍스트용. */
export interface TextVariant {
  if?: Condition[]; // 예: [{ path: 'self.memory', gte: 1 }]
  text: string;
}

/**
 * 본문 변형 — 문단 배열 (ui-screen-spec §4). 원소 하나 = 문단 하나 = 입력 한 번.
 * 분절은 읽기의 박자를 정하는 콘텐츠의 명시적 결정이라 `\n\n` 관례로 표현하지 않는다.
 * 변형 선택 규칙은 TextVariant와 같다 (첫 매치 우선, 무조건 변형이 기본값).
 */
export interface ProseVariant {
  if?: Condition[];
  paragraphs: string[];
}

// ─────────────────────────────────────────────
// 지시서 (자동 생성 콘텐츠)
// ─────────────────────────────────────────────
/**
 * 카드 종류 4종 (카드 리뉴얼 확정) — 미니게임과 1:1, 검증기가 이 필드를 검사한다.
 * 구 표면 분류 5종(inspection/patrol/liaison/supply/survey)은 폐기.
 * 얼굴 **문구**는 이 종류 안의 표현 변형(title)이고, 종류 자체는 4개 고정이다.
 * 아이콘 어휘도 이 필드와 1:1 (얼굴 문구가 아니라).
 */
export type CardKind =
  | "circuit" // 마력회로 점검 — 파이프 퍼즐
  | "patrol" // 구역 순찰 — 기사의 여행
  | "material" // 자재 옮기기 — 블록 퍼즐
  | "incinerate"; // 불순물 소각 — 선별 두더지 잡기

/**
 * 구역 도면의 한 지점 (UI 층위 사양 §7) — 지도 마커가 놓이는 자리.
 * 좌표를 지시서 템플릿에 직접 박으면 도면이 바뀔 때 템플릿이 전부 깨진다.
 * 도면이 지점 목록을 소유하고, 템플릿은 `siteId`만 참조한다.
 */
export interface ZoneSite {
  id: string; // 'd5-w7'
  label: string; // '7호 지선 하부' — 표면 층이므로 조직의 언어
  x: number; // 0~100 (도면 상대 좌표)
  y: number;
}

export interface ZoneMap {
  zone: ZoneId;
  title: string; // '제5구역 · 시설 배치도'
  sites: ZoneSite[];
}

export interface WorkOrderTemplate {
  id: string; // 'WO-T1' ...
  minDecay: number; // 이 노후도 이상 구역에서 생성됨
  weight: number; // 1~3 — CLOSE_DAY 노후도 정산 폭 (v3 §3, 빌드 검증 대상)
  kind: CardKind; // 카드 종류 4종 — 미니게임 1:1 (빌드 검증 대상)
  siteId: string; // ZoneSite.id — 배치 구역 도면에서 이 지점에 놓인다
  /**
   * 서사 전제 (v3 §4 정정) — minDecay 외의 등장 조건.
   * 도시의 비밀은 저녁 장면이 아니라 **일과 중에 고른 카드**에서 알게 되므로,
   * 진실의 뼈대를 이루는 카드는 플래그·기억·일차로 걸린다.
   * 1회성은 별도 필드 없이 "성공 시 플래그 세팅 + 여기서 그 플래그 배제"로 닫는다.
   */
  requirements?: Condition[];
  /**
   * 진실의 뼈대인가 (v3 §5). 표면에 드러나지 않는 **내부** 표시다 —
   * 렌더링되지 않으므로 "표면은 실제를 예고하지 않는다"에 걸리지 않는다.
   * 등장 우선순위에만 쓴다: 조건이 맞는 날 방치 정렬에 밀려 사라지면 진실이 멈춘다.
   */
  thread?: boolean;
  /**
   * 공식 완곡어 제목 — **단서가 실리는 자리**다 (v3 §4 「단서」).
   * 조건 없는 변형 하나면 단서 '없음'(문구 자체가 튄다),
   * `self.memory` 조건이면 기억 축, `self.skills.*` 조건이면 기술 축.
   * 카드 하나는 한 축만 쓴다 — §7의 조합 폭발 방지 원칙.
   */
  /** 도입 — 미니게임 전의 짧은 본문 (인터랙션 순서: 얼굴 → 열기 → 도입 → 미니게임 → 결과 산문) */
  title: TextVariant[];
  body: ProseVariant[]; // 완곡어 시스템 적용 지점 — 문단 배열 (ui-screen-spec §4)
  /**
   * 결과 반영 산문 — 미니게임 성적 3변형 (필수, 빌드 검증 대상).
   * 각 변형 = 현장 묘사(노후도 축) 문단 + 보고 문구(기억 축) 문단, 문단 분리.
   */
  resultProse: Record<MinigameResult, ProseVariant[]>;
}

/**
 * 생성기 출력: 템플릿 + 구역 바인딩.
 * 리듀서는 이 객체만 보고 처리한다 — 템플릿 재조회·치환 없음.
 */
export interface WorkOrder {
  templateId: string;
  zone: ZoneId;
  /** 템플릿에서 복사 — 지도는 이 값만 보고 마커를 놓는다 (템플릿 재조회 없음) */
  siteId: string;
  /** 미니게임 난이도 보정: 구역 노후도의 minDecay 초과분 + 방치 누적 (상승의 축은 노후도) */
  difficultyBonus: number;
  weight: number; // 템플릿에서 복사 — 정산은 리듀서가 이 값만 본다
  kind: CardKind; // 종류 4종 — 미니게임 1:1
  /** 재발부 차수 = 생성 시점의 방치 누적. 0이면 신규 발부. UI에 표기하지 않는다 */
  reissueCount: number;
  /** 변형 선택은 렌더 시점 — 단서가 지금의 기억·기술로 다시 판정된다 (v3 §7) */
  title: TextVariant[];
  body: ProseVariant[]; // 변형 선택은 렌더 시점 (완곡어 시스템)
  resolved: boolean;
  /**
   * 처리 성적 (3등급 확정) — 미니게임 결과의 귀속: 완수→perfect / 부분→passed / 실패→notPassed.
   * CLOSE_DAY 정산 근거: notPassed 외 −weight / notPassed 0 / 방치(미기록) +weight
   * (성적별 가중치 차등은 미결 — CLAUDE.md 노후도 절).
   */
  outcome?: WeeklyRating;
  /** 결과 반영 산문 — 성적 3변형 (구역 바인딩 완료). 산문은 반드시 미니게임 뒤 */
  resultProse: Record<MinigameResult, ProseVariant[]>;
}

// ─────────────────────────────────────────────
// 스토리렛 (손제작 서사)
// ─────────────────────────────────────────────
export interface Storylet {
  id: string; // 'EV-001' ...
  requirements: Condition[];
  body: ProseVariant[];
  choices: StoryletChoice[];
}

export interface StoryletChoice {
  label: string;
  check: Check;
  /**
   * 다일 이벤트 점유 선언 (v3 §5) — 판정 결과와 무관하게 선택 즉시 점유가 시작된다.
   * days는 1~3 (빌드 검증). 시작 시 flags[`md_${id}_started`]=1, 종료 시 flags[`md_${id}_done`]=1.
   */
  startsMultiday?: { id: string; days: number };
  onSuccess: { effects: Effect[]; text: string };
  onFailure?: { effects: Effect[]; text: string };
}

// ─────────────────────────────────────────────
// 조우 — 설비 이상 (v3 §6)
// 조우 상태는 GameState에 저장되지 않는다. 격리된 리듀서(core/encounter.ts)의
// 로컬 상태이며, 종료 시 outcome별 효과만 하루 루프로 돌아온다.
// ─────────────────────────────────────────────
export type EncounterActionId = "observe" | "soothe" | "burn" | "withdraw";
/** 'briefed' = 설명형 조우의 유일한 결말 — 읽고 확인했다 */
export type EncounterOutcome =
  | "burned"
  | "soothed"
  | "withdrawn"
  | "expired"
  | "briefed";

export interface EncounterDef {
  id: string; // 'ENC-001' ...
  /** 고장 신고서 양식 제목 — 문서상 이것은 생물이 아니다 */
  title: string;
  /**
   * 설명형 선행 조우 (2026-08-11 확정 — ENC-001) — 행동·턴 없이 intro를 읽고
   * 확인하면 끝난다. 종료 효과·한 줄은 여기서 온다 (outcome은 'briefed' 고정).
   * 이 필드가 있으면 아래 다단 필드는 쓰지 않는다 (검증기가 상호 배타를 강제).
   */
  briefing?: { effects: TemplateEffect[]; text: string };
  maxTurns?: number; // 3~5 (빌드 검증) — 다단 조우 전용
  /** soothe 성공 누적이 이 값에 닿으면 잠든다 (1~3) — 다단 조우 전용 */
  calmToSleep?: number;
  intro: ProseVariant[];
  actions?: Record<
    EncounterActionId,
    {
      label: string;
      check: Check; // withdraw는 auto
      successText: string;
      failureText?: string;
    }
  >;
  /** outcome 효과는 기존 자원만 (피로·동요·기억·플래그·노후도). {zone} 허용 */
  outcomes?: Partial<
    Record<EncounterOutcome, { effects: TemplateEffect[]; text: string }>
  >;
}

// ─────────────────────────────────────────────
// 주말 활동 (주간 마감 흐름 확정 2026-08-11)
// ─────────────────────────────────────────────
/**
 * 주말 택2 선택지 하나 — 빙결 학습 또는 인물 장면.
 * repeatable=true는 하루 1회 제한(다음 날 다시 가능 — 학습),
 * repeatable=false는 주말 전체 1회(인물 — 같은 장면을 두 번 겪지 않는다).
 * 학습과 인물이 같은 슬롯을 경쟁한다: 3인 전부 + 학습 2회는 산술적으로 불가능.
 */
export interface WeekendActivityDef {
  id: string; // 'WKD-frost' ...
  label: string; // 선택지 문구
  repeatable: boolean;
  body: ProseVariant[]; // 장면 산문 — 선택 즉시 읽는다
  effects: Effect[]; // 빙결 학습은 self.skillXp.frost, 인물은 플래그
}

// ─────────────────────────────────────────────
// 콘텐츠 번들 (D4: 코드가 콘텐츠를 직접 import하지 않는다)
// ─────────────────────────────────────────────
export interface ContentBundle {
  bundleId: string; // 'ep1-slice'
  version: string;
  orderTemplates: WorkOrderTemplate[];
  storylets: Storylet[];
  encounters: EncounterDef[];
  /** 구역 도면 (UI 층위 사양 §7) — 배치 구역의 지도가 여기서 온다 */
  zoneMaps: ZoneMap[];
  /** 주간 총평 장면 — 상사가 말로 전한다 (금요일 일과 종료 직후, 등급별 변형) */
  weeklyDebrief: Record<WeeklyRating, ProseVariant[]>;
  /** 평가 통지서 — 문서. 총평 장면에서 발행되어 재열람에 등록, 현재 상태로 재렌더링 */
  weeklyNotice: Record<WeeklyRating, ProseVariant[]>;
  /** 주말 택2 선택지 풀 (빙결 학습 · 인물 3인) */
  weekendActivities: WeekendActivityDef[];
  /** 엔딩 맺음 산문 — 유임/해고. 문서 ID로 재열람에 등록하지 않는다 (종료 화면) */
  endings: Record<EndingId, ProseVariant[]>;
}

// ─────────────────────────────────────────────
// 리듀서 계약 (구현은 core/ 에서)
// ─────────────────────────────────────────────
export type Action =
  | { type: "START_DAY" }
  | { type: "SKIP_TO_EVENT" }
  | { type: "CHOOSE_STORYLET"; storyletId: string; choiceIndex: number }
  /**
   * 저녁에 아무도 없을 때만 (v3 §4 정정 이후 서사가 카드로 가면서 생긴 빈 저녁).
   * 조건 맞는 스토리렛이 있으면 거부한다 — 관계 이벤트를 건너뛰는 문이 되면 안 된다.
   */
  | { type: "SKIP_EVENT" }
  /**
   * 조우 종료 결과 반입 (v3 §6) — 조우 리듀서가 만든 완성된 효과만 받는다.
   * 조우는 카드 성적·근무 슬롯에 관여하지 않는다 (확정 — implementation-plan §6-5):
   * 선행 조우(ENC-001)가 끝나면 미니게임이 이어지고, 성적은 RESOLVE_MINIGAME이 맡는다.
   */
  | {
      type: "RESOLVE_ENCOUNTER";
      encounterId: string;
      zone: ZoneId;
      outcome: EncounterOutcome;
      effects: Effect[];
      text: string;
    }
  /**
   * 미니게임 종료 반입 (세션 ②) — 성적이 카드의 3등급이 된다 (판정 없음, PRNG 불사용).
   * 미니게임 구현은 앱 층. 코어는 결과 하나만 받는다.
   */
  | { type: "RESOLVE_MINIGAME"; orderIndex: number; result: MinigameResult }
  | { type: "CLOSE_DAY" }
  /** 총평 장면을 읽고 확인 — 주말(토요일)로 넘어간다 */
  | { type: "CONFIRM_DEBRIEF" }
  /** 주말 활동 하나 선택 — 슬롯이 다하면 다음 날로, 이틀이 다하면 엔딩(FINAL_WEEK) 또는 월요일로 */
  | { type: "CHOOSE_WEEKEND"; activityId: string };

export interface StepResult {
  state: GameState;
  log: string[]; // 이번 스텝의 서술 텍스트 (UI가 그대로 출력)
  /**
   * 이번 스텝에 새로 상한에 닿은 메나스 (UI 층위 사양 §6).
   * 리듀서는 "무엇이 닿았는가"만 알리고 문안은 UI가 쓴다 — 통지의 서식은
   * 메나스마다 다르고(주목·피로는 본부 공문, 동요는 아님) 그 판단은 코어의 몫이 아니다.
   */
  notices?: MenaceId[];
}

export type Reducer = (
  state: GameState,
  action: Action,
  content: ContentBundle,
) => StepResult;
