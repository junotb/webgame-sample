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

export interface WorldSheet {
  calendar: {
    day: number;      // 통산 일차 (주말 포함, day 1 = 1주차 월요일)
    weekday: number;  // 주중 일차 1~5 (금요일 = 5)
  };
  assignment: { zone: ZoneId };            // 현재 배치 구역 — 1주차는 한 구역 고정 (v3 §9)
  weekRatings: Record<number, WeeklyRating>; // 주차 → 주간 평가
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
export interface Condition {
  path: EffectPath | 'world.calendar.day';
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
export interface WorkOrderTemplate {
  id: string;                       // 'WO-T1' ...
  minDecay: number;                 // 이 노후도 이상 구역에서 생성됨
  weight: number;                   // 1~3 — CLOSE_DAY 노후도 정산 폭 (v3 §3, 빌드 검증 대상)
  title: string;                    // 공식 완곡어 제목
  body: TextVariant[];              // 완곡어 시스템 적용 지점
  options: WorkOption[];
}

export interface WorkOption {
  label: string;
  check: Check;
  timeCost: number;                 // 근무 시간 소모 (슬라이스: 1)
  onSuccess: { effects: TemplateEffect[]; text: string };
  onFailure?: { effects: TemplateEffect[]; text: string };
}

/** 생성 시점에 완전히 구체화된 옵션 — 경로 바인딩·난이도 보정 완료 */
export interface BoundWorkOption {
  label: string;
  check: Check;                     // difficultyBonus 가산 완료
  timeCost: number;
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
  onSuccess: { effects: Effect[]; text: string };
  onFailure?: { effects: Effect[]; text: string };
}

// ─────────────────────────────────────────────
// 콘텐츠 번들 (D4: 코드가 콘텐츠를 직접 import하지 않는다)
// ─────────────────────────────────────────────
export interface ContentBundle {
  bundleId: string;                 // 'ep1-slice'
  version: string;
  orderTemplates: WorkOrderTemplate[];
  storylets: Storylet[];
}

// ─────────────────────────────────────────────
// 리듀서 계약 (구현은 core/ 에서)
// ─────────────────────────────────────────────
export type Action =
  | { type: 'START_DAY' }
  | { type: 'RESOLVE_ORDER'; orderIndex: number; optionIndex: number }
  | { type: 'SKIP_TO_EVENT' }
  | { type: 'CHOOSE_STORYLET'; storyletId: string; choiceIndex: number }
  | { type: 'CLOSE_DAY' };

export interface StepResult {
  state: GameState;
  log: string[];                    // 이번 스텝의 서술 텍스트 (UI가 그대로 출력)
}

export type Reducer = (state: GameState, action: Action, content: ContentBundle) => StepResult;
