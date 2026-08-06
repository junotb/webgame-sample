/**
 * Phase 0 스키마 v1 — 3시트 상태 + 콘텐츠 규격
 * 원칙: 순수 리듀서 코어 (프레임워크·저장소 무의존)
 * 이 파일이 AI 에이전트 콘텐츠 작성의 작업 규격이다 (가이드라인 D4)
 */

// ─────────────────────────────────────────────
// 식별자
// ─────────────────────────────────────────────
export type ZoneId = 'd2' | 'd5' | 'd7'; // 제2·5·7구역 (가칭)
export type NpcId = 'protagonist';           // Ep1 주인공 ("돌아온 자")
export type StatId = 'repair' | 'insight' | 'procedure' | 'nerve'; // 정비/진단/절차/담력
export type SkillId = 'inscription' | 'flowsense'; // 각인학/감류학 (슬라이스 범위)
export type MenaceId = 'fatigue' | 'scrutiny' | 'unrest'; // 피로/주목/동요

// ─────────────────────────────────────────────
// 3시트 상태 (세이브 = 이 객체 그대로)
// ─────────────────────────────────────────────
export interface AccountSheet {
  ownedEpisodes: string[];   // 슬라이스: ['ep1']
  // 여력(액션)은 Phase 1에서 추가 — 가이드라인 확정사항
}

export interface CharacterSheet {
  stats: Record<StatId, number>;    // 0~100
  skills: Record<SkillId, number>;  // 0~7
  memory: number;                   // 기억 0~7, 비가역 (감소 이펙트 금지 — 빌드 검증 대상)
  rank: number;                     // 직위 (슬라이스: 0 고정)
}

/** 주간 평가 등급 (v3 §2) — 금요일 종료 시점의 배치 구역 밴드가 곧 등급 */
export type WeeklyRating = 'perfect' | 'good' | 'concern' | 'warning';

/** 재열람 항목 — 구역 바인딩이 필요한 문서는 구역을 함께 기억한다 */
export type ArchiveEntry =
  | { kind: 'order'; templateId: string; zone: ZoneId }
  | { kind: 'storylet'; id: string }
  | { kind: 'encounter'; id: string; zone: ZoneId };

export interface WorldSheet {
  calendar: {
    day: number;      // 통산 일차 (주말 포함, day 1 = 1주차 월요일)
    weekday: number;  // 주중 일차 1~5 (금요일 = 5)
  };
  assignment: { zone: ZoneId };            // 현재 배치 구역 — 1주차는 한 구역 고정 (v3 §9)
  weekRatings: Record<number, WeeklyRating>; // 주차 → 주간 평가
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
  menace: Record<MenaceId, number>;                 // 0~8
  npcs: Record<NpcId, { trust: number }>;           // 신뢰 0~7
  flags: Record<string, number>;                    // 서사 플래그 (patched_d5 등)
  shiftLeft: number;                                // 근무 시간 잔여 (슬라이스의 트리아지 장치)
  pendingOrders: WorkOrder[];                       // 오늘 생성된 지시서
  seed: number;                                     // PRNG 상태 (재현성)
}

export interface GameState {
  account: AccountSheet;
  self: CharacterSheet;
  world: WorldSheet;
}

export type DayPhase = 'morning' | 'field' | 'event' | 'closing';

// ─────────────────────────────────────────────
// 판정
// ─────────────────────────────────────────────
export type Check =
  | { kind: 'broad'; stat: StatId; difficulty: number }   // p = 0.6·stat/diff
  | { kind: 'narrow'; skill: SkillId; difficulty: number } // p = 0.5+(skill−diff)·0.1
  | { kind: 'auto' };                                      // 판정 없음

// ─────────────────────────────────────────────
// 효과 — QBN 스타일 경로 기반 (기억 감소는 빌드 검증에서 거부)
// ─────────────────────────────────────────────
export type EffectPath =
  | `self.stats.${StatId}`
  | `self.skills.${SkillId}`
  | 'self.memory'
  | `world.zones.${ZoneId}.decay`
  | `world.menace.${MenaceId}`
  | `world.npcs.${NpcId}.trust`
  | `world.flags.${string}`;

export interface Effect {
  path: EffectPath;
  op: 'add' | 'set';
  value: number;
}

/**
 * 지시서 템플릿 전용 경로 — 템플릿은 구역 바인딩 전이므로 `{zone}` 치환자를 허용.
 * 생성기가 WorkOrder로 바인딩할 때 실제 ZoneId로 치환되며,
 * 리듀서의 effect 적용기에는 항상 구체 EffectPath만 도달한다.
 */
export type TemplateEffectPath =
  | EffectPath
  | 'world.zones.{zone}.decay'
  | `world.flags.${string}{zone}${string}`;

export interface TemplateEffect {
  path: TemplateEffectPath;
  op: 'add' | 'set';
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
  path: EffectPath | 'world.calendar.day' | 'world.zones.{zone}.decay';
  gte?: number;
  lte?: number;
}

/** 첫 매치 우선. 조건 없는 변형이 기본값(맨 뒤에 배치). */
export interface TextVariant {
  if?: Condition[];   // 예: [{ path: 'self.memory', gte: 1 }]
  text: string;
}

// ─────────────────────────────────────────────
// 지시서 (자동 생성 콘텐츠)
// ─────────────────────────────────────────────
/**
 * 카드 표면 층 — 전부 조직의 언어 (v3 §4). 표면은 실제를 예고하지 않는다:
 * '전투' 같은 분류는 존재할 수 없다 (설비 이상은 고장 신고서 양식으로만 존재).
 */
export type CardFace =
  | 'inspection'   // 점검
  | 'patrol'       // 정기 순시
  | 'liaison'      // 조직 방문·보고
  | 'supply'       // 자재 수령
  | 'survey';      // 미확인 구간 확인

export interface WorkOrderTemplate {
  id: string;                       // 'WO-T1' ...
  minDecay: number;                 // 이 노후도 이상 구역에서 생성됨
  weight: number;                   // 1~3 — CLOSE_DAY 노후도 정산 폭 (v3 §3, 빌드 검증 대상)
  face: CardFace;                   // 카드 얼굴 (표면 층)
  title: string;                    // 공식 완곡어 제목
  body: TextVariant[];              // 완곡어 시스템 적용 지점
  options: WorkOption[];
}

export interface WorkOption {
  label: string;
  check: Check;
  timeCost: number;                 // 근무 시간 소모 (슬라이스: 1)
  /**
   * 조우 진입 (v3 §6) — 이 옵션은 판정 대신 격리된 조우 리듀서로 넘어간다.
   * 표면은 실제를 예고하지 않으므로 라벨은 반드시 조직의 언어여야 한다.
   * check/onSuccess는 무시된다 (진입 자체는 판정 없음).
   */
  startsEncounter?: string;         // EncounterDef.id
  onSuccess: { effects: TemplateEffect[]; text: string };
  onFailure?: { effects: TemplateEffect[]; text: string };
}

/** 생성 시점에 완전히 구체화된 옵션 — 경로 바인딩·난이도 보정 완료 */
export interface BoundWorkOption {
  label: string;
  check: Check;                     // difficultyBonus 가산 완료
  timeCost: number;
  startsEncounter?: string;
  onSuccess: { effects: Effect[]; text: string };
  onFailure?: { effects: Effect[]; text: string };
}

/**
 * 생성기 출력: 템플릿 + 구역 바인딩.
 * 리듀서는 이 객체만 보고 처리한다 — 템플릿 재조회·치환 없음.
 */
export interface WorkOrder {
  templateId: string;
  zone: ZoneId;
  /** 난이도 보정: 구역 노후도의 minDecay 초과분 (방치의 대가, 튜닝 대상) */
  difficultyBonus: number;
  weight: number;                   // 템플릿에서 복사 — 정산은 리듀서가 이 값만 본다
  face: CardFace;
  /** 재발부 차수 = 생성 시점의 방치 누적. 0이면 신규 발부 */
  reissueCount: number;
  title: string;
  body: TextVariant[];              // 변형 선택은 렌더 시점 (완곡어 시스템)
  options: BoundWorkOption[];
  resolved: boolean;
  /** 처리 결과 — CLOSE_DAY 정산 근거: 성공 −weight / 실패 0 / 방치(미기록) +weight */
  outcome?: 'success' | 'failure';
}

// ─────────────────────────────────────────────
// 스토리렛 (손제작 서사)
// ─────────────────────────────────────────────
export interface Storylet {
  id: string;                       // 'EV-001' ...
  requirements: Condition[];
  body: TextVariant[];
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
export type EncounterActionId = 'observe' | 'soothe' | 'burn' | 'withdraw';
export type EncounterOutcome = 'burned' | 'soothed' | 'withdrawn' | 'expired';

export interface EncounterDef {
  id: string;                       // 'ENC-001' ...
  /** 고장 신고서 양식 제목 — 문서상 이것은 생물이 아니다 */
  title: string;
  maxTurns: number;                 // 3~5 (빌드 검증)
  /** soothe 성공 누적이 이 값에 닿으면 잠든다 (1~3) */
  calmToSleep: number;
  intro: TextVariant[];
  actions: Record<EncounterActionId, {
    label: string;
    check: Check;                   // withdraw는 auto
    successText: string;
    failureText?: string;
  }>;
  /** outcome 효과는 기존 자원만 (피로·동요·기억·플래그·노후도). {zone} 허용 */
  outcomes: Record<EncounterOutcome, { effects: TemplateEffect[]; text: string }>;
}

// ─────────────────────────────────────────────
// 콘텐츠 번들 (D4: 코드가 콘텐츠를 직접 import하지 않는다)
// ─────────────────────────────────────────────
export interface ContentBundle {
  bundleId: string;                 // 'ep1-slice'
  version: string;
  orderTemplates: WorkOrderTemplate[];
  storylets: Storylet[];
  encounters: EncounterDef[];
}

// ─────────────────────────────────────────────
// 리듀서 계약 (구현은 core/ 에서)
// ─────────────────────────────────────────────
export type Action =
  | { type: 'START_DAY' }
  | { type: 'RESOLVE_ORDER'; orderIndex: number; optionIndex: number }
  | { type: 'SKIP_TO_EVENT' }
  | { type: 'CHOOSE_STORYLET'; storyletId: string; choiceIndex: number }
  /**
   * 조우 종료 결과 반입 (v3 §6) — 조우 리듀서가 만든 완성된 효과만 받는다.
   * burned/soothed는 카드 처리 성공, withdrawn/expired는 처리 실패로 정산된다.
   */
  | { type: 'RESOLVE_ENCOUNTER'; orderIndex: number; outcome: EncounterOutcome; effects: Effect[]; text: string }
  | { type: 'CLOSE_DAY' };

export interface StepResult {
  state: GameState;
  log: string[];                    // 이번 스텝의 서술 텍스트 (UI가 그대로 출력)
}

export type Reducer = (state: GameState, action: Action, content: ContentBundle) => StepResult;
