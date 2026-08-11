'use client';

/** 미니게임 공용 카운트다운 — 만료 시 onEnd를 정확히 1회 호출한다 */
import { useEffect, useRef, useState } from 'react';

export function useCountdown(totalMs: number, onEnd: () => void): number {
  const [remaining, setRemaining] = useState(totalMs);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  const firedRef = useRef(false);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const left = Math.max(0, totalMs - (Date.now() - startedAt));
      setRemaining(left);
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        clearInterval(timer);
        endRef.current();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [totalMs]);

  return remaining;
}
