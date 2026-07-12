"use client";

import { useEffect, useRef } from "react";

interface Props {
  displayFont: string;
  bodyFont: string;
}

/** PixiJS는 브라우저 전용이므로 게임 모듈을 클라이언트에서 동적 import한다. */
export default function GameCanvas({ displayFont, bodyFont }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    import("@/game").then(async (mod) => {
      if (cancelled || !ref.current) return;
      const c = await mod.boot(ref.current, { displayFont, bodyFont });
      if (cancelled) c();
      else cleanup = c;
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [displayFont, bodyFont]);

  return <div ref={ref} className="game-root" />;
}
