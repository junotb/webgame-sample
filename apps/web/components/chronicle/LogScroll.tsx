import type { RefObject } from "react";
import { cn } from "@/lib/utils";
import type { LogEntry, LogKind } from "./types";

const KIND_CLASS: Record<LogKind, string> = {
  sys: "text-muted-foreground",
  combat: "font-medium text-foreground",
  loot: "font-medium text-emerald-600 dark:text-emerald-400",
  danger: "font-semibold text-red-600 dark:text-red-400",
  npc: "italic text-muted-foreground",
};

interface LogScrollProps {
  log: LogEntry[];
  logRef: RefObject<HTMLDivElement | null>;
}

export function LogScroll({ log, logRef }: LogScrollProps) {
  return (
    <div
      ref={logRef}
      className="h-85 overflow-y-auto rounded-lg border bg-card p-4 text-sm leading-relaxed"
    >
      {log.length === 0 && (
        <p className="text-muted-foreground">이야기가 아직 쓰이지 않았다...</p>
      )}
      {log.map((entry) => (
        <p key={entry.id} className={cn("mb-2", KIND_CLASS[entry.kind])}>
          {entry.text}
        </p>
      ))}
    </div>
  );
}
