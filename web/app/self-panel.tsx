'use client';

/**
 * L2 참조 패널 — 내 능력치 (UI 층위 사양 §4).
 *
 * 구 「도시 운용 원장」을 둘로 쪼갠 것의 한쪽이다. "원장"은 조직 문서의 이름이지
 * 메뉴의 이름이 아니었다 — 무엇이 나오는 창인지 이름이 말하지 않았다.
 * 여기는 나에 관한 것만: 스탯, 기술, 기억, 피로.
 */
import { SKILL_LABELS, STAT_LABELS } from '../core/reducer';
import { SKILL_LEVEL_MAX, XP_PER_LEVEL, xpIntoLevel } from '../core/skills';
import type { GameState } from '../core/schema';

export function SelfPanel({ state }: { state: GameState }) {
  return (
    <section className="ledger" aria-label="내 능력치">
      <div className="ledger-heading">
        <span>내 능력치</span>
        <span className="ledger-code">FORM 2-C</span>
      </div>
      <dl className="ledger-grid">
        <div>
          <dt>기억</dt>
          <dd>{state.self.memory} / 7</dd>
        </div>
        <div>
          <dt>피로</dt>
          <dd>{state.world.menace.fatigue} / 8</dd>
        </div>
      </dl>
      <div className="stat-row" aria-label="주 스탯">
        {(Object.keys(STAT_LABELS) as (keyof typeof STAT_LABELS)[]).map((stat) => (
          <span key={stat}>{STAT_LABELS[stat]} <b>{state.self.stats[stat]}</b></span>
        ))}
      </div>
      {/* 경험치 바 — 카드 선택이 준 경험이 다음 등급까지 얼마나 찼는가 (core/skills.ts) */}
      <div className="skill-rows" aria-label="전문 기술">
        {(Object.keys(SKILL_LABELS) as (keyof typeof SKILL_LABELS)[]).map((skill) => {
          const level = state.self.skills[skill];
          const into = xpIntoLevel(state.self.skillXp[skill]);
          return (
            <div className="skill-row" key={skill}>
              <span>{SKILL_LABELS[skill]} <b>{level}등급</b></span>
              <div
                aria-label={`${SKILL_LABELS[skill]} 경험 ${into} / ${XP_PER_LEVEL}`}
                aria-valuemax={XP_PER_LEVEL}
                aria-valuenow={into}
                className="xp-bar"
                role="meter"
              >
                <i style={{ width: `${(into / XP_PER_LEVEL) * 100}%` }} />
              </div>
              <small>{level >= SKILL_LEVEL_MAX ? '최고 등급' : `${into} / ${XP_PER_LEVEL}`}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}
