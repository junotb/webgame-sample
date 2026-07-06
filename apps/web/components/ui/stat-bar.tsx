import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type StatBarVariant = "hp" | "mp" | "xp";

const VARIANT_INDICATOR_CLASS: Record<StatBarVariant, string> = {
  hp: "[&_[data-slot=progress-indicator]]:bg-red-500",
  mp: "[&_[data-slot=progress-indicator]]:bg-blue-500",
  xp: "[&_[data-slot=progress-indicator]]:bg-amber-500",
};

interface StatBarProps {
  label?: string;
  value: number;
  max: number;
  variant: StatBarVariant;
  className?: string;
}

export function StatBar({ label, value, max, variant, className }: StatBarProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between text-xs">
        {label && <span className="font-medium text-muted-foreground">{label}</span>}
        <span className="ml-auto tabular-nums text-muted-foreground">
          {value} / {max}
        </span>
      </div>
      <Progress value={(value / max) * 100} className={VARIANT_INDICATOR_CLASS[variant]} />
    </div>
  );
}
