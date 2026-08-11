'use client';

/**
 * 미니게임 공통 셸 (세션 ②) — 4종 구현이 공유하는 유일한 접점.
 * 셸은 세션(종류·난이도·seed)을 받아 구현을 띄우고, 결과 하나를 위로 돌려준다.
 * 등급 판정·상태 반영은 셸의 몫이 아니다 — 호출부가 RESOLVE_MINIGAME으로 반입한다.
 *
 * 실제 4종(파이프/기사의 여행/블록/선별 두더지)이 채워질 때까지
 * 레지스트리는 개발용 스텁을 가리킨다. 스텁은 결과 3값을 버튼으로 노출한다 —
 * 파이프라인(카드 열기 → 미니게임 → 결과 산문 → 정산)을 먼저 검증하기 위한 자리다.
 */
import type { ComponentType } from 'react';
import type { MinigameId, MinigameResult } from '../core/schema';
import { MINIGAME_NAMES, type MinigameSession } from '../core/minigame';

export interface MinigameProps {
  session: MinigameSession;
  onFinish: (result: MinigameResult) => void;
}

/** 개발용 스텁 — 실제 구현이 들어오면 레지스트리에서 교체된다 */
function StubMinigame({ session, onFinish }: MinigameProps) {
  return (
    <div className="minigame-stub" data-minigame={session.id}>
      <p className="minigame-stub-name">
        {MINIGAME_NAMES[session.id]} (스텁 · 난이도 {session.difficulty})
      </p>
      <div className="choices">
        <button onClick={() => onFinish('complete')}>완수</button>
        <button onClick={() => onFinish('partial')}>부분</button>
        <button onClick={() => onFinish('fail')}>실패</button>
      </div>
    </div>
  );
}

/** 4종 레지스트리 — 구현 교체 지점. 셸·호출부는 이 표만 본다 */
const MINIGAMES: Record<MinigameId, ComponentType<MinigameProps>> = {
  pipe: StubMinigame,
  knight: StubMinigame,
  block: StubMinigame,
  whack: StubMinigame,
};

export function MinigameShell({ session, onFinish }: MinigameProps) {
  const Impl = MINIGAMES[session.id];
  return <Impl session={session} onFinish={onFinish} />;
}
