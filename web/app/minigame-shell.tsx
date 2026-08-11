'use client';

/**
 * 미니게임 공통 셸 (세션 ②) — 4종 구현이 공유하는 유일한 접점.
 * 셸은 세션(종류·난이도·seed)을 받아 구현을 띄우고, 결과 하나를 위로 돌려준다.
 * 등급 판정·상태 반영은 셸의 몫이 아니다 — 호출부가 RESOLVE_MINIGAME으로 반입한다.
 */
import type { ComponentType } from 'react';
import type { MinigameId, MinigameResult } from '../core/schema';
import type { MinigameSession } from '../core/minigame';
import { BlockGame } from './minigames/block';
import { KnightGame } from './minigames/knight';
import { PipeGame } from './minigames/pipe';
import { WhackGame } from './minigames/whack';

export interface MinigameProps {
  session: MinigameSession;
  onFinish: (result: MinigameResult) => void;
}

/** 4종 레지스트리 — 구현 교체 지점. 셸·호출부는 이 표만 본다 */
const MINIGAMES: Record<MinigameId, ComponentType<MinigameProps>> = {
  pipe: PipeGame,
  knight: KnightGame,
  block: BlockGame,
  whack: WhackGame,
};

export function MinigameShell({ session, onFinish }: MinigameProps) {
  const Impl = MINIGAMES[session.id];
  return <Impl session={session} onFinish={onFinish} />;
}
