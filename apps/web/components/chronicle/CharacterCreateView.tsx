import { CLASSES } from "./data";
import { Panel } from "@/components/ui/panel";
import { SealButton } from "@/components/ui/seal-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ClassKey } from "./types";

interface CharacterCreateViewProps {
  nameInput: string;
  setNameInput: (value: string) => void;
  selectedClass: ClassKey;
  setSelectedClass: (value: ClassKey) => void;
  startGame: () => void;
}

export function CharacterCreateView({
  nameInput,
  setNameInput,
  selectedClass,
  setSelectedClass,
  startGame,
}: CharacterCreateViewProps) {
  return (
    <Panel style={{ maxWidth: 560, margin: "0 auto" }}>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">이름</label>
        <Input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="이름을 입력하세요"
          maxLength={16}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">클래스</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(CLASSES).map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setSelectedClass(c.key)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors hover:bg-muted",
                selectedClass === c.key ? "border-primary bg-muted" : "border-border"
              )}
            >
              <div className="flex size-9 items-center justify-center rounded-full border text-base font-semibold">
                {c.initial}
              </div>
              <div className="mt-2 text-sm font-medium">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.tagline}</div>
              <div className="mt-1 text-xs leading-snug text-muted-foreground">{c.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <SealButton onClick={startGame}>여정 시작하기</SealButton>
    </Panel>
  );
}
