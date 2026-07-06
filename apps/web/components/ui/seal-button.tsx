import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface SealButtonProps {
  onClick: () => void;
  children: ReactNode;
}

export function SealButton({ onClick, children }: SealButtonProps) {
  return (
    <Button size="lg" className="h-11 w-full text-sm" onClick={onClick}>
      {children}
    </Button>
  );
}
